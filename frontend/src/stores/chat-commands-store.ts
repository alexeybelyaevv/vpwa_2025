import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Chat, Message, ChannelType, UserProfile, UserStatus } from 'src/types';
import { chatTitleToSlug } from 'src/utils/chat';
import { useQuasar } from 'quasar';
import { api } from '../api';
import type { AxiosError } from 'axios';
import { connectSocket, disconnectSocket, getSocket } from 'src/socket';
import type { Socket } from 'socket.io-client';

export const useChatStore = defineStore('chat', () => {
  const MESSAGES_BATCH_SIZE = 20;
  const $q = useQuasar();
  const createInitialState = () => ({
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
    typingIndicators: {} as Record<string, string | null>,
    peerStatuses: {} as Record<string, UserStatus | undefined>,
  });

  const state = reactive(createInitialState());
  let socket: Socket | null = null;
  const typingTimeouts: Record<string, number> = {};

  function getCurrentUser(): string {
    return state.profile.nickName;
  }

  function resetState() {
    disconnectSocket();
    socket = null;
    Object.assign(state, createInitialState());
  }

  function getChannelById(id: number): Chat | undefined {
    return state.channels.find((c) => c.id === id);
  }

  function upsertChannel(channel: Chat) {
    const existingIndex = state.channels.findIndex((c) => c.id === channel.id);
    if (existingIndex !== -1) {
      state.channels.splice(existingIndex, 1, channel);
    } else {
      state.channels.push(channel);
    }
  }

  function removeChannel(channelId: number) {
    state.channels = state.channels.filter((c) => c.id !== channelId);
  }

  function setTypingIndicator(channelTitle: string, nickName: string) {
    state.typingIndicators[channelTitle] = nickName;
    if (typingTimeouts[channelTitle]) {
      window.clearTimeout(typingTimeouts[channelTitle]);
    }
    typingTimeouts[channelTitle] = window.setTimeout(() => {
      state.typingIndicators[channelTitle] = null;
    }, 3500);
  }

  function bindSocketEvents(sock: Socket) {
    sock.on('session', ({ profile, channels }) => {
      state.profile = profile;
      state.channels = channels;
      if (!state.currentChannel && channels.length) {
        state.currentChannel = channels[0].title;
      }
    });

    sock.on('channel:updated', (channel: Chat) => {
      upsertChannel(channel);
    });

    sock.on('channel:removed', ({ id, title }: { id: number; title: string }) => {
      removeChannel(id);
      if (state.currentChannel === title) {
        state.currentChannel = null;
      }
    });

    sock.on('channel:invited', (channel: Chat & { inviteHighlighted?: boolean }) => {
      upsertChannel(channel);
    });

    sock.on('message:new', (message: Message) => {
      handleIncomingMessage(message);
    });

    sock.on('status:changed', ({ nickName, status }: { nickName: string; status: UserStatus }) => {
      state.peerStatuses[nickName] = status;
    });

    sock.on('typing', ({ channelId, nickName }: { channelId: number; nickName: string }) => {
      const channel = getChannelById(channelId);
      if (!channel) return;
      setTypingIndicator(channel.title, nickName);
    });

    sock.on(
      'draft:update',
      ({ channelId, nickName, text }: { channelId: number; nickName: string; text: string }) => {
        const channel = getChannelById(channelId);
        if (!channel) return;
        setTypingDraft(nickName, text);
      },
    );
  }

  async function ensureSocket() {
    if (socket) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    socket = connectSocket(token);
    bindSocketEvents(socket);
    await new Promise<void>((resolve) => {
      if (!socket) {
        resolve();
        return;
      }
      if (socket.connected) {
        resolve();
        return;
      }
      socket.once('connect', () => resolve());
    });
  }

  async function emitWithAck<T = unknown>(event: string, payload: Record<string, unknown>) {
    await ensureSocket();
    const sock = socket ?? getSocket();
    if (!sock) {
      throw new Error('Socket not connected');
    }
    return new Promise<T>((resolve, reject) => {
      sock.timeout(8000).emit(event, payload, (resp: { ok: boolean; error?: string; data?: T }) => {
        if (!resp) {
          resolve(undefined as T);
          return;
        }
        if (!resp.ok) {
          reject(new Error(resp.error || 'Request failed'));
          return;
        }
        resolve(resp.data as T);
      });
    });
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

  function handleIncomingMessage(message: Message) {
    ensureMessageCollections(message.chatId);
    const channel = getChannelByTitle(message.chatId);
    const isIncoming = message.senderId !== getCurrentUser();
    if (isIncoming && state.status === 'offline') {
      state.pendingMessages[message.chatId]!.push(message);
      return;
    }
    appendMessage(message.chatId, message);
    touchChannel(channel);
    if (isIncoming && channel) {
      const isMention = Boolean(message.mentioned?.includes(getCurrentUser()));
      maybeNotify(channel, message, isMention);
    }
  }
  function initializeVisibleMessages(channelTitle: string) {
    ensureMessageCollections(channelTitle);
    const all = state.messages[channelTitle] ?? [];
    if (!all.length) {
      const channel = state.channels.find((c) => c.title === channelTitle);
      const channelId = channel?.id;
      if (!channelId || !socket) {
        state.visibleMessages[channelTitle] = [];
        state.visiblePosition[channelTitle] = 0;
        return;
      }
      void emitWithAck<Message[]>('messages:history', { channelId, limit: MESSAGES_BATCH_SIZE })
        .then((messages) => {
          if (!messages) return;
          state.messages[channelTitle] = messages;
          initializeVisibleMessages(channelTitle);
        })
        .catch((error) => {
          console.error('Failed to load initial messages', error);
        });
      return;
    }
    const total = all.length;
    const start = Math.max(0, total - MESSAGES_BATCH_SIZE);
    const initialVisible = all.slice(start);

    state.visibleMessages[channelTitle] = [...initialVisible];
    state.visiblePosition[channelTitle] = start;
  }
  async function createChannel(title: string, type: ChannelType) {
    try {
      await ensureSocket();
      const channel = await emitWithAck<Chat>('channel:join', {
        name: title,
        isPrivate: type === 'private',
      });
      if (!channel) return;
      state.channels.push(channel);
      ensureMessageCollections(title);
      state.currentChannel = channel.title;
    } catch (err) {
      console.error('Failed to create channel:', err);
      if (err instanceof Error) {
        $q.notify({ type: 'negative', message: err.message });
      }
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
      await ensureSocket();
      const channel = await emitWithAck<Chat>('channel:join', { name: title, isPrivate });
      if (!channel) return;
      upsertChannel(channel);
      state.currentChannel = channel.title;
      $q.notify({ type: 'positive', message: `Joined #${channel.title}`, icon: 'chat' });
    } catch (error) {
      const err = error as AxiosError<{ error: string }>;
      const message =
        err.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to join channel');
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
      await ensureSocket();
      const updated = await emitWithAck<Chat>('channel:invite', {
        channelId: channel.id,
        nickName,
      });
      channel.members = updated.members;
      $q.notify({
        type: 'positive',
        message: `User ${nickName} was invited.`,
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
      await ensureSocket();
      const updated = await emitWithAck<Chat>('channel:revoke', {
        channelId: channel.id,
        nickName,
      });
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
        message: `User ${nickName} was revoked`,
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
      await ensureSocket();
      await emitWithAck('channel:kick', {
        channelId: getChannelByTitle(state.currentChannel)!.id,
        nickName,
      });
      $q.notify({
        icon: 'warning',
        color: 'negative',
        message: `${nickName} was kicked`,
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
      await ensureSocket();
      await emitWithAck('channel:leave', { channelId: channel.id });
      state.channels = state.channels.filter((c) => c.title !== channel.title);
      delete state.messages[channel.title];
      delete state.pendingMessages[channel.title];
      state.currentChannel = null;
      $q.notify({
        type: 'negative',
        message: `Channel #${channel.title} deleted`,
        icon: 'delete',
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function cancel() {
    const channel = getChannelByTitle(state.currentChannel!);
    if (!channel) return;
    try {
      await ensureSocket();
      await emitWithAck('channel:leave', { channelId: channel.id });
      if (channel.admin !== getCurrentUser()) {
        channel.members = channel.members.filter((m) => m !== getCurrentUser());
        state.currentChannel = null;
        $q.notify({
          type: 'info',
          message: `You left #${channel.title}`,
          icon: 'logout',
        });
        return;
      }
      state.channels = state.channels.filter((c) => c.title !== channel.title);
      delete state.messages[channel.title];
      state.currentChannel = null;
      $q.notify({
        type: 'negative',
        message: `Channel #${channel.title} closed`,
        icon: 'delete',
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
        if (arg) await kick(arg);
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
    const sock = socket ?? getSocket();
    sock?.emit('status:update', { status, notifyOnlyMentions: state.notifyOnlyMentions });
    if (status === 'online') {
      flushPendingMessages();
    }
  }

  function setNotifyOnlyMentions(value: boolean) {
    state.notifyOnlyMentions = value;
    const sock = socket ?? getSocket();
    sock?.emit('status:update', { status: state.status, notifyOnlyMentions: value });
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

  function sendTypingSignal(channelTitle: string) {
    const channel = getChannelByTitle(channelTitle);
    const sock = socket ?? getSocket();
    if (!channel || !sock) return;
    sock.emit('typing', { channelId: channel.id });
  }

  function sendDraftUpdate(channelTitle: string, text: string) {
    const channel = getChannelByTitle(channelTitle);
    const sock = socket ?? getSocket();
    if (!channel || !sock) return;
    sock.emit('draft:update', { channelId: channel.id, text });
  }

  async function sendMessage(channelTitle: string, text: string) {
    await ensureSocket();
    const channel = getChannelByTitle(channelTitle);
    if (!channel) return;
    try {
      await emitWithAck('message:send', { channelId: channel.id, text });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        $q.notify({ type: 'negative', message: error.message });
      }
    }
  }
  async function initialize() {
    try {
      await ensureSocket();
      const token = localStorage.getItem('token');
      if (!token) return;

      if (!state.profile.nickName) {
        const meResponse = await api.get('/user');
        state.profile = {
          firstName: meResponse.data.firstName,
          lastName: meResponse.data.lastName,
          nickName: meResponse.data.nickName,
          email: meResponse.data.email,
        };
      }

      if (!state.channels.length) {
        try {
          const channels = await emitWithAck<Chat[]>('channel:list', {});
          if (channels) {
            state.channels = channels;
          }
        } catch {
          const channelsResponse = await api.get('/channels');
          state.channels = channelsResponse.data.channels;
        }
      }
      if (!state.currentChannel && state.channels.length) {
        state.currentChannel = state.channels[0]?.title ?? null;
      }
    } catch (e) {
      console.error('Initialization error:', e);
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
    const all = state.messages[channelTitle] ?? [];
    const visible = state.visibleMessages[channelTitle];
    const pos = state.visiblePosition[channelTitle] ?? all.length;

    if (!all || all.length === 0) {
      initializeVisibleMessages(channelTitle);
      return;
    }
    if (!visible) {
      initializeVisibleMessages(channelTitle);
      return;
    }

    if (pos <= 0) {
      const channel = state.channels.find((c) => c.title === channelTitle);
      const channelId = channel?.id;
      const oldest = visible[0];
      if (!channelId || !oldest) return;
      const older = await emitWithAck<Message[]>('messages:history', {
        channelId,
        beforeId: oldest.id,
        limit: MESSAGES_BATCH_SIZE,
      }).catch(() => null);
      if (older && older.length) {
        state.messages[channelTitle] = [...older, ...(state.messages[channelTitle] ?? [])];
        state.visibleMessages[channelTitle] = [
          ...older,
          ...(state.visibleMessages[channelTitle] ?? []),
        ];
        state.visiblePosition[channelTitle] = 0;
      }
      return;
    }

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
    sendTypingSignal,
    sendDraftUpdate,
    resetState,
  };
});
