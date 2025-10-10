<template>
  <div class="sl-chat">
    <q-scroll-area
      ref="scrollArea"
      class="q-pa-md scroll-area"
      style="flex: 1;"
      :horizontal="false"
    >
      <sl-messages-list :messages="messages" :current-user-id="currentUserId" />
    </q-scroll-area>

    <div class="row items-center q-pa-sm input-container">
      <q-input
        filled
        v-model="message"
        placeholder="Type a message..."
        dense
        class="col message-input"
        input-class="text-white"
        @keyup.enter="sendMessage"
      />
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
import { ref, nextTick } from 'vue'
import SlMessagesList from './SlMessagesList.vue'

const currentUserId = 1
const messages = ref<Message[]>([
  { id: 1, chatId: 100, senderId: 2, text: 'Hey there!' },
  { id: 2, chatId: 100, senderId: 1, text: 'Hi Alice 👋' }
])

const message = ref('')
const scrollArea = ref()

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

.message-input:hover {
  background: rgba(255, 255, 255, 0.1);
}

.send-btn {
  background: linear-gradient(90deg, #4a00e0, #8e2de2);
  color: #ffffff;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 600;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.send-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.4);
}
</style>