<template>
  <div class="sl-workspace">
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
          aria-label="Close drawer"
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
      <section class="sl-navigation" aria-label="Workspace navigation">
        <header class="sl-navigation__header">
          <div class="sl-navigation__title">
            <span class="sl-navigation__title-label">Workspace navigation</span>
            <span class="sl-navigation__title-sub"
              >{{ filteredChannels.length + filteredDirectChats.length }} items</span
            >
          </div>
        </header>
        <q-input
          v-model="navFilter"
          dense
          outlined
          rounded
          bg-color="grey-9"
          input-class="text-white"
          placeholder="Search across channels"
          class="sl-navigation__search"
        >
          <template #prepend>
            <q-icon name="search" size="18px" class="text-grey-4" />
          </template>
        </q-input>

        <div class="sl-navigation__lists">
          <q-expansion-item
            dense
            expand-icon="keyboard_arrow_down"
            switch-toggle-side
            class="sl-navigation__accordion"
            :model-value="desktopNavSection === 'channels'"
            @update:model-value="(value) => setDesktopSection('channels', value)"
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
            :model-value="desktopNavSection === 'direct'"
            @update:model-value="(value) => setDesktopSection('direct', value)"
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
      </section>

      <section class="sl-content" aria-label="Channel content area">
        <ConversationShell
          :channel-name="chatTitle"
          :channel-description="chatDescription"
          :show-drawer-toggle="isMobile"
          @toggle-drawer="mobileDrawer = true"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import WorkspaceHeader from 'src/components/WorkspaceHeader.vue';
import ConversationList from 'src/components/ConversationList.vue';
import ConversationShell from 'src/components/ConversationShell.vue';
import type {
  Chat,
  PresenceStatus,
  UserProfile,
  WorkspaceBadge,
  WorkspaceSummary,
} from 'src/types';

const workspaces = reactive<(WorkspaceBadge & { plan: string })[]>([
  { id: 1, name: 'Team Nova', initials: 'TN', color: '#5865f2', plan: 'Pro Workspace' },
  { id: 2, name: 'Marketing Hub', initials: 'MH', color: '#4dc0b5', plan: 'Starter Plan' },
  { id: 3, name: 'Ops Center', initials: 'OC', color: '#f2994a', plan: 'Enterprise' },
  { id: 4, name: 'QA Studio', initials: 'QA', color: '#9b51e0', plan: 'Sandbox' },
]);

const activeWorkspaceId = ref(workspaces[0]?.id ?? 0);

const activeWorkspace = computed<WorkspaceSummary>(() => {
  const match = workspaces.find((item) => item.id === activeWorkspaceId.value);
  if (!match) {
    return { id: 0, name: 'Workspace', plan: '' };
  }
  return { id: match.id, name: match.name, plan: match.plan };
});

const currentUser = reactive<UserProfile>({
  name: 'Oleksii Belyaev',
  role: 'Frontend Engineer',
  status: 'online',
  avatarUrl:
    'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=160&q=80',
});

const channels = ref<Chat[]>([
  {
    id: 1,
    title: 'general',
    slug: 'general',
    description: 'Updates, wins, and company-wide announcements',
    unread: 4,
    type: 'channel',
  },
  {
    id: 2,
    title: 'product-sync',
    slug: 'product-sync',
    description: 'Roadmap alignment and sprint planning',
    unread: 2,
    type: 'channel',
  },
  {
    id: 3,
    title: 'design-review',
    slug: 'design-review',
    description: 'Share mockups for feedback before Thursday',
    type: 'channel',
  },
  {
    id: 4,
    title: 'release-support',
    slug: 'release-support',
    description: 'On-call status and deploy coordination',
    invited: true,
    muted: true,
    type: 'channel',
  },
]);

const directChats = ref<Chat[]>([
  {
    id: 21,
    title: 'John Carter',
    status: 'online',
    description: 'Shared sprint notes',
    type: 'dm',
  },
  {
    id: 22,
    title: 'Ava Thompson',
    status: 'away',
    description: 'Feature flag follow-up',
    type: 'dm',
  },
  {
    id: 23,
    title: 'Emilia Rhodes',
    status: 'offline',
    description: 'Design system review',
    type: 'dm',
  },
  {
    id: 24,
    title: 'Noah Bennett',
    status: 'dnd',
    description: 'Release checklist',
    type: 'dm',
  },
]);

const navFilter = ref('');
const desktopNavSection = ref<'channels' | 'direct'>('channels');
const mobileNavSection = ref<'channels' | 'direct'>('channels');

const $q = useQuasar();
const isMobile = computed(() => $q.screen.lt.md);
const mobileDrawer = ref(false);
const router = useRouter();
const route = useRoute();

const filterText = computed(() => navFilter.value.trim().toLowerCase());

const filteredChannels = computed(() => {
  const pool = channels.value.filter((item) => {
    if (!filterText.value) return true;
    return (
      item.title.toLowerCase().includes(filterText.value) ||
      (item.description?.toLowerCase().includes(filterText.value) ?? false)
    );
  });

  return [...pool].sort((a, b) => {
    const inviteWeight = Number(Boolean(b.invited)) - Number(Boolean(a.invited));
    if (inviteWeight !== 0) return inviteWeight;
    return (a.title ?? '').localeCompare(b.title ?? '');
  });
});

const filteredDirectChats = computed(() => {
  if (!filterText.value) return directChats.value;
  return directChats.value.filter(
    (item) =>
      item.title.toLowerCase().includes(filterText.value) ||
      (item.description?.toLowerCase().includes(filterText.value) ?? false),
  );
});

function sectionHasItems(section: 'channels' | 'direct') {
  return section === 'channels'
    ? filteredChannels.value.length > 0
    : filteredDirectChats.value.length > 0;
}

function setDesktopSection(section: 'channels' | 'direct', opened: boolean) {
  if (opened) {
    desktopNavSection.value = section;
    return;
  }

  if (desktopNavSection.value !== section) {
    return;
  }

  const fallback = section === 'channels' ? 'direct' : 'channels';
  if (sectionHasItems(fallback)) {
    desktopNavSection.value = fallback;
  } else {
    void nextTick(() => {
      desktopNavSection.value = section;
    });
  }
}

function setMobileSection(section: 'channels' | 'direct', opened: boolean) {
  if (opened) {
    mobileNavSection.value = section;
    return;
  }

  if (mobileNavSection.value !== section) {
    return;
  }

  const fallback = section === 'channels' ? 'direct' : 'channels';
  if (sectionHasItems(fallback)) {
    mobileNavSection.value = fallback;
  } else {
    void nextTick(() => {
      mobileNavSection.value = section;
    });
  }
}

function ensureSectionState() {
  const available: Array<'channels' | 'direct'> = [];
  if (sectionHasItems('channels')) available.push('channels');
  if (sectionHasItems('direct')) available.push('direct');

  const fallback = available[0] ?? 'channels';

  if (!available.includes(desktopNavSection.value)) {
    desktopNavSection.value = fallback;
  }
  if (!available.includes(mobileNavSection.value)) {
    mobileNavSection.value = fallback;
  }
}

watch([filteredChannels, filteredDirectChats], () => {
  ensureSectionState();
});

ensureSectionState();

function updateUserStatus(status: PresenceStatus) {
  currentUser.status = status;
}

function handleLogout() {
  console.log('Logout requested');
}

const entityType = computed(() => {
  const type = (route.params.entityType as string | undefined)?.toLowerCase();
  if (type === 'dm' || type === 'channel') {
    return type;
  }
  return 'channel';
});

const entityId = computed(() => (route.params.entityId as string | undefined) ?? null);

const activeChannel = computed<Chat | null>(() => {
  if (entityType.value !== 'channel') return null;
  const id = entityId.value;
  if (!id) return channels.value[0] ?? null;
  return (
    channels.value.find((item) => (item.slug ?? String(item.id)) === id) ??
    channels.value[0] ??
    null
  );
});

const activeDirect = computed<Chat | null>(() => {
  if (entityType.value !== 'dm') return null;
  const id = entityId.value;
  if (!id) return directChats.value[0] ?? null;
  return directChats.value.find((item) => String(item.id) === id) ?? directChats.value[0] ?? null;
});

const activeChannelId = computed<string | undefined>(() => {
  if (entityType.value !== 'channel' || !activeChannel.value) {
    return undefined;
  }
  return activeChannel.value.slug ?? String(activeChannel.value.id);
});

const activeDirectId = computed<string | undefined>(() => {
  if (entityType.value !== 'dm' || !activeDirect.value) {
    return undefined;
  }
  return String(activeDirect.value.id);
});

const chatTitle = computed(() => {
  if (activeChannel.value) {
    return `# ${activeChannel.value.title}`;
  }

  if (entityType.value === 'dm' && activeDirect.value) {
    return `@ ${activeDirect.value.title}`;
  }

  return '# Welcome';
});

const chatDescription = computed(() => {
  if (activeChannel.value?.description) {
    return activeChannel.value.description;
  }

  if (activeDirect.value?.description) {
    return activeDirect.value.description;
  }

  return 'Select a conversation to see the messages.';
});

function navigateToChannel(item: Chat) {
  const slug = item.slug ?? String(item.id);
  if (entityType.value === 'channel' && entityId.value === slug) {
    mobileDrawer.value = false;
    return;
  }

  void router.push({
    name: 'workspace-entity',
    params: { entityType: 'channel', entityId: slug },
  });

  if (isMobile.value) {
    mobileDrawer.value = false;
  }
}

function navigateToDirect(item: Chat) {
  const id = String(item.id);
  if (entityType.value === 'dm' && entityId.value === id) {
    mobileDrawer.value = false;
    return;
  }

  void router.push({
    name: 'workspace-entity',
    params: { entityType: 'dm', entityId: id },
  });

  if (isMobile.value) {
    mobileDrawer.value = false;
  }
}

function ensureValidRoute() {
  if (!channels.value.length) return;

  const currentType = (route.params.entityType as string | undefined)?.toLowerCase();
  const currentId = route.params.entityId as string | undefined;

  const goToFirstChannel = () => {
    const fallback = channels.value[0];
    if (!fallback) {
      return;
    }
    void router.replace({
      name: 'workspace-entity',
      params: { entityType: 'channel', entityId: fallback.slug ?? String(fallback.id) },
    });
  };

  if (!currentType) {
    goToFirstChannel();
    return;
  }

  if (currentType === 'channel') {
    const match = channels.value.find((item) => (item.slug ?? String(item.id)) === currentId);
    if (!match) {
      goToFirstChannel();
    }
    return;
  }

  if (currentType === 'dm') {
    if (!directChats.value.length) {
      goToFirstChannel();
      return;
    }

    const match = directChats.value.find((item) => String(item.id) === currentId);
    if (!match) {
      const fallbackDm = directChats.value[0];
      if (!fallbackDm) {
        goToFirstChannel();
        return;
      }
      void router.replace({
        name: 'workspace-entity',
        params: { entityType: 'dm', entityId: String(fallbackDm.id) },
      });
    }
    return;
  }

  goToFirstChannel();
}

onMounted(() => {
  ensureValidRoute();
});

watch(
  () => [
    route.params.entityType,
    route.params.entityId,
    channels.value.length,
    directChats.value.length,
  ],
  () => {
    ensureValidRoute();
  },
);

watch(isMobile, (value) => {
  if (!value) {
    mobileDrawer.value = false;
  }
});
</script>

<style scoped lang="scss">
.sl-workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
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
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;
  padding: 28px 32px 44px;
  align-items: stretch;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.sl-navigation {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: linear-gradient(180deg, rgba(22, 24, 31, 0.92), rgba(16, 18, 24, 0.96));
  border-radius: 26px;
  padding: 26px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(22px);
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 28px 60px rgba(6, 8, 14, 0.4);
  box-sizing: border-box;
}

.sl-navigation__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
}

.sl-navigation__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sl-navigation__title-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);
}

.sl-navigation__title-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.sl-navigation__search {
  width: 100%;
}

.sl-navigation__lists {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  padding-right: 4px;

  :deep(.q-expansion-item__container) {
    border-radius: 20px;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  :deep(.q-expansion-item__content) {
    padding: 0;
    background: rgba(14, 16, 22, 0.92);
  }

  :deep(.q-expansion-item__toggle-icon) {
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.2s ease;
  }
}

.sl-navigation__accordion {
  background: transparent;
  border-radius: 20px;
}

.sl-navigation__accordion + .sl-navigation__accordion {
  margin-top: 10px;
}

.sl-navigation__accordion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px 18px;
  box-sizing: border-box;
  gap: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));

  @media (min-width: 960px) {
    padding: 18px 22px;
  }
}

.sl-navigation__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.sl-navigation__header-action {
  text-transform: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);

  :deep(.q-btn__content) {
    font-size: 12px;
    gap: 6px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }
}

.sl-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
}
.sl-drawer {
  background: linear-gradient(180deg, #201f2c 0%, #121319 100%);
  color: #f5f6f8;
  padding: 18px 16px 24px;
}

.sl-drawer__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sl-drawer__title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.sl-drawer__lists {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding-right: 4px;

  :deep(.q-expansion-item__container) {
    border-radius: 18px;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  :deep(.q-expansion-item__content) {
    padding: 0;
    background: rgba(16, 18, 25, 0.95);
  }
}

.sl-drawer__create {
  margin-bottom: 12px;
  align-self: flex-start;
  text-transform: none;
  border-radius: 12px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.1);

  :deep(.q-btn__content) {
    gap: 6px;
    font-weight: 600;
    font-size: 12px;
  }
}

.sl-drawer__search {
  margin-bottom: 14px;
}

.sl-drawer__lists::-webkit-scrollbar {
  width: 4px;
}

.sl-drawer__lists::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
}

@media (max-width: 1440px) {
  .sl-main {
    grid-template-columns: 280px minmax(0, 1fr);
    padding: 28px;
    gap: 20px;
  }
}

@media (max-width: 1024px) {
  .sl-main {
    display: flex;
    flex-direction: column;
    padding: 24px 22px 36px;
    gap: 18px;
  }

  .sl-navigation {
    padding: 20px;
  }

  .sl-navigation__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .sl-navigation__lists {
    flex-direction: row;
    gap: 12px;
    overflow-x: hidden;
    overflow-y: visible;
    padding-right: 0;

    :deep(.q-expansion-item__container) {
      background: rgba(0, 0, 0, 0.08);
    }
  }

  .sl-navigation__lists :deep(.sl-list) {
    flex: 1 1 0;
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .sl-main {
    padding: 18px 16px 30px;
    gap: 14px;
  }

  .sl-navigation {
    padding: 16px;
    border-radius: 20px;
  }

  .sl-navigation__lists {
    flex-direction: column;
    gap: 12px;
    padding-right: 0;
  }
}

.sl-navigation__search :deep(.q-field__control) {
  @media (max-width: 600px) {
    min-height: 40px;
  }
}
</style>
