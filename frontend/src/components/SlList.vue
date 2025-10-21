<template>
  <div class="sl-list">
    <h3>{{ title }}</h3>
    <ul>
      <li v-for="item in list" :key="item.title">
        {{ item.title }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { Chat } from 'src/types';

defineProps<{
  title: string;
  list: Chat[];
}>();
</script>
