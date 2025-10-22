<template>
  <div class="messages">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message"
      :class="{
        'message--own': msg.senderId === currentUser,
        'message--mentioned': msg.mentioned?.includes(currentUser)
      }"
    >
      <div class="message__inner">
        <div class="message__avatar" aria-hidden="true">
          {{ msg.senderId === currentUser ? 'You' : getInitial(msg.senderId) }}
        </div>
        <div class="message__bubble">
          <div class="message__meta">
            <span class="message__author">
              {{ msg.senderId === currentUser ? 'You' : msg.senderId }}
            </span>
          </div>
          <p class="message__content">
            {{ msg.text }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from 'src/types'

defineProps<{
  messages: Message[]
  currentUser: string
}>()

function getInitial(senderId: string): string {
  return senderId.slice(0, 1).toUpperCase()
}
</script>

<style scoped lang="scss">
.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 8px 24px;
}

.message {
  display: flex;
  justify-content: flex-start;
}

.message--own {
  justify-content: flex-end;
}

.message__inner {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: min(70%, 520px);
}

.message--own .message__inner {
  flex-direction: row-reverse;
}

.message__avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: rgba(79, 70, 229, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #f5f5f5;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.35);
  flex-shrink: 0;
  min-width: 40px;
  min-height: 40px;
}

.message--own .message__avatar {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(14, 116, 144, 0.85));
  box-shadow: 0 8px 18px rgba(109, 40, 217, 0.35);
}

.message__bubble {
  background: rgba(17, 18, 22, 0.92);
  border-radius: 18px 18px 18px 6px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 18px 25px rgba(8, 8, 15, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.message--own .message__bubble {
  background: linear-gradient(135deg, rgba(76, 29, 149, 0.9), rgba(37, 99, 235, 0.88));
  border-radius: 18px 18px 6px 18px;
  border-color: rgba(147, 197, 253, 0.35);
  color: #f8fafc;
  box-shadow: 0 20px 32px rgba(30, 64, 175, 0.4);
}

.message--mentioned .message__bubble {
  border-color: rgba(250, 204, 21, 0.6);
  box-shadow: 0 25px 35px rgba(250, 204, 21, 0.2);
}

.message__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.message--own .message__meta {
  justify-content: flex-end;
  color: rgba(226, 232, 240, 0.75);
}

.message__author {
  font-weight: 700;
  letter-spacing: 0.05em;
  color: rgba(129, 140, 248, 0.9);
}

.message--own .message__author {
  color: rgba(225, 239, 254, 0.92);
}

.message__content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  color: rgba(226, 232, 240, 0.92);
}

.message--own .message__content {
  color: #f8fafc;
}

@media (max-width: 900px) {
  .message__inner {
    max-width: 80%;
  }
}

@media (max-width: 600px) {
  .messages {
    padding-inline: 4px;
  }

  .message__inner {
    max-width: 90%;
  }

  .message__bubble {
    padding: 10px 14px;
  }
}
</style>
