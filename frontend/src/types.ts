export interface Chat {
  id: number
  title: string
}
export interface Message {
  id: number
  chatId: number
  senderId: number
  text: string
}