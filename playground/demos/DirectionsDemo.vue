<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const top = ref(false)
const left = ref(false)
const right = ref(false)

const menu = ['Home', 'Library', 'Downloads', 'Settings', 'Help']
</script>

<template>
  <DemoCard
    title="Directions"
    description="Bottom is the default. Drawers can also come from the top or slide in from either side."
  >
    <button class="button" type="button" data-testid="open-top" @click="top = true">Top</button>
    <button class="button" type="button" data-testid="open-left" @click="left = true">Left</button>
    <button class="button" type="button" data-testid="open-right" @click="right = true">
      Right
    </button>

    <Drawer v-model:open="top" direction="top" fit data-testid="drawer-top">
      <div class="notice">
        <span class="avatar" style="background: #34c759">✓</span>
        <span class="list-text">
          <strong>Backup complete</strong>
          <small>Swipe up to dismiss</small>
        </span>
      </div>
    </Drawer>

    <Drawer v-model:open="left" direction="left" title="Menu" data-testid="drawer-left">
      <template #default="{ close }">
        <nav class="group">
          <button v-for="item in menu" :key="item" class="group-item" type="button" @click="close">
            {{ item }}
          </button>
        </nav>
      </template>
    </Drawer>

    <Drawer
      v-model:open="right"
      direction="right"
      title="Filters"
      description="Swipe right to close"
      data-testid="drawer-right"
    >
      <div class="group">
        <label
          v-for="filter in ['Open now', 'Top rated', 'Free Wi-Fi', 'Outdoor seating']"
          :key="filter"
          class="group-item toggle"
        >
          {{ filter }}
          <input type="checkbox" />
        </label>
      </div>
    </Drawer>
  </DemoCard>
</template>
