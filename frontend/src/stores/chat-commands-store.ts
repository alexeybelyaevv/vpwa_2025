import { defineStore } from 'pinia'
import { reactive } from 'vue'
import type { Chat, Message, ChannelType } from 'src/types'

export const useChatStore = defineStore('chat', () => {
  const state = reactive({
    channels: [] as Chat[],
    messages: {} as Record<string, Message[]>,
    currentChannel: null as string | null,
    currentUser: 'Alex' as string,
  })

  function getChannelByTitle(title: string): Chat | undefined {
    return state.channels.find(c => c.title === title)
  }

  function createChannel(title: string, type: ChannelType) {
    if (getChannelByTitle(title)) {
      return
    }
    const chat: Chat = {
      title,
      type,
      admin: state.currentUser,
      members: [state.currentUser],
      banned: [],
      kicks: {},
    }
    state.channels.push(chat)
    state.messages[title] = []
    state.currentChannel = title
  }

  function joinChannel(title: string, isPrivate = false) {
    const channel = getChannelByTitle(title)
    if (!channel) {
      createChannel(title, isPrivate ? 'private' : 'public')
    } else if (
      channel.type === 'public' &&
      !channel.banned.includes(state.currentUser) &&
      !channel.members.includes(state.currentUser)
    ) {
      channel.members.push(state.currentUser)
      state.currentChannel = title
    }
  }
  function invite(nickName: string) {
    if (!state.currentChannel) return
    const channelTitle = state.currentChannel
    const channel = getChannelByTitle(channelTitle)
    if (!channel || channel.members.includes(nickName)) return

    const isAdmin = channel.admin === state.currentUser
    if (channel.type === 'private' && !isAdmin) return
    
    if (channel.banned.includes(nickName)) {
        if (!isAdmin) return
        channel.banned = channel.banned.filter(b => b !== nickName)
    }
    channel.members.push(nickName)
    if (!state.messages[channelTitle]) state.messages[channelTitle] = []
    state.messages[channelTitle].push({
        id: Date.now(),
        chatId: channelTitle,
        senderId: state.currentUser,
        text: `${nickName} was invited to ${channelTitle}`,
    })
    console.log(getChannelByTitle(state.currentChannel)?.members)
  }
  function revoke(nickName: string) {
    if (!state.currentChannel) return
    const channelTitle = state.currentChannel
    const channel = getChannelByTitle(channelTitle)
    if (!channel || channel.admin !== state.currentUser || channel.type !== 'private') return
    channel.members = channel.members.filter(m => m !== nickName)
    channel.banned.push(nickName)
    if (!state.messages[channelTitle]) state.messages[channelTitle] = []
    state.messages[channelTitle].push({
      id: Date.now(),
      chatId: state.currentChannel,
      senderId: state.currentUser,
      text: `${nickName} was revoked from ${state.currentChannel}`,
    })
    console.log(getChannelByTitle(state.currentChannel)?.members)
  }
  function quit() {
    if (!state.currentChannel) return
    const channel = getChannelByTitle(state.currentChannel)
    if (!channel || channel.admin !== state.currentUser) return
    state.channels = state.channels.filter(c => c.title !== state.currentChannel)
    delete state.messages[state.currentChannel]
    state.currentChannel = null
  }

  function cancel() {
    if (!state.currentChannel) return
    const channel = getChannelByTitle(state.currentChannel)
    if (!channel) return
    channel.members = channel.members.filter(m => m !== state.currentUser)
    if (channel.admin === state.currentUser) {
      quit()
    } else {
      state.currentChannel = null
    }
  }

  function processCommand(command: string) {
    const parts = command.slice(1).trim().split(/\s+/)
    const cmd = parts[0]
    const arg = parts[1]
    const opt = parts[2]
    switch (cmd) {
      case 'join':
        if (arg) {
          const isPrivate = opt ? /private|\[private\]/.test(opt) : false
          joinChannel(arg, isPrivate)
        }
        break
      case 'invite':
        if(arg)
            invite(arg)
        break
      case 'revoke':
        if(arg)
            revoke(arg)
        break
      case 'quit':
        quit()
        break
      case 'cancel':
        cancel()
        break
    }
  }

  function sendMessage(channelTitle: string, text: string) {
    if (!state.messages[channelTitle]) {
      state.messages[channelTitle] = []
    }
    const newMessage: Message = {
      id: Date.now(),
      chatId: channelTitle,
      senderId: state.currentUser,
      text,
    }
    state.messages[channelTitle].push(newMessage)
  }

  function initialize() {
    if (state.channels.length > 0) return

    createChannel('general', 'public')
    const generalChannel = getChannelByTitle('general')
    if (generalChannel) {
      sendMessage('general', 'Welcome to the general channel!')
      sendMessage('general', 'Feel free to discuss anything here.')
    }

    createChannel('random', 'public')
    const randomChannel = getChannelByTitle('random')
    if (randomChannel) {
      sendMessage('random', 'Random thoughts go here!')
      sendMessage('random', 'What\'s on your mind?')
    }

    createChannel('projects', 'private')
    const projectsChannel = getChannelByTitle('projects')
    if (projectsChannel) {
      sendMessage('projects', 'Project updates and planning.')
      sendMessage('projects', 'Only team members can join.')
    }

    createChannel('VPWA', 'private')
    const oleksiiChat = getChannelByTitle('Oleksii')
    if (oleksiiChat) {
      sendMessage('VPWA', 'Hey Oleksii, how’s it going?')
      sendMessage('VPWA', 'Let’s catch up soon!')
    }

    createChannel('IAU', 'private')
    const sofiiaChat = getChannelByTitle('Sofiia')
    if (sofiiaChat) {
      sendMessage('IAU', 'Hi Sofiia, got any updates?')
      sendMessage('IAU', 'Working on anything cool?')
    }
  }
  function getAvailableCommands(): string[] {
    const commands = ['/join channelName [private]']
    if (!state.currentChannel) return commands

    const channel = getChannelByTitle(state.currentChannel)
    if (!channel || !channel.members.includes(state.currentUser)) return commands

    commands.push('/cancel')
    const isAdmin = channel.admin === state.currentUser
    if (isAdmin) {
        commands.push('/quit')
    }
    if (channel.type === 'public' || isAdmin) {
        commands.push('/invite nickName')
    }
    if (channel.type === 'private' && isAdmin) {
        commands.push('/revoke nickName')
    }
    commands.push('/kick nickName')
    commands.push('/list')

    return commands
    }

  return {
    state,
    getChannelByTitle,
    createChannel,
    joinChannel,
    quit,
    cancel,
    processCommand,
    sendMessage,
    initialize,
    getAvailableCommands,
    invite,
    revoke,
  }
})