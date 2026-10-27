<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from '../../../src'
import { state } from './state'

const nestedOpen = ref(false)

function onOpen(value: boolean) {
  if (!state.keepOpen) state.open = value
}

function onDrag(progress: number) {
  state.progress.push(progress)
}
</script>

<template>
  <div class="page" data-vnd-background>
    <button type="button" data-testid="trigger" @click="state.open = true">Open</button>

    <Drawer
      v-bind="state.props"
      v-model:snap-point="state.snap"
      :open="state.open"
      data-testid="drawer"
      @update:open="onOpen"
      @opened="state.events.push('opened')"
      @closed="state.events.push('closed')"
      @drag="onDrag"
    >
      <template #default="{ close, snapPoint, expanded }">
        <p data-testid="slot-state">{{ String(snapPoint) }} {{ expanded }}</p>
        <button type="button" data-testid="inner-close" @click="close">Close</button>
        <input data-testid="input" aria-label="Name" />
        <button
          v-if="state.nested"
          type="button"
          data-testid="open-nested"
          @click="nestedOpen = true"
        >
          Nested
        </button>
        <div v-for="n in state.items" :key="n" class="item" style="height: 60px">Item {{ n }}</div>

        <Drawer v-if="state.nested" v-model:open="nestedOpen" fit data-testid="nested">
          <p>Nested drawer</p>
        </Drawer>
      </template>

      <template v-if="state.header" #header="{ snapPoint }">
        <strong data-testid="custom-header">Header {{ String(snapPoint) }}</strong>
      </template>

      <template v-if="state.footer" #footer="{ close }">
        <button type="button" data-testid="footer-close" @click="close">Done</button>
      </template>
    </Drawer>
  </div>
</template>
