import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import Channel from '#models/channel'

export default class ChannelKickVote extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare channelId: number

  @column()
  declare voterUserId: number

  @column()
  declare targetUserId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Channel)
  declare channel: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'voterUserId' })
  declare voter: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'targetUserId' })
  declare target: BelongsTo<typeof User>
}
