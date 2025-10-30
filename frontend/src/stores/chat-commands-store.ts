import { defineStore } from 'pinia';
import { reactive } from 'vue';
import type { Chat, Message, ChannelType, UserProfile, UserStatus } from 'src/types';
import { chatTitleToSlug } from 'src/utils/chat';
import { useQuasar } from 'quasar';

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
      firstName: 'Alex',
      lastName: 'Carter',
      nickName: 'alex.carter',
      email: 'alex.carter@example.com',
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
  function createChannel(title: string, type: ChannelType) {
    if (getChannelByTitle(title)) {
      return;
    }
    const owner = getCurrentUser();
    const timestamp = Date.now();
    const chat: Chat = {
      title,
      type,
      admin: owner,
      members: [owner],
      banned: [],
      kicks: {},
      createdAt: timestamp,
      lastActivityAt: timestamp,
    };
    state.channels.push(chat);
    ensureMessageCollections(title);
    state.currentChannel = title;
  }

  function ensureMember(channel: Chat, nickname: string, highlight = false) {
    if (!channel.members.includes(nickname)) {
      channel.members.push(nickname);
      touchChannel(channel);
    }
    if (highlight) {
      channel.inviteHighlighted = true;
      channel.inviteReceivedAt = Date.now();
    }
  }

  function joinChannel(title: string, isPrivate = false) {
    const me = getCurrentUser();
    const channel = getChannelByTitle(title);
    if (!channel) {
      createChannel(title, isPrivate ? 'private' : 'public');
      return;
    } else if (
      channel.type === 'public' &&
      !channel.banned.includes(me) &&
      !channel.members.includes(me)
    ) {
      channel.members.push(me);
      channel.inviteHighlighted = false;
      touchChannel(channel);
    }
    state.currentChannel = title;
  }
  function invite(nickName: string) {
    if (!state.currentChannel) return;
    const channelTitle = state.currentChannel;
    const channel = getChannelByTitle(channelTitle);
    if (!channel || channel.members.includes(nickName)) return;

    const me = getCurrentUser();
    const isAdmin = channel.admin === me;
    if (channel.type === 'private' && !isAdmin) return;

    if (channel.banned.includes(nickName) && isAdmin) {
      channel.banned = channel.banned.filter((b) => b !== nickName);
    }
    channel.members.push(nickName);
    ensureMessageCollections(channelTitle);
    const timestamp = Date.now();
    appendMessage(channelTitle, {
      id: timestamp,
      chatId: channelTitle,
      senderId: me,
      text: `${nickName} was invited to ${channelTitle}`,
      system: true,
      createdAt: timestamp,
    });
    touchChannel(channel);
    if (nickName === me) {
      channel.inviteHighlighted = true;
      channel.inviteReceivedAt = timestamp;
    }
  }
  function revoke(nickName: string) {
    if (!state.currentChannel) return;
    const channelTitle = state.currentChannel;
    const channel = getChannelByTitle(channelTitle);
    if (!channel || channel.admin !== getCurrentUser() || channel.type !== 'private') return;
    channel.members = channel.members.filter((m) => m !== nickName);
    if (!channel.banned.includes(nickName)) {
      channel.banned.push(nickName);
    }
    ensureMessageCollections(channelTitle);
    const timestamp = Date.now();
    appendMessage(channelTitle, {
      id: timestamp,
      chatId: channelTitle,
      senderId: getCurrentUser(),
      text: `${nickName} was revoked from ${channelTitle}`,
      system: true,
      createdAt: timestamp,
    });
    touchChannel(channel);
  }
  function kick(nickName: string) {
    if (!state.currentChannel) return;
    const channelTitle = state.currentChannel;
    const channel = getChannelByTitle(channelTitle);
    const me = getCurrentUser();
    if (!channel || nickName === me || !channel.members.includes(nickName)) return;

    const isAdmin = channel.admin === me;
    ensureMessageCollections(channelTitle);
    const timestamp = Date.now();

    if (channel.type === 'private' && isAdmin) {
      channel.members = channel.members.filter((m) => m !== nickName);
      if (!channel.banned.includes(nickName)) {
        channel.banned.push(nickName);
      }
      appendMessage(channelTitle, {
        id: timestamp,
        chatId: channelTitle,
        senderId: me,
        text: `${nickName} was banned from ${channelTitle}`,
        system: true,
        createdAt: timestamp,
      });
      touchChannel(channel);
      return;
    }

    if (channel.type === 'public') {
      if (!channel.kicks[nickName]) {
        channel.kicks[nickName] = new Set<string>();
      }
      if (channel.kicks[nickName].has(me)) {
        appendMessage(channelTitle, {
          id: timestamp,
          chatId: channelTitle,
          senderId: me,
          text: `${me}, you have already voted to kick ${nickName}`,
          system: true,
          createdAt: timestamp,
        });
        return;
      }
      channel.kicks[nickName].add(me);
      appendMessage(channelTitle, {
        id: timestamp + 1,
        chatId: channelTitle,
        senderId: me,
        text: `${me} voted to kick ${nickName} (${channel.kicks[nickName].size}/3)`,
        system: true,
        createdAt: timestamp + 1,
      });
      if (isAdmin || channel.kicks[nickName].size >= 3) {
        channel.members = channel.members.filter((m) => m !== nickName);
        if (!channel.banned.includes(nickName)) {
          channel.banned.push(nickName);
        }
        appendMessage(channelTitle, {
          id: timestamp + 2,
          chatId: channelTitle,
          senderId: me,
          text: `${nickName} was banned from ${channelTitle}`,
          system: true,
          createdAt: timestamp + 2,
        });
      }
      touchChannel(channel);
    }
  }
  function quit() {
    if (!state.currentChannel) return;
    const channel = getChannelByTitle(state.currentChannel);
    if (!channel || channel.admin !== getCurrentUser()) return;
    state.channels = state.channels.filter((c) => c.title !== state.currentChannel);
    delete state.messages[state.currentChannel];
    delete state.pendingMessages[state.currentChannel];
    state.currentChannel = null;
  }

  function cancel() {
    if (!state.currentChannel) return;
    const channel = getChannelByTitle(state.currentChannel);
    if (!channel) return;
    const me = getCurrentUser();
    channel.members = channel.members.filter((m) => m !== me);
    if (channel.admin === me) {
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
      mentioned: text.includes('@alex.carter') ? ['alex.carter'] : [],
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

  function receiveInvite(title: string, type: ChannelType) {
    const me = getCurrentUser();
    let channel = getChannelByTitle(title);
    const timestamp = Date.now();
    if (!channel) {
      channel = {
        title,
        type,
        admin: me,
        members: [me],
        banned: [],
        kicks: {},
        createdAt: timestamp,
        lastActivityAt: timestamp,
        inviteHighlighted: true,
        inviteReceivedAt: timestamp,
      };
      state.channels.push(channel);
      ensureMessageCollections(title);
    } else {
      if (!channel.members.includes(me)) {
        channel.members.push(me);
      }
      channel.inviteHighlighted = true;
      channel.inviteReceivedAt = timestamp;
    }
  }

  function setTypingDraft(nickName: string, draft: string) {
    state.typingDrafts[nickName] = draft;
  }

  function clearTypingDraft(nickName: string) {
    delete state.typingDrafts[nickName];
  }

  function sendMessage(channelTitle: string, text: string) {
    pushMessage(channelTitle, getCurrentUser(), text);
  }
  function initialize() {
    if (state.channels.length > 0) return;

    createChannel('general', 'public');
    const generalChannel = getChannelByTitle('general');

    if (generalChannel) {
      ensureMember(generalChannel, 'Mira');
      ensureMember(generalChannel, 'Noah');

      for (let i = 1; i <= 50; i++) {
        const sender = i % 2 === 0 ? 'Mira' : 'Noah';
        pushMessage('general', sender, `(${i}) This is message number ${i} from ${sender}.`);
      }
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

    createChannel('design-team', 'public');
    const designChannel = getChannelByTitle('design-team');
    if (designChannel) {
      ensureMember(designChannel, 'lea');
      ensureMember(designChannel, getCurrentUser(), true);
      pushMessage('design-team', 'lea', '@alex.carter welcome to the design guild!');
    }

    if (state.channels.length > 0) {
      const defaultChannel = getChannelByTitle('general') ?? state.channels[0];
      state.currentChannel = defaultChannel ? defaultChannel.title : null;
      if (state.currentChannel) {
        initializeVisibleMessages(state.currentChannel);
      }
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
    receiveInvite,
    listMembers,
    setTypingDraft,
    clearTypingDraft,
  };
});
