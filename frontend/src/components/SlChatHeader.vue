<template>
  <div class="sl-chat-header">
    <h2 class="sl-chat-header-title">{{ chatTitle }}</h2>
    <div v-if="typingUser" class="sl-chat-header__typing" @click="handleOpenPreview">
      <span class="sl-chat-header__dot"></span>
      <span class="sl-chat-header__text">
        <strong class="sl-chat-header__name">{{ typingUser }}</strong>
        <span class="sl-chat-header__suffix">is typing… (click to preview)</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  chatTitle: string;
  typingUser: string | null;
}>();

const emit = defineEmits<{
  (e: 'open-preview', nickName: string): void;
}>();

function handleOpenPreview() {
  if (!props.typingUser) return;
  emit('open-preview', props.typingUser);
}
</script>

<style scoped>
.sl-chat-header {
  background: linear-gradient(90deg, #1a1c22 0%, #222529 100%);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  font-family: 'Poppins', sans-serif;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sl-chat-header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  text-align: left;
}

.sl-chat-header__typing {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.sl-chat-header__typing:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.55);
}

.sl-chat-header__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #60a5fa;
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.75);
}

.sl-chat-header__text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.sl-chat-header__name {
  color: #bfdbfe;
  font-weight: 700;
}

.sl-chat-header__suffix {
  color: rgba(226, 232, 240, 0.8);
}
</style>
