<template>
  <div class="sl-workspace">
    <sl-header />
    <div class="sl-main">
        <sl-sidebar />
        <div class="sl-container-nav-chats">
            <sl-list :list="channels"  title="Channels"/>
            <sl-list :list="directChats" title="Direct Messages"/>
        </div>
        <sl-chat />
    </div>
  </div>
</template>


<script setup lang="ts">
import SlHeader from 'src/components/SlHeader.vue'
import SlSidebar from 'src/components/SlSidebar.vue'
import SlList from 'src/components/SlList.vue'
import SlChat from 'src/components/SlChat.vue'
import type { Chat } from 'src/types'

const channels: Chat[] = [ {id: 1, title: 'general'}, {id: 2, title: 'random'}, {id: 3, title: 'projects'} ]
const directChats: Chat[] = [ {id: 1, title: 'Oleksii'}, {id: 2, title: 'Sofiia'} ]

</script>

<style scoped lang="scss">
.sl-workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1d21;
  color: #fff;
  font-family: 'Inter', sans-serif;
}

.sl-main {
  display: flex;
  flex: 1;
}



</style>
