import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Chat, Message, ChannelType } from 'src/types';
import { chatTitleToSlug } from 'src/utils/chat';

export const useChatStore = defineStore('chat', () => {
  const state = reactive({
    channels: [] as Chat[],
    messages: {} as Record<string, Message[]>,
    currentChannel: null as string | null,
    currentUser: 'Alex' as string,
  });

  function getChannelByTitle(title: string): Chat | undefined {
    return state.channels.find((c) => c.title === title);
  }

  function createChannel(title: string, type: ChannelType) {
    if (getChannelByTitle(title)) {
      return;
    }
    const chat: Chat = {
      title,
      type,
      admin: state.currentUser,
      members: [state.currentUser],
      banned: [],
      kicks: {},
    };
    state.channels.push(chat);
    state.messages[title] = [];
    state.currentChannel = title;
  }

  function ensureMember(channel: Chat, nickname: string) {
    if (!channel.members.includes(nickname)) {
      channel.members.push(nickname);
    }
  }

  function joinChannel(title: string, isPrivate = false) {
    const channel = getChannelByTitle(title);
    if (!channel) {
      createChannel(title, isPrivate ? 'private' : 'public');
    } else if (
      channel.type === 'public' &&
      !channel.banned.includes(state.currentUser) &&
      !channel.members.includes(state.currentUser)
    ) {
      channel.members.push(state.currentUser);
      state.currentChannel = title;
    }
  }
  function invite(nickName: string) {
    if (!state.currentChannel) return;
    const channelTitle = state.currentChannel;
    const channel = getChannelByTitle(channelTitle);
    if (!channel || channel.members.includes(nickName)) return;

    const isAdmin = channel.admin === state.currentUser;
    if (channel.type === 'private' && !isAdmin) return;

    if (channel.banned.includes(nickName) && isAdmin) {
      channel.banned = channel.banned.filter((b) => b !== nickName);
    }
    channel.members.push(nickName);
    if (!state.messages[channelTitle]) state.messages[channelTitle] = [];
    state.messages[channelTitle].push({
      id: Date.now(),
      chatId: channelTitle,
      senderId: state.currentUser,
      text: `${nickName} was invited to ${channelTitle}`,
    });
    console.log(getChannelByTitle(state.currentChannel)?.members);
  }
  function revoke(nickName: string) {
    if (!state.currentChannel) return;
    const channelTitle = state.currentChannel;
    const channel = getChannelByTitle(channelTitle);
    if (!channel || channel.admin !== state.currentUser || channel.type !== 'private') return;
    channel.members = channel.members.filter((m) => m !== nickName);
    channel.banned.push(nickName);
    if (!state.messages[channelTitle]) state.messages[channelTitle] = [];
    state.messages[channelTitle].push({
      id: Date.now(),
      chatId: state.currentChannel,
      senderId: state.currentUser,
      text: `${nickName} was revoked from ${state.currentChannel}`,
    });
    console.log(getChannelByTitle(state.currentChannel)?.members);
  }
  function kick(nickName: string) {
    if (!state.currentChannel) return;
    const channelTitle = state.currentChannel;
    const channel = getChannelByTitle(channelTitle);
    if (!channel || nickName === state.currentUser || !channel.members.includes(nickName)) return;

    const isAdmin = channel.admin === state.currentUser;
    if (channel.type === 'private' && isAdmin) {
      channel.members = channel.members.filter((m) => m !== nickName);
      channel.banned.push(nickName);
      if (!state.messages[channelTitle]) state.messages[channelTitle] = [];
      state.messages[channelTitle].push({
        id: Date.now(),
        chatId: channelTitle,
        senderId: state.currentUser,
        text: `${nickName} was banned from ${channelTitle}`,
      });
    } else if (channel.type === 'public') {
      if (!channel.kicks[nickName]) {
        channel.kicks[nickName] = new Set<string>();
      }
      if (channel.kicks[nickName].has(state.currentUser)) {
        if (!state.messages[channelTitle]) state.messages[channelTitle] = [];
        state.messages[channelTitle].push({
          id: Date.now(),
          chatId: channelTitle,
          senderId: state.currentUser,
          text: `${state.currentUser}, you have already voted to kick ${nickName}`,
        });
        return;
      }
      channel.kicks[nickName].add(state.currentUser);
      if (!state.messages[channelTitle]) state.messages[channelTitle] = [];
      state.messages[channelTitle].push({
        id: Date.now(),
        chatId: channelTitle,
        senderId: state.currentUser,
        text: `${state.currentUser} voted to kick ${nickName} (${channel.kicks[nickName].size}/3)`,
      });
      if (isAdmin || channel.kicks[nickName].size >= 3) {
        channel.members = channel.members.filter((m) => m !== nickName);
        channel.banned.push(nickName);
        if (!state.messages[channelTitle]) state.messages[channelTitle] = [];
        state.messages[channelTitle].push({
          id: Date.now(),
          chatId: channelTitle,
          senderId: state.currentUser,
          text: `${nickName} was banned from ${channelTitle}`,
        });
      }
    }
  }
  function quit() {
    if (!state.currentChannel) return;
    const channel = getChannelByTitle(state.currentChannel);
    if (!channel || channel.admin !== state.currentUser) return;
    state.channels = state.channels.filter((c) => c.title !== state.currentChannel);
    delete state.messages[state.currentChannel];
    state.currentChannel = null;
  }

  function cancel() {
    if (!state.currentChannel) return;
    const channel = getChannelByTitle(state.currentChannel);
    if (!channel) return;
    channel.members = channel.members.filter((m) => m !== state.currentUser);
    if (channel.admin === state.currentUser) {
      quit();
    } else {
      state.currentChannel = null;
    }
  }

  function processCommand(command: string) {
    const parts = command.slice(1).trim().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];
    const opt = parts[2];
    switch (cmd) {
      case 'join':
        if (arg) {
          const isPrivate = opt ? /private|\[private\]/.test(opt) : false;
          joinChannel(arg, isPrivate);
        }
        break;
      case 'invite':
        if (arg) invite(arg);
        break;
      case 'revoke':
        if (arg) revoke(arg);
        break;
      case 'kick':
        if (arg) kick(arg);
        break;
      case 'quit':
        quit();
        break;
      case 'cancel':
        cancel();
        break;
    }
  }

  function pushMessage(channelTitle: string, senderId: string, text: string) {
    const channel = getChannelByTitle(channelTitle);
    if (!channel) return;

    if (!state.messages[channelTitle]) {
      state.messages[channelTitle] = [];
    }

    const mentioned = text
      .match(/@(\w+)/g)
      ?.map((mention) => mention.slice(1))
      .filter((nickname) => channel.members.includes(nickname));

    const newMessage: Message = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      chatId: channelTitle,
      senderId,
      text,
      ...(mentioned && mentioned.length > 0 ? { mentioned } : {}),
    };

    state.messages[channelTitle].push(newMessage);
  }

  function sendMessage(channelTitle: string, text: string) {
    pushMessage(channelTitle, state.currentUser, text);
  }
  function initialize() {
    if (state.channels.length > 0) return;

    createChannel('general', 'public');
    const generalChannel = getChannelByTitle('general');
    if (generalChannel) {
      ensureMember(generalChannel, 'Mira');
      ensureMember(generalChannel, 'Noah');
      pushMessage(
        'general',
        'Mira',
        'Morning team! The sprint board is up to date if you want to peek before standup.',
      );
      pushMessage(
        'general',
        'Noah',
        "Hey @Alex, can you share yesterday's design explorations before we review?",
      );
    }

    createChannel('random', 'public');
    const randomChannel = getChannelByTitle('random');
    if (randomChannel) {
      ensureMember(randomChannel, 'Kai');
      pushMessage('random', 'Kai', 'Anyone up for a lunch walk today?');
    }

    createChannel('projects', 'private');
    const projectsChannel = getChannelByTitle('projects');
    if (projectsChannel) {
      ensureMember(projectsChannel, 'Mira');
      pushMessage(
        'projects',
        'Mira',
        'Shipped the analytics dashboard update. QA is scheduled for tomorrow morning.',
      );
    }

    createChannel('VPWA', 'private');
    const oleksiiChat = getChannelByTitle('Oleksii');
    if (oleksiiChat) {
      sendMessage('VPWA', 'Hey Oleksii, how’s it going?');
      sendMessage('VPWA', 'Let’s catch up soon!');
    }

    createChannel('IAU', 'private');
    const sofiiaChat = getChannelByTitle('Sofiia');
    if (sofiiaChat) {
      sendMessage('IAU', 'Hi Sofiia, got any updates?');
      sendMessage('IAU', 'Working on anything cool?');
    }

    if (state.channels.length > 0) {
      const generalChannel = getChannelByTitle('general');
      state.currentChannel = generalChannel ? generalChannel.title : state.channels[0]?.title || '';
    }
  }
  function getAvailableCommands(): string[] {
    const commands = ['/join channelName [private]'];
    if (!state.currentChannel) return commands;

    const channel = getChannelByTitle(state.currentChannel);
    if (!channel || !channel.members.includes(state.currentUser)) return commands;

    commands.push('/cancel');
    const isAdmin = channel.admin === state.currentUser;
    if (isAdmin) {
      commands.push('/quit');
    }
    if (channel.type === 'public' || isAdmin) {
      commands.push('/invite nickName');
    }
    if (channel.type === 'private' && isAdmin) {
      commands.push('/revoke nickName');
    }
    commands.push('/kick nickName');
    commands.push('/list');

    return commands;
  }

  function selectChannelBySlug(slug: string | null | undefined): string | null {
    if (!state.channels.length) {
      state.currentChannel = null;
      return null;
    }

    if (slug) {
      const channel = state.channels.find((c) => chatTitleToSlug(c.title) === slug);
      if (channel) {
        state.currentChannel = channel.title;
        return chatTitleToSlug(channel.title);
      }
    }

    if (state.currentChannel) {
      const existing = getChannelByTitle(state.currentChannel);
      if (existing) {
        return chatTitleToSlug(existing.title);
      }
    }

    state.currentChannel = state.channels[0]?.title || '';
    return chatTitleToSlug(state.currentChannel);
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
    kick,
    selectChannelBySlug,
    chatTitleToSlug,
  };
});
