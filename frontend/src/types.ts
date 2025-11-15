export type ChannelType = 'public' | 'private'

export type UserStatus = 'online' | 'dnd' | 'offline'

export interface UserProfile {
  firstName: string
  lastName: string
  nickName: string
  email: string
}

export interface Chat {
  title: string
  type: ChannelType
  admin: string
  members: string[]
  banned: string[]
  kicks: Record<string, Set<string>>
  createdAt: number
  lastActivityAt: number
  inviteHighlighted?: boolean
  inviteReceivedAt?: number
}

export interface Message {
  id: number
  chatId: string
  senderId: string
  text: string
  mentioned?: string[]
  createdAt?: number
  system?: boolean
}

export interface BackendError {
  error?: string
}