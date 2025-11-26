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
    pendingMessages: {} as Record<string, Message[]>,
    oldestMessageId: {} as Record<string, number | null>,
    historyComplete: {} as Record<string, boolean>,
    historyLoading: {} as Record<string, boolean>,
    historyInitialized: {} as Record<string, boolean>,
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
    pendingTypingIndicators: {} as Record<number, string | null>,
    peerStatuses: {} as Record<string, UserStatus | undefined>,
  });

  const state = reactive(createInitialState());
  let socket: Socket | null = null;
  const typingTimeouts: Record<string, number> = {};

  function getCurrentUser(): string {
    return state.profile.nickName;
  }

  function isAppVisible(): boolean {
    if (typeof $q.appVisible === 'boolean') {
      return $q.appVisible;
    }
    if (typeof document !== 'undefined' && 'hidden' in document) {
      return !document.hidden;
    }
    return true;
  }

  function supportsNativeNotifications(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  async function ensureNotificationPermission(): Promise<boolean> {
    if (!supportsNativeNotifications()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  function isChannelMember(channel: Chat | undefined): boolean {
    const current = getCurrentUser();
    return Boolean(channel && current && channel.members.includes(current));
  }

  function pickDefaultChannelTitle(includePublicFallback = false): string | null {
    const joined = state.channels.find((channel) => isChannelMember(channel));
    if (joined) return joined.title;
    if (includePublicFallback) {
      const firstPublic = state.channels.find((channel) => channel.type === 'public');
      if (firstPublic) return firstPublic.title;
    }
    return null;
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
    syncPendingTypingForChannel(channel);
  }

  function removeChannel(channelId: number) {
    const existing = getChannelById(channelId);
    if (existing) {
      delete state.typingIndicators[existing.title];
    }
    state.channels = state.channels.filter((c) => c.id !== channelId);
    delete state.pendingTypingIndicators[channelId];
  }

  function applyTypingIndicator(channelKey: string, nickName: string, channelId?: number) {
    state.typingIndicators[channelKey] = nickName;
    if (typingTimeouts[channelKey]) {
      window.clearTimeout(typingTimeouts[channelKey]);
    }
    typingTimeouts[channelKey] = window.setTimeout(() => {
      state.typingIndicators[channelKey] = null;
      if (channelId !== undefined && state.pendingTypingIndicators[channelId] === nickName) {
        state.pendingTypingIndicators[channelId] = null;
      }
    }, 3500);
  }

  function syncPendingTypingForChannel(channel: Chat) {
    const pending = state.pendingTypingIndicators[channel.id];
    if (!pending) return;
    applyTypingIndicator(channel.title, pending, channel.id);
  }

  function syncAllPendingTyping() {
    state.channels.forEach((channel) => syncPendingTypingForChannel(channel));
  }

  function setTypingIndicator(channelTitle: string, nickName: string, channelId?: number) {
    if (channelId !== undefined) {
      state.pendingTypingIndicators[channelId] = nickName;
    }
    applyTypingIndicator(channelTitle, nickName, channelId);
  }

  function bindSocketEvents(sock: Socket) {
    sock.on('session', ({ profile, channels }) => {
      state.profile = profile;
      state.channels = channels;
      syncAllPendingTyping();
      if (!state.currentChannel && channels.length) {
        state.currentChannel = pickDefaultChannelTitle();
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
      setTypingIndicator(channel?.title ?? String(channelId), nickName, channelId);
    });

    sock.on(
      'draft:update',
      ({ channelId, nickName, text }: { channelId: number; nickName: string; text: string }) => {
        const channel = getChannelById(channelId);
        setTypingDraft(nickName, text);
        if (!channel) return;
        touchChannel(channel);
      },
    );
  }

  async function ensureSocket() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No auth token');
    }

    if (!socket) {
      socket = connectSocket(token);
      bindSocketEvents(socket);
    }

    if (socket.connected) return;

    await new Promise<void>((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not available'));
        return;
      }

      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err: unknown) => {
        cleanup();
        reject(err instanceof Error ? err : new Error('Socket connect error'));
      };
      const cleanup = () => {
        window.clearTimeout(timeout);
        socket?.off('connect', onConnect);
        socket?.off('connect_error', onError);
      };

      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('Socket connect timeout'));
      }, 5000);

      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      socket.connect();
    });
  }

  async function emitWithAck<T = unknown>(event: string, payload: Record<string, unknown>) {
    await ensureSocket();
    const sock = socket ?? getSocket();
    if (!sock) {
      throw new Error('Socket not connected');
    }
    if (!sock.connected) {
      throw new Error('Socket not connected');
    }
    return new Promise<T>((resolve, reject) => {
      sock
        .timeout(8000)
        .emit(event, payload, (err: unknown, resp?: { ok: boolean; error?: string; data?: T }) => {
          // Some socket.io transports pass only resp (without err), so normalize here
          const respObj =
            resp ||
            (err && typeof err === 'object' && err !== null && 'ok' in (err as Error)
              ? (err as { ok: boolean; error?: string; data?: T })
              : undefined);
          const errObj =
            respObj && respObj.ok !== undefined ? undefined : err instanceof Error ? err : null;

          if (errObj) {
            reject(errObj);
            return;
          }
          if (!respObj) {
            reject(new Error('No response'));
            return;
          }
          if (!respObj.ok) {
            reject(new Error(respObj.error || 'Request failed'));
            return;
          }
          resolve(respObj.data as T);
        });
    });
  }

  function ensureMessageCollections(channelTitle: string) {
    state.messages[channelTitle] = state.messages[channelTitle] || [];
    state.visibleMessages[channelTitle] = state.visibleMessages[channelTitle] || [];
    state.pendingMessages[channelTitle] = state.pendingMessages[channelTitle] || [];
    if (state.oldestMessageId[channelTitle] === undefined)
      state.oldestMessageId[channelTitle] = null;
    if (state.historyComplete[channelTitle] === undefined)
      state.historyComplete[channelTitle] = false;
    if (state.historyLoading[channelTitle] === undefined)
      state.historyLoading[channelTitle] = false;
    if (state.historyInitialized[channelTitle] === undefined)
      state.historyInitialized[channelTitle] = false;
  }

  function dedupeMessages(messages: Message[]) {
    const seen = new Set<number>();
    return messages.filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }

  function touchChannel(channel: Chat | undefined) {
    if (!channel) return;
    channel.lastActivityAt = Date.now();
  }

  function appendMessage(channelTitle: string, message: Message) {
    ensureMessageCollections(channelTitle);
    const alreadyExists = state.messages[channelTitle]!.some((m) => m.id === message.id);
    if (alreadyExists) return;
    state.messages[channelTitle]!.push(message);
    if (state.currentChannel === channelTitle) {
      state.visibleMessages[channelTitle] = [...state.messages[channelTitle]!];
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
      void maybeNotify(channel, message, isMention);
    }
  }
  async function initializeVisibleMessages(channelTitle: string) {
    ensureMessageCollections(channelTitle);
    if (state.historyLoading[channelTitle]) return;

    if (state.historyInitialized[channelTitle]) {
      state.visibleMessages[channelTitle] = [...(state.messages[channelTitle] ?? [])];
      return;
    }

    await ensureSocket();
    let channel = getChannelByTitle(channelTitle);
    if (!channel) {
      state.visibleMessages[channelTitle] = [];
      state.historyComplete[channelTitle] = true;
      state.oldestMessageId[channelTitle] = null;
      return;
    }

    if (channel.type === 'public' && !isChannelMember(channel)) {
      await joinChannel(channel.title, false);
      channel = getChannelByTitle(channelTitle);
      if (!channel || !isChannelMember(channel)) {
        state.visibleMessages[channelTitle] = [];
        state.historyComplete[channelTitle] = true;
        state.historyInitialized[channelTitle] = true;
        state.oldestMessageId[channelTitle] = null;
        return;
      }
    }

    const channelId = channel.id;

    state.historyLoading[channelTitle] = true;
    try {
      const messages =
        (await emitWithAck<Message[]>('messages:history', {
          channelId,
          limit: MESSAGES_BATCH_SIZE,
        })) ?? [];
      state.messages[channelTitle] = messages;
      state.visibleMessages[channelTitle] = [...messages];
      state.oldestMessageId[channelTitle] = messages[0]?.id ?? null;
      state.historyComplete[channelTitle] = messages.length < MESSAGES_BATCH_SIZE;
      state.historyInitialized[channelTitle] = true;
    } catch (error) {
      console.error('Failed to load initial messages', error);
      state.visibleMessages[channelTitle] = [];
      state.historyComplete[channelTitle] = false;
      state.oldestMessageId[channelTitle] = null;
      state.historyInitialized[channelTitle] = false;
    } finally {
      state.historyLoading[channelTitle] = false;
    }
  }
  async function createChannel(title: string, type: ChannelType) {
    try {
      await ensureSocket();
      const channel = await emitWithAck<Chat>('channel:join', {
        name: title,
        isPrivate: type === 'private',
      });
      if (!channel) return;
      upsertChannel(channel);
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
    if (isAppVisible()) return false;
    if (state.notifyOnlyMentions && !isMention) return false;

    return true;
  }

  async function maybeNotify(channel: Chat, message: Message, isMention: boolean) {
    if (!shouldNotify(message, isMention)) return;
    const snippet =
      message.text.length > 80 ? `${message.text.slice(0, 77).trimEnd()}...` : message.text;

    const hasPermission = await ensureNotificationPermission();
    if (hasPermission) {
      try {
        new Notification(`#${channel.title}`, {
          body: `${message.senderId}: ${snippet}`,
        });
        return;
      } catch (err) {
        console.error('Native notification failed', err);
      }
    }

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

  async function sendTypingSignal(channelTitle: string) {
    const channel = getChannelByTitle(channelTitle);
    if (!channel) return;
    try {
      await ensureSocket();
      const sock = socket ?? getSocket();
      sock?.emit('typing', { channelId: channel.id });
    } catch (err) {
      console.error('Failed to send typing signal', err);
    }
  }

  async function sendDraftUpdate(channelTitle: string, text: string) {
    const channel = getChannelByTitle(channelTitle);
    if (!channel) return;
    try {
      await ensureSocket();
      const sock = socket ?? getSocket();
      sock?.emit('draft:update', { channelId: channel.id, text });
    } catch (err) {
      console.error('Failed to send draft update', err);
    }
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
            syncAllPendingTyping();
          }
        } catch {
          const channelsResponse = await api.get('/channels');
          state.channels = channelsResponse.data.channels;
          syncAllPendingTyping();
        }
      }
      if (!state.currentChannel && state.channels.length) {
        state.currentChannel = pickDefaultChannelTitle();
      }

      const current = state.currentChannel;
      if (current) {
        await initializeVisibleMessages(current);
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
      if (channel && isChannelMember(channel)) {
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

    state.currentChannel = pickDefaultChannelTitle();
    return state.currentChannel ? chatTitleToSlug(state.currentChannel) : null;
  }
  async function loadOlderMessages(channelTitle: string) {
    ensureMessageCollections(channelTitle);
    if (state.historyComplete[channelTitle] || state.historyLoading[channelTitle]) return;
    await ensureSocket();

    const channel = state.channels.find((c) => c.title === channelTitle);
    const channelId = channel?.id;
    if (!channelId) return;

    const beforeId = state.oldestMessageId[channelTitle] ?? undefined;
    state.historyLoading[channelTitle] = true;
    try {
      const older =
        (await emitWithAck<Message[]>('messages:history', {
          channelId,
          beforeId,
          limit: MESSAGES_BATCH_SIZE,
        })) ?? [];
      if (!older.length) {
        state.historyComplete[channelTitle] = true;
        state.historyInitialized[channelTitle] = true;
        return;
      }
      const existing = state.messages[channelTitle] ?? [];
      const merged = dedupeMessages([...older, ...existing]);
      state.messages[channelTitle] = merged;
      state.visibleMessages[channelTitle] = [...merged];
      state.oldestMessageId[channelTitle] = state.messages[channelTitle][0]?.id ?? beforeId ?? null;
      state.historyInitialized[channelTitle] = true;
      if (older.length < MESSAGES_BATCH_SIZE) {
        state.historyComplete[channelTitle] = true;
      }
    } catch (error) {
      console.error('Failed to load older messages', error);
    } finally {
      state.historyLoading[channelTitle] = false;
    }
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
