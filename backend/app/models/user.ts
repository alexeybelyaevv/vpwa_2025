import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

import Message from '#models/message'
import ChannelMember from '#models/channel_member'
import MessageMention from '#models/message_mention'
import ChannelKickVote from '#models/channel_kick_vote'
import ChannelBan from '#models/channel_ban'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nickname: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare notifyOnlyMentions: boolean

  @column()
  declare status: string 

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  public async beforeSave() {
    if (this.$dirty.password) {
      this.password = await hash.make(this.password)
    }
  }

  static accessTokens = DbAccessTokensProvider.forModel(User)

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>

  
  @hasMany(() => ChannelMember)
  declare channelMembers: HasMany<typeof ChannelMember>

  
  @hasMany(() => MessageMention, {
    foreignKey: 'mentionedUserId',
  })
  declare mentions: HasMany<typeof MessageMention>

  
  @hasMany(() => ChannelKickVote, {
    foreignKey: 'voterUserId',
  })
  declare kickVotes: HasMany<typeof ChannelKickVote>

  
  @hasMany(() => ChannelKickVote, {
    foreignKey: 'targetUserId',
  })
  declare kickVotesAgainst: HasMany<typeof ChannelKickVote>

  
  @hasMany(() => ChannelBan, {
    foreignKey: 'bannedByUserId',
  })
  declare bansCreated: HasMany<typeof ChannelBan>

  
  @hasMany(() => ChannelBan, {
    foreignKey: 'userId',
  })
  declare bans: HasMany<typeof ChannelBan>
}
