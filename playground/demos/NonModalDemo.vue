<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer, type SnapPoint } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const open = ref(false)
const snapPoints: SnapPoint[] = ['140px', 1 / 2, 1]
const snap = ref<SnapPoint>('140px')
const labels = ['Peek', 'Half', 'Full']
</script>

<template>
  <DemoCard
    title="Non-modal"
    description="No overlay: the page stays scrollable and interactive, like the sheet in Maps. The buttons below control the snap point from the outside."
  >
    <button class="button" type="button" data-testid="open-nonmodal" @click="open = !open">
      {{ open ? 'Hide' : 'Show' }} player
    </button>
    <div class="segmented" role="group" aria-label="Snap point">
      <button
        v-for="(point, index) in snapPoints"
        :key="String(point)"
        type="button"
        :aria-pressed="snap === point"
        :data-testid="`nonmodal-snap-${index}`"
        @click="snap = point"
      >
        {{ labels[index] }}
      </button>
    </div>

    <Drawer
      v-model:open="open"
      v-model:snap-point="snap"
      :snap-points="snapPoints"
      :modal="false"
      data-testid="drawer-nonmodal"
    >
      <div class="player">
        <span class="artwork" />
        <span class="list-text">
          <strong>Weightless</strong>
          <small>Marconi Union</small>
        </span>
      </div>
      <p class="prose">
        Non-modal drawers leave focus and scrolling to the page. Use them for panels that live
        alongside your content.
      </p>
    </Drawer>
  </DemoCard>
</template>
