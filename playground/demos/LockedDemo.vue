<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const open = ref(false)
</script>

<template>
  <DemoCard
    title="Non-dismissible"
    description="Ignores swipes, overlay taps and Escape. It only closes when the button inside says so."
  >
    <button class="button" type="button" data-testid="open-locked" @click="open = true">
      Review terms
    </button>

    <Drawer
      v-model:open="open"
      fit
      :dismissible="false"
      title="Updated terms"
      description="Please review the changes before you continue."
      data-testid="drawer-locked"
    >
      <p class="prose">
        We changed how we store your preferences. Nothing leaves your device without your
        permission, and you can export or delete your data at any time.
      </p>
      <template #footer>
        <button
          class="button block"
          type="button"
          data-testid="locked-accept"
          @click="open = false"
        >
          Accept
        </button>
      </template>
    </Drawer>
  </DemoCard>
</template>
