import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { nextTick } from 'vue'
import { state } from './fixtures/state'
import {
  drag,
  getOverlay,
  getPanel,
  mountHarness,
  setReducedMotion,
  sleep,
  unmountHarness,
} from './helpers'

beforeEach(async () => {
  await setReducedMotion(true)
  await mountHarness()
})

afterEach(() => {
  unmountHarness()
  vi.restoreAllMocks()
})

const open = async () => {
  state.open = true
  await expect.poll(() => state.events).toContain('opened')
  return getPanel()!
}

const observeSuppression = () => {
  const added = vi.spyOn(window, 'addEventListener')
  const removed = vi.spyOn(window, 'removeEventListener')
  const registrations = () =>
    added.mock.calls.filter(
      ([type, , capture]) => (type === 'click' || type === 'pointerdown') && capture === true,
    )
  const active = () =>
    registrations().filter(
      ([type, listener]) =>
        !removed.mock.calls.some(
          ([removedType, removedListener, capture]) =>
            removedType === type && removedListener === listener && capture === true,
        ),
    )
  return { active, registrations }
}

const shortDrag = (panel: HTMLElement) =>
  drag(panel, 0, 20, { pointerType: 'mouse', steps: 1, interval: 1 })

describe('drag click cleanup', () => {
  beforeEach(() => {
    state.props = { snapPoints: [1], dismissible: false }
  })

  it('expires both capture listeners when no later interaction occurs', async () => {
    const panel = await open()
    const listeners = observeSuppression()
    await shortDrag(panel)
    expect(listeners.active()).toHaveLength(2)
    await sleep(130)
    expect(listeners.active()).toHaveLength(0)
  })

  it('disarms pending suppression when the component unmounts', async () => {
    const panel = await open()
    const listeners = observeSuppression()
    await shortDrag(panel)
    expect(listeners.active()).toHaveLength(2)
    unmountHarness()
    expect(listeners.active()).toHaveLength(0)
  })

  it('does not accumulate listeners across consecutive gestures', async () => {
    const panel = await open()
    const listeners = observeSuppression()
    await shortDrag(panel)
    await shortDrag(panel)
    expect(listeners.registrations()).toHaveLength(4)
    expect(listeners.active()).toHaveLength(2)
    await sleep(130)
    expect(listeners.active()).toHaveLength(0)
  })

  it('disarms on the next press without cancelling that interaction', async () => {
    const panel = await open()
    const listeners = observeSuppression()
    await shortDrag(panel)
    const press = new PointerEvent('pointerdown', { cancelable: true })
    window.dispatchEvent(press)
    expect(press.defaultPrevented).toBe(false)
    expect(listeners.active()).toHaveLength(0)
  })

  it('lets keyboard activation through when a drag produces no pointer click', async () => {
    const panel = await open()
    const listeners = observeSuppression()
    panel.querySelector<HTMLButtonElement>('[data-testid="inner-close"]')!.focus()
    await shortDrag(panel)
    expect(listeners.active()).toHaveLength(2)
    await userEvent.keyboard('{Enter}')
    expect(state.open).toBe(false)
    expect(listeners.active()).toHaveLength(0)
  })

  it('lets programmatic clicks through while suppression is armed', async () => {
    const panel = await open()
    const listeners = observeSuppression()
    await shortDrag(panel)
    panel.querySelector<HTMLButtonElement>('[data-testid="inner-close"]')!.click()
    await nextTick()
    expect(state.open).toBe(false)
    expect(listeners.active()).toHaveLength(0)
  })
})

describe('cached rendering boundaries', () => {
  it('recalculates the background boundary when snap points change', async () => {
    state.props = { snapPoints: [0.25, 0.5, 1], scaleBackground: true }
    state.snap = 0.5
    await open()
    const background = document.querySelector<HTMLElement>('[data-vnd-background]')!
    expect(background.style.transform).toContain('scale(1)')

    state.snap = 1
    await nextTick()
    expect(background.style.transform).toMatch(/scale\(0\.9\d+\)/)

    state.props.snapPoints = [0.25, 0.75, 1]
    state.snap = 0.75
    await nextTick()
    expect(background.style.transform).toContain('scale(1)')
  })

  it('preserves duplicate snap-point background boundaries', async () => {
    state.props = { snapPoints: [1, 1], scaleBackground: true }
    await open()
    const background = document.querySelector<HTMLElement>('[data-vnd-background]')!
    expect(background.style.transform).toMatch(/scale\(0\.9\d+\)/)
  })

  it('recalculates the fade interval when fadeFrom changes', async () => {
    await open()
    expect(getOverlay()!.style.opacity).toBe('1')
    state.props.fadeFrom = 2
    state.snap = 0.5
    await nextTick()
    expect(getOverlay()!.style.opacity).toBe('0')
    state.snap = 1
    await nextTick()
    expect(getOverlay()!.style.opacity).toBe('1')
  })
})
