<script setup lang="ts">
import { computed, normalizeStyle, useAttrs, useId, useTemplateRef, type CSSProperties } from 'vue'
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

// The overlay is a sibling, so it cannot inherit custom properties from the panel.
// Read attrs during rendering: useAttrs() is updated by Vue but is not reactive.
const overlayStyle = () => {
  const style = normalizeStyle([attrs.style]) as CSSProperties | undefined
  return {
    '--vnd-overlay-color': style?.['--vnd-overlay-color'],
    '--vnd-z-index': style?.['--vnd-z-index'],
  }
}

const vertical = computed(() => props.direction === 'top' || props.direction === 'bottom')
const snapPoints = computed<readonly SnapPoint[]>(() => {
  if (props.snapPoints?.length) return props.snapPoints
  return props.fit || !vertical.value ? [1] : DEFAULT_SNAP_POINTS
})
const showHandle = computed(() => props.handle ?? vertical.value)

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
      :style="overlayStyle()"
      :data-state="visible ? 'open' : 'closed'"
      @click="onOverlayClick"
    />
    <div
      v-if="mounted"
      ref="panel"
      class="vnd-drawer"
      role="dialog"
      tabindex="-1"
      data-vnd-drawer=""
      :aria-modal="modal || undefined"
      :aria-labelledby="title && !attrs['aria-label'] ? `${id}-title` : undefined"
      :aria-describedby="description ? `${id}-description` : undefined"
      v-bind="attrs"
      :data-direction="direction"
      :data-state="visible ? 'open' : 'closed'"
      :data-expanded="expanded || undefined"
      :data-dragging="dragging || undefined"
      :data-fit="fit || undefined"
      @pointerdown="onPointerDown"
    >
      <button
        v-if="showHandle"
        type="button"
        class="vnd-handle"
        aria-label="Change drawer size"
        :aria-disabled="snapPoints.length < 2 || undefined"
        :tabindex="snapPoints.length > 1 ? 0 : -1"
        @click="onHandleClick"
      />
      <div v-if="slots.header || title || description" class="vnd-header">
        <template v-if="slots.header">
          <span v-if="title" :id="`${id}-title`" hidden>{{ title }}</span>
          <span v-if="description" :id="`${id}-description`" hidden>{{ description }}</span>
        </template>
        <slot name="header" v-bind="slotProps">
          <h2 v-if="title" :id="slots.header ? undefined : `${id}-title`" class="vnd-title">
            {{ title }}
          </h2>
          <p
            v-if="description"
            :id="slots.header ? undefined : `${id}-description`"
            class="vnd-description"
          >
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
