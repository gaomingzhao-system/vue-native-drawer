<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer, type SnapPoint } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'
import { places } from '../data'

const open = ref(false)
const snap = ref<SnapPoint>(1 / 3)

const label = (point: SnapPoint) => (point === 1 ? 'full' : point === 1 / 2 ? '1/2' : '1/3')
</script>

<template>
  <DemoCard
    title="Snap points"
    description="Opens at a third of the screen. Drag up to half and full height, flick to skip ahead and drag down to close. The list scrolls once the drawer is fully open."
  >
    <button class="button" type="button" data-testid="open-snap" @click="open = true">
      Open drawer
    </button>
    <span class="chip" data-testid="snap-value">{{ label(snap) }}</span>

    <Drawer
      v-model:open="open"
      v-model:snap-point="snap"
      title="Nearby"
      description="20 places within walking distance"
      data-testid="drawer-snap"
    >
      <ul class="list">
        <li v-for="place in places" :key="place.name" class="list-item">
          <span class="avatar" :style="{ background: place.color }">{{ place.name[0] }}</span>
          <span class="list-text">
            <strong>{{ place.name }}</strong>
            <small>{{ place.kind }}</small>
          </span>
          <span class="list-meta">{{ place.distance }}</span>
        </li>
      </ul>
      <template #footer="{ close }">
        <button class="button block" type="button" data-testid="snap-done" @click="close">
          Done
        </button>
      </template>
    </Drawer>
  </DemoCard>
</template>
