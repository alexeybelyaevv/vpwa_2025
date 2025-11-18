import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import ChannelMember from '#models/channel_member'

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

}
