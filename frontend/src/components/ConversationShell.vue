<template>
  <section class="conversation-shell">
    <q-btn
      v-if="props.showDrawerToggle"
      flat
      round
      dense
      icon="menu"
      color="white"
      class="conversation-shell__drawer-btn"
      aria-label="Open navigation"
      @click="emit('toggle-drawer')"
    />

    <div class="conversation-shell__surface">
      <div class="conversation-shell__glyph">
        <q-icon name="auto_awesome" size="32px" />
      </div>
      <h1 class="conversation-shell__title">{{ props.channelName || '# welcome' }}</h1>
      <p class="conversation-shell__description">
        {{ placeholderCopy }}
      </p>
      <div class="conversation-shell__tags">
        <span class="conversation-shell__tag">Coming soon</span>
        <span class="conversation-shell__tag">Realtime sync</span>
        <span class="conversation-shell__tag">History backlog</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  showDrawerToggle?: boolean;
  channelName?: string;
  channelDescription?: string;
}>();

const emit = defineEmits<{
  (event: 'toggle-drawer'): void;
}>();

const placeholderCopy = computed(() => {
  if (props.channelDescription) {
    return props.channelDescription;
  }
  return 'This space is waiting for the chat module. Drop-ins from the realtime bridge will land here once the integration ships.';
});
</script>

<style scoped lang="scss">
.conversation-shell {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28px;
  background: linear-gradient(155deg, rgba(36, 38, 48, 0.94), rgba(16, 17, 24, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.04);
  min-height: 0;
  box-shadow: 0 28px 60px rgba(6, 8, 14, 0.45);
  padding: 60px 40px;
  text-align: center;

  @media (max-width: 960px) {
    padding: 48px 32px;
  }

  @media (max-width: 720px) {
    padding: 36px 18px;
  }
}

.conversation-shell__drawer-btn {
  position: absolute;
  top: 18px;
  left: 18px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.12);

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }
}

.conversation-shell__surface {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: min(560px, 100%);
  padding: 48px 42px;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 32px 60px rgba(10, 12, 20, 0.5);
  color: #f5f6f8;

  @media (max-width: 720px) {
    padding: 30px 22px;
    border-radius: 24px;
    gap: 16px;
  }
}

.conversation-shell__glyph {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(126, 118, 255, 0.22);
  border: 1px solid rgba(139, 136, 255, 0.44);
  color: #d9dcff;
  box-shadow: 0 14px 28px rgba(86, 92, 255, 0.35);
}

.conversation-shell__title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin: 0;

  @media (max-width: 720px) {
    font-size: 22px;
  }
}

.conversation-shell__description {
  font-size: 15px;
  line-height: 1.7;
  color: rgba(245, 246, 248, 0.78);
  margin: 0;

  @media (max-width: 720px) {
    font-size: 14px;
  }

  @media (max-width: 480px) {
    font-size: 13px;
    line-height: 1.6;
  }
}

.conversation-shell__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;

  @media (max-width: 480px) {
    gap: 8px;
  }
}

.conversation-shell__tag {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.82);

  @media (max-width: 480px) {
    font-size: 11px;
    padding: 5px 10px;
  }
}
</style>
