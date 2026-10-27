<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const open = ref(false)
</script>

<template>
  <DemoCard
    title="Pixel snap points"
    description="Snap points in pixels, and an overlay that only fades in on the way to the last one."
  >
    <button class="button" type="button" data-testid="open-fade" @click="open = true">
      Open drawer
    </button>

    <Drawer
      v-model:open="open"
      :snap-points="['148px', '355px', 1]"
      :fade-from="2"
      title="The hidden details"
      description="2 modules, 27 hours of video"
      data-testid="drawer-fade"
    >
      <p class="prose">
        The world of user interface design is an intricate landscape filled with hidden details and
        nuance. Drag up to read on.
      </p>
      <p v-for="n in 6" :key="n" class="prose">
        Module {{ n }}: layers of UI, typography, animation curves and the small touches that make
        an interface feel alive.
      </p>
    </Drawer>
  </DemoCard>
</template>
