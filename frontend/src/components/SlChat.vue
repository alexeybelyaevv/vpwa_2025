<template>
  <div class="sl-chat">
  <sl-chat-header chat-title="Alice" />
    <q-scroll-area
      ref="scrollArea"
      class="q-pa-md"
      style="flex: 1;"
      :horizontal="false"
    >
      <sl-messages-list :messages="messages" :current-user-id="currentUserId" />
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
import type { Message } from 'src/types'
import { ref, nextTick, computed } from 'vue'
import SlMessagesList from './SlMessagesList.vue'
import SlChatHeader from './SlChatHeader.vue'
import { QInput } from 'quasar'
const currentUserId = 1
const messages = ref<Message[]>([
  { id: 1, chatId: 100, senderId: 2, text: 'Hey there!' },
  { id: 2, chatId: 100, senderId: 1, text: 'Hi Alice 👋' }
])
const inputRef = ref<QInput | null>(null)
const inputElement = computed(() => {
  return inputRef.value?.$el.querySelector('input') || inputRef.value?.$el
})
const message = ref('')
const scrollArea = ref()
const availableCommands = computed(() => {
  const commands = ['/join channelName [private]']
  return commands
})
function selectCommand(cmd: string) {
  message.value = cmd
  showMenu.value = false
}
const showMenu = ref(false)
function handleCommands() {
  console.log("hi")
  if (message.value.startsWith('/')) {
    showMenu.value = true
  } else {
    showMenu.value = false
  }
}
async function sendMessage() {
  if (message.value.trim()) {
    const newMessage: Message = {
      id: Date.now(),
      chatId: 100,
      senderId: currentUserId,
      text: message.value.trim()
    }
    messages.value.push(newMessage)
    message.value = ''

    await nextTick()
    const scroll = scrollArea.value?.getScrollTarget()
    if (scroll) {
      scroll.scrollTop = scroll.scrollHeight
    }
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
  transition:  0.3s ease;
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
