import { useEventListener, useMediaQuery, useResizeObserver } from '@vueuse/core'
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  watch,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'
import {
  DURATION,
  MAX_OVERDRAG,
  MOUSE_SLOP,
  NESTED_SHIFT,
  SCROLL_SLOP,
  TOUCH_SLOP,
} from '../constants'
import type { DrawerDirection, SnapPoint } from '../types'
import { createBackgroundScale } from '../utils/background'
import { canScroll, findScrollable, getFocusable, readTranslate } from '../utils/dom'
import { easingForVelocity } from '../utils/easing'
import { lockScroll } from '../utils/scroll-lock'
import { clamp, findSnapIndex, getReleaseTarget, getSnapOffsets, rubberBand } from '../utils/snap'
import { isTopDrawer, pushDrawer, removeDrawer } from '../utils/stack'
import { createVelocityTracker } from '../utils/velocity'

type ElementRef = Readonly<ShallowRef<HTMLElement | null>>

export interface UseDrawerOptions {
  open: Ref<boolean>
  snapPoint: Ref<SnapPoint | undefined>
  snapPoints: () => readonly SnapPoint[]
  direction: () => DrawerDirection
  dismissible: () => boolean
  modal: () => boolean
  fadeFrom: () => number
  scaleBackground: () => boolean | string
  closeThreshold: () => number
  handleOnly: () => boolean
  panel: ElementRef
  overlay: ElementRef
  content: ElementRef
  footer: ElementRef
  onDrag: (progress: number) => void
  onOpened: () => void
  onClosed: () => void
}

/** Lets a drawer push back the drawer it is nested in. */
interface DrawerContext {
  nest: (progress: number, transition?: string) => void
}

const DRAWER: InjectionKey<DrawerContext> = Symbol('vue-native-drawer')

type Phase = 'closed' | 'opening' | 'open' | 'closing'

interface Gesture {
  pointerId: number
  pointerType: string
  x: number
  y: number
  /** Drawer offset when the gesture started. */
  origin: number
  dragging: boolean
  /** Scroll container under the pointer, which may take the gesture instead of the drawer. */
  scroller: HTMLElement | null
  /** The press stopped an animation, which resumes unless the gesture becomes a drag. */
  interrupted: boolean
}

/**
 * Drives a drawer: opening and closing, snapping, dragging and everything that follows the
 * drawer around (overlay, footer, the page behind it and the drawer it is nested in).
 *
 * Positions are offsets: how far (px) the drawer is moved towards its edge. `0` is fully open
 * and the drawer's size is closed, whatever the direction.
 */
export function useDrawer(options: UseDrawerOptions) {
  const { open, snapPoint } = options

  const mounted = ref(false)
  const visible = ref(false)
  const dragging = ref(false)
  const size = ref(0)

  const vertical = computed(() => options.direction() === 'top' || options.direction() === 'bottom')
  /** `1` when the drawer closes towards positive coordinates (bottom, right). */
  const sign = computed(() =>
    options.direction() === 'bottom' || options.direction() === 'right' ? 1 : -1,
  )
  const points = computed(() => {
    const list = options.snapPoints()
    return list.length > 0 ? list : [1]
  })
  const offsets = computed(() => getSnapOffsets(points.value, size.value))
  const openOffset = computed(() => Math.min(...offsets.value))
  const lowestOffset = computed(() => Math.max(...offsets.value))
  const activeIndex = ref(Math.max(findSnapIndex(points.value, snapPoint.value), 0))
  const activeSnapPoint = computed(() => points.value[activeIndex.value] ?? points.value[0]!)
  const expanded = computed(() => (offsets.value[activeIndex.value] ?? 0) <= openOffset.value + 0.5)

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const background = createBackgroundScale()
  const tracker = createVelocityTracker()
  const id = Symbol('drawer')
  const parent = inject(DRAWER, null)

  let phase: Phase = 'closed'
  /** Whether the drawer is rendered and measured, so it can move. */
  let ready = false
  /** Counts calls to `show`, so only the latest one carries on once the drawer has rendered. */
  let showing = 0
  /** Offset the drawer is rendered at. */
  let position = 0
  /** How far a drawer nested in this one is open, from 0 to 1. */
  let nested = 0
  /** How far (px) the footer may rise to stay on screen. */
  let footerRange = 0
  let gesture: Gesture | null = null
  let stopAnimation: (() => void) | null = null
  let releaseScroll: (() => void) | null = null
  let returnFocus: HTMLElement | null = null
  let scaled = false
  /** Speed of the release that is closing the drawer, until `open` has been updated. */
  let closeSpeed = 0

  provide(DRAWER, {
    nest(progress, transition) {
      nested = progress
      const panel = options.panel.value
      if (!panel || phase === 'closed') return
      panel.style.transition = transition ? `transform ${transition}` : 'none'
      panel.style.transform = transform(position)
    },
  })

  // Rendering

  const scalesBackground = () => !parent && !!options.scaleBackground()

  function transform(offset: number): string {
    const shift = sign.value * (offset - NESTED_SHIFT * nested)
    const translate = vertical.value
      ? `translate3d(0, ${shift}px, 0)`
      : `translate3d(${shift}px, 0, 0)`
    if (!nested) return translate
    const cross = vertical.value ? window.innerWidth : window.innerHeight
    return `${translate} scale(${1 - (NESTED_SHIFT / cross) * nested})`
  }

  function render(offset: number, transition?: string) {
    position = offset
    const panel = options.panel.value
    if (!panel) return
    panel.style.transition = transition ? `transform ${transition}` : 'none'
    panel.style.transform = transform(offset)

    const footer = options.footer.value
    if (footer && options.direction() === 'bottom') {
      // Keep the footer on screen while only part of the drawer is.
      footer.style.transition = panel.style.transition
      footer.style.transform = `translate3d(0, ${-clamp(offset, 0, footerRange)}px, 0)`
    }

    const overlay = options.overlay.value
    if (overlay) {
      overlay.style.transition = transition ? `opacity ${transition}` : 'none'
      overlay.style.opacity = String(overlayOpacity(offset))
    }

    if (scaled) background.render(backgroundProgress(offset), transition)
    parent?.nest(openProgress(offset), transition)
  }

  /** 0 when closed, 1 from the smallest snap point on. */
  function openProgress(offset: number): number {
    const range = size.value - lowestOffset.value
    return range > 0 ? clamp((size.value - offset) / range, 0, 1) : Number(offset < size.value)
  }

  /** The overlay fades in on the way from the snap point before `fadeFrom` to `fadeFrom`. */
  function overlayOpacity(offset: number): number {
    const list = offsets.value
    const index = clamp(Math.round(options.fadeFrom()), 0, list.length - 1)
    const full = list[index] ?? 0
    const none = index > 0 ? (list[index - 1] ?? size.value) : size.value
    if (none <= full) return Number(offset <= full)
    return clamp((none - offset) / (none - full), 0, 1)
  }

  /** The page is pushed back on the way from the second largest snap point to the largest. */
  function backgroundProgress(offset: number): number {
    const [full = 0, from = size.value] = offsets.value.toSorted((a, b) => a - b)
    return from > full ? clamp((from - offset) / (from - full), 0, 1) : Number(offset <= full)
  }

  // Animation

  /** Animate to `offset`. `speed` (px/ms, positive towards closed) is the speed to start at. */
  function animate(offset: number, speed = 0, done?: () => void) {
    // Continue from wherever a running animation has got to.
    freeze()
    const panel = options.panel.value
    const distance = Math.abs(offset - position)
    if (!panel || reducedMotion.value || distance < 1) {
      render(offset)
      done?.()
      return
    }

    // Only the part of the release velocity heading to the target carries over.
    const toward = (offset - position) * speed > 0 ? Math.abs(speed) : 0
    render(offset, `${DURATION}ms ${easingForVelocity(toward, distance)}`)

    let timer = 0
    const onEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === 'transform') finish()
    }
    const cleanup = () => {
      panel.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
      stopAnimation = null
    }
    const finish = () => {
      cleanup()
      render(offset)
      done?.()
    }
    panel.addEventListener('transitionend', onEnd)
    // `transitionend` never fires when nothing moves or the page is hidden.
    timer = window.setTimeout(finish, DURATION + 50)
    stopAnimation = cleanup
  }

  /** Stop a running animation where it is. Returns whether one was running. */
  function freeze(): boolean {
    if (!stopAnimation) return false
    stopAnimation()
    const panel = options.panel.value
    if (panel) render(readTranslate(panel, vertical.value) * sign.value + NESTED_SHIFT * nested)
    return true
  }

  // Opening and closing

  async function show() {
    if (phase === 'open' || phase === 'opening') return
    const reopening = phase === 'closing'
    phase = 'opening'
    visible.value = true

    if (reopening) {
      freeze()
    } else {
      const run = ++showing
      mounted.value = true
      await nextTick()
      if (phase !== 'opening' || run !== showing) return
      setup()
      measure()
      render(size.value)
      // Commit the closed position so the drawer animates away from it.
      options.panel.value?.getBoundingClientRect()
      ready = true
    }
    animate(offsets.value[activeIndex.value] ?? 0, 0, settle)
  }

  function settle() {
    if (phase !== 'opening') return
    phase = 'open'
    options.onOpened()
  }

  function hide(speed = 0) {
    if (phase === 'closed' || phase === 'closing') return
    endGesture()
    phase = 'closing'
    visible.value = false
    if (ready) animate(size.value, speed, finishClose)
    else finishClose()
  }

  function finishClose() {
    phase = 'closed'
    ready = false
    teardown()
    mounted.value = false
    activeIndex.value = 0
    if (snapPoint.value !== undefined && findSnapIndex(points.value, snapPoint.value) !== 0) {
      snapPoint.value = points.value[0]
    }
    options.onClosed()
  }

  function setup() {
    pushDrawer(id)
    if (options.modal()) {
      releaseScroll = lockScroll()
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      options.panel.value?.focus({ preventScroll: true })
    }
    if (scalesBackground()) {
      const target = options.scaleBackground()
      background.activate(
        typeof target === 'string' ? target : '[data-vnd-background]',
        options.direction(),
      )
      scaled = true
    }
  }

  function teardown() {
    removeDrawer(id)
    releaseScroll?.()
    releaseScroll = null
    if (scaled) background.deactivate()
    scaled = false
    parent?.nest(0)

    const panel = options.panel.value
    const active = document.activeElement
    if (
      returnFocus?.isConnected &&
      (!panel || !active || active === document.body || panel.contains(active))
    ) {
      returnFocus.focus({ preventScroll: true })
    }
    returnFocus = null
  }

  /** Close the drawer, starting at `speed` (px/ms) after a release. */
  function close(speed = 0) {
    if (phase === 'closed' || phase === 'closing') return
    closeSpeed = speed
    open.value = false
    void nextTick(() => {
      closeSpeed = 0
      // The parent kept the drawer open by not updating `v-model:open`.
      if (open.value) resume()
      else hide(speed)
    })
  }

  // Snapping

  function setSnap(index: number, speed = 0) {
    const point = points.value[index]
    if (point === undefined) return
    activeIndex.value = index
    if (findSnapIndex(points.value, snapPoint.value) !== index) snapPoint.value = point
    // Before the drawer has rendered, opening picks up the new snap point by itself.
    if (ready && (phase === 'open' || phase === 'opening')) {
      animate(offsets.value[index] ?? 0, speed, settle)
    }
  }

  function snapTo(point: SnapPoint) {
    const index = findSnapIndex(points.value, point)
    if (index !== -1) setSnap(index)
  }

  function measure() {
    const panel = options.panel.value
    if (!panel) return
    size.value = vertical.value ? panel.offsetHeight : panel.offsetWidth
    const footer = options.footer.value
    const content = options.content.value
    footerRange = footer && content ? Math.max(0, footer.offsetTop - content.offsetTop) : 0
  }

  // Gestures

  function onPointerDown(event: PointerEvent) {
    if (gesture || !event.isPrimary || event.button > 0) return
    if (phase !== 'open' && phase !== 'opening') return
    const panel = options.panel.value
    const target = event.target
    if (!panel || !(target instanceof Element) || !canGrab(target, event.pointerType)) return

    const interrupted = freeze()
    gesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      origin: position,
      dragging: false,
      scroller: findScrollable(target, panel, vertical.value),
      interrupted,
    }
    tracker.reset()
    tracker.add(event.timeStamp, axis(event))
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
  }

  function canGrab(target: Element, pointerType: string): boolean {
    if (target.closest('[data-vnd-no-drag], select')) return false
    if (options.handleOnly() && !target.closest('.vnd-handle, [data-vnd-handle]')) return false
    // Let a mouse select text in fields instead of dragging the drawer.
    if (
      pointerType === 'mouse' &&
      target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')
    ) {
      return false
    }
    const selection = window.getSelection()
    return (
      !selection || selection.isCollapsed || !options.panel.value?.contains(selection.anchorNode)
    )
  }

  /** Whether moving `main` px along the drag axis moves the drawer rather than its content. */
  function wantsDrag(current: Gesture, main: number): boolean {
    // Content only scrolls once the drawer is (nearly) settled at its largest snap point.
    const settled = expanded.value && position <= openOffset.value + SCROLL_SLOP
    if (!settled || !current.scroller) return true
    return !canScroll(current.scroller, vertical.value, main > 0)
  }

  function onPointerMove(event: PointerEvent) {
    const current = gesture
    if (!current || event.pointerId !== current.pointerId) return
    const main = vertical.value ? event.clientY - current.y : event.clientX - current.x
    const cross = vertical.value ? event.clientX - current.x : event.clientY - current.y

    if (!current.dragging) {
      const slop = current.pointerType === 'mouse' ? MOUSE_SLOP : TOUCH_SLOP
      if (Math.abs(main) < slop && Math.abs(cross) < slop) return
      if (Math.abs(cross) > Math.abs(main) || !wantsDrag(current, main)) {
        cancelGesture()
        return
      }
      startDrag(current, event)
    }

    tracker.add(event.timeStamp, axis(event))
    drag(current.origin + main * sign.value)
  }

  // Pointer events stop once the browser starts scrolling, so hold it back while a move may
  // still become a drag.
  function onTouchMove(event: TouchEvent) {
    const current = gesture
    if (!current || !event.cancelable) return
    if (current.dragging) {
      event.preventDefault()
      return
    }
    const touch = event.touches[0]
    if (!touch) return
    const main = vertical.value ? touch.clientY - current.y : touch.clientX - current.x
    const cross = vertical.value ? touch.clientX - current.x : touch.clientY - current.y
    if (main !== 0 && Math.abs(main) >= Math.abs(cross) && wantsDrag(current, main)) {
      event.preventDefault()
    }
  }

  function startDrag(current: Gesture, event: PointerEvent) {
    current.dragging = true
    dragging.value = true
    freeze()
    const panel = options.panel.value
    try {
      panel?.setPointerCapture(event.pointerId)
    } catch {
      // The pointer is already gone.
    }
    // Drop the text selection the press may have started.
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && panel?.contains(selection.anchorNode)) {
      selection.removeAllRanges()
    }
  }

  function drag(offset: number) {
    const dismissible = options.dismissible()
    const min = openOffset.value
    const max = dismissible ? size.value : lowestOffset.value
    const limit = Math.min(MAX_OVERDRAG, size.value * 0.2)
    let next = offset
    if (offset < min) next = min - rubberBand(min - offset, limit)
    else if (offset > max) next = dismissible ? max : max + rubberBand(offset - max, limit)
    render(next)
    options.onDrag(size.value ? clamp((size.value - next) / size.value, 0, 1) : 0)
  }

  function onPointerUp(event: PointerEvent) {
    const current = gesture
    if (!current || event.pointerId !== current.pointerId) return
    endGesture()
    if (current.dragging) {
      tracker.add(event.timeStamp, axis(event))
      const panel = options.panel.value
      if (panel) suppressClick(panel, event.timeStamp)
      release(tracker.velocity(event.timeStamp) * sign.value)
    } else if (current.interrupted) {
      resume()
    }
  }

  function onPointerCancel(event: PointerEvent) {
    const current = gesture
    if (!current || event.pointerId !== current.pointerId) return
    endGesture()
    if (current.dragging) release(0)
    else if (current.interrupted) resume()
  }

  /** Hand the gesture over to the content or the page. */
  function cancelGesture() {
    const current = gesture
    endGesture()
    if (current?.interrupted) resume()
  }

  function endGesture() {
    const current = gesture
    if (!current) return
    gesture = null
    dragging.value = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    const panel = options.panel.value
    if (current.dragging && panel?.hasPointerCapture(current.pointerId)) {
      panel.releasePointerCapture(current.pointerId)
    }
  }

  function resume() {
    if (phase === 'open' || phase === 'opening') {
      animate(offsets.value[activeIndex.value] ?? 0, 0, settle)
    }
  }

  function release(speed: number) {
    const target = getReleaseTarget({
      offsets: offsets.value,
      closed: size.value,
      position,
      velocity: speed,
      dismissible: options.dismissible(),
      closeThreshold: options.closeThreshold(),
    })
    if (target.type === 'close') close(speed)
    else setSnap(target.index, speed)
  }

  function axis(event: PointerEvent): number {
    return vertical.value ? event.clientY : event.clientX
  }

  // Keyboard and focus

  function onKeydown(event: KeyboardEvent) {
    if (phase === 'closing' || !isTopDrawer(id)) return
    if (event.key === 'Escape') {
      if (!options.dismissible() || event.defaultPrevented) return
      event.preventDefault()
      close()
    } else if (event.key === 'Tab' && options.modal()) {
      trapTab(event)
    }
  }

  function trapTab(event: KeyboardEvent) {
    const panel = options.panel.value
    if (!panel) return
    const focusable = getFocusable(panel)
    const first = focusable[0]
    const last = focusable.at(-1)
    const active = document.activeElement
    if (!first || !last) {
      event.preventDefault()
      panel.focus({ preventScroll: true })
      return
    }
    const outside = !active || !panel.contains(active)
    const wraps = event.shiftKey
      ? outside || active === first || active === panel
      : outside || active === last
    if (wraps) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
  }

  function onFocusIn(event: FocusEvent) {
    const panel = options.panel.value
    if (!panel || !options.modal() || phase === 'closing' || !isTopDrawer(id)) return
    if (event.target instanceof Node && !panel.contains(event.target)) {
      panel.focus({ preventScroll: true })
    }
  }

  function onOverlayClick() {
    if (options.dismissible()) close()
  }

  /** A tap on the handle steps through the snap points. */
  function onHandleClick() {
    const count = points.value.length
    if (count > 1) setSnap((activeIndex.value + 1) % count)
  }

  // Wiring

  watch(open, (value) => (value ? void show() : hide(closeSpeed)), { immediate: true })

  watch(snapPoint, (value) => {
    const index = findSnapIndex(points.value, value)
    if (index !== -1 && index !== activeIndex.value) setSnap(index)
  })

  watch(points, (list) => {
    const index = findSnapIndex(list, snapPoint.value)
    activeIndex.value = index === -1 ? clamp(activeIndex.value, 0, list.length - 1) : index
    if (phase === 'open' && !gesture?.dragging) {
      animate(offsets.value[activeIndex.value] ?? 0, 0, settle)
    }
  })

  useResizeObserver(options.panel, () => {
    if (!ready) return
    const previous = size.value
    measure()
    if (size.value === previous || gesture?.dragging) return
    const target = offsets.value[activeIndex.value] ?? 0
    if (phase === 'closing') animate(size.value, 0, finishClose)
    else if (stopAnimation) animate(target, 0, settle)
    else render(target)
  })

  const whileMounted = () => (mounted.value ? document : null)
  useEventListener(whileMounted, 'keydown', onKeydown)
  useEventListener(whileMounted, 'focusin', onFocusIn)
  useEventListener(options.panel, 'touchmove', onTouchMove, { passive: false })

  onBeforeUnmount(() => {
    endGesture()
    stopAnimation?.()
    if (phase !== 'closed') {
      phase = 'closed'
      ready = false
      teardown()
    }
  })

  return {
    mounted,
    visible,
    dragging,
    expanded,
    activeSnapPoint,
    show: () => {
      open.value = true
    },
    close: () => close(),
    snapTo,
    onPointerDown,
    onOverlayClick,
    onHandleClick,
  }
}

/**
 * Swallow the click a drag of `panel` ends with, so releasing over a button does not press it.
 * Only that click goes: a real one, inside the drawer, right after the release at `releasedAt`.
 * The next click or press disarms it.
 */
function suppressClick(panel: HTMLElement, releasedAt: number) {
  const disarm = () => {
    window.removeEventListener('click', swallow, true)
    window.removeEventListener('pointerdown', disarm, true)
  }
  const swallow = (event: MouseEvent) => {
    disarm()
    const target = event.target
    if (
      event.isTrusted &&
      event.timeStamp - releasedAt < 100 &&
      target instanceof Node &&
      panel.contains(target)
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  window.addEventListener('click', swallow, true)
  window.addEventListener('pointerdown', disarm, true)
}
