export type ChannelType = 'public' | 'private'

export interface Chat {
  id: number
  title: string
  type: ChannelType
}
export interface Message {
  id: number
  chatId: number
  senderId: number
  text: string
}