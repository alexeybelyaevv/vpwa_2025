<template>
  <header class="workspace-header">
    <div class="workspace-header__row">
      <div class="workspace-header__logo">Logo</div>

      <div class="workspace-header__controls">
        <q-btn
          flat
          round
          dense
          icon="notifications_none"
          color="white"
          aria-label="Show notifications"
          class="workspace-header__icon-btn"
        />
        <q-btn
          flat
          dense
          round
          class="workspace-header__avatar-btn"
          aria-label="Open status menu"
        >
          <q-avatar size="32px" class="workspace-header__avatar">
            <span>{{ userInitials }}</span>
          </q-avatar>

          <q-menu
            dark
            anchor="bottom right"
            self="top right"
            transition-show="jump-down"
            transition-hide="jump-up"
            class="workspace-header__menu"
          >
            <div class="workspace-header__menu-surface">
              <div class="workspace-header__menu-title">Presence</div>
              <div class="workspace-header__status-options">
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  type="button"
                  class="workspace-header__status-option"
                  :class="{ 'is-active': option.value === currentStatus }"
                  v-close-popup
                  @click="updateStatus(option.value)"
                >
                  <span class="workspace-header__status-dot" :class="`is-${option.value}`"></span>
                  <span class="workspace-header__status-label">{{ option.label }}</span>
                </button>
              </div>
              <q-separator dark spaced class="workspace-header__menu-separator" />
              <button
                type="button"
                class="workspace-header__menu-action is-danger"
                @click="handleLogout"
              >
                <q-icon name="logout" size="18px" />
                <span>Log out</span>
              </button>
            </div>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <div class="workspace-header__search">
      <q-input
        v-model="search"
        dense
        standout
        rounded
        bg-color="grey-9"
        input-class="text-white"
        class="workspace-header__search-input"
        placeholder="ssh remote-cluster"
      >
        <template #prepend>
          <q-icon name="terminal" size="18px" class="text-grey-4" />
        </template>
      </q-input>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PresenceStatus, UserProfile, WorkspaceSummary } from 'src/types';

const props = defineProps<{
  user: UserProfile;
  workspace: WorkspaceSummary;
}>();

const emit = defineEmits<{
  (event: 'update:status', status: PresenceStatus): void;
  (event: 'logout'): void;
}>();

const search = ref('');
const currentStatus = ref<PresenceStatus>(props.user.status);

const statusOptions: Array<{ value: PresenceStatus; label: string }> = [
  { value: 'online', label: 'Online' },
  { value: 'away', label: 'Away' },
  { value: 'dnd', label: 'Do not disturb' },
  { value: 'offline', label: 'Offline' },
];

const userInitials = computed(() => extractInitials(props.user.name));

watch(
  () => props.user.status,
  (next) => {
    currentStatus.value = next;
  },
);

function updateStatus(status: PresenceStatus) {
  currentStatus.value = status;
  emit('update:status', status);
}

function handleLogout() {
  emit('logout');
}

function extractInitials(input: string): string {
  const tokens = input.split(' ').filter(Boolean);
  if (!tokens.length) {
    return '?';
  }

  if (tokens.length === 1) {
    return tokens[0]!.substring(0, 2).toUpperCase() || '?';
  }

  const first = tokens[0]?.[0] ?? '';
  const last = tokens.at(-1)?.[0] ?? '';
  const combined = `${first}${last}`.trim();
  return combined ? combined.toUpperCase() : '?';
}
</script>

<style scoped lang="scss">
.workspace-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 14px 24px;
  background: rgba(35, 37, 45, 0.94);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(22px);
  color: #f5f6f8;

  @media (min-width: 960px) {
    flex-direction: row;
    align-items: center;
    gap: 24px;
  }

  @media (max-width: 720px) {
    padding: 12px 16px 16px;
    gap: 14px;
  }
}

.workspace-header__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  @media (min-width: 960px) {
    display: contents;
  }
}

.workspace-header__logo {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  @media (min-width: 960px) {
    order: 0;
  }
}

.workspace-header__search {
  display: flex;
  align-items: center;

  @media (min-width: 960px) {
    flex: 1 1 auto;
    order: 1;
  }
}

.workspace-header__search-input {
  width: 100%;
  max-width: 540px;

  @media (max-width: 960px) {
    max-width: none;
  }
}

.workspace-header__controls {
  display: flex;
  align-items: center;
  gap: 10px;

  @media (min-width: 960px) {
    order: 2;
    justify-content: flex-end;
    gap: 12px;
  }
}

.workspace-header__icon-btn {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.workspace-header__avatar-btn {
  padding: 0;
}

.workspace-header__avatar {
  background: linear-gradient(135deg, #5865f2, #7b73ff);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.workspace-header__menu {
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.workspace-header__menu-surface {
  min-width: 220px;
  padding: 16px 14px;
  border-radius: 18px;
  background: rgba(14, 15, 21, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f5f6f8;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
}

.workspace-header__menu-title {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.workspace-header__menu-separator {
  margin: 12px 0;
  opacity: 0.5;
}

.workspace-header__status-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workspace-header__status-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border 0.2s ease,
    transform 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  &.is-active {
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.16);
  }
}

.workspace-header__menu-action {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border 0.2s ease,
    transform 0.2s ease;

  :deep(.q-icon) {
    color: rgba(198, 201, 255, 0.8);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
  }

  &.is-danger {
    background: rgba(241, 94, 108, 0.14);
    border-color: rgba(241, 94, 108, 0.2);

    :deep(.q-icon) {
      color: #f27785;
    }

    &:hover {
      background: rgba(241, 94, 108, 0.22);
    }
  }
}

.workspace-header__status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;

  &.is-online {
    background: #3dc172;
    box-shadow: 0 0 0 4px rgba(61, 193, 114, 0.16);
  }

  &.is-away {
    background: #f0c75e;
    box-shadow: 0 0 0 4px rgba(240, 199, 94, 0.16);
  }

  &.is-dnd {
    background: #f15e6c;
    box-shadow: 0 0 0 4px rgba(241, 94, 108, 0.16);
  }

  &.is-offline {
    background: rgba(255, 255, 255, 0.3);
  }
}

.workspace-header__status-label {
  font-size: 13px;
}
</style>
