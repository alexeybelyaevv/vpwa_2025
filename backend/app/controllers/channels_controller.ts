import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import ChannelMember from '#models/channel_member'
import User from '#models/user'
import ChannelBan from '#models/channel_ban'
import ChannelKickVote from '#models/channel_kick_vote'

export default class ChannelsController {
  public async create({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthorized' })
    }

    const { name, type, description } = request.only([
      'name',
      'type',
      'description',
    ])

    const existing = await Channel.findBy('name', name)
    if (existing) {
      return response.badRequest({ error: 'Channel already exists' })
    }

    const channel = await Channel.create({
      name,
      type,
      description: description || null,
      ownerId: user.id,
    })

    await ChannelMember.create({
      userId: user.id,
      channelId: channel.id,
      role: 'admin',
    })

    return response.created({
      message: 'Channel created',
      channel,
    })
  }
  public async getChannels({ auth, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthorized' })
    }

    const memberships = await ChannelMember
      .query()
      .where('user_id', user.id)
      .preload('channel', (channelQuery) => {
        channelQuery
          .preload('owner')
          .preload('members', (membersQuery) => {
            membersQuery.preload('user')
          })
          .preload('bans', (bansQuery) => {
            bansQuery.preload('bannedUser')
          })
      })

    const channels = memberships.map((membership) => {
      const channel = membership.channel

      const membersNicknames = channel.members.map((cm) => cm.user.nickname)
      const bannedNicknames = channel.bans.map((ban) => ban.bannedUser.nickname)

      return {
        id: channel.id,
        title: channel.name,
        type: channel.type as 'public' | 'private',
        admin: channel.owner.nickname,
        members: membersNicknames,
        banned: bannedNicknames,
        kicks: {},
        createdAt: channel.createdAt?.toMillis() ?? Date.now(),
        lastActivityAt: channel.updatedAt?.toMillis() ?? Date.now(),
      }
    })

    return response.ok({ channels })
  }

  public async join({ auth, request, response }: HttpContext) {
    const user = auth.user;
    if (!user) {
      return response.unauthorized({ error: 'Unauthorized' });
    }

    const { name, isPrivate } = request.only(['name', 'isPrivate']);
    let channel = await Channel.findBy('name', name);
    if (!channel) {
      channel = await Channel.create({
        name,
        type: isPrivate ? 'private' : 'public',
        ownerId: user.id,
      });

      await ChannelMember.create({
        userId: user.id,
        channelId: channel.id,
        role: 'admin',
      });

      return response.created({
        message: 'Channel created and joined',
        channel,
      });
    }
    const banned = await ChannelBan
    .query()
    .where('channel_id', channel.id)
    .where('user_id', user.id)
    .first();
    if (banned) {
      return response.forbidden({
        error: 'You are banned from this channel',
      });
    }
    const existing = await ChannelMember
      .query()
      .where('user_id', user.id)
      .where('channel_id', channel.id)
      .first();

    if (existing) {
      return response.ok({
        message: 'Already a member',
        channel,
      });
    }
    if (channel.type === 'private') {
      return response.forbidden({
        error: 'Cannot join a private channel. Ask the admin to invite you.',
      });
    }
    await ChannelMember.create({
      userId: user.id,
      channelId: channel.id,
      role: 'member',
    });
    return response.ok({
      message: 'Joined channel',
      channel,
    });
  }
  public async delete({ auth, params, response }: HttpContext) {
    const user = auth.user
    if (!user) return response.unauthorized({ error: 'Unauthorized' })
    const channel = await Channel.find(params.id)
    if (!channel) return response.notFound({ error: 'Channel not found' })
    if (channel.ownerId !== user.id) {
      return response.forbidden({ error: 'Only admin can close the channel' })
    }
    await channel.delete()
    return response.ok({
      message: `Channel "${channel.name}" was deleted`,
    })
  }
  public async leave({ auth, params, response }: HttpContext) {
    const user = auth.user
    if (!user) return response.unauthorized({ error: 'Unauthorized' })
    const channel = await Channel.find(params.id)
    if (!channel) return response.notFound({ error: 'Channel not found' })
    const membership = await ChannelMember
      .query()
      .where('channel_id', params.id)
      .andWhere('user_id', user.id)
      .first()
    if (!membership) {
      return response.badRequest({ error: 'You are not a member of this channel' })
    }
    if (channel.ownerId === user.id) {
      await channel.delete()
      return response.ok({ message: `Admin left channel "${channel.name}" deleted` })
    }
    await membership.delete()

    return response.ok({
      message: `You left channel "${channel.name}"`,
    })
  }
  public async invite({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      return response.unauthorized({ error: 'Unauthorized' })
    }
    const { channelId, nickName } = request.only(['channelId', 'nickName'])
    const invitee = await User.findBy('nickname', nickName)
    if (!invitee) {
      return response.badRequest({ error: 'User not found' })
    }
    const channel = await Channel.find(channelId)
    if (!channel) {
      return response.notFound({ error: 'Channel not found' })
    }
    const meMembership = await ChannelMember
      .query()
      .where('channel_id', channel.id)
      .where('user_id', user.id)
      .first()

    if (!meMembership) {
      return response.forbidden({ error: 'You are not a member of this channel' })
    }
    const isAdmin = channel.ownerId === user.id

    if (channel.type === 'private' && !isAdmin) {
      return response.forbidden({ error: 'Only admin can invite in private channels' })
    }
    const isBanned = await ChannelBan
      .query()
      .where('channel_id', channel.id)
      .where('user_id', invitee.id)
      .first();

    if (isBanned && !isAdmin) {
      return response.forbidden({
        error: `${nickName} is banned from this channel.`,
      });
    }
    if (isBanned && isAdmin) {
      await isBanned.delete();
    }
    const existing = await ChannelMember
      .query()
      .where('channel_id', channel.id)
      .where('user_id', invitee.id)
      .first()

    if (existing) {
      return response.badRequest({ error: 'User is already a member' })
    }
    await ChannelMember.create({
      channelId: channel.id,
      userId: invitee.id,
      role: 'member',
    })
    const members = await ChannelMember
      .query()
      .where('channel_id', channel.id)
      .preload('user')

    return response.ok({
      message: `User ${nickName} was invited`,
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        ownerId: channel.ownerId,
        members: members.map(m => m.user.nickname),
        createdAt: channel.createdAt.toMillis(),
        updatedAt: channel.updatedAt.toMillis(),
      },
    })
  }
  public async revoke({ auth, request, response }: HttpContext) {
    const user = auth.user;
    if (!user) {
      return response.unauthorized({ error: 'Unauthorized' });
    }
    const { channelId, nickName } = request.only(['channelId', 'nickName']);
    const channel = await Channel.find(channelId);
    if (!channel) {
      return response.notFound({ error: 'Channel not found' });
    }
    if (channel.type !== 'private' || channel.ownerId !== user.id) {
      return response.forbidden({ error: 'Only admin can revoke members in private channels' });
    }
    const revokedUser = await User.findBy('nickname', nickName);
    if (!revokedUser) {
      return response.badRequest({ error: 'User not found' });
    }
    const membership = await ChannelMember
      .query()
      .where('channel_id', channelId)
      .where('user_id', revokedUser.id)
      .first();
    if (!membership) {
      return response.badRequest({ error: 'User is not a member' });
    }
    await membership.delete();
    const banned = await ChannelBan
      .query()
      .where('channel_id', channelId)
      .where('user_id', revokedUser.id)
      .first();

    if (!banned) {
      await ChannelBan.create({
        channelId: channel.id,
        userId: revokedUser.id,
        bannedByUserId: user.id,
      });
    }
    const members = await ChannelMember
      .query()
      .where('channel_id', channelId)
      .preload('user');

    const bans = await ChannelBan
      .query()
      .where('channel_id', channelId)
      .preload('bannedUser');
    return response.ok({
      message: `User ${nickName} was revoked`,
      channel: {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        ownerId: channel.ownerId,
        members: members.map(m => m.user.nickname),
        banned: bans.map(b => b.bannedUser.nickname),
      },
    });
  }
  public async kick({ auth, request, response }: HttpContext) {
    const user = auth.user;
    if (!user) return response.unauthorized({ error: 'Unauthorized' });
    const { channelId, nickName } = request.only(['channelId', 'nickName']);
    const target = await User.findBy('nickname', nickName);
    if (!target) return response.badRequest({ error: 'User not found' });
    const channel = await Channel.find(channelId);
    if (!channel) return response.notFound({ error: 'Channel not found' });
    const meMembership = await ChannelMember.query()
      .where('channel_id', channelId)
      .where('user_id', user.id)
      .first();
    if (!meMembership) {
      return response.forbidden({ error: 'You are not a member of this channel' });
    }
    const targetMembership = await ChannelMember.query()
      .where('channel_id', channelId)
      .where('user_id', target.id)
      .first();

    if (!targetMembership) {
      return response.badRequest({ error: 'User is not in this channel' });
    }
    const isAdmin = channel.ownerId === user.id;
    if (channel.type === 'private') {
      if (!isAdmin) {
        return response.forbidden({ error: 'Only admin can kick in private channels' });
      }
      await targetMembership.delete();
      await ChannelBan.create({
        channelId,
        userId: target.id,
        bannedByUserId: user.id,
      });
      return response.ok({
        message: `${nickName} was permanently banned (private channel)`,
      });
    }
    if (isAdmin) {
      await targetMembership.delete();
      await ChannelBan.create({
        channelId,
        userId: target.id,
        bannedByUserId: user.id,
      });

      return response.ok({
        message: `${nickName} was permanently banned by admin`,
      });
    }
    const existingVote = await ChannelKickVote.query()
      .where('channel_id', channelId)
      .where('voter_id', user.id)
      .where('target_user_id', target.id)
      .first();
    if (existingVote) {
      return response.badRequest({ error: 'You already voted to kick this user' });
    }
    await ChannelKickVote.create({
      channelId,
      voterUserId: user.id,
      targetUserId: target.id,
    });
    const votes = await ChannelKickVote.query()
      .where('channel_id', channelId)
      .where('target_user_id', target.id);
    if (votes.length >= 3) {
      await targetMembership.delete();
      await ChannelBan.create({
        channelId,
        userId: target.id,
        bannedByUserId: user.id,
      });
      return response.ok({
        message: `${nickName} was banned after 3 votes`,
      });
    }
    return response.ok({
      message: `${user.nickname} voted to kick ${nickName} (${votes.length}/3)`,
    });
  }



}
