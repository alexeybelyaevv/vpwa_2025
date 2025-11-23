import Channel from '#models/channel'
import ChannelBan from '#models/channel_ban'
import ChannelKickVote from '#models/channel_kick_vote'
import ChannelMember from '#models/channel_member'
import Message from '#models/message'
import { DateTime } from 'luxon'

export type RemovedChannelInfo = {
  id: number
  title: string
  memberIds: number[]
}

export async function cleanupStaleChannels(): Promise<RemovedChannelInfo[]> {
  const threshold = DateTime.now().minus({ days: 30 })
  const staleChannels = await Channel.query().where('updated_at', '<', threshold.toJSDate())

  const removed: RemovedChannelInfo[] = []
  for (const channel of staleChannels) {
    const members = await ChannelMember.query().where('channel_id', channel.id)
    removed.push({
      id: channel.id,
      title: channel.name,
      memberIds: members.map((m) => m.userId),
    })

    await ChannelMember.query().where('channel_id', channel.id).delete()
    await ChannelKickVote.query().where('channel_id', channel.id).delete()
    await ChannelBan.query().where('channel_id', channel.id).delete()
    await Message.query().where('channel_id', channel.id).delete()
    await channel.delete()
  }

  return removed
}
