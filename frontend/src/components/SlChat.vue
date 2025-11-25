<template>
  <div class="sl-chat">
    <sl-chat-header :chat-title="chatTitle" />
    <q-scroll-area
      ref="scrollArea"
      class="q-pa-md"
      style="flex: 1;"
      :horizontal="false"
      @scroll="handleScroll"
    >
      <q-infinite-scroll
        ref="infiniteScroll"
        :scroll-target="scrollTarget"
        :offset="50"
        @load="onLoadMessages"
        reverse
      >
        <template v-slot:loading>
          <div class="row justify-center q-my-md">
            <q-spinner color="primary" name="dots" size="30px" />
          </div>
        </template>
        <sl-messages-list
          :messages="currentMessages"
          :current-user="currentUser"
          @author-click="openTypingPreview"
        />
      </q-infinite-scroll>
    </q-scroll-area>
    <div v-if="isOffline" class="sl-chat__offline-banner">
      You are offline. Messages will refresh once you come back online.
    </div>
    <q-dialog v-model="showTypingPreview" persistent transition-show="scale" transition-hide="scale">
      <q-card class="sl-chat__preview-dialog">
        <q-card-section class="sl-chat__preview-header">
          <div class="sl-chat__preview-title">{{ typingPreviewUser }}</div>
          <div class="sl-chat__preview-subtitle">Live draft preview</div>
        </q-card-section>
        <q-card-section class="sl-chat__preview-body">
          <div class="sl-chat__preview-content">
            {{ typingPreviewText }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="primary" label="Close" @click="showTypingPreview = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Typing Indicator -->
    <div v-if="typingUser" class="typing-indicator q-pa-sm">
      {{ typingUser }} is typing...
    </div>
    <div class="row items-center q-pa-sm input-container">
      <q-input
        ref="inputRef"
        filled
        v-model="message"
        placeholder="Type a message..."
        dense
        class="col message-input"
        input-class="text-white"
        @keyup.enter="sendMessage"
        @update:model-value="handleCommands"
        @input="onUserTyping"
      >
        <template v-slot:append>
          <q-menu
            ref="menu"
            v-model="showMenu"
            auto-close
            no-parent-event
            :target="inputElement"
            anchor="bottom left"
            self="top left"
            no-focus
            :style="commandMenuStyle"
            :content-style="commandMenuContentStyle"
            content-class="sl-command-menu__surface"
            dark
          >
            <q-list :style="commandMenuListStyle">
              <q-item
                v-for="(cmd, index) in availableCommands"
                :key="cmd"
                clickable
                @click="selectCommand(cmd)"
                @mouseenter="hoveredCommandIndex = index"
                @mouseleave="hoveredCommandIndex = null"
                :style="getCommandItemStyle(index === highlightedIndex, hoveredCommandIndex === index)"
              >
                <q-item-section>{{ cmd }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </template>
      </q-input>
      <q-btn
        class="q-ml-sm send-btn"
        label="Send"
        @click="sendMessage"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import SlMessagesList from './SlMessagesList.vue';
import SlChatHeader from './SlChatHeader.vue';
import { useChatStore } from 'src/stores/chat-commands-store';
import { QInput, QScrollArea } from 'quasar';
import type { Ref } from 'vue';

const chatCommandsStore = useChatStore();

onMounted(async () => {
  await chatCommandsStore.initialize();
  const current = chatCommandsStore.state.currentChannel
  if (current) {
    const visible = chatCommandsStore.state.visibleMessages[current];
    if (!visible || visible.length === 0) {
      await chatCommandsStore.initializeVisibleMessages(current);
    }
  }
});

const message = ref('');
const scrollArea = ref<QScrollArea | null>(null);
const showMenu = ref(false);
const inputRef: Ref<QInput | null> = ref(null);
const highlightedIndex = ref(-1);
const hoveredCommandIndex = ref<number | null>(null);
const currentUser = computed(() => chatCommandsStore.state.profile.nickName);
const isOffline = computed(() => chatCommandsStore.state.status === 'offline');
const showTypingPreview = ref(false);
const typingPreviewUser = ref<string | null>(null);
const typingPreviewText = computed(() => {
  if (!typingPreviewUser.value) {
    return 'No live draft available yet.';
  }
  return (
    chatCommandsStore.state.typingDrafts[typingPreviewUser.value] ??
    'No live draft available yet.'
  );
});
const typingUser = computed(() => {
  const current = chatCommandsStore.state.currentChannel;
  if (!current) return null;
  return chatCommandsStore.state.typingIndicators[current] ?? null;
});

const inputElement = computed(() => {
  return inputRef.value?.$el.querySelector('input') || inputRef.value?.$el;
});
const infiniteScroll = ref(null);
const scrollTarget = computed(() => scrollArea.value?.getScrollTarget());

async function onLoadMessages(index: number, done: (stop?: boolean) => void) {
  const channel = chatCommandsStore.state.currentChannel;
  if (!channel) {
    done(true);
    return;
  }

  if (chatCommandsStore.state.historyLoading[channel]) {
    done();
    return;
  }

  if (chatCommandsStore.state.historyComplete[channel]) {
    done(true);
    return;
  }

  const previousCount = currentMessages.value.length;
  const target = scrollArea.value?.getScrollTarget();
  const oldHeight = target?.scrollHeight ?? 0;

  try {
    await chatCommandsStore.loadOlderMessages(channel);
  } catch (error) {
    console.error('Failed to load older messages', error);
    done(true);
    return;
  }

  await nextTick();

  const newHeight = target?.scrollHeight ?? 0;
  if (target) {
    target.scrollTop = newHeight - oldHeight;
  }

  const newCount = currentMessages.value.length;
  if (newCount === previousCount || chatCommandsStore.state.historyComplete[channel]) {
    done(true);
    return;
  }

  done();
}

const currentMessages = computed(() => {
  const ch = chatCommandsStore.state.currentChannel
  return ch ? chatCommandsStore.state.visibleMessages[ch] || [] : []
})

const chatTitle = computed(() =>
  chatCommandsStore.state.currentChannel
    ? chatCommandsStore.getChannelByTitle(chatCommandsStore.state.currentChannel)?.title || 'No Channel Selected'
    : 'No Channel Selected'
);

const availableCommands = computed(() => {
  return chatCommandsStore.getAvailableCommands();
});

const commandMenuStyle = {
  borderRadius: '16px',
  overflow: 'hidden',
};

const commandMenuContentStyle = `
  background: linear-gradient(135deg, #08090d 0%, #131924 100%) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 26px 54px rgba(5, 8, 15, 0.75) !important;
  color: #e2e8f0 !important;
  padding: 8px 0 !important;
`;

const commandMenuListStyle = `
  min-width: 220px !important;
  background: transparent !important;
  padding: 6px 0 !important;
  color: #e2e8f0 !important;
`;

function getCommandItemStyle(isActive: boolean, isHovered: boolean): string {
  const base = `
    border-radius: 10px;
    padding: 8px 12px;
    margin: 0 8px 4px;
    color: #e2e8f0 !important;
    background: transparent !important;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  `;

  if (isActive || isHovered) {
    return `
      ${base}
      background: linear-gradient(120deg, rgba(129, 140, 248, 0.36), rgba(59, 130, 246, 0.28)) !important;
      color: #ffffff !important;
      box-shadow: 0 12px 28px rgba(21, 32, 67, 0.45);
    `;
  }

  return base;
}

function selectCommand(cmd: string) {
  message.value = cmd;
  showMenu.value = false;
  highlightedIndex.value = -1;
}

function handleCommands() {
  showMenu.value = message.value.startsWith('/');
}

async function handleScroll({ verticalPosition }: { verticalPosition: number }) {
  const channel = chatCommandsStore.state.currentChannel;
  if (!channel) return;
  if (verticalPosition > 20) return;
  if (chatCommandsStore.state.historyLoading[channel] || chatCommandsStore.state.historyComplete[channel]) {
    return;
  }

  const previousCount = currentMessages.value.length;
  const target = scrollArea.value?.getScrollTarget();
  const oldHeight = target?.scrollHeight ?? 0;

  try {
    await chatCommandsStore.loadOlderMessages(channel);
  } catch (error) {
    console.error('Failed to load older messages on scroll', error);
    return;
  }

  await nextTick();

  const newHeight = target?.scrollHeight ?? 0;
  if (target) {
    target.scrollTop = newHeight - oldHeight;
  }

  if (currentMessages.value.length === previousCount) {
    chatCommandsStore.state.historyComplete[channel] = true;
  }
}

async function sendMessage() {
  if (!message.value.trim()) return;

  if (message.value.startsWith('/')) {
    await chatCommandsStore.processCommand(message.value);
    showMenu.value = false;
  } else if (chatCommandsStore.state.currentChannel !== null) {
    await chatCommandsStore.sendMessage(chatCommandsStore.state.currentChannel, message.value.trim());
  }

  message.value = '';
  await nextTick();
  const scroll = scrollArea.value?.getScrollTarget();
  if (scroll) {
    scroll.scrollTop = scroll.scrollHeight;
  }
}

function onUserTyping() {
  const channelTitle = chatCommandsStore.state.currentChannel;
  if (!channelTitle) return;
  chatCommandsStore.sendTypingSignal(channelTitle);
  chatCommandsStore.sendDraftUpdate(channelTitle, message.value);
}

function openTypingPreview(nickname: string) {
  typingPreviewUser.value = nickname;
  showTypingPreview.value = true;
}

function handleKeydown(event: KeyboardEvent) {
  if (!showMenu.value) return;

  const commands = availableCommands.value;
  if (!commands.length) return;

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  event.preventDefault();

  if (event.key === 'ArrowDown') {
    highlightedIndex.value = (highlightedIndex.value + 1) % commands.length;
  } else {
    highlightedIndex.value = (highlightedIndex.value - 1 + commands.length) % commands.length;
  }

  const index = highlightedIndex.value;
  if (index >= 0 && index < commands.length) {
    message.value = commands[index]!;
  }
}

watch(showMenu, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown);
    highlightedIndex.value = 0;
  } else {
    document.removeEventListener('keydown', handleKeydown);
    highlightedIndex.value = -1;
    hoveredCommandIndex.value = null;
  }
});

watch(showTypingPreview, (visible) => {
  if (!visible) {
    typingPreviewUser.value = null;
  }
});

onBeforeUnmount(() => {
});

watch(() => chatCommandsStore.state.currentChannel, async (newChannel) => {
  if (newChannel) {
    const visible = chatCommandsStore.state.visibleMessages[newChannel];
    if (!visible || visible.length === 0) {
      await chatCommandsStore.initializeVisibleMessages(newChannel);
    }

    await nextTick()
    const scroll = scrollArea.value?.getScrollTarget()
    if (scroll) {
      scroll.scrollTop = scroll.scrollHeight
    }
  }
})

</script>

<style scoped>
.sl-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1a1c22 0%, #222529 100%);
  height: 100%;
  font-family: 'Poppins', sans-serif;
}

.scroll-area {
  max-height: 2000px;
  overflow-x: hidden !important;
  overflow-y: auto;
  background: transparent;
  border-radius: 10px;
}

.input-container {
  background: rgba(34, 37, 41, 0.9);
  backdrop-filter: blur(10px);
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.message-input {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: 0.3s ease;
}

.send-btn {
  background: linear-gradient(90deg, #4a00e0, #8e2de2);
  color: #ffffff;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.typing-indicator {
  color: #e2e8f0;
  font-size: 12px;
  font-family: 'Poppins', sans-serif;
  padding: 10px;
  background: rgba(34, 37, 41, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.sl-chat__offline-banner {
  padding: 10px 16px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.03em;
  color: rgba(250, 204, 21, 0.88);
  background: rgba(250, 204, 21, 0.12);
  border-top: 1px solid rgba(250, 204, 21, 0.18);
  border-bottom: 1px solid rgba(250, 204, 21, 0.12);
}

.sl-chat__preview-dialog {
  min-width: 360px;
  background: linear-gradient(135deg, #151922 0%, #10141c 100%);
  color: #e2e8f0;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.sl-chat__preview-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sl-chat__preview-title {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.sl-chat__preview-subtitle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(148, 163, 184, 0.7);
}

.sl-chat__preview-body {
  background: rgba(15, 18, 26, 0.85);
  border-radius: 12px;
  padding: 14px;
}

.sl-chat__preview-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(226, 232, 240, 0.88);
}

:deep(.sl-command-menu__surface) {
  background: linear-gradient(135deg, #08090d 0%, #131924 100%) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 26px 54px rgba(5, 8, 15, 0.75) !important;
  color: #e2e8f0 !important;
  padding: 8px 0 !important;
}

:deep(.sl-command-menu__surface .q-list) {
  background: transparent !important;
  color: #e2e8f0 !important;
  padding: 6px 0 !important;
}

:deep(.sl-command-menu__surface .q-item) {
  border-radius: 10px;
  transition: background 0.2s ease, color 0.2s ease;
}

:deep(.sl-command-menu__surface .q-item:hover) {
  background: rgba(148, 163, 184, 0.14) !important;
}

@media (max-width: 600px) {
  .sl-chat__preview-dialog {
    width: calc(100vw - 32px);
    min-width: 0;
  }
}
</style>
