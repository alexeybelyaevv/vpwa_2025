<template>
  <div class="messages">
    <div
      v-for="msg in messages"
      :key="msg.id"
      class="message"
      :class="{
        'message--own': msg.senderId === currentUser,
        'message--mentioned': msg.mentioned?.includes(currentUser),
        'message--system': msg.system === true
      }"
    >
      <div class="message__inner" :class="{ 'message__inner--system': msg.system }">
        <div v-if="!msg.system" class="message__avatar" aria-hidden="true">
          {{ msg.senderId === currentUser ? 'You' : getInitial(msg.senderId) }}
        </div>
        <div class="message__bubble" :class="{ 'message__bubble--system': msg.system }">
          <div v-if="!msg.system" class="message__meta">
            <span
              class="message__author"
              :class="{ 'message__author--clickable': msg.senderId !== currentUser }"
              @click="handleAuthorClick(msg.senderId, currentUser)"
            >
              {{ msg.senderId === currentUser ? 'You' : msg.senderId }}
            </span>
            <span
              v-if="msg.mentioned?.includes(currentUser)"
              class="message__tag"
            >
              Mentioned you
            </span>
          </div>
          <div v-else class="message__meta message__meta--system">
            <span class="message__author message__author--system">System</span>
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

const emit = defineEmits<{
  (e: 'author-click', nickName: string): void
}>()

function getInitial(senderId: string): string {
  return senderId.slice(0, 1).toUpperCase()
}

function handleAuthorClick(senderId: string, currentUser: string): void {
  if (!senderId || senderId === currentUser || senderId === 'system') return
  emit('author-click', senderId)
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

.message--system {
  justify-content: center;
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

.message__inner--system {
  flex-direction: column;
  align-items: center;
  max-width: min(80%, 460px);
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

.message__bubble--system {
  background: rgba(148, 163, 184, 0.12);
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 14px;
  text-align: center;
  color: rgba(226, 232, 240, 0.88);
  box-shadow: none;
}

.message--mentioned .message__bubble {
  border-color: rgba(251, 191, 36, 0.75);
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(217, 119, 6, 0.1));
  box-shadow: 0 18px 30px rgba(251, 191, 36, 0.25);
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

.message__tag {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: rgba(251, 191, 36, 0.18);
  color: rgba(251, 191, 36, 0.92);
}

.message__meta--system {
  justify-content: center;
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

.message__author--clickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.message__author--clickable:hover {
  color: rgba(191, 219, 254, 0.95);
}

.message__author--system {
  color: rgba(148, 163, 184, 0.85);
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
