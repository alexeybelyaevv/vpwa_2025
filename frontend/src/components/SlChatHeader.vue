<template>
  <div class="sl-chat-header">
    <h2 class="sl-chat-header-title">{{ chatTitle }}</h2>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  chatTitle: string
}>()
</script>

<style scoped>
.sl-chat-header {
  background: linear-gradient(90deg, #1a1c22 0%, #222529 100%);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 10;
  font-family: 'Poppins', sans-serif;
}

.sl-chat-header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  text-align: left;
}
</style>