<template>
  <div class="sl-workspace">
    <sl-header
      class="sl-workspace__header"
      :is-mobile="isMobile"
      @toggle-nav="toggleMobileNav"
      @logout="handleLogout"
    />
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
          <div class="sl-workspace__drawer-avatar">{{ profileInitials }}</div>
          <div class="sl-workspace__drawer-details">
            <div class="sl-workspace__drawer-name">John Doe</div>
            <div class="sl-workspace__drawer-role">{{ profileHandle }}</div>
          </div>
        </div>

        <q-input
          v-model="searchTerm"
          dense
          rounded
          standout
          class="sl-workspace__drawer-search"
          placeholder="Search channels"
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
                {
                  'sl-workspace__drawer-item--active': isActiveSlug(chat),
                  'sl-workspace__drawer-item--invite': chat.inviteHighlighted,
                },
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
              <q-item-section side v-if="chat.inviteHighlighted">
                <q-badge color="warning" text-color="black" label="New" />
              </q-item-section>
            </q-item>
          </section>

          <section class="sl-workspace__drawer-section">
            <div class="sl-workspace__drawer-section-title">Private channels</div>
            <div v-if="!filteredPrivateChannels.length" class="sl-workspace__drawer-empty">
              No private channels found
            </div>
            <q-item
              v-for="chat in filteredPrivateChannels"
              :key="chat.title"
              clickable
              :class="[
                'sl-workspace__drawer-item',
                {
                  'sl-workspace__drawer-item--active': isActiveSlug(chat),
                  'sl-workspace__drawer-item--invite': chat.inviteHighlighted,
                },
              ]"
              @click="navigateToChat(chat)"
            >
              <q-item-section avatar>
                <div class="sl-workspace__drawer-pill">@</div>
              </q-item-section>
              <q-item-section>
                <div class="sl-workspace__drawer-item-title">{{ chat.title }}</div>
                <div class="sl-workspace__drawer-item-meta">Private channel</div>
              </q-item-section>
              <q-item-section side v-if="chat.inviteHighlighted">
                <q-badge color="warning" text-color="black" label="New" />
              </q-item-section>
            </q-item>
          </section>
        </q-scroll-area>
      </div>
    </q-drawer>
    <div class="sl-workspace__body">
      <aside v-if="!isMobile" class="sl-workspace__navigation">
        <div class="sl-workspace__navigation-actions">
          <q-btn
            class="sl-workspace__action-btn"
            color="primary"
            icon="add"
            label="Create channel"
            @click="openCreateChannelDialog()"
          />
        </div>
        <sl-list :list="publicChannels" title="Public Channels" @select="handleChatSelected" />
        <sl-list :list="privateChannels" title="Private Channels" @select="handleChatSelected" />
        <div v-if="activeChannel" class="sl-workspace__navigation-manage">
          <div class="sl-workspace__navigation-manage-title">{{ manageActionLabel }}</div>
          <div class="sl-workspace__navigation-manage-desc">{{ manageActionDescription }}</div>
          <q-btn
            class="sl-workspace__action-btn sl-workspace__action-btn--full"
            outline
            color="negative"
            :icon="manageActionIcon"
            :label="manageActionLabel"
            @click="promptManageChannel"
          />
        </div>
        <div v-else class="sl-workspace__navigation-manage sl-workspace__navigation-manage--empty">
          Select a channel to manage options.
        </div>
      </aside>
      <section class="sl-workspace__chat">
        <sl-chat />
      </section>
    </div>

    <q-dialog
      v-model="showCreateChannel"
      persistent
      :no-backdrop-dismiss="false"
      :no-esc-dismiss="false"
    >
      <q-card class="sl-dialog">
        <q-card-section class="sl-dialog__header">
          <div class="text-h6">Create a channel</div>
          <div class="sl-dialog__subtitle">Choose a name and visibility for the new channel.</div>
        </q-card-section>
        <q-card-section class="sl-dialog__body">
          <q-input
            v-model="newChannelName"
            label="Channel name"
            dense
            outlined
            autocapitalize="none"
            autocomplete="off"
            autofocus
            :error="Boolean(createChannelError)"
            :error-message="createChannelError"
            placeholder="marketing-team"
            @keyup.enter="handleCreateChannel"
            input-class="text-white"
            label-color="white"
            color="white"
            bg-color="transparent"
          >
            <template #prepend>
              <q-icon name="#" class="text-white" />
            </template>
          </q-input>
          <div class="sl-dialog__toggle-label">Visibility</div>
          <q-btn-toggle
            v-model="newChannelType"
            :options="[...createChannelOptions]"
            class="sl-dialog__toggle"
            toggle-color="primary"
            rounded
            unelevated
          />
        </q-card-section>
        <q-card-actions align="right" class="sl-dialog__actions">
          <q-btn flat label="Cancel" color="white" @click="showCreateChannel = false" />
          <q-btn
            color="primary"
            label="Create"
            :disable="!canSubmitChannel"
            @click="handleCreateChannel"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showManageConfirm">
      <q-card class="sl-dialog">
        <q-card-section class="sl-dialog__header">
          <div class="text-h6">{{ manageActionLabel }}</div>
          <div class="sl-dialog__subtitle">{{ manageActionChannelName }}</div>
        </q-card-section>
        <q-card-section class="sl-dialog__body">
          <div>{{ manageActionDescription }}</div>
        </q-card-section>
        <q-card-actions align="right" class="sl-dialog__actions">
          <q-btn flat label="Cancel" @click="showManageConfirm = false" />
          <q-btn
            color="negative"
            :icon="manageActionIcon"
            :label="manageActionLabel"
            @click="confirmManageChannel"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import SlHeader from 'src/components/SlHeader.vue';
import SlList from 'src/components/SlList.vue';
import SlChat from 'src/components/SlChat.vue';
import type { Chat, ChannelType } from 'src/types';
import { computed, onMounted, ref, watch } from 'vue';
import { useChatStore } from 'src/stores/chat-commands-store';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { chatTitleToSlug } from 'src/utils/chat';
import { setUnauthorizedHandler } from 'src/api';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const chatCommandsStore = useChatStore();

const showMobileNav = ref(false);
const isMobile = computed(() => $q.screen.lt.md);
const searchTerm = ref('');
const isSigningOut = ref(false);

setUnauthorizedHandler(() => {
  void performLogout(true, 'Session expired. Please log in again.');
});

const showCreateChannel = ref(false);
const newChannelName = ref('');
const newChannelType = ref<ChannelType>('public');
const createChannelError = ref('');

const showManageConfirm = ref(false);

const currentUserNick = computed(() => chatCommandsStore.state.profile.nickName);
const profile = computed(() => chatCommandsStore.state.profile);
const profileDisplayName = computed(() => {
  const { firstName, lastName, nickName } = profile.value;
  const full = `${firstName} ${lastName}`.trim();
  return full || nickName;
});
const profileHandle = computed(() => `@${profile.value.nickName}`);
const profileInitials = computed(() => profileDisplayName.value.charAt(0).toUpperCase() || '@');

function sortChannels(source: Chat[]): Chat[] {
  return [...source].sort((a, b) => {
    const highlightDiff =
      Number(Boolean(b.inviteHighlighted)) - Number(Boolean(a.inviteHighlighted));
    if (highlightDiff !== 0) return highlightDiff;
    return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  });
}

const publicChannels = computed((): Chat[] => {
  return sortChannels(
    chatCommandsStore.state.channels.filter(
      (chat) => chat.type === 'public' && chat.members.includes(currentUserNick.value),
    ),
  );
});

const privateChannels = computed((): Chat[] => {
  return sortChannels(
    chatCommandsStore.state.channels.filter(
      (chat) => chat.type === 'private' && chat.members.includes(currentUserNick.value),
    ),
  );
});

const activeChannel = computed(() => {
  const current = chatCommandsStore.state.currentChannel;
  return current ? (chatCommandsStore.getChannelByTitle(current) ?? null) : null;
});

const isCurrentAdmin = computed(() => activeChannel.value?.admin === currentUserNick.value);

const manageActionLabel = computed(() =>
  isCurrentAdmin.value ? 'Close channel' : 'Leave channel',
);
const manageActionChannelName = computed(() =>
  activeChannel.value ? `#${activeChannel.value.title}` : 'this channel',
);
const manageActionDescription = computed(() => {
  if (!activeChannel.value) return '';
  return isCurrentAdmin.value
    ? `${manageActionChannelName.value} will be removed for all members.`
    : `You will no longer receive updates from ${manageActionChannelName.value}.`;
});
const manageActionIcon = computed(() => (isCurrentAdmin.value ? 'delete' : 'logout'));

const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase());

const filteredChannels = computed(() => {
  const term = normalizedSearch.value;
  if (!term) return publicChannels.value;
  return publicChannels.value.filter((chat) => chat.title.toLowerCase().includes(term));
});

const filteredPrivateChannels = computed(() => {
  const term = normalizedSearch.value;
  if (!term) return privateChannels.value;
  return privateChannels.value.filter((chat) => chat.title.toLowerCase().includes(term));
});

const createChannelOptions = [
  { label: 'Public', value: 'public', icon: 'tag' },
  { label: 'Private', value: 'private', icon: 'lock' },
] as const;

const canSubmitChannel = computed(() => newChannelName.value.trim().length >= 2);

async function performLogout(showNotification = true, message = 'You have been logged out') {
  if (isSigningOut.value) return;
  isSigningOut.value = true;
  localStorage.removeItem('token');
  chatCommandsStore.resetState();
  showMobileNav.value = false;
  if (showNotification) {
    $q.notify({
      type: 'info',
      icon: 'logout',
      message,
    });
  }
  await router.replace('/login');
}

function handleLogout() {
  void performLogout();
}

onMounted(async () => {
  await chatCommandsStore.initialize();
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
    if (isSigningOut.value) return;
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
    chatCommandsStore.markInviteSeen(newChannel);
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

watch(showCreateChannel, (value) => {
  if (!value) {
    resetCreateChannelForm();
  }
});

watch(newChannelName, () => {
  createChannelError.value = '';
});

function syncChannelWithRoute() {
  if (isSigningOut.value) return;
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
  if (chatCommandsStore.state.currentChannel) {
    chatCommandsStore.markInviteSeen(chatCommandsStore.state.currentChannel);
  }
}

function toggleMobileNav() {
  showMobileNav.value = !showMobileNav.value;
}

function resetCreateChannelForm() {
  newChannelName.value = '';
  newChannelType.value = 'public';
  createChannelError.value = '';
}

function openCreateChannelDialog(type?: ChannelType) {
  if (type) {
    newChannelType.value = type;
  }
  showCreateChannel.value = true;
}

async function handleCreateChannel() {
  const trimmed = newChannelName.value.trim();
  if (!trimmed) {
    createChannelError.value = 'Channel name is required';
    return;
  }
  if (trimmed.length < 2) {
    createChannelError.value = 'Use at least 2 characters';
    return;
  }
  if (chatCommandsStore.getChannelByTitle(trimmed)) {
    createChannelError.value = 'Channel name is already in use';
    return;
  }
  await chatCommandsStore.createChannel(trimmed, newChannelType.value);
  $q.notify({
    icon: 'check',
    color: 'positive',
    message: `Channel #${trimmed} created`,
  });
  showCreateChannel.value = false;
}

function promptManageChannel() {
  if (!activeChannel.value) return;
  showManageConfirm.value = true;
}

async function confirmManageChannel() {
  const channel = activeChannel.value;
  if (!channel) return;
  const wasAdmin = isCurrentAdmin.value;
  const title = channel.title;
  await chatCommandsStore.cancel();
  $q.notify({
    icon: wasAdmin ? 'delete' : 'logout',
    color: wasAdmin ? 'negative' : 'info',
    message: wasAdmin ? `Channel #${title} was closed` : `You left #${title}`,
  });
  showManageConfirm.value = false;
}

function handleChatSelected(chat: Chat) {
  if (isMobile.value) {
    showMobileNav.value = false;
  }
  chatCommandsStore.markInviteSeen(chat.title);
}

const activeSlug = computed(() => {
  const slugParam = typeof route.params.chatSlug === 'string' ? route.params.chatSlug : null;
  if (slugParam) return slugParam;
  if (chatCommandsStore.state.currentChannel) {
    return chatTitleToSlug(chatCommandsStore.state.currentChannel);
  }
  return '';
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
  handleChatSelected(chat);
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

.sl-workspace__navigation-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sl-workspace__action-btn {
  width: 100%;
  justify-content: center;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.sl-workspace__action-btn--full {
  margin-top: 8px;
}

.sl-workspace__navigation-manage {
  margin-top: auto;
  padding: 14px 12px;
  border-radius: 16px;
  background: rgba(17, 19, 24, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sl-workspace__navigation-manage--empty {
  margin-top: auto;
  padding: 12px;
  border-radius: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.25);
  color: rgba(148, 163, 184, 0.7);
  font-size: 12px;
  text-align: center;
}

.sl-workspace__navigation-manage-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(226, 232, 240, 0.7);
}

.sl-workspace__navigation-manage-desc {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.75);
  line-height: 1.5;
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

.sl-workspace__drawer-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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
  white-space: nowrap;
}

.sl-workspace__drawer-role {
  font-size: 12px;
  color: rgba(226, 232, 240, 0.65);
  white-space: nowrap;
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

.sl-workspace__drawer-item--invite {
  border: 1px solid rgba(250, 204, 21, 0.28);
  background: rgba(250, 204, 21, 0.08);
  color: rgba(253, 230, 138, 0.92);
}

.sl-workspace__drawer-item--invite:hover {
  background: rgba(250, 204, 21, 0.14);
  color: #fff8dc;
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

.sl-dialog {
  min-width: 380px;
  background: linear-gradient(135deg, #141820 0%, #10121a 100%);
  color: #e2e8f0;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 28px 60px rgba(4, 6, 12, 0.75);
}

.sl-dialog__header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 0;
}

.sl-dialog__subtitle {
  font-size: 13px;
  color: rgba(148, 163, 184, 0.75);
}

.sl-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sl-dialog__toggle-label {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.7);
}

.sl-dialog__toggle {
  gap: 8px;
}

.sl-dialog__toggle :deep(.q-btn) {
  padding: 8px 18px;
  font-weight: 600;
  text-transform: none;
}

.sl-dialog__actions {
  padding-top: 0;
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

  .sl-dialog {
    width: calc(100vw - 32px);
    min-width: 0;
  }
}
</style>
