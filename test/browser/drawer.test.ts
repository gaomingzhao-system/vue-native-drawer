import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref, vaporInteropPlugin } from 'vue'
import { Drawer, type DrawerProps } from '../../src'
import { state } from './fixtures/state'
import {
  drag,
  getOverlay,
  getPanel,
  mountHarness,
  setReducedMotion,
  settle,
  sleep,
  unmountHarness,
  visibleShare,
} from './helpers'

async function open(props: DrawerProps = {}) {
  state.props = props
  state.open = true
  await expect.poll(() => state.events).toContain('opened')
  return getPanel()!
}

async function closed() {
  await expect.poll(() => state.events).toContain('closed')
}

/** Release slowly: the pointer rests long enough to drop its velocity. */
const slowly = { steps: 12, hold: 80 }

beforeEach(async () => {
  await setReducedMotion(true)
  await mountHarness()
})

afterEach(() => {
  unmountHarness()
})

describe('opening and closing', () => {
  it('opens at a third of its height by default', async () => {
    const panel = await open()
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
    expect(panel.dataset.state).toBe('open')
    expect(panel.dataset.direction).toBe('bottom')
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(getOverlay()?.style.opacity).toBe('1')
  })

  it('removes the drawer once it has closed', async () => {
    await open()
    state.open = false
    await closed()
    expect(getPanel()).toBeNull()
    expect(getOverlay()).toBeNull()
  })

  it('closes from the slot props', async () => {
    await open()
    getPanel()!.querySelector<HTMLElement>('[data-testid="inner-close"]')!.click()
    await closed()
    expect(state.open).toBe(false)
  })

  it('closes with Escape', async () => {
    await open()
    await userEvent.keyboard('{Escape}')
    await closed()
    expect(state.open).toBe(false)
  })

  it('closes when the overlay is clicked', async () => {
    await open()
    getOverlay()!.click()
    await closed()
    expect(state.open).toBe(false)
  })

  it('stays open when the parent does not update v-model:open', async () => {
    state.keepOpen = true
    await open()
    await userEvent.keyboard('{Escape}')
    await settle()
    expect(getPanel()).not.toBeNull()
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
    expect(state.events).not.toContain('closed')
  })

  it('ignores Escape, overlay clicks and drags when not dismissible', async () => {
    const panel = await open({ dismissible: false })
    await userEvent.keyboard('{Escape}')
    getOverlay()!.click()
    await drag(panel, 0, 300, slowly)
    await settle()
    expect(state.open).toBe(true)
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
  })
})

describe('snap points', () => {
  it('follows v-model:snap-point', async () => {
    const panel = await open()
    state.snap = 1 / 2
    await settle()
    expect(visibleShare()).toBeCloseTo(1 / 2, 2)
    state.snap = 1
    await settle()
    expect(visibleShare()).toBeCloseTo(1, 2)
    expect(panel.dataset.expanded).toBe('true')
    expect(panel.querySelector('[data-testid="slot-state"]')?.textContent).toBe('1 true')
  })

  it('opens at the bound snap point', async () => {
    state.snap = 1
    await open()
    expect(visibleShare()).toBeCloseTo(1, 2)
  })

  it('opens at a snap point set in the same tick as opening', async () => {
    state.open = true
    state.snap = 1
    await expect.poll(() => state.events).toContain('opened')
    expect(visibleShare()).toBeCloseTo(1, 2)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(getPanel())
  })

  it('survives being toggled open, closed and open in one tick', async () => {
    state.open = true
    await nextTick()
    state.open = false
    await nextTick()
    state.open = true
    await expect.poll(() => state.events).toContain('opened')
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
    state.open = false
    await closed()
    // Every scroll lock was released.
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('drags to the nearest snap point and reports it', async () => {
    const panel = await open()
    const height = panel.offsetHeight
    await drag(panel, 0, -height / 6, slowly)
    await settle()
    expect(state.snap).toBe(1 / 2)
    expect(visibleShare()).toBeCloseTo(1 / 2, 2)
  })

  it('skips ahead on a strong flick', async () => {
    const panel = await open()
    await drag(panel, 0, -300, { steps: 4, interval: 8 })
    await settle()
    expect(state.snap).toBe(1)
  })

  it('snaps back after a short drag', async () => {
    const panel = await open()
    await drag(panel, 0, 40, slowly)
    await settle()
    expect(state.open).toBe(true)
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
  })

  it('closes when dragged past the close threshold', async () => {
    const panel = await open()
    await drag(panel, 0, 120, slowly)
    await closed()
    expect(state.open).toBe(false)
  })

  it('closes on a flick down from the smallest snap point', async () => {
    const panel = await open()
    await drag(panel, 0, 40, { steps: 3, interval: 8 })
    await closed()
    expect(state.open).toBe(false)
  })

  it('rubber bands past the largest snap point', async () => {
    state.snap = 1
    const panel = await open()
    const top = panel.getBoundingClientRect().top
    let overdrag = 0
    const watch = () => {
      overdrag = Math.max(overdrag, top - panel.getBoundingClientRect().top)
    }
    panel.addEventListener('pointermove', watch)
    await drag(panel, 0, -200, slowly)
    panel.removeEventListener('pointermove', watch)
    await settle()
    expect(overdrag).toBeGreaterThan(10)
    expect(overdrag).toBeLessThan(64)
    expect(panel.getBoundingClientRect().top).toBeCloseTo(top, 0)
  })

  it('steps through the snap points when the handle is tapped', async () => {
    const panel = await open()
    const handle = panel.querySelector<HTMLElement>('.vnd-handle')!
    handle.click()
    await settle()
    expect(state.snap).toBe(1 / 2)
    handle.click()
    await settle()
    expect(state.snap).toBe(1)
    handle.click()
    await settle()
    expect(state.snap).toBe(1 / 3)
  })

  it('returns to the first snap point after closing', async () => {
    state.snap = 1
    await open()
    state.open = false
    await closed()
    expect(state.snap).toBe(1 / 3)
    state.events = []
    await open()
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
  })

  it('accepts pixel snap points', async () => {
    const panel = await open({ snapPoints: ['200px', 1] })
    expect(window.innerHeight - panel.getBoundingClientRect().top).toBeCloseTo(200, 0)
  })

  it('only scrolls its content once fully expanded', async () => {
    state.items = 30
    const panel = await open()
    const content = panel.querySelector<HTMLElement>('.vnd-content')!
    expect(getComputedStyle(content).overflowY).toBe('hidden')
    state.snap = 1
    await settle()
    expect(getComputedStyle(content).overflowY).toBe('auto')
  })

  it('reports drag progress', async () => {
    const panel = await open()
    await drag(panel, 0, -100, slowly)
    expect(state.progress.length).toBeGreaterThan(5)
    expect(state.progress.at(-1)!).toBeGreaterThan(state.progress[0]!)
    expect(state.progress.at(-1)!).toBeCloseTo(1 / 3 + 100 / panel.offsetHeight, 2)
  })

  it('only drags from the handle with handleOnly', async () => {
    const panel = await open({ handleOnly: true })
    await drag(panel, 0, -200, { ...slowly, from: { x: 40, y: 120 } })
    await settle()
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
    await drag(panel, 0, -200, slowly)
    await settle()
    expect(state.snap).toBe(1 / 2)
  })
})

describe('layout', () => {
  it('fits its content with fit', async () => {
    const panel = await open({ fit: true })
    expect(panel.offsetHeight).toBeLessThan(window.innerHeight / 2)
    expect(visibleShare()).toBeCloseTo(1, 2)
  })

  it('slides in from the side', async () => {
    const panel = await open({ direction: 'left' })
    expect(panel.getBoundingClientRect().left).toBeCloseTo(0, 0)
    expect(panel.querySelector('.vnd-handle')).toBeNull()
    await drag(panel, -200, 0, { ...slowly, from: { x: 200, y: 200 } })
    await closed()
  })

  it('keeps the footer on screen at partial snap points', async () => {
    state.footer = true
    const panel = await open()
    const footer = panel.querySelector<HTMLElement>('.vnd-footer')!
    expect(footer.getBoundingClientRect().bottom).toBeCloseTo(window.innerHeight, 0)
    footer.querySelector<HTMLElement>('[data-testid="footer-close"]')!.click()
    await closed()
  })

  it('renders the title and description', async () => {
    const panel = await open({ title: 'Nearby', description: 'Places around you' })
    const title = panel.querySelector('.vnd-title')!
    const description = panel.querySelector('.vnd-description')!
    expect(title.textContent).toBe('Nearby')
    expect(panel.getAttribute('aria-labelledby')).toBe(title.id)
    expect(panel.getAttribute('aria-describedby')).toBe(description.id)
  })

  it('replaces the title with the header slot', async () => {
    state.header = true
    const panel = await open({ title: 'Ignored' })
    expect(panel.querySelector('[data-testid="custom-header"]')?.textContent).toContain('Header')
    expect(panel.querySelector('.vnd-title')).toBeNull()
  })

  it('passes attributes through to the drawer', async () => {
    const panel = await open({ class: 'custom', 'aria-label': 'Places' } as DrawerProps)
    expect(panel.classList).toContain('vnd-drawer')
    expect(panel.classList).toContain('custom')
    expect(panel.getAttribute('aria-label')).toBe('Places')
  })
})

describe('page integration', () => {
  it('locks page scrolling while open', async () => {
    await open()
    expect(document.documentElement.style.overflow).toBe('hidden')
    state.open = false
    await closed()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('moves focus into the drawer and back', async () => {
    const trigger = document.querySelector<HTMLElement>('[data-testid="trigger"]')!
    trigger.focus()
    trigger.click()
    await expect.poll(() => state.events).toContain('opened')
    expect(document.activeElement).toBe(getPanel())
    await userEvent.keyboard('{Escape}')
    await closed()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps Tab inside the drawer', async () => {
    const panel = await open()
    const close = panel.querySelector('[data-testid="inner-close"]')
    const input = panel.querySelector('[data-testid="input"]')
    await userEvent.tab()
    expect(document.activeElement).toBe(close)
    await userEvent.tab()
    expect(document.activeElement).toBe(input)
    await userEvent.tab()
    expect(document.activeElement).toBe(close)
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(input)
  })

  it('leaves the page alone when not modal', async () => {
    const trigger = document.querySelector<HTMLElement>('[data-testid="trigger"]')!
    trigger.focus()
    const panel = await open({ modal: false })
    expect(getOverlay()).toBeNull()
    expect(panel.hasAttribute('aria-modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.activeElement).toBe(trigger)
  })

  it('pushes the page back with scale-background', async () => {
    const page = document.querySelector<HTMLElement>('.page')!
    await open({ scaleBackground: true, snapPoints: [1] })
    expect(page.style.transform).toMatch(/scale\(0\.9\d+\)/)
    expect(page.style.clipPath).toContain('round 10px')
    expect(document.documentElement.hasAttribute('data-vnd-scaled')).toBe(true)
    state.open = false
    await closed()
    expect(page.style.transform).toBe('')
    expect(page.style.clipPath).toBe('')
    expect(document.documentElement.hasAttribute('data-vnd-scaled')).toBe(false)
  })

  it('only pushes the page back at the largest snap point', async () => {
    const page = document.querySelector<HTMLElement>('.page')!
    await open({ scaleBackground: true })
    expect(page.style.transform).toContain('scale(1)')
    state.snap = 1
    await settle()
    expect(page.style.transform).toMatch(/scale\(0\.9\d+\)/)
  })

  it('pushes back the drawer it is nested in', async () => {
    state.nested = true
    const panel = await open()
    panel.querySelector<HTMLElement>('[data-testid="open-nested"]')!.click()
    await expect.poll(() => getPanel('nested')).not.toBeNull()
    await expect.poll(() => panel.style.transform).toContain('scale(')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => getPanel('nested')).toBeNull()
    expect(panel.style.transform).not.toContain('scale(')
    expect(state.open).toBe(true)
  })
})

describe('animation', () => {
  beforeEach(async () => {
    unmountHarness()
    await setReducedMotion(false)
    await mountHarness()
  })

  it('moves with the UIKit sheet curve', async () => {
    state.open = true
    await expect
      .poll(() => getPanel()?.style.transition)
      .toBe('transform 500ms cubic-bezier(0.32, 0.72, 0, 1)')
    expect(getOverlay()?.style.transition).toBe('opacity 500ms cubic-bezier(0.32, 0.72, 0, 1)')
    expect(state.events).not.toContain('opened')
    await expect.poll(() => state.events, { timeout: 2000 }).toContain('opened')
    expect(getPanel()?.style.transition).toBe('none')
  })

  it('keeps the speed of a quick release', async () => {
    state.open = true
    await expect.poll(() => state.events, { timeout: 2000 }).toContain('opened')
    const panel = getPanel()!
    await drag(panel, 0, -200, { steps: 4, interval: 8 })
    const easing = panel.style.transition.match(/cubic-bezier\(([\d.]+)/)
    expect(Number(easing?.[1])).toBeLessThan(0.32)
  })

  it('can be grabbed mid-animation', async () => {
    state.open = true
    await sleep(150)
    const panel = getPanel()!
    const top = panel.getBoundingClientRect().top
    panel.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 3,
        isPrimary: true,
        clientX: 100,
        clientY: top + 10,
      }),
    )
    await sleep(100)
    expect(panel.style.transition).toBe('none')
    expect(panel.getBoundingClientRect().top).toBeCloseTo(top, -1)
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, isPrimary: true }))
    await expect.poll(() => state.events, { timeout: 2000 }).toContain('opened')
    expect(visibleShare()).toBeCloseTo(1 / 3, 2)
  })
})

describe('VDOM interop', () => {
  it('renders inside a VDOM app with vaporInteropPlugin', async () => {
    const shown = ref(true)
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h(
          Drawer as never,
          {
            open: shown.value,
            'onUpdate:open': (value: boolean) => (shown.value = value),
            title: 'Interop',
            'data-testid': 'vdom',
          },
          { default: () => h('p', { class: 'vdom-content' }, 'Hello from a VDOM app') },
        ),
    })
    app.use(vaporInteropPlugin)
    app.mount(host)
    await nextTick()
    await expect.poll(() => getPanel('vdom')).not.toBeNull()
    expect(getPanel('vdom')!.querySelector('.vdom-content')?.textContent).toBe(
      'Hello from a VDOM app',
    )
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => shown.value).toBe(false)
    await expect.poll(() => getPanel('vdom')).toBeNull()
    app.unmount()
    host.remove()
  })
})
