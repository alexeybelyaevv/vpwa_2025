import { Server, Socket } from 'socket.io'
import app from '@adonisjs/core/services/app'
import User from '#models/user'
import Channel from '#models/channel'
import ChannelMember from '#models/channel_member'
import ChannelBan from '#models/channel_ban'
import ChannelKickVote from '#models/channel_kick_vote'
import Message from '#models/message'
import MessageMention from '#models/message_mention'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { cleanupStaleChannels } from '#services/channel_maintenance'
import { Secret } from '@adonisjs/core/helpers'

type WsUser = {
  id: number
  nickName: string
  status: string | null
}

type AckResponse<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

let io: Server | null = null

const userSockets = new Map<number, Set<Socket>>()
const socketToUser = new Map<string, number>()

function ackError(cb: ((resp: AckResponse) => void) | undefined, error: string) {
  if (cb) cb({ ok: false, error })
}

function ackOk<T>(cb: ((resp: AckResponse<T>) => void) | undefined, data?: T) {
  if (cb) cb({ ok: true, data })
}

function trackSocket(userId: number, socket: Socket) {
  socketToUser.set(socket.id, userId)
  const existing = userSockets.get(userId) ?? new Set<Socket>()
  existing.add(socket)
  userSockets.set(userId, existing)
}

function untrackSocket(socket: Socket) {
  const userId = socketToUser.get(socket.id)
  if (!userId) return
  socketToUser.delete(socket.id)
  const set = userSockets.get(userId)
  if (!set) return
  set.delete(socket)
  if (!set.size) {
    userSockets.delete(userId)
  }
}

async function verifyToken(token: string): Promise<WsUser | null> {
  try {
    const verified = await User.accessTokens.verify(new Secret(token))
    if (!verified) return null
    const user = await User.find(verified.tokenableId)
    if (!user) return null
    return { id: user.id, nickName: user.nickname, status: user.status }
  } catch (error) {
    console.error('Token verify error', error)
    return null
  }
}

async function getChannelMembers(channelId: number) {
  const members = await ChannelMember.query().where('channel_id', channelId).preload('user')
  return members.map((m) => m.user)
}

function emitToUsers(userIds: number[], event: string, payload: any) {
  userIds.forEach((id) => {
    const sockets = userSockets.get(id)
    if (!sockets) return
    sockets.forEach((s) => s.emit(event, payload))
  })
}

function emitToUser(userId: number, event: string, payload: any) {
  const sockets = userSockets.get(userId)
  if (!sockets) return
  sockets.forEach((s) => s.emit(event, payload))
}

async function cleanupAndNotifyStaleChannels() {
  const removed = await cleanupStaleChannels()
  removed.forEach((info) => {
    emitToUsers(info.memberIds, 'channel:removed', { id: info.id, title: info.title })
  })
}

async function serializeChannel(channel: Channel) {
  await channel.load('owner')
  await channel.load('members', (query) => query.preload('user'))
  await channel.load('bans', (query) => query.preload('bannedUser'))
  return {
    id: channel.id,
    title: channel.name,
    type: channel.type,
    admin: channel.owner.nickname,
    members: channel.members.map((m) => m.user.nickname),
    banned: channel.bans.map((b) => b.bannedUser.nickname),
    kicks: {},
    createdAt: channel.createdAt?.toMillis() ?? Date.now(),
    lastActivityAt: channel.updatedAt?.toMillis() ?? Date.now(),
  }
}

function extractMentions(text: string): string[] {
  return (
    text
      .match(/@(\w+)/g)
      ?.map((mention) => mention.slice(1))
      ?.filter(Boolean) ?? []
  )
}

async function handleMessageSend(socket: Socket, channelId: number, text: string) {
  const userId = socketToUser.get(socket.id)
  if (!userId) return
  const channel = await Channel.find(channelId)
  if (!channel) {
    socket.emit('error', { message: 'Channel not found' })
    return
  }
  const membership = await ChannelMember.query()
    .where('channel_id', channelId)
    .where('user_id', userId)
    .first()
  if (!membership) {
    socket.emit('error', { message: 'You are not a member of this channel' })
    return
  }

  const user = await User.find(userId)
  if (!user) return

  const message = await Message.create({
    channelId,
    userId,
    text,
  })

  const mentions = extractMentions(text)
  if (mentions.length) {
    const mentionedUsers = await User.query().whereIn('nickname', mentions)
    await Promise.all(
      mentionedUsers.map((mentioned) =>
        MessageMention.create({
          messageId: message.id,
          mentionedUserId: mentioned.id,
        })
      )
    )
  }

  channel.updatedAt = DateTime.now()
  await channel.save()

  const payload = {
    id: message.id,
    chatId: channel.name,
    senderId: user.nickname,
    text,
    createdAt: message.createdAt.toMillis(),
    mentioned: mentions,
    system: false,
  }

  const members = await getChannelMembers(channelId)
  emitToUsers(
    members.map((m) => m.id),
    'message:new',
    payload
  )
}

async function sendSystemMessage(channelId: number, text: string) {
  const channel = await Channel.find(channelId)
  if (!channel) return
  const members = await getChannelMembers(channelId)
  const payload = {
    id: Date.now(),
    chatId: channel.name,
    senderId: 'system',
    text,
    createdAt: Date.now(),
    system: true,
  }
  emitToUsers(
    members.map((m) => m.id),
    'message:new',
    payload
  )
}

async function handleChannelsList(socket: Socket, cb?: (resp: AckResponse) => void) {
  const userId = socketToUser.get(socket.id)
  if (!userId) return ackError(cb, 'Unauthorized')
  await cleanupAndNotifyStaleChannels()
  const memberships = await ChannelMember.query()
    .where('user_id', userId)
    .preload('channel', (query) => {
      query
        .preload('owner')
        .preload('members', (q) => q.preload('user'))
        .preload('bans', (q) => q.preload('bannedUser'))
    })

  const channels = await Promise.all(memberships.map((m) => serializeChannel(m.channel)))
  ackOk(cb, channels)
}

function bootSocketServer() {
  if (io) return
  const environment = app.getEnvironment()
  if (environment !== 'web') return
  io = new Server(3334, {
    cors: {
      origin: '*',
    },
  })

  // Ensure DB connections are registered before websocket auth uses them
  db.connection()

  io.use(async (socket, next) => {
    const token = (socket.handshake.auth?.token || socket.handshake.query?.token) as
      | string
      | undefined
    if (!token) {
      return next(new Error('Unauthorized'))
    }
    const user = await verifyToken(token)
    if (!user) {
      return next(new Error('Unauthorized'))
    }
    socket.data.user = user
    trackSocket(user.id, socket)
    next()
  })

  io.on('connection', async (socket) => {
    const wsUser = socket.data.user as WsUser | undefined
    if (!wsUser) {
      socket.disconnect()
      return
    }

    await cleanupAndNotifyStaleChannels()

    const user = await User.find(wsUser.id)
    if (user) {
      await user.load('channelMembers')
      await handleChannelsList(socket, (resp) => {
        if (resp.ok) {
          socket.emit('session', {
            profile: {
              firstName: user.firstName,
              lastName: user.lastName,
              nickName: user.nickname,
              email: user.email,
            },
            channels: resp.data,
          })
        }
      })
    }

    socket.on('channel:list', (_, cb) => void handleChannelsList(socket, cb))

    socket.on('channel:join', async (data, cb) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return ackError(cb, 'Unauthorized')
      const { name, isPrivate } = data as { name: string; isPrivate?: boolean }
      if (!name) return ackError(cb, 'Channel name is required')
      let channel = await Channel.findBy('name', name)
      const me = await User.find(userId)
      if (!me) return ackError(cb, 'User not found')

      if (!channel) {
        channel = await Channel.create({
          name,
          type: isPrivate ? 'private' : 'public',
          ownerId: userId,
          updatedAt: DateTime.now(),
        })
        await ChannelMember.create({
          userId,
          channelId: channel.id,
          role: 'admin',
        })
        const serialized = await serializeChannel(channel)
        emitToUser(userId, 'channel:updated', serialized)
        ackOk(cb, serialized)
        return
      }

      const banned = await ChannelBan.query()
        .where('channel_id', channel.id)
        .where('user_id', userId)
        .first()
      if (banned) return ackError(cb, 'You are banned from this channel')
      const existing = await ChannelMember.query()
        .where('channel_id', channel.id)
        .where('user_id', userId)
        .first()
      if (existing) {
        return ackError(cb, 'Already a member')
      }
      if (channel.type === 'private') {
        return ackError(cb, 'Cannot join a private channel without invite')
      }
      await ChannelMember.create({
        userId,
        channelId: channel.id,
        role: 'member',
      })
      channel.updatedAt = DateTime.now()
      await channel.save()
      const serialized = await serializeChannel(channel)
      const members = await getChannelMembers(channel.id)
      emitToUsers(
        members.map((m) => m.id),
        'channel:updated',
        serialized
      )
      await sendSystemMessage(channel.id, `${me.nickname} joined #${channel.name}`)
      ackOk(cb, serialized)
    })

    socket.on('channel:leave', async (data, cb) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return ackError(cb, 'Unauthorized')
      const { channelId } = data as { channelId: number }
      const channel = await Channel.find(channelId)
      if (!channel) return ackError(cb, 'Channel not found')
      const membership = await ChannelMember.query()
        .where('channel_id', channelId)
        .where('user_id', userId)
        .first()
      if (!membership) return ackError(cb, 'Not a member')
      const me = await User.find(userId)
      if (!me) return ackError(cb, 'User not found')
      if (channel.ownerId === userId) {
        const members = await getChannelMembers(channelId)
        await ChannelMember.query().where('channel_id', channelId).delete()
        await ChannelKickVote.query().where('channel_id', channelId).delete()
        await ChannelBan.query().where('channel_id', channelId).delete()
        await channel.delete()
        emitToUsers(
          members.map((m) => m.id),
          'channel:removed',
          { id: channelId, title: channel.name }
        )
        ackOk(cb, { removed: true })
        return
      }
      await membership.delete()
      channel.updatedAt = DateTime.now()
      await channel.save()
      const members = await getChannelMembers(channelId)
      emitToUsers(
        members.map((m) => m.id),
        'channel:updated',
        await serializeChannel(channel)
      )
      await sendSystemMessage(channelId, `${me.nickname} left #${channel.name}`)
      ackOk(cb, { left: true })
    })

    socket.on('channel:invite', async (data, cb) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return ackError(cb, 'Unauthorized')
      const { channelId, nickName } = data as { channelId: number; nickName: string }
      const channel = await Channel.find(channelId)
      if (!channel) return ackError(cb, 'Channel not found')
      const meIsAdmin = channel.ownerId === userId
      if (channel.type === 'private' && !meIsAdmin) {
        return ackError(cb, 'Only admin can invite in private channels')
      }
      const invitee = await User.findBy('nickname', nickName)
      if (!invitee) return ackError(cb, 'User not found')
      const banned = await ChannelBan.query()
        .where('channel_id', channel.id)
        .where('user_id', invitee.id)
        .first()
      if (banned && !meIsAdmin) {
        return ackError(cb, `${nickName} is banned from this channel`)
      }
      if (banned && meIsAdmin) {
        await banned.delete()
      }
      const existing = await ChannelMember.query()
        .where('channel_id', channel.id)
        .where('user_id', invitee.id)
        .first()
      if (existing) {
        return ackError(cb, 'User already a member')
      }
      await ChannelMember.create({
        channelId: channel.id,
        userId: invitee.id,
        role: 'member',
      })
      channel.updatedAt = DateTime.now()
      await channel.save()
      const serialized = await serializeChannel(channel)
      const members = await getChannelMembers(channel.id)
      emitToUsers(
        members.map((m) => m.id),
        'channel:updated',
        serialized
      )
      emitToUser(invitee.id, 'channel:invited', {
        ...serialized,
        inviteHighlighted: true,
        inviteReceivedAt: Date.now(),
      })
      await sendSystemMessage(channel.id, `${nickName} was invited to #${channel.name}`)
      ackOk(cb, serialized)
    })

    socket.on('channel:revoke', async (data, cb) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return ackError(cb, 'Unauthorized')
      const { channelId, nickName } = data as { channelId: number; nickName: string }
      const channel = await Channel.find(channelId)
      if (!channel) return ackError(cb, 'Channel not found')
      if (channel.type !== 'private' || channel.ownerId !== userId) {
        return ackError(cb, 'Only admin can revoke members in private channels')
      }
      const revokedUser = await User.findBy('nickname', nickName)
      if (!revokedUser) return ackError(cb, 'User not found')
      const membership = await ChannelMember.query()
        .where('channel_id', channelId)
        .where('user_id', revokedUser.id)
        .first()
      if (!membership) return ackError(cb, 'User is not a member')
      await membership.delete()
      const banned = await ChannelBan.query()
        .where('channel_id', channelId)
        .where('user_id', revokedUser.id)
        .first()
      if (!banned) {
        await ChannelBan.create({
          channelId: channel.id,
          userId: revokedUser.id,
          bannedByUserId: userId,
        })
      }
      channel.updatedAt = DateTime.now()
      await channel.save()
      const serialized = await serializeChannel(channel)
      const members = await getChannelMembers(channel.id)
      emitToUsers(
        members.map((m) => m.id),
        'channel:updated',
        serialized
      )
      await sendSystemMessage(channel.id, `${nickName} was revoked from #${channel.name}`)
      ackOk(cb, serialized)
    })

    socket.on('channel:kick', async (data, cb) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return ackError(cb, 'Unauthorized')
      const { channelId, nickName } = data as { channelId: number; nickName: string }
      const channel = await Channel.find(channelId)
      if (!channel) return ackError(cb, 'Channel not found')
      const meMembership = await ChannelMember.query()
        .where('channel_id', channelId)
        .where('user_id', userId)
        .first()
      if (!meMembership) return ackError(cb, 'You are not a member')
      const target = await User.findBy('nickname', nickName)
      if (!target) return ackError(cb, 'User not found')
      const targetMembership = await ChannelMember.query()
        .where('channel_id', channelId)
        .where('user_id', target.id)
        .first()
      if (!targetMembership) return ackError(cb, 'User is not in this channel')
      const isAdmin = channel.ownerId === userId
      if (channel.type === 'private') {
        if (!isAdmin) return ackError(cb, 'Only admin can kick in private channels')
        await targetMembership.delete()
        await ChannelBan.create({
          channelId,
          userId: target.id,
          bannedByUserId: userId,
        })
        channel.updatedAt = DateTime.now()
        await channel.save()
        await sendSystemMessage(channelId, `${nickName} was permanently banned`)
        const serialized = await serializeChannel(channel)
        emitToUser(target.id, 'channel:removed', { id: channelId, title: channel.name })
        {
          const members = await getChannelMembers(channelId)
          const memberIds = members.map((m) => m.id)
          emitToUsers(memberIds, 'channel:updated', serialized)
        }
        return ackOk(cb, { banned: true })
      }
      if (isAdmin) {
        await targetMembership.delete()
        await ChannelBan.create({
          channelId,
          userId: target.id,
          bannedByUserId: userId,
        })
        channel.updatedAt = DateTime.now()
        await channel.save()
        emitToUser(target.id, 'channel:removed', { id: channelId, title: channel.name })
        await sendSystemMessage(channelId, `${nickName} was permanently banned by admin`)
        {
          const members = await getChannelMembers(channelId)
          const memberIds = members.map((m) => m.id)
          emitToUsers(memberIds, 'channel:updated', await serializeChannel(channel))
        }
        return ackOk(cb, { banned: true })
      }
      const existingVote = await ChannelKickVote.query()
        .where('channel_id', channelId)
        .where('voter_id', userId)
        .where('target_user_id', target.id)
        .first()
      if (existingVote) return ackError(cb, 'You already voted to kick this user')
      await ChannelKickVote.create({
        channelId,
        voterUserId: userId,
        targetUserId: target.id,
      })
      const votes = await ChannelKickVote.query()
        .where('channel_id', channelId)
        .where('target_user_id', target.id)
      if (votes.length >= 3) {
        await targetMembership.delete()
        await ChannelBan.create({
          channelId,
          userId: target.id,
          bannedByUserId: userId,
        })
        channel.updatedAt = DateTime.now()
        await channel.save()
        emitToUser(target.id, 'channel:removed', { id: channelId, title: channel.name })
        await sendSystemMessage(channelId, `${nickName} was banned after 3 votes`)
        {
          const members = await getChannelMembers(channelId)
          const memberIds = members.map((m) => m.id)
          emitToUsers(memberIds, 'channel:updated', await serializeChannel(channel))
        }
        return ackOk(cb, { banned: true })
      }
      await sendSystemMessage(
        channelId,
        `${wsUser.nickName} voted to kick ${nickName} (${votes.length}/3)`
      )
      return ackOk(cb, { vote: votes.length })
    })

    socket.on('message:send', async (data, cb) => {
      const { channelId, text } = data as { channelId: number; text: string }
      if (!text) return ackError(cb, 'Message is empty')
      await handleMessageSend(socket, channelId, text)
      ackOk(cb)
    })

    socket.on('messages:history', async (data, cb) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return ackError(cb, 'Unauthorized')
      const {
        channelId,
        beforeId,
        limit = 20,
      } = data as {
        channelId: number
        beforeId?: number
        limit?: number
      }
      const channel = await Channel.find(channelId)
      if (!channel) return ackError(cb, 'Channel not found')
      const membership = await ChannelMember.query()
        .where('channel_id', channelId)
        .where('user_id', userId)
        .first()
      if (!membership) return ackError(cb, 'Not a member')

      let query = Message.query()
        .where('channel_id', channelId)
        .orderBy('id', 'desc')
        .limit(limit)
        .preload('user')
      if (beforeId) {
        query = query.where('id', '<', beforeId)
      }
      const messages = await query.preload('mentions', (q) => q.preload('mentionedUser'))
      const serialized = messages.map((m) => ({
        id: m.id,
        chatId: channel.name,
        senderId: m.user?.nickname || 'unknown',
        text: m.text,
        createdAt: m.createdAt.toMillis(),
        mentioned: m.mentions.map((mn) => mn.mentionedUser.nickname),
        system: false,
      }))
      ackOk(cb, serialized.reverse())
    })

    socket.on('status:update', async (data) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return
      const { status, notifyOnlyMentions } = data as {
        status?: string
        notifyOnlyMentions?: boolean
      }
      const currentUser = await User.find(userId)
      if (!currentUser) return
      if (status) currentUser.status = status
      if (typeof notifyOnlyMentions === 'boolean') {
        currentUser.notifyOnlyMentions = notifyOnlyMentions
      }
      await currentUser.save()
      io?.emit('status:changed', { nickName: currentUser.nickname, status: currentUser.status })
    })

    socket.on('typing', async (data) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return
      const { channelId } = data as { channelId: number }
      const members = await getChannelMembers(channelId)
      emitToUsers(
        members.map((m) => m.id),
        'typing',
        { channelId, nickName: wsUser.nickName }
      )
    })

    socket.on('draft:update', async (data) => {
      const userId = socketToUser.get(socket.id)
      if (!userId) return
      const { channelId, text } = data as { channelId: number; text: string }
      const members = await getChannelMembers(channelId)
      emitToUsers(
        members.map((m) => m.id),
        'draft:update',
        { channelId, nickName: wsUser.nickName, text }
      )
    })

    socket.on('disconnect', () => {
      untrackSocket(socket)
    })
  })

  console.log('WebSocket server listening on :3334')
}

app.booted(() => {
  const environment = app.getEnvironment()
  if (environment !== 'web') return
  bootSocketServer()
})
