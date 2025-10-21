<template>
  <section class="sl-list" :class="{ 'sl-list--compact': hideHeader }">
    <header v-if="!hideHeader" class="sl-list__header">
      <h3 class="sl-list__title">{{ title }}</h3>
      <q-btn
        v-if="actionIcon || actionLabel"
        flat
        dense
        round
        color="white"
        :icon="actionIcon || 'add'"
        class="sl-list__action"
        :aria-label="actionLabel || `Add to ${title}`"
      />
    </header>

    <ul class="sl-list__items">
      <li
        v-for="item in list"
        :key="itemKey(item)"
        class="sl-list__item"
        :class="{
          'is-active': String(activeId ?? '') === itemKey(item),
          'is-muted': item.muted,
          'is-selectable': selectable,
          'is-invited': item.invited,
        }"
        :tabindex="selectable ? 0 : -1"
        :role="selectable ? 'button' : 'presentation'"
        @click="selectable && handleSelect(item)"
        @keyup.enter="selectable && handleSelect(item)"
        @keyup.space="selectable && handleSelect(item)"
      >
        <span v-if="accent === 'hash'" class="sl-list__prefix" aria-hidden="true">#</span>
        <span v-else-if="accent === 'status'" class="sl-list__prefix" aria-hidden="true">
          <span class="sl-status-dot" :class="`is-${item.status || 'offline'}`"></span>
        </span>
        <q-icon
          v-else-if="accent === 'icon' && item.icon"
          :name="item.icon"
          size="16px"
          class="sl-list__prefix"
        />

        <div class="sl-list__content">
          <span class="sl-list__label">{{ item.title }}</span>
          <span v-if="item.description" class="sl-list__description">{{ item.description }}</span>
        </div>

        <span v-if="item.unread" class="sl-list__badge" aria-label="Unread messages">
          {{ item.unread }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { Chat } from 'src/types';

withDefaults(
  defineProps<{
    list: Chat[];
    title: string;
    accent?: 'hash' | 'status' | 'icon';
    actionIcon?: string;
    actionLabel?: string;
    activeId?: number | string | undefined;
    selectable?: boolean;
    hideHeader?: boolean;
  }>(),
  {
    accent: 'hash' as const,
    selectable: true,
    hideHeader: false,
  },
);

const emit = defineEmits<{
  (event: 'select', item: Chat): void;
}>();

function handleSelect(item: Chat) {
  emit('select', item);
}

function itemKey(item: Chat): string {
  return item.slug ?? String(item.id);
}
</script>

<style scoped lang="scss">
.sl-list {
  background: linear-gradient(180deg, rgba(26, 30, 39, 0.92), rgba(18, 20, 27, 0.94));
  border-radius: 22px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  box-shadow: 0 18px 38px rgba(5, 7, 14, 0.42);

  @media (max-width: 720px) {
    padding: 18px;
    border-radius: 18px;
  }

  @media (max-width: 600px) {
    padding: 16px;
    gap: 12px;
  }
}

.sl-list--compact {
  padding-top: 18px;
}

.sl-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sl-list__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
  margin: 0;
}

.sl-list__action :deep(.q-icon) {
  color: rgba(255, 255, 255, 0.86);
}

.sl-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;

  @media (max-width: 600px) {
    gap: 4px;
    overflow: visible;
    padding-right: 0;
  }
}

.sl-list__items::-webkit-scrollbar {
  width: 4px;
}

.sl-list__items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
}

.sl-list__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
  cursor: default;
  backdrop-filter: blur(6px);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    border: 1px solid transparent;
    transition: border 0.2s ease;
  }

  &.is-selectable {
    cursor: pointer;
  }

  &.is-selectable:hover {
    background: rgba(123, 119, 255, 0.18);
    color: #f6f7fb;
    transform: translateY(-2px);

    &::after {
      border-color: rgba(143, 149, 255, 0.26);
    }
  }

  &.is-active {
    background: rgba(123, 119, 255, 0.24);
    color: #ffffff;

    &::after {
      border-color: rgba(143, 149, 255, 0.46);
    }
  }

  &.is-invited {
    background: rgba(123, 119, 255, 0.3);

    &::after {
      border-color: rgba(162, 166, 255, 0.44);
    }
  }

  &.is-muted {
    color: rgba(255, 255, 255, 0.54);
  }

  @media (max-width: 600px) {
    padding: 10px 14px;
    font-size: 13px;
  }
}

.sl-list__prefix {
  min-width: 18px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.sl-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05);

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
    background: rgba(255, 255, 255, 0.4);
    box-shadow: none;
  }
}

.sl-list__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.sl-list__label {
  font-weight: 600;
  letter-spacing: 0.01em;
  color: inherit;
}

.sl-list__description {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.58);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-list__badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(247, 99, 179, 0.24);
  color: rgba(255, 255, 255, 0.92);
}
</style>
