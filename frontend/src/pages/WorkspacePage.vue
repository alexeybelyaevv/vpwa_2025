<template>
  <q-page class="sl-workspace">
    <WorkspaceHeader
      :workspace="activeWorkspace"
      :user="currentUser"
      @update:status="updateUserStatus"
      @logout="handleLogout"
    />

    <q-drawer
      v-if="isMobile"
      v-model="mobileDrawer"
      side="left"
      overlay
      behavior="mobile"
      mini-to-overlay
      :width="300"
      content-class="sl-drawer"
    >
      <div class="sl-drawer__header">
        <div class="sl-drawer__title">Navigation</div>
        <q-btn
          flat
          round
          dense
          icon="close"
          color="white"
          aria-label="Close navigation"
          @click="mobileDrawer = false"
        />
      </div>

      <q-btn
        flat
        dense
        color="white"
        icon="add"
        label="New channel"
        class="sl-drawer__create"
        aria-label="Create channel"
        size="sm"
      />

      <q-input
        v-model="navFilter"
        dense
        outlined
        rounded
        bg-color="grey-10"
        input-class="text-white"
        placeholder="Search channels or people"
        class="sl-drawer__search"
      >
        <template #prepend>
          <q-icon name="search" size="18px" class="text-grey-4" />
        </template>
      </q-input>

      <div class="sl-drawer__lists">
        <q-expansion-item
          dense
          expand-icon="keyboard_arrow_down"
          switch-toggle-side
          class="sl-navigation__accordion"
          :model-value="mobileNavSection === 'channels'"
          @update:model-value="(value) => setMobileSection('channels', value)"
        >
          <template #header>
            <div class="sl-navigation__accordion-header">
              <div class="sl-navigation__heading">
                <q-icon name="tag" size="18px" />
                <span>Channels</span>
              </div>
              <q-btn
                flat
                dense
                color="white"
                icon="add"
                class="sl-navigation__header-action"
                aria-label="Create channel"
                size="sm"
                @click.stop
              />
            </div>
          </template>

          <ConversationList
            hide-header
            title="Channels"
            :list="filteredChannels"
            accent="hash"
            :active-id="activeChannelId"
            @select="navigateToChannel"
          />
        </q-expansion-item>

        <q-expansion-item
          dense
          expand-icon="keyboard_arrow_down"
          switch-toggle-side
          class="sl-navigation__accordion"
          :model-value="mobileNavSection === 'direct'"
          @update:model-value="(value) => setMobileSection('direct', value)"
        >
          <template #header>
            <div class="sl-navigation__accordion-header">
              <div class="sl-navigation__heading">
                <q-icon name="forum" size="18px" />
                <span>Direct messages</span>
              </div>
              <q-btn
                flat
                dense
                color="white"
                icon="person_add_alt"
                class="sl-navigation__header-action"
                aria-label="Start direct message"
                size="sm"
                @click.stop
              />
            </div>
          </template>

          <ConversationList
            hide-header
            title="Direct messages"
            :list="filteredDirectChats"
            accent="status"
            :active-id="activeDirectId"
            @select="navigateToDirect"
          />
        </q-expansion-item>
      </div>
    </q-drawer>

    <div class="sl-main">
      <WorkspaceSidebar
        class="sl-sidebar"
        :workspaces="workspaces"
        :active-workspace-id="activeWorkspaceId"
        @select="handleWorkspaceSelect"
      />

      <section class="sl-navigation" aria-label="Channel navigation">
        <div class="sl-navigation__header">
          <div class="sl-navigation__title">Navigation</div>
          <q-btn
            flat
            dense
            color="white"
            icon="add"
            label="New channel"
            class="sl-navigation__action"
            aria-label="Create channel"
            size="sm"
          />
        </div>

        <q-input
          v-model="navFilter"
          dense
          standout
          rounded
          bg-color="grey-9"
          input-class="text-white"
          class="sl-navigation__search"
          placeholder="Search channels or people"
        >
          <template #prepend>
            <q-icon name="search" size="18px" class="text-grey-4" />
          </template>
        </q-input>

        <div class="sl-navigation__lists">
          <ConversationList
            title="Channels"
            :list="filteredChannels"
            accent="hash"
            :active-id="activeChannelId"
            @select="navigateToChannel"
          />
          <ConversationList
            title="Direct messages"
            :list="filteredDirectChats"
            accent="status"
            :active-id="activeDirectId"
            @select="navigateToDirect"
          />
        </div>
      </section>

      <section class="sl-conversation" aria-live="polite">
        <q-btn
          v-if="isMobile && hasActiveConversation"
          flat
          round
          dense
          icon="menu"
          color="white"
          class="sl-conversation__drawer-btn"
          aria-label="Open navigation"
          @click="mobileDrawer = true"
        />

        <SlChat v-if="hasActiveConversation" />
        <ConversationShell
          v-else
          :show-drawer-toggle="isMobile"
          :channel-name="placeholderChannelName"
          :channel-description="placeholderChannelDescription"
          @toggle-drawer="mobileDrawer = true"
        />
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ConversationList from 'src/components/ConversationList.vue';
import ConversationShell from 'src/components/ConversationShell.vue';
import SlChat from 'src/components/SlChat.vue';
import WorkspaceHeader from 'src/components/WorkspaceHeader.vue';
import WorkspaceSidebar from 'src/components/WorkspaceSidebar.vue';
import type {
  Chat,
  PresenceStatus,
  UserProfile,
  WorkspaceBadge,
  WorkspaceSummary,
} from 'src/types';
import { useChatStore } from 'src/stores/chat-commands-store';

const $q = useQuasar();
const router = useRouter();
const route = useRoute();
const chatCommandsStore = useChatStore();

const navFilter = ref('');
const mobileDrawer = ref(false);
const mobileNavSection = ref<'channels' | 'direct'>('channels');

const workspaces = ref<Array<WorkspaceBadge & { plan?: string }>>([
  { id: 1, name: 'Voyager Platform', initials: 'VP', color: '#7c3aed', plan: 'Pro' },
  { id: 2, name: 'Launch Control', initials: 'LC', color: '#f59e0b', plan: 'Plus' },
  { id: 3, name: 'Telemetry Lab', initials: 'TL', color: '#10b981', plan: 'Starter' },
]);

const activeWorkspaceId = ref<number | null>(workspaces.value[0]?.id ?? null);

const activeWorkspace = computed<WorkspaceSummary>(() => {
  const fallback = workspaces.value[0];
  const selected =
    workspaces.value.find((workspace) => workspace.id === activeWorkspaceId.value) ?? fallback;

  if (!selected) {
    return {
      id: 0,
      name: 'Workspace',
      plan: 'Starter',
    };
  }

  return {
    id: selected.id,
    name: selected.name,
    plan: selected.plan ?? 'Starter',
  };
});

const currentUser = ref<UserProfile>({
  name: chatCommandsStore.state.currentUser,
  role: 'Engineer',
  status: 'online',
});

const channels = computed<Chat[]>(() =>
  chatCommandsStore.state.channels.filter((chat: Chat) => chat.type === 'public'),
);

const directChats = computed<Chat[]>(() =>
  chatCommandsStore.state.channels.filter((chat: Chat) => chat.type === 'private'),
);

const filteredChannels = computed<Chat[]>(() => applyFilter(channels.value));
const filteredDirectChats = computed<Chat[]>(() => applyFilter(directChats.value));

const allConversations = computed<Chat[]>(() => [...channels.value, ...directChats.value]);

const activeConversation = computed<Chat | null>(() => {
  const current = chatCommandsStore.state.currentChannel;
  if (!current) {
    return null;
  }
  return allConversations.value.find((chat) => chat.title === current) ?? null;
});

const hasActiveConversation = computed<boolean>(() => activeConversation.value !== null);

const activeChannelId = computed<string | undefined>(() => {
  const current = chatCommandsStore.state.currentChannel;
  if (!current) {
    return undefined;
  }
  return channels.value.find((chat) => chat.title === current)?.slug;
});

const activeDirectId = computed<string | undefined>(() => {
  const current = chatCommandsStore.state.currentChannel;
  if (!current) {
    return undefined;
  }
  return directChats.value.find((chat) => chat.title === current)?.slug;
});

const placeholderChannelName = computed<string>(() => {
  if (activeConversation.value) {
    return `# ${activeConversation.value.title}`;
  }
  const fallback = allConversations.value[0];
  return fallback ? `# ${fallback.title}` : '# welcome';
});

const placeholderChannelDescription = computed<string>(() => {
  if (activeConversation.value?.description) {
    return activeConversation.value.description;
  }
  const fallback = allConversations.value.find((chat) => chat.description);
  return (
    fallback?.description ??
    'Pick a channel from the list to start chatting while the realtime bridge is on the way.'
  );
});

const isMobile = computed<boolean>(() => $q.screen.lt.md);

onMounted(() => {
  chatCommandsStore.initialize();
});

watch(isMobile, (value) => {
  if (!value) {
    mobileDrawer.value = false;
  }
});

watchEffect(() => {
  if (!allConversations.value.length) {
    return;
  }

  const entityType = route.params.entityType as string | undefined;
  const entityId = route.params.entityId as string | undefined;

  if (entityType && entityId) {
    const target = findConversation(entityType, entityId);
    if (target && chatCommandsStore.state.currentChannel !== target.title) {
      chatCommandsStore.state.currentChannel = target.title;
    }
    return;
  }

  if (!chatCommandsStore.state.currentChannel) {
    chatCommandsStore.state.currentChannel = allConversations.value[0]!.title;
  }
});

watch(
  () => chatCommandsStore.state.currentChannel,
  (next) => {
    if (!next) {
      if (route.name !== 'workspace-root') {
        void router.replace({ name: 'workspace-root' }).catch(() => {});
      }
      return;
    }

    const target = allConversations.value.find((chat) => chat.title === next);
    if (!target) {
      return;
    }

    const entityType = target.type === 'private' ? 'direct' : 'channel';
    const entityId = target.slug || String(target.id);

    if (
      route.name === 'workspace-entity' &&
      route.params.entityType === entityType &&
      route.params.entityId === entityId
    ) {
      return;
    }

    void router
      .replace({ name: 'workspace-entity', params: { entityType, entityId } })
      .catch(() => {});
  },
);

function applyFilter(list: Chat[]): Chat[] {
  const query = navFilter.value.trim().toLowerCase();
  if (!query) {
    return list;
  }
  return list.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(query);
    const descriptionMatch = item.description?.toLowerCase().includes(query) ?? false;
    return titleMatch || descriptionMatch;
  });
}

function setMobileSection(section: 'channels' | 'direct', value: boolean) {
  if (value) {
    mobileNavSection.value = section;
  }
}

function navigateToChannel(chat: Chat) {
  chatCommandsStore.state.currentChannel = chat.title;
  mobileDrawer.value = false;
}

function navigateToDirect(chat: Chat) {
  chatCommandsStore.state.currentChannel = chat.title;
  mobileDrawer.value = false;
}

function updateUserStatus(status: PresenceStatus) {
  currentUser.value = {
    ...currentUser.value,
    status,
  };
}

function handleLogout() {
  void router.push({ path: '/login' });
}

function handleWorkspaceSelect(id: number) {
  activeWorkspaceId.value = id;
}

function findConversation(entityType: string, entityId: string): Chat | undefined {
  const source = entityType === 'direct' ? directChats.value : channels.value;
  const targetId = entityId.toLowerCase();
  return source.find((chat) => {
    const slugMatch = chat.slug?.toLowerCase() === targetId;
    const titleMatch = chat.title.toLowerCase() === targetId;
    const idMatch = String(chat.id ?? '').toLowerCase() === targetId;
    return slugMatch || titleMatch || idMatch;
  });
}
</script>

<style scoped lang="scss">
.sl-workspace {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: radial-gradient(circle at top left, #3f0f40 0%, #1a1d21 60%, #16181d 100%);
  color: #f5f6f8;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.sl-main {
  flex: 1;
  display: grid;
  grid-template-columns: 96px 320px minmax(0, 1fr);
  gap: 24px;
  padding: 28px 32px 44px;
  align-items: stretch;
  min-height: 0;
  box-sizing: border-box;
}

.sl-sidebar {
  min-height: 0;
}

.sl-navigation {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-radius: 24px;
  padding: 24px;
  background: linear-gradient(180deg, rgba(26, 30, 39, 0.92), rgba(18, 20, 27, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 18px 38px rgba(5, 7, 14, 0.42);
  min-height: 0;
}

.sl-navigation__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sl-navigation__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
}

.sl-navigation__search {
  width: 100%;
}

.sl-navigation__lists {
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  min-height: 0;
}

.sl-conversation {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sl-conversation__drawer-btn {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 10;
  backdrop-filter: blur(12px);
  background: rgba(36, 38, 48, 0.84);
}

.sl-drawer {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px;
  background: linear-gradient(180deg, rgba(26, 30, 39, 0.96), rgba(18, 20, 27, 0.94));
  color: #f5f6f8;
}

.sl-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sl-drawer__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sl-drawer__create {
  align-self: flex-start;
}

.sl-drawer__search {
  width: 100%;
}

.sl-drawer__lists {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.sl-navigation__accordion {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: #f5f6f8;
}

.sl-navigation__accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sl-navigation__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  text-transform: none;
}

.sl-navigation__header-action {
  color: rgba(255, 255, 255, 0.82);
}

@media (max-width: 1280px) {
  .sl-main {
    grid-template-columns: 88px 280px minmax(0, 1fr);
    gap: 20px;
    padding: 24px 24px 36px;
  }
}

@media (max-width: 960px) {
  .sl-main {
    grid-template-columns: minmax(0, 1fr);
    padding: 20px 16px 28px;
    gap: 16px;
  }

  .sl-sidebar,
  .sl-navigation {
    display: none;
  }

  .sl-conversation {
    min-height: calc(100vh - 220px);
  }
}
</style>
