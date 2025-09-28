<template>
<q-page class="row items-center justify-evenly q-pa-lg q-gutter-md">
    <example-component
      title="Example component"
      active
      :todos="todos"
      :meta="meta"
    ></example-component>

    <q-card class="api-card q-pa-md" flat bordered>
      <q-card-section>
        <div class="text-h6">Backend ping</div>
      </q-card-section>
      <q-card-section>
        <div v-if="apiState === 'loading'">Запрос выполняется…</div>
        <div v-else-if="apiState === 'error'" class="text-negative">
          Ошибка: {{ apiError }}
        </div>
        <pre v-else class="api-response">{{ apiPayload }}</pre>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Todo, Meta } from 'components/models';
import ExampleComponent from 'components/ExampleComponent.vue';

const todos = ref<Todo[]>([
  {
    id: 1,
    content: 'ct1',
  },
  {
    id: 2,
    content: 'ct2',
  },
  {
    id: 3,
    content: 'ct3',
  },
  {
    id: 4,
    content: 'ct4',
  },
  {
    id: 5,
    content: 'ct5',
  },
]);

const meta = ref<Meta>({
  totalCount: 1200,
});

type ApiState = 'idle' | 'loading' | 'success' | 'error';

const apiState = ref<ApiState>('idle');
const apiPayload = ref<string>('');
const apiError = ref<string>('');

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3333';

onMounted(async () => {
  apiState.value = 'loading';
  try {
    const response = await fetch(apiBaseUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    apiPayload.value = JSON.stringify(payload, null, 2);
    apiState.value = 'success';
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : String(error);
    apiState.value = 'error';
  }
});
</script>

<style scoped>
.api-card {
  width: 360px;
}

.api-response {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
