<template>
  <q-layout view="lHh Lpr lFf" class="auth-layout">
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
// Auth layout intentionally minimal for standalone auth screens
</script>

<style scoped>
.auth-layout {
  min-height: 100vh;
}
</style>
