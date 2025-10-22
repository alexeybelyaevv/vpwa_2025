<template>
  <div class="sl-chat">
    <sl-chat-header :chat-title="chatTitle" />
    <q-scroll-area
      ref="scrollArea"
      class="q-pa-md"
      style="flex: 1;"
      :horizontal="false"
    >
      <sl-messages-list :messages="currentMessages" :current-user="chatCommandsStore.state.currentUser" />
    </q-scroll-area>

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
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import SlMessagesList from './SlMessagesList.vue'
import SlChatHeader from './SlChatHeader.vue'
import { useChatStore } from 'src/stores/chat-commands-store'
import { QInput, QScrollArea } from 'quasar'
import type { Ref } from 'vue'
const chatCommandsStore = useChatStore()

onMounted(() => {
  chatCommandsStore.initialize()
})

const message = ref('')
const scrollArea = ref<QScrollArea | null>(null)
const showMenu = ref(false)
const inputRef: Ref<QInput | null> = ref(null)
const highlightedIndex = ref(-1)
const hoveredCommandIndex = ref<number | null>(null)

const inputElement = computed(() => {
  return inputRef.value?.$el.querySelector('input') || inputRef.value?.$el
})

const currentMessages = computed(() => {
  return chatCommandsStore.state.currentChannel !== null
    ? chatCommandsStore.state.messages[chatCommandsStore.state.currentChannel] || []
    : []
})

const chatTitle = computed(() =>
  chatCommandsStore.state.currentChannel
    ? chatCommandsStore.getChannelByTitle(chatCommandsStore.state.currentChannel)?.title || 'No Channel Selected'
    : 'No Channel Selected'
)

const availableCommands = computed(() => {
  return chatCommandsStore.getAvailableCommands()
})

const commandMenuStyle = {
  borderRadius: '16px',
  overflow: 'hidden',
}

const commandMenuContentStyle = `
  background: linear-gradient(135deg, #08090d 0%, #131924 100%) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 26px 54px rgba(5, 8, 15, 0.75) !important;
  color: #e2e8f0 !important;
  padding: 8px 0 !important;
`

const commandMenuListStyle = `
  min-width: 220px !important;
  background: transparent !important;
  padding: 6px 0 !important;
  color: #e2e8f0 !important;
`

function getCommandItemStyle(isActive: boolean, isHovered: boolean): string {
  const base = `
    border-radius: 10px;
    padding: 8px 12px;
    margin: 0 8px 4px;
    color: #e2e8f0 !important;
    background: transparent !important;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  `

  if (isActive || isHovered) {
    return `
      ${base}
      background: linear-gradient(120deg, rgba(129, 140, 248, 0.36), rgba(59, 130, 246, 0.28)) !important;
      color: #ffffff !important;
      box-shadow: 0 12px 28px rgba(21, 32, 67, 0.45);
    `
  }

  return base
}

function selectCommand(cmd: string) {
  message.value = cmd
  showMenu.value = false
  highlightedIndex.value = -1
}

function handleCommands() {
  showMenu.value = message.value.startsWith('/')
}

async function sendMessage() {
  if (!message.value.trim()) return

  if (message.value.startsWith('/')) {
    chatCommandsStore.processCommand(message.value)
    showMenu.value = false
  } else if (chatCommandsStore.state.currentChannel !== null) {
    chatCommandsStore.sendMessage(chatCommandsStore.state.currentChannel, message.value.trim())
  }

  message.value = ''
  await nextTick()
  const scroll = scrollArea.value?.getScrollTarget()
  if (scroll) {
    scroll.scrollTop = scroll.scrollHeight
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (!showMenu.value) return

  const commands = availableCommands.value
  if (!commands.length) return

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()

  if (event.key === 'ArrowDown') {
    highlightedIndex.value = (highlightedIndex.value + 1) % commands.length
  } else {
    highlightedIndex.value = (highlightedIndex.value - 1 + commands.length) % commands.length
  }

  const index = highlightedIndex.value
  if (index >= 0 && index < commands.length) {
    message.value = commands[index]!
  }
}

watch(showMenu, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown)
    highlightedIndex.value = 0
  } else {
    document.removeEventListener('keydown', handleKeydown)
    highlightedIndex.value = -1
    hoveredCommandIndex.value = null
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
</style>
