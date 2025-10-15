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
          >
            <q-list style="min-width: 200px">
              <q-item v-for="cmd in availableCommands" :key="cmd" clickable @click="selectCommand(cmd)">
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
import { ref, computed, nextTick, onMounted } from 'vue'
import SlMessagesList from './SlMessagesList.vue'
import SlChatHeader from './SlChatHeader.vue'
import { useChatStore } from 'src/stores/chat-commands-store'
import { QInput } from 'quasar'

const chatCommandsStore = useChatStore()

onMounted(() => {
  chatCommandsStore.initialize()
})

const message = ref('')
const scrollArea = ref()
const showMenu = ref(false)
const inputRef = ref<QInput | null>(null)

const inputElement = computed(() => {
  return inputRef.value?.$el.querySelector('input') || inputRef.value?.$el
})

const currentMessages = computed(() => {
  return chatCommandsStore.state.currentChannel !== null
    ? chatCommandsStore.state.messages[chatCommandsStore.state.currentChannel] || []
    : []
})

const chatTitle = computed(() => {
  if (chatCommandsStore.state.currentChannel === null) {
    return 'No Channel Selected'
  }
  const channel = chatCommandsStore.getChannelByTitle(chatCommandsStore.state.currentChannel)
  return channel ? channel.title : 'No Channel Selected'
})

const availableCommands = computed(() => {
  return ['/join channelName private', '/quit', '/cancel']
})

function selectCommand(cmd: string) {
  message.value = cmd
  showMenu.value = false
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
</style>