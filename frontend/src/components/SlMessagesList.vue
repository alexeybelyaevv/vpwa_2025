<template>
  <div class="messages-container">
    <div v-for="msg in messages" :key="msg.id" class="q-mb-sm message-text" :class="{ 'own-message': msg.senderId === currentUser }">
      <span class="sender"><strong>{{ msg.senderId === currentUser ? 'You' : msg.senderId }}:</strong></span>
      <span class="message-content">{{ msg.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from 'src/types'
import { defineProps } from 'vue'

defineProps<{
  messages: Message[]
  currentUser: string
}>()
</script>

<style scoped>
.messages-container {
  max-width: 100%;
  box-sizing: border-box;
}

.message-text {
  display: flex;
  flex-wrap: wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  max-width: 100%;
  word-break: break-word;
  hyphens: auto;
  padding: 10px 15px;
  margin: 5px 10px;
  border-radius: 15px;
  color: #ffffff;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  background: linear-gradient(145deg, #2a2e33, #1e2125);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease-in-out;
}

.message-text.own-message {
  background: linear-gradient(145deg, #4a00e0, #8e2de2);
  color: #ffffff;
  margin-left: 20%;
  margin-right: 10px;
}

.sender {
  margin-right: 8px;
  white-space: nowrap;
  font-weight: 600;
  color: #a8bffa;
}

.message-text.own-message .sender {
  color: #e0c3fc;
}

.message-content {
  flex: 1;
  word-break: break-word;
}

.message-text:hover {
  transform: translateY(-2px);
}
</style>