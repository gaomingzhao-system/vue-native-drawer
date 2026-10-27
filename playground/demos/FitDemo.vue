<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const open = ref(false)
const last = ref('Nothing yet')

const targets = [
  { name: 'Messages', color: '#34c759' },
  { name: 'Mail', color: '#007aff' },
  { name: 'Notes', color: '#ffcc00' },
  { name: 'Reminders', color: '#ff9500' },
]
const actions = ['Copy link', 'Add to favorites', 'Add bookmark']
</script>

<template>
  <DemoCard
    title="Fit content"
    description="An action sheet that is exactly as tall as its content. Drag it down, tap outside or press Escape to dismiss."
  >
    <button class="button" type="button" data-testid="open-fit" @click="open = true">Share…</button>
    <span class="chip" data-testid="fit-result">{{ last }}</span>

    <Drawer v-model:open="open" fit title="Share" data-testid="drawer-fit">
      <template #default="{ close }">
        <div class="share-row">
          <button
            v-for="target in targets"
            :key="target.name"
            class="share-target"
            type="button"
            @click="((last = target.name), close())"
          >
            <span class="share-icon" :style="{ background: target.color }" />
            {{ target.name }}
          </button>
        </div>
        <div class="group">
          <button
            v-for="action in actions"
            :key="action"
            class="group-item"
            type="button"
            @click="((last = action), close())"
          >
            {{ action }}
          </button>
          <button
            class="group-item destructive"
            type="button"
            data-testid="fit-delete"
            @click="((last = 'Delete'), close())"
          >
            Delete
          </button>
        </div>
      </template>
    </Drawer>
  </DemoCard>
</template>
