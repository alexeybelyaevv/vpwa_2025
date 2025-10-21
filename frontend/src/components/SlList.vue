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
import type { Chat } from 'src/types'
defineProps<{
    list: Chat[],
    title: string
}>()
</script>
<style scoped>
.sl-list {
  width: 220px;
  background-color: #1e1f22;
  border-right: 1px solid #2e2f33;
  padding: 15px;
  h3 {
    margin-bottom: 10px;
    color: #bbb;
    font-size: 14px;
  }
  ul {
    list-style: none;
    padding: 0;
    li {
      padding: 6px 0;
      color: #ccc;
      cursor: pointer;
      &:hover {
        color: #fff;
      }
    }
  }
}
</style>