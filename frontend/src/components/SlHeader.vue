<template>
  <header class="sl-header">
    <div class="sl-header__brand">
      <div class="sl-header__brand-main">
        <div class="sl-header__logo">VP</div>
        <div class="sl-header__brand-text">
          <span class="sl-header__brand-name">VP Workspace</span>
          <span class="sl-header__brand-subtitle">Collaboration hub</span>
        </div>
      </div>
      <div v-if="isMobile" class="sl-header__brand-actions">
        <q-btn
          class="sl-header__menu-toggle"
          dense
          flat
          round
          icon="menu"
          color="white"
          aria-label="Open navigation"
          @click="handleToggleNav"
        />
        <div class="sl-header__status sl-header__status--mobile">
          <span
            class="sl-header__status-indicator"
            :style="{ backgroundColor: activeStatus.color }"
          ></span>
          <span class="sl-header__status-text">{{ activeStatus.label }}</span>
        </div>
      </div>
    </div>

    <div class="sl-header__controls">
      <div v-if="!isMobile" class="sl-header__status">
        <span
          class="sl-header__status-indicator"
          :style="{ backgroundColor: activeStatus.color }"
        ></span>
        <span class="sl-header__status-text">{{ activeStatus.label }}</span>
      </div>

      <div class="sl-header__profile">
        <span class="sl-header__profile-name">{{ profile.firstName }} {{ profile.lastName }}</span>
        <span class="sl-header__profile-role">@{{ profile.nickName }}</span>
      </div>

      <q-btn
        class="sl-header__settings-btn"
        dense
        flat
        round
        icon="settings"
        aria-label="Open settings"
      >
        <q-menu
          anchor="bottom right"
          self="top right"
          :style="headerMenuStyle"
          :content-style="headerMenuContentStyle"
          content-class="sl-header__menu-surface"
          dark
          auto-close
        >
          <q-list padding :style="headerMenuListStyle">
            <div class="sl-header__menu-title" :style="headerMenuTitleStyle">Status</div>
            <q-item
              v-for="status in statuses"
              :key="status.value"
              clickable
              v-close-popup
              @click="selectStatus(status.value)"
              :style="
                getMenuItemStyle(status.value === activeStatusValue, hoveredStatus === status.value)
              "
              :class="{ 'q-item--active': status.value === activeStatusValue }"
              @mouseenter="hoveredStatus = status.value"
              @mouseleave="hoveredStatus = null"
            >
              <q-item-section avatar>
                <span :style="getStatusDotStyle(status.color)"></span>
              </q-item-section>
              <q-item-section>
                <div :style="headerMenuLabelStyle">{{ status.label }}</div>
                <div :style="headerMenuDescriptionStyle">
                  {{ status.description }}
                </div>
              </q-item-section>
              <q-item-section side v-if="status.value === activeStatusValue">
                <q-icon name="check" size="16px" color="white" />
              </q-item-section>
            </q-item>
            <q-separator spaced :style="separatorStyle" />
            <div class="sl-header__menu-title" :style="headerMenuTitleStyle">Notifications</div>
            <q-item>
              <q-item-section>
                <div :style="headerMenuLabelStyle">Only mentions</div>
                <div :style="headerMenuDescriptionStyle">
                  Send alerts only when someone mentions you while the app is hidden.
                </div>
              </q-item-section>
              <q-item-section side>
                <q-toggle v-model="notifyOnlyMentions" color="primary" dense keep-color />
              </q-item-section>
            </q-item>
            <q-separator spaced :style="separatorStyle" />
            <q-item
              clickable
              v-close-popup
              @click="handleLogout"
              @mouseenter="logoutHovered = true"
              @mouseleave="logoutHovered = false"
              :style="getLogoutItemStyle(logoutHovered)"
            >
              <q-item-section avatar>
                <q-icon name="logout" color="white" />
              </q-item-section>
              <q-item-section>
                <div :style="headerMenuLabelStyle">Logout</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useChatStore } from 'src/stores/chat-commands-store';

const props = defineProps<{
  isMobile: boolean;
}>();

const emit = defineEmits<{
  (e: 'logout'): void;
  (e: 'toggle-nav'): void;
}>();

const chatCommandsStore = useChatStore();

const statuses = [
  {
    value: 'online',
    label: 'Online',
    color: '#43b581',
    description: 'Available to collaborate',
  },
  {
    value: 'dnd',
    label: 'Do Not Disturb',
    color: '#f04747',
    description: 'Focusing — notifications muted',
  },
  {
    value: 'offline',
    label: 'Offline',
    color: '#64748b',
    description: 'Pause updates until you return',
  },
] as const;

type StatusValue = (typeof statuses)[number]['value'];

const activeStatusValue = computed<StatusValue>({
  get: () => chatCommandsStore.state.status as StatusValue,
  set: (value) => {
    void chatCommandsStore.setStatus(value);
  },
});

const activeStatus = computed(() => {
  return statuses.find((status) => status.value === activeStatusValue.value) ?? statuses[0];
});

const notifyOnlyMentions = computed({
  get: () => chatCommandsStore.state.notifyOnlyMentions,
  set: (value: boolean) => {
    chatCommandsStore.setNotifyOnlyMentions(value);
  },
});

const profile = computed(() => chatCommandsStore.state.profile);

const isMobile = computed(() => props.isMobile);

const headerMenuStyle = {
  borderRadius: '18px',
  overflow: 'hidden',
};

const headerMenuContentStyle = `
  background: linear-gradient(135deg, #08090c 0%, #111624 100%) !important;
  border-radius: 18px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 28px 60px rgba(4, 6, 12, 0.75) !important;
  color: #e2e8f0 !important;
  padding: 12px 0 !important;
`;

const headerMenuListStyle = `
  background: transparent !important;
  padding: 0 8px !important;
  color: #e2e8f0 !important;
`;

const headerMenuTitleStyle = `
  font-size: 12px !important;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.8) !important;
  padding: 6px 12px 10px !important;
`;

const headerMenuLabelStyle = `
  font-weight: 600 !important;
  font-size: 14px !important;
  color: #e2e8f0 !important;
`;

const headerMenuDescriptionStyle = `
  font-size: 12px !important;
  color: rgba(148, 163, 184, 0.75) !important;
`;

const separatorStyle = `
  background-color: rgba(148, 163, 184, 0.18) !important;
  margin: 8px 0 !important;
`;

const hoveredStatus = ref<StatusValue | null>(null);

function getStatusDotStyle(color: string): string {
  return `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${color} !important;
    border: 2px solid rgba(0, 0, 0, 0.45);
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
  `;
}

function getMenuItemStyle(isActive: boolean, isHovered: boolean): string {
  const base = `
    border-radius: 12px;
    padding: 10px 12px;
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    background: transparent !important;
    color: #e2e8f0 !important;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  `;

  if (isActive) {
    return `
      ${base}
      background: linear-gradient(120deg, rgba(129, 140, 248, 0.45), rgba(59, 130, 246, 0.38)) !important;
      color: #ffffff !important;
      box-shadow: 0 12px 28px rgba(18, 37, 87, 0.45);
    `;
  }

  if (isHovered) {
    return `
      ${base}
      background: rgba(148, 163, 184, 0.14) !important;
    `;
  }

  return base;
}

const logoutHovered = ref(false);

function handleToggleNav() {
  emit('toggle-nav');
}

function getLogoutItemStyle(isHovered: boolean): string {
  return `
    border-radius: 12px;
    padding: 10px 12px;
    margin-top: 4px;
    color: ${isHovered ? '#ff8888' : 'rgba(248, 113, 113, 0.9)'} !important;
    background: ${isHovered ? 'rgba(248, 113, 113, 0.14)' : 'transparent'} !important;
    transition: background 0.2s ease, color 0.2s ease;
  `;
}

function selectStatus(value: StatusValue) {
  activeStatusValue.value = value;
}

function handleLogout() {
  emit('logout');
}
</script>

<style scoped lang="scss">
.sl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(90deg, #3f0e40 0%, #2b0a2d 90%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 24px;
}

.sl-header__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  flex-wrap: wrap;
}

.sl-header__brand-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 0 10px;
}

.sl-header__brand-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sl-header__logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(128, 90, 213, 0.95), rgba(56, 189, 248, 0.85));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.sl-header__brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  line-height: 1.1;
  padding-right: 6px;
}

.sl-header__brand-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sl-header__brand-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sl-header__controls {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-left: auto;
}

.sl-header__menu-toggle {
  color: #ffffff;
  background: transparent;
  border-radius: 999px;
  padding: 6px;
  transition: background 0.2s ease;
}

.sl-header__menu-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sl-header__status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}

.sl-header__status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.sl-header__status-text {
  font-size: 13px;
  white-space: nowrap;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.sl-header__status--mobile {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}

.sl-header__profile {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}

.sl-header__profile-name {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
}

.sl-header__profile-role {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.sl-header__settings-btn {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.sl-header__settings-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

:deep(.sl-header__menu-surface) {
  background: linear-gradient(135deg, #08090c 0%, #111624 100%) !important;
  border-radius: 18px !important;
  border: 1px solid rgba(148, 163, 184, 0.18) !important;
  box-shadow: 0 28px 60px rgba(4, 6, 12, 0.75) !important;
  color: #e2e8f0 !important;
  padding: 12px 0 !important;
}

:deep(.sl-header__menu-surface .q-list) {
  background: transparent !important;
  color: #e2e8f0 !important;
  padding: 0 8px !important;
}

:deep(.sl-header__menu-surface .q-item) {
  border-radius: 12px;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

:deep(.sl-header__menu-surface .q-item:hover) {
  background: rgba(148, 163, 184, 0.14) !important;
}

:deep(.sl-header__menu-surface .q-item--active) {
  background: linear-gradient(
    120deg,
    rgba(129, 140, 248, 0.45),
    rgba(59, 130, 246, 0.38)
  ) !important;
  color: #ffffff !important;
  box-shadow: 0 12px 28px rgba(18, 37, 87, 0.45);
}

:deep(.sl-header__menu-surface .q-separator) {
  background-color: rgba(148, 163, 184, 0.18) !important;
  margin: 8px 0 !important;
}

@media (max-width: 900px) {
  .sl-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .sl-header__brand {
    justify-content: space-between;
  }

  .sl-header__controls {
    width: 100%;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .sl-header__profile {
    align-items: flex-start;
  }

  .sl-header__settings-btn {
    margin-left: auto;
  }
}

@media (max-width: 600px) {
  .sl-header__status {
    width: auto;
  }
}
</style>
