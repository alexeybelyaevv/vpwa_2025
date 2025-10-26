<template>
  <div class="sl-list">
    <div class="sl-list__header">
      <span class="sl-list__title">{{ title }}</span>
      <span class="sl-list__badge">{{ list.length }}</span>
    </div>
    <ul class="sl-list__items">
      <li
        v-for="item in list"
        :key="item.title"
        class="sl-list__item"
        :class="{
          'sl-list__item--active': isActive(item),
          'sl-list__item--invite': item.inviteHighlighted
        }"
        role="button"
        tabindex="0"
        @click="goToChat(item)"
        @keydown.enter.prevent="goToChat(item)"
        @keydown.space.prevent="goToChat(item)"
      >
        <span class="sl-list__item-name">{{ item.title }}</span>
        <span v-if="item.inviteHighlighted" class="sl-list__item-indicator">New</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Chat } from 'src/types'
import { chatTitleToSlug } from 'src/utils/chat'

defineProps<{
  list: Chat[]
  title: string
}>()

const emit = defineEmits<{
  (e: 'select', chat: Chat): void
}>()

const router = useRouter()
const route = useRoute()

const activeSlug = computed(() => {
  return typeof route.params.chatSlug === 'string' ? route.params.chatSlug : ''
})

function isActive(chat: Chat) {
  const slug = chatTitleToSlug(chat.title)
  return slug === activeSlug.value
}

function goToChat(chat: Chat) {
  const slug = chatTitleToSlug(chat.title)
  if (!slug) return

  if (slug === activeSlug.value) return

  void router.push({ name: 'workspace-chat', params: { chatSlug: slug } })
  emit('select', chat)
}
</script>

<style scoped lang="scss">
.sl-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(180deg, rgba(37, 40, 45, 0.85), rgba(24, 26, 30, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 18px 16px;
  backdrop-filter: blur(8px);
}

.sl-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sl-list__title {
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.sl-list__badge {
  min-width: 24px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  background-color: rgba(255, 255, 255, 0.08);
}

.sl-list__items {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
}

.sl-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.68);
  transition: background 0.25s ease, color 0.25s ease;
  user-select: none;
}

.sl-list__item:hover {
  background: rgba(121, 80, 242, 0.18);
  color: #fff;
}

.sl-list__item--invite {
  position: relative;
  border: 1px solid rgba(250, 204, 21, 0.32);
  background: rgba(250, 204, 21, 0.08);
}

.sl-list__item--invite:hover {
  background: rgba(250, 204, 21, 0.12);
}

.sl-list__item--active {
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.58), rgba(118, 75, 162, 0.65));
  color: #fff;
  box-shadow: 0 8px 20px rgba(68, 51, 153, 0.35);
}

.sl-list__item-name {
  font-weight: 600;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sl-list__item-indicator {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.2);
  color: rgba(250, 204, 21, 0.92);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .sl-list {
    min-width: 220px;
    flex: 1;
  }
}

@media (max-width: 600px) {
  .sl-list {
    min-width: 190px;
    padding: 16px 14px;
  }
}
</style>
