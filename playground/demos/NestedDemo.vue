<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const outer = ref(false)
const inner = ref(false)
</script>

<template>
  <DemoCard
    title="Nested drawers"
    description="Open a drawer from inside another one. The first drawer steps back while the second is on top, and comes forward again as you drag the second away."
  >
    <button class="button" type="button" data-testid="open-nested" @click="outer = true">
      Open drawer
    </button>

    <Drawer
      v-model:open="outer"
      :snap-points="[0.7]"
      title="First drawer"
      description="Nothing special about me."
      data-testid="drawer-nested"
    >
      <p class="prose">Drawers can be nested as deep as you like.</p>
      <button class="button block" type="button" data-testid="open-inner" @click="inner = true">
        Open another drawer
      </button>

      <Drawer
        v-model:open="inner"
        fit
        title="Second drawer"
        description="Drag me down and watch the first drawer."
        data-testid="drawer-inner"
      >
        <p class="prose">Closing this one brings the first drawer back to the front.</p>
        <template #footer="{ close }">
          <button class="button block" type="button" data-testid="inner-close" @click="close">
            Close
          </button>
        </template>
      </Drawer>
    </Drawer>
  </DemoCard>
</template>
