import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import Message from '#models/message'
import ChannelMember from '#models/channel_member'
import ChannelKickVote from '#models/channel_kick_vote'
import ChannelBan from '#models/channel_ban'

export default class Channel extends BaseModel {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string 

  @column()
  declare type: 'public' | 'private'

  @column()
  declare description: string | null

  @column()
  declare ownerId: number 

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, {
    foreignKey: 'ownerId',
  })
  declare owner: BelongsTo<typeof User>

  
  @hasMany(() => ChannelMember)
  declare members: HasMany<typeof ChannelMember>

  
  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>

  
  @hasMany(() => ChannelKickVote)
  declare kickVotes: HasMany<typeof ChannelKickVote>

  
  @hasMany(() => ChannelBan)
  declare bans: HasMany<typeof ChannelBan>
}
