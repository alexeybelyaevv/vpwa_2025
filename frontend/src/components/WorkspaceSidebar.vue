<template>
  <aside class="workspace-sidebar" aria-label="Workspace switcher">
    <div class="workspace-sidebar__brand" aria-hidden="true">
      <q-icon name="auto_awesome" size="20px" />
    </div>

    <nav class="workspace-sidebar__list" aria-label="Available workspaces">
      <button
        v-for="workspace in workspaces"
        :key="workspace.id"
        type="button"
        class="workspace-sidebar__item"
        :class="{ 'is-active': workspace.id === activeWorkspaceId }"
        :style="{ '--accent-color': workspace.color }"
        :aria-current="workspace.id === activeWorkspaceId ? 'page' : false"
        @click="handleSelect(workspace.id)"
      >
        <span class="workspace-sidebar__initials">{{ workspace.initials }}</span>
        <q-tooltip anchor="center right" self="center left" class="workspace-sidebar__tooltip">
          <div class="workspace-sidebar__tooltip-name">{{ workspace.name }}</div>
          <div v-if="workspace.plan" class="workspace-sidebar__tooltip-plan">
            {{ workspace.plan }}
          </div>
        </q-tooltip>
      </button>
    </nav>

    <div class="workspace-sidebar__footer">
      <q-btn
        round
        dense
        flat
        icon="add"
        aria-label="Create workspace"
        class="workspace-sidebar__action"
      />
      <q-btn
        round
        dense
        flat
        icon="settings"
        aria-label="Workspace preferences"
        class="workspace-sidebar__action workspace-sidebar__action--muted"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { WorkspaceBadge } from 'src/types';

const props = defineProps<{
  workspaces: Array<WorkspaceBadge & { plan?: string }>;
  activeWorkspaceId?: number | null;
}>();

const emit = defineEmits<{
  (event: 'select', workspaceId: number): void;
}>();

function handleSelect(id: number) {
  if (id === props.activeWorkspaceId) {
    return;
  }
  emit('select', id);
}
</script>

<style scoped lang="scss">
.workspace-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  border-radius: 28px;
  padding: 22px 12px 24px;
  background: linear-gradient(180deg, rgba(18, 21, 28, 0.82), rgba(12, 14, 20, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(26px);
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}

.workspace-sidebar__brand {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #ffffff;
  box-shadow: 0 18px 30px rgba(104, 109, 255, 0.35);
}

.workspace-sidebar__list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  overflow-y: auto;
  padding: 4px 0;
}

.workspace-sidebar__list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.workspace-sidebar__item {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  display: grid;
  place-items: center;
  color: #f5f6f8;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.25s ease,
    background 0.25s ease;
  box-shadow: 0 10px 20px rgba(10, 11, 16, 0.35);
}

.workspace-sidebar__item::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent-color, #5865f2) 74%, transparent);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.workspace-sidebar__item::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  transition: border 0.2s ease;
}

.workspace-sidebar__item:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 28px rgba(10, 11, 16, 0.45);
}

.workspace-sidebar__item:hover::before {
  opacity: 0.6;
}

.workspace-sidebar__item.is-active {
  background: rgba(255, 255, 255, 0.12);
}

.workspace-sidebar__item.is-active::before {
  opacity: 0.85;
}

.workspace-sidebar__item.is-active::after {
  border-color: color-mix(in srgb, var(--accent-color, #5865f2) 65%, #ffffff 10%);
}

.workspace-sidebar__initials {
  position: relative;
  z-index: 1;
}

.workspace-sidebar__tooltip {
  background: rgba(13, 14, 22, 0.96);
  color: #f5f6f8;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
}

.workspace-sidebar__tooltip-name {
  font-weight: 600;
}

.workspace-sidebar__tooltip-plan {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.workspace-sidebar__footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workspace-sidebar__action {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  color: #f5f6f8;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  :deep(.q-btn__content) {
    font-size: 18px;
  }
}

.workspace-sidebar__action:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14);
}

.workspace-sidebar__action--muted {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

.workspace-sidebar__action--muted:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 1024px) {
  .workspace-sidebar {
    flex-direction: row;
    align-items: center;
    padding: 16px 18px;
    gap: 18px;
    border-radius: 22px;
    width: 100%;
  }

  .workspace-sidebar__list {
    flex-direction: row;
    justify-content: flex-start;
    gap: 12px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .workspace-sidebar__footer {
    flex-direction: row;
    gap: 10px;
  }
}
</style>
