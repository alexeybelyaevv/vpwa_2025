import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Chat, Message, ChannelType, UserProfile, UserStatus } from 'src/types';
import { chatTitleToSlug } from 'src/utils/chat';
import { useQuasar } from 'quasar';
import { api } from '../api'
import type { AxiosError } from 'axios';

export const useChatStore = defineStore('chat', () => {
  const MESSAGES_BATCH_SIZE = 20;
  const $q = useQuasar();
  const state = reactive({
    channels: [] as Chat[],
    messages: {} as Record<string, Message[]>,
    visibleMessages: {} as Record<string, Message[]>,
    visiblePosition: {} as Record<string, number>,
    pendingMessages: {} as Record<string, Message[]>,
    currentChannel: null as string | null,
    profile: {
      firstName: '',
      lastName: '',
      nickName: '',
      email: '',
    } as UserProfile,
    status: 'online' as UserStatus,
    notifyOnlyMentions: false,
    typingDrafts: {} as Record<string, string>,
  });

  function getCurrentUser(): string {
    return state.profile.nickName;
  }

  function ensureMessageCollections(channelTitle: string) {
    if (!state.messages[channelTitle]) {
      state.messages[channelTitle] = [];
    }
    if (!state.pendingMessages[channelTitle]) {
      state.pendingMessages[channelTitle] = [];
    }
  }

  function touchChannel(channel: Chat | undefined) {
    if (!channel) return;
    channel.lastActivityAt = Date.now();
  }

  function appendMessage(channelTitle: string, message: Message) {
    ensureMessageCollections(channelTitle);
    state.messages[channelTitle]?.push(message);
    if (state.currentChannel === channelTitle) {
      if (!state.visibleMessages[channelTitle]) {
        initializeVisibleMessages(channelTitle);
      } else {
        state.visibleMessages[channelTitle].push(message);
      }
    }
  }

  function getChannelByTitle(title: string): Chat | undefined {
    return state.channels.find((c) => c.title === title);
  }
  function initializeVisibleMessages(channelTitle: string) {
    ensureMessageCollections(channelTitle);
    const all = state.messages[channelTitle] || [];
    const total = all.length;

    const start = Math.max(0, total - MESSAGES_BATCH_SIZE);
    const initialVisible = all.slice(start);

    state.visibleMessages[channelTitle] = [...initialVisible];
    state.visiblePosition[channelTitle] = start;
  }
  async function createChannel(title: string, type: ChannelType) {
    const me = getCurrentUser();
    try {
      const res = await api.post('/channels/create', {
        name: title,
        type,
      });

      const channel = res.data.channel;
      console.log(channel);
      state.channels.push({
        id: channel.id,
        title: channel.name,
        type: channel.type,
        admin: me,
        members: [me],
        banned: [],
        kicks: {},
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
      });
      console.log(state.channels);
      ensureMessageCollections(title);
      state.currentChannel = channel.name;
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  }


  // function ensureMember(channel: Chat, nickname: string, highlight = false) {
  //   if (!channel.members.includes(nickname)) {
  //     channel.members.push(nickname);
  //     touchChannel(channel);
  //   }
  //   if (highlight) {
  //     channel.inviteHighlighted = true;
  //     channel.inviteReceivedAt = Date.now();
  //   }
  // }

  async function joinChannel(title: string, isPrivate = false) {
    try {
      const res = await api.post('/channels/join', {
        name: title,
        isPrivate,
      });

      const channel = res.data.channel;
      const backendMessage = res.data.message;
      if (backendMessage) {
        $q.notify({
          type: 'positive',
          color: 'primary',
          icon: 'chat',
          message: backendMessage,
        });
      }
      if (!getChannelByTitle(channel.name)) {
        state.channels.push({
          id: channel.id,
          title: channel.name,
          type: channel.type,
          admin: channel.ownerId,
          members: [],
          banned: [],
          kicks: {},
          createdAt: channel.createdAt,
          lastActivityAt: Date.now(),
        });
      }
      await initialize();
      state.currentChannel = channel.name;
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      const message = err.response?.data?.error || 'Failed to join channel';
      $q.notify({
        type: 'warning',
        icon: 'lock',
        message,
      });
      return;
    }
  }


  async function invite(nickName: string) {
    if (!state.currentChannel) return;

    const channel = getChannelByTitle(state.currentChannel);
    if (!channel) return;

    try {
      const res = await api.post('/channels/invite', {
        channelId: channel.id,
        nickName,
      });

      const updated = res.data.channel;
      channel.members = updated.members;
      if (nickName === getCurrentUser()) {
        channel.inviteHighlighted = true;
        channel.inviteReceivedAt = Date.now();
      }
      $q.notify({
        type: 'positive',
        message: res.data.message ?? `User ${nickName} was invited.`,
      });

    } catch (err: unknown) {
      if (err instanceof Error) {
        $q.notify({
          type: 'negative',
          message: err.message,
        });
        console.error(err);
      }
    }
  }

  async function revoke(nickName: string) {
    if (!state.currentChannel) return;
    const channel = getChannelByTitle(state.currentChannel);
    if (!channel) return;
    try {
      const res = await api.post('/channels/revoke', {
        channelId: channel.id,
        nickName,
      });
      const updated = res.data.channel;
      channel.members = updated.members;
      channel.banned = updated.banned;
      const timestamp = Date.now();
      appendMessage(channel.title, {
        id: timestamp,
        chatId: channel.title,
        senderId: getCurrentUser(),
        text: `${nickName} was revoked from ${channel.title}`,
        system: true,
        createdAt: timestamp,
      });
      touchChannel(channel);
      $q.notify({
        message: res.data.message,
        color: 'warning',
        icon: 'block',
      });

    } catch (err: unknown) {
      if (err instanceof Error) {
        $q.notify({
          type: 'negative',
          message: err.message,
        });
        console.error(err);
      }
    }
  }

  async function kick(nickName: string) {
    if (!state.currentChannel) return;

    try {
      const res = await api.post('/channels/kick', {
        channelId: getChannelByTitle(state.currentChannel)!.id,
        nickName,
      });
      $q.notify({
        icon: 'warning',
        color: 'negative',
        message: res.data.message,
      });
      await initialize();
    } catch (err: unknown) {
      if (err instanceof Error) {
        $q.notify({
          type: 'negative',
          message: err.message,
        });
        console.error(err);
      }
    }
  }
  async function quit() {
    const channel = getChannelByTitle(state.currentChannel!);
    if (!channel) return;
    try {
      await api.delete(`/channels/${channel.id}`);
      state.channels = state.channels.filter(c => c.title !== channel.title);
      delete state.messages[channel.title];
      delete state.pendingMessages[channel.title];
      state.currentChannel = null;
      $q.notify({
        type: 'negative',
        message: `Channel #${channel.title} deleted`,
        icon: 'delete'
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function cancel() {
    const channel = getChannelByTitle(state.currentChannel!);
    if (!channel) return;
    try {
      await api.post(`/channels/${channel.id}/leave`);
      if (channel.admin !== getCurrentUser()) {
        channel.members = channel.members.filter(m => m !== getCurrentUser());
        state.currentChannel = null;
        $q.notify({
          type: 'info',
          message: `You left #${channel.title}`,
          icon: 'logout'
        });
        return;
      }
      state.channels = state.channels.filter(c => c.title !== channel.title);
      delete state.messages[channel.title];
      state.currentChannel = null;
      $q.notify({
        type: 'negative',
        message: `Channel #${channel.title} closed`,
        icon: 'delete'
      });
    } catch (err) {
      console.error(err);
    }
  }


  async function processCommand(command: string) {
    const parts = command.slice(1).trim().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];
    const opt = parts[2];
    switch (cmd) {
      case 'join':
        if (arg) {
          const isPrivate = opt ? /private|\[private\]/.test(opt) : false;
          await joinChannel(arg, isPrivate);
        }
        break;
      case 'invite':
        if (arg) await invite(arg);
        break;
      case 'revoke':
        if (arg) await revoke(arg);
        break;
      case 'kick':
        if (arg) kick(arg);
        break;
      case 'quit':
        await quit();
        break;
      case 'cancel':
        await cancel();
        break;
      case 'list':
        listMembers();
        break;
    }
  }

  function listMembers() {
    if (!state.currentChannel) return;
    const channel = getChannelByTitle(state.currentChannel);
    if (!channel) return;
    const timestamp = Date.now();
    const membersList = channel.members.join(', ');
    appendMessage(channel.title, {
      id: timestamp,
      chatId: channel.title,
      senderId: 'system',
      text: `Members (${channel.members.length}): ${membersList}`,
      system: true,
      createdAt: timestamp,
    });
  }

  function pushMessage(channelTitle: string, senderId: string, text: string) {
    const channel = getChannelByTitle(channelTitle);
    if (!channel) return;

    ensureMessageCollections(channelTitle);
    const timestamp = Date.now();
    const mentioned = text
      .match(/@(\w+)/g)
      ?.map((mention) => mention.slice(1))
      .filter((nickname) => channel.members.includes(nickname));

    const newMessage: Message = {
      id: timestamp + Math.floor(Math.random() * 1000),
      chatId: channelTitle,
      senderId,
      text,
      createdAt: timestamp,
      ...(mentioned && mentioned.length > 0 ? { mentioned } : {}),
    };

    const isIncoming = senderId !== getCurrentUser();
    const isOffline = state.status === 'offline';

    if (isIncoming && isOffline) {
      state.pendingMessages[channelTitle]?.push(newMessage);
      return;
    }

    appendMessage(channelTitle, newMessage);
    touchChannel(channel);

    if (isIncoming) {
      const isMention = Boolean(newMessage.mentioned?.includes(getCurrentUser()));
      maybeNotify(channel, newMessage, isMention);
    }
  }

  function shouldNotify(message: Message, isMention: boolean): boolean {
    if (message.system) return false;
    if (state.status === 'offline' || state.status === 'dnd') return false;
    if (typeof document !== 'undefined' && !document.hidden) return false;
    if (state.notifyOnlyMentions && !isMention) return false;
    return true;
  }

  function maybeNotify(channel: Chat, message: Message, isMention: boolean) {
    if (!shouldNotify(message, isMention)) return;
    const snippet =
      message.text.length > 80 ? `${message.text.slice(0, 77).trimEnd()}...` : message.text;
    $q.notify({
      message: `${message.senderId}: ${snippet}`,
      caption: `#${channel.title}`,
      color: isMention ? 'warning' : 'primary',
      position: 'top-right',
      timeout: 4000,
    });
  }

  function flushPendingMessages() {
    Object.entries(state.pendingMessages).forEach(([channelTitle, queue]) => {
      if (!queue.length) return;
      const channel = getChannelByTitle(channelTitle);
      if (!channel) return;
      queue.forEach((message) => {
        appendMessage(channelTitle, message);
      });
      queue.length = 0;
      touchChannel(channel);
    });
  }

  function setStatus(status: UserStatus) {
    if (state.status === status) return;
    state.status = status;
    if (status === 'online') {
      flushPendingMessages();
    }
  }

  function setNotifyOnlyMentions(value: boolean) {
    state.notifyOnlyMentions = value;
  }

  function markInviteSeen(title: string) {
    const channel = getChannelByTitle(title);
    if (!channel) return;
    channel.inviteHighlighted = false;
  }

  // function receiveInvite(title: string, type: ChannelType) {
  //   const me = getCurrentUser();
  //   let channel = getChannelByTitle(title);
  //   const timestamp = Date.now();
  //   if (!channel) {
  //     channel = {
  //       title,
  //       type,
  //       admin: me,
  //       members: [me],
  //       banned: [],
  //       kicks: {},
  //       createdAt: timestamp,
  //       lastActivityAt: timestamp,
  //       inviteHighlighted: true,
  //       inviteReceivedAt: timestamp,
  //     };
  //     state.channels.push(channel);
  //     ensureMessageCollections(title);
  //   } else {
  //     if (!channel.members.includes(me)) {
  //       channel.members.push(me);
  //     }
  //     channel.inviteHighlighted = true;
  //     channel.inviteReceivedAt = timestamp;
  //   }
  // }

  function setTypingDraft(nickName: string, draft: string) {
    state.typingDrafts[nickName] = draft;
  }

  function clearTypingDraft(nickName: string) {
    delete state.typingDrafts[nickName];
  }

  function sendMessage(channelTitle: string, text: string) {
    pushMessage(channelTitle, getCurrentUser(), text);
  }
  async function initialize() {
    try {
      const meResponse = await api.get('/user')
      state.profile = {
        firstName: meResponse.data.firstName,
        lastName: meResponse.data.lastName,
        nickName: meResponse.data.nickName,
        email: meResponse.data.email,
      }
      const channelsResponse = await api.get('/channels')
      state.channels = channelsResponse.data.channels

      console.log('Profile:', state.profile)
      console.log('Channels:', state.channels)

    } catch (e) {
      console.error('Initialization error:', e)
    }
  }

  function getAvailableCommands(): string[] {
    const commands = ['/join channelName [private]'];
    if (!state.currentChannel) return commands;

    const channel = getChannelByTitle(state.currentChannel);
    const me = getCurrentUser();
    if (!channel || !channel.members.includes(me)) return commands;

    commands.push('/cancel');
    const isAdmin = channel.admin === me;
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
  async function loadOlderMessages(channelTitle: string) {
    ensureMessageCollections(channelTitle);
    const all = state.messages[channelTitle];
    const visible = state.visibleMessages[channelTitle];
    const pos = state.visiblePosition[channelTitle] ?? all?.length ?? 0;

    if (!all || all.length === 0) return;
    if (!visible) {
      initializeVisibleMessages(channelTitle);
      return;
    }

    if (pos <= 0) return;

    const start = Math.max(0, pos - MESSAGES_BATCH_SIZE);
    const end = pos;
    const olderMessages = all.slice(start, end);

    await new Promise((resolve) => setTimeout(resolve, 200));

    state.visibleMessages[channelTitle] = [
      ...olderMessages,
      ...(state.visibleMessages[channelTitle] ?? []),
    ];

    state.visiblePosition[channelTitle] = start;
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
    loadOlderMessages,
    initializeVisibleMessages,
    setStatus,
    setNotifyOnlyMentions,
    markInviteSeen,
    //receiveInvite,
    listMembers,
    setTypingDraft,
    clearTypingDraft,
  };
});
