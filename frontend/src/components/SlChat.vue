<template>
    <div class="sl-chat">
        <div class="q-pa-md scroll" style="flex: 1;">
          <div><strong>Alice:</strong> Hey there!</div>
          <div><strong>Bob:</strong> Hi Alice 👋</div>
        </div>
        <div class="row items-center q-pa-sm ">
          <q-input
            filled
            v-model="message"
            placeholder="Type a message..."
            dense
            class="col"
            input-class="text-white"
          />
          <q-btn
            color="indigo-5"
            label="Send"
            class="q-ml-sm"
            @click="sendMessage"
          />
        </div>
      </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';

const message = ref('')
function sendMessage() {
  if (message.value.trim()) {
    console.log('Message sent:', message.value)
    message.value = ''
  }
}
</script>
<style scoped>
.sl-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #222529;
}

</style>