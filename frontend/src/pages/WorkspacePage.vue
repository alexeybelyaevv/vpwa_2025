<template>
  <div class="sl-workspace">
    <sl-header class="sl-workspace__header" :is-mobile="isMobile" @toggle-nav="toggleMobileNav" />
    <q-drawer
      v-if="isMobile"
      v-model="showMobileNav"
      side="left"
      overlay
      behavior="mobile"
      class="sl-workspace__drawer-wrapper"
      content-class="sl-workspace__drawer"
    >
      <div class="sl-workspace__drawer-inner">
        <div class="sl-workspace__drawer-profile">
          <div class="sl-workspace__drawer-avatar">JC</div>
          <div>
            <div class="sl-workspace__drawer-name">Alex Carter</div>
            <div class="sl-workspace__drawer-role">Product Designer</div>
          </div>
        </div>

        <q-input
          v-model="searchTerm"
          dense
          rounded
          standout
          class="sl-workspace__drawer-search"
          placeholder="Search channels or DM"
          input-class="text-white"
        >
          <template #append>
            <q-icon name="search" />
          </template>
        </q-input>

        <q-scroll-area class="sl-workspace__drawer-scroll">
          <section class="sl-workspace__drawer-section">
            <div class="sl-workspace__drawer-section-title">Channels</div>
            <div v-if="!filteredChannels.length" class="sl-workspace__drawer-empty">
              No channels found
            </div>
            <q-item
              v-for="chat in filteredChannels"
              :key="chat.title"
              clickable
              :class="[
                'sl-workspace__drawer-item',
                { 'sl-workspace__drawer-item--active': isActiveSlug(chat) },
              ]"
              @click="navigateToChat(chat)"
            >
              <q-item-section avatar>
                <div class="sl-workspace__drawer-pill">#</div>
              </q-item-section>
              <q-item-section>
                <div class="sl-workspace__drawer-item-title">{{ chat.title }}</div>
                <div class="sl-workspace__drawer-item-meta">Channel</div>
              </q-item-section>
            </q-item>
          </section>

          <section class="sl-workspace__drawer-section">
            <div class="sl-workspace__drawer-section-title">Private channels</div>
            <div v-if="!filteredDirectChats.length" class="sl-workspace__drawer-empty">
              No conversations found
            </div>
            <q-item
              v-for="chat in filteredDirectChats"
              :key="chat.title"
              clickable
              :class="[
                'sl-workspace__drawer-item',
                { 'sl-workspace__drawer-item--active': isActiveSlug(chat) },
              ]"
              @click="navigateToChat(chat)"
            >
              <q-item-section avatar>
                <div class="sl-workspace__drawer-pill">@</div>
              </q-item-section>
              <q-item-section>
                <div class="sl-workspace__drawer-item-title">{{ chat.title }}</div>
                <div class="sl-workspace__drawer-item-meta">Direct message</div>
              </q-item-section>
            </q-item>
          </section>
        </q-scroll-area>
      </div>
    </q-drawer>
    <div class="sl-workspace__body">
      <aside v-if="!isMobile" class="sl-workspace__navigation">
        <sl-list :list="channels" title="Channels" @select="handleChatSelected" />
        <sl-list :list="directChats" title="Direct Messages" @select="handleChatSelected" />
      </aside>
      <section class="sl-workspace__chat">
        <sl-chat />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import SlHeader from 'src/components/SlHeader.vue';
import SlList from 'src/components/SlList.vue';
import SlChat from 'src/components/SlChat.vue';
import type { Chat } from 'src/types';
import { computed, onMounted, ref, watch } from 'vue';
import { useChatStore } from 'src/stores/chat-commands-store';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { chatTitleToSlug } from 'src/utils/chat';

const chatCommandsStore = useChatStore();
const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const showMobileNav = ref(false);
const isMobile = computed(() => $q.screen.lt.md);
const searchTerm = ref('');

const channels = computed((): Chat[] => {
  return chatCommandsStore.state.channels.filter((chat) => chat.type === 'public');
});

const directChats = computed((): Chat[] => {
  return chatCommandsStore.state.channels.filter((chat) => chat.type === 'private');
});

onMounted(() => {
  chatCommandsStore.initialize();
  syncChannelWithRoute();
});

watch(
  () => route.params.chatSlug,
  () => {
    syncChannelWithRoute();
  },
);

watch(
  () => chatCommandsStore.state.currentChannel,
  (newChannel) => {
    if (!newChannel) {
      if (route.name !== 'workspace') {
        void router.replace({ name: 'workspace' });
      }
      if (isMobile.value) {
        showMobileNav.value = false;
      }
      return;
    }
    const slug = chatCommandsStore.chatTitleToSlug(newChannel);
    const currentSlug = typeof route.params.chatSlug === 'string' ? route.params.chatSlug : null;
    if (slug && slug !== currentSlug) {
      void router.replace({ name: 'workspace-chat', params: { chatSlug: slug } });
    }
    if (isMobile.value) {
      showMobileNav.value = false;
    }
  },
);

watch(isMobile, (value) => {
  if (!value) {
    showMobileNav.value = false;
  }
});

function syncChannelWithRoute() {
  const slugParam = typeof route.params.chatSlug === 'string' ? route.params.chatSlug : null;
  const resolvedSlug = chatCommandsStore.selectChannelBySlug(slugParam);
  if (resolvedSlug && resolvedSlug !== slugParam) {
    void router.replace({ name: 'workspace-chat', params: { chatSlug: resolvedSlug } });
  }
  if (
    !resolvedSlug &&
    chatCommandsStore.state.currentChannel === null &&
    route.name !== 'workspace'
  ) {
    void router.replace({ name: 'workspace' });
  }
}

function toggleMobileNav() {
  showMobileNav.value = !showMobileNav.value;
}

function handleChatSelected() {
  if (isMobile.value) {
    showMobileNav.value = false;
  }
}

const activeSlug = computed(() => {
  const slugParam = typeof route.params.chatSlug === 'string' ? route.params.chatSlug : null;
  if (slugParam) return slugParam;
  if (chatCommandsStore.state.currentChannel) {
    return chatTitleToSlug(chatCommandsStore.state.currentChannel);
  }
  return '';
});

const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase());

const filteredChannels = computed(() => {
  const term = normalizedSearch.value;
  if (!term) return channels.value;
  return channels.value.filter((chat) => chat.title.toLowerCase().includes(term));
});

const filteredDirectChats = computed(() => {
  const term = normalizedSearch.value;
  if (!term) return directChats.value;
  return directChats.value.filter((chat) => chat.title.toLowerCase().includes(term));
});

function isActiveSlug(chat: Chat) {
  return chatTitleToSlug(chat.title) === activeSlug.value;
}

function navigateToChat(chat: Chat) {
  const slug = chatTitleToSlug(chat.title);
  if (!slug) return;
  if (slug !== activeSlug.value) {
    void router.push({ name: 'workspace-chat', params: { chatSlug: slug } });
  }
  handleChatSelected();
}
</script>

<style scoped lang="scss">
.sl-workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1d21;
  color: #fff;
  font-family: 'Inter', sans-serif;
}

.sl-workspace__body {
  display: flex;
  flex: 1;
  padding: 24px;
  gap: 24px;
  min-height: 0;
  background: radial-gradient(circle at top left, rgba(91, 33, 182, 0.18), transparent 45%);
}

.sl-workspace__navigation {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 260px;
  padding: 12px;
  background: rgba(18, 19, 23, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 20px;
  backdrop-filter: blur(8px);
}

.sl-workspace__chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 28px 60px rgba(10, 10, 18, 0.45);
}

:deep(.sl-workspace__drawer) {
  background: #0f1117 !important;
  color: #e2e8f0;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 280px;
  border-right: 1px solid rgba(148, 163, 184, 0.15);
}

.sl-workspace__drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sl-workspace__drawer-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.sl-workspace__drawer-headline {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 10px;
}

.sl-workspace__drawer-title {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.6);
}

.sl-workspace__drawer-subtitle {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #f8fafc;
}

.sl-workspace__drawer-lists {
  display: flex;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
}

.sl-workspace__drawer-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.08);
}

.sl-workspace__drawer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.85), rgba(59, 130, 246, 0.75));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #0f172a;
}

.sl-workspace__drawer-name {
  font-weight: 600;
  color: #f8fafc;
}

.sl-workspace__drawer-role {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.65);
}

.sl-workspace__drawer-search {
  width: 100%;
}

.sl-workspace__drawer-scroll {
  flex: 1;
}

.sl-workspace__drawer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.sl-workspace__drawer-section-title {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.6);
  padding-inline: 4px;
}

.sl-workspace__drawer-empty {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.6);
  padding: 6px 12px;
}

:deep(.sl-workspace__drawer .q-btn) {
  color: rgba(226, 232, 240, 0.6);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

:deep(.sl-workspace__drawer .q-btn:hover) {
  color: #ffffff;
  background: rgba(148, 163, 184, 0.12);
}

:deep(.sl-workspace__drawer .sl-list) {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

:deep(.sl-workspace__drawer .sl-list__title) {
  color: rgba(226, 232, 240, 0.6);
  font-size: 11px;
  letter-spacing: 0.12em;
}

:deep(.sl-workspace__drawer .sl-list__badge) {
  display: none;
}

:deep(.sl-workspace__drawer .sl-list__items) {
  gap: 6px;
}

:deep(.sl-workspace__drawer .sl-list__item) {
  padding: 0;
}

.sl-workspace__drawer-item {
  position: relative;
  padding: 10px 14px;
  border-radius: 10px;
  color: rgba(226, 232, 240, 0.75);
  transition:
    background 0.2s ease,
    color 0.2s ease;
  margin-bottom: 6px;
}

.sl-workspace__drawer-item:last-child {
  margin-bottom: 0;
}

.sl-workspace__drawer-item:hover {
  color: #e5edff;
  background: rgba(148, 163, 184, 0.08);
}

.sl-workspace__drawer-item--active {
  color: #ffffff;
  background: rgba(129, 140, 248, 0.18);
  box-shadow: inset 0 0 0 1px rgba(129, 140, 248, 0.35);
}

.sl-workspace__drawer-item--active::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(129, 140, 248, 0.9), rgba(59, 130, 246, 0.8));
}

.sl-workspace__drawer-pill {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(148, 163, 184, 0.16);
  color: rgba(226, 232, 240, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.sl-workspace__drawer-item-title {
  font-weight: 600;
  font-size: 14px;
}

.sl-workspace__drawer-item-meta {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.65);
}

:deep(.sl-workspace__drawer-wrapper) {
  background: #0f1117 !important;
  color: #e2e8f0 !important;
}

:deep(.sl-workspace__drawer-wrapper .q-drawer__content) {
  background: transparent !important;
}

@media (max-width: 1100px) {
  .sl-workspace__body {
    padding: 18px;
    gap: 18px;
  }

  .sl-workspace__navigation {
    width: 220px;
  }
}

@media (max-width: 900px) {
  .sl-workspace__body {
    flex-direction: column;
    gap: 18px;
  }
}

@media (max-width: 600px) {
  .sl-workspace__body {
    padding: 16px;
    gap: 16px;
  }

  .sl-workspace__chat {
    border-radius: 18px;
  }
}
</style>
