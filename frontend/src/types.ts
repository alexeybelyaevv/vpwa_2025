export type ChannelType = 'public' | 'private'

export interface Chat {
  title: string
  type: ChannelType
  admin: string 
  members: string[]
  banned: string[]
  kicks: Record<string, Set<string>>
}
export interface Message {
  id: number
  chatId: string
  senderId: string
  text: string
  mentioned?: string[]
}