import { cdp } from 'vitest/browser'
import { createVaporApp, nextTick, type App } from 'vue'
import Harness from './fixtures/Harness.vue'
import { resetState } from './fixtures/state'

let app: App | undefined
let host: HTMLElement | undefined

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Render the harness in a Vapor app. */
export async function mountHarness() {
  host = document.createElement('div')
  document.body.append(host)
  app = createVaporApp(Harness)
  app.mount(host)
  await nextTick()
}

export function unmountHarness() {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  resetState()
}

export async function setReducedMotion(reduce: boolean) {
  await cdp().send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }],
  })
}

export const getPanel = (id = 'drawer') =>
  document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

export const getOverlay = () => document.querySelector<HTMLElement>('.vnd-overlay')

/** Visible share of a bottom drawer, from 0 to 1. */
export function visibleShare(id = 'drawer'): number {
  const panel = getPanel(id)
  if (!panel) return 0
  const rect = panel.getBoundingClientRect()
  return (window.innerHeight - rect.top) / panel.offsetHeight
}

/** Wait until the drawer stops moving. */
export async function settle(id = 'drawer') {
  let last = Number.NaN
  for (let i = 0; i < 100; i++) {
    await sleep(32)
    const top = getPanel(id)?.getBoundingClientRect().top ?? -1
    if (top === last) return
    last = top
  }
}

interface DragOptions {
  /** Where the press starts, relative to the top-left corner of `element`. */
  from?: { x: number; y: number }
  steps?: number
  /** Time (ms) between moves. */
  interval?: number
  /** Time (ms) the pointer rests before it is released. */
  hold?: number
  pointerType?: 'touch' | 'mouse'
}

/** Drag the pointer from a point of `element` by `dx`, `dy` and release it. */
export async function drag(element: Element, dx: number, dy: number, options: DragOptions = {}) {
  const { steps = 10, interval = 16, hold = 0, pointerType = 'touch' } = options
  const rect = element.getBoundingClientRect()
  const x = rect.left + (options.from?.x ?? rect.width / 2)
  const y = rect.top + (options.from?.y ?? 10)
  const target = document.elementFromPoint(x, y) ?? element
  const fire = (type: string, clientX: number, clientY: number) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 7,
        pointerType,
        isPrimary: true,
        button: type === 'pointermove' ? -1 : 0,
        clientX,
        clientY,
      }),
    )

  fire('pointerdown', x, y)
  for (let step = 1; step <= steps; step++) {
    await sleep(interval)
    fire('pointermove', x + (dx * step) / steps, y + (dy * step) / steps)
  }
  if (hold) await sleep(hold)
  fire('pointerup', x + dx, y + dy)
  await nextTick()
}
