<script setup vapor lang="ts">
import { computed, useAttrs, useId, useTemplateRef } from 'vue'
import { useDrawer } from './composables/useDrawer'
import { CLOSE_THRESHOLD, DEFAULT_SNAP_POINTS } from './constants'
import type { DrawerExposed, DrawerProps, DrawerSlotProps, SnapPoint } from './types'

defineOptions({ name: 'Drawer', inheritAttrs: false })

const props = withDefaults(defineProps<DrawerProps>(), {
  snapPoints: undefined,
  direction: 'bottom',
  dismissible: true,
  modal: true,
  fit: false,
  handle: undefined,
  handleOnly: false,
  fadeFrom: 0,
  scaleBackground: false,
  closeThreshold: CLOSE_THRESHOLD,
  title: undefined,
  description: undefined,
  to: 'body',
})

/** Whether the drawer is open. */
const open = defineModel<boolean>('open', { default: false })
/** The snap point the drawer rests at. Resets to the first one when the drawer closes. */
const snapPoint = defineModel<SnapPoint>('snapPoint')

const emit = defineEmits<{
  /** While dragging: how much of the drawer is visible, from 0 to 1. */
  drag: [progress: number]
  /** The opening animation has finished. */
  opened: []
  /** The closing animation has finished and the drawer is gone. */
  closed: []
}>()

const slots = defineSlots<{
  default?: (props: DrawerSlotProps) => unknown
  header?: (props: DrawerSlotProps) => unknown
  footer?: (props: DrawerSlotProps) => unknown
}>()

const attrs = useAttrs()
const id = useId()

const vertical = computed(() => props.direction === 'top' || props.direction === 'bottom')
const snapPoints = computed<readonly SnapPoint[]>(() => {
  if (props.snapPoints?.length) return props.snapPoints
  return props.fit || !vertical.value ? [1] : DEFAULT_SNAP_POINTS
})
const showHandle = computed(() => props.handle ?? vertical.value)
const hasHeader = computed(() => !!(slots.header || props.title || props.description))

const {
  mounted,
  visible,
  dragging,
  expanded,
  activeSnapPoint,
  show,
  close,
  snapTo,
  onPointerDown,
  onOverlayClick,
  onHandleClick,
} = useDrawer({
  open,
  snapPoint,
  snapPoints: () => snapPoints.value,
  direction: () => props.direction,
  dismissible: () => props.dismissible,
  modal: () => props.modal,
  fadeFrom: () => props.fadeFrom,
  scaleBackground: () => props.scaleBackground,
  closeThreshold: () => props.closeThreshold,
  handleOnly: () => props.handleOnly,
  panel: useTemplateRef<HTMLElement>('panel'),
  overlay: useTemplateRef<HTMLElement>('overlay'),
  content: useTemplateRef<HTMLElement>('content'),
  footer: useTemplateRef<HTMLElement>('footer'),
  onDrag: (progress) => emit('drag', progress),
  onOpened: () => emit('opened'),
  onClosed: () => emit('closed'),
})

const slotProps = computed<DrawerSlotProps>(() => ({
  close,
  snapTo,
  snapPoint: activeSnapPoint.value,
  expanded: expanded.value,
}))

defineExpose<DrawerExposed>({ show, close, snapTo })
</script>

<template>
  <Teleport :to="to || 'body'" :disabled="to === false">
    <div
      v-if="mounted && modal"
      ref="overlay"
      class="vnd-overlay"
      aria-hidden="true"
      :data-state="visible ? 'open' : 'closed'"
      @click="onOverlayClick"
    />
    <div
      v-if="mounted"
      ref="panel"
      v-bind="attrs"
      class="vnd-drawer"
      role="dialog"
      tabindex="-1"
      data-vnd-drawer=""
      :aria-modal="modal || undefined"
      :aria-labelledby="title ? `${id}-title` : undefined"
      :aria-describedby="description ? `${id}-description` : undefined"
      :data-direction="direction"
      :data-state="visible ? 'open' : 'closed'"
      :data-expanded="expanded || undefined"
      :data-dragging="dragging || undefined"
      :data-fit="fit || undefined"
      @pointerdown="onPointerDown"
    >
      <div v-if="showHandle" class="vnd-handle" aria-hidden="true" @click="onHandleClick" />
      <div v-if="hasHeader" class="vnd-header">
        <slot name="header" v-bind="slotProps">
          <h2 v-if="title" :id="`${id}-title`" class="vnd-title">{{ title }}</h2>
          <p v-if="description" :id="`${id}-description`" class="vnd-description">
            {{ description }}
          </p>
        </slot>
      </div>
      <div ref="content" class="vnd-content">
        <slot v-bind="slotProps" />
      </div>
      <div v-if="slots.footer" ref="footer" class="vnd-footer">
        <slot name="footer" v-bind="slotProps" />
      </div>
    </div>
  </Teleport>
</template>

<style src="./style.css"></style>
