<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer, type SnapPoint } from 'vue-native-drawer'
import DemoCard from '../components/DemoCard.vue'

const open = ref(false)
const snap = ref<SnapPoint>(1 / 2)
const name = ref('Taylor')

function show() {
  snap.value = 1
  open.value = true
}
</script>

<template>
  <DemoCard
    title="Scaled background"
    description="Opens fully expanded and pushes the page back like a stack of iOS cards. Drag it down to half height and the page comes forward again."
  >
    <button class="button" type="button" data-testid="open-scale" @click="show">
      Edit profile
    </button>

    <Drawer
      v-model:open="open"
      v-model:snap-point="snap"
      :snap-points="[1 / 2, 1]"
      scale-background
      title="Edit profile"
      data-testid="drawer-scale"
    >
      <form class="form" @submit.prevent="open = false">
        <label class="field">
          <span>Name</span>
          <input v-model="name" autocomplete="name" />
        </label>
        <label class="field">
          <span>Bio</span>
          <textarea rows="4">Designer and weekend baker.</textarea>
        </label>
        <button class="button block" type="submit">Save</button>
      </form>
    </Drawer>
  </DemoCard>
</template>
