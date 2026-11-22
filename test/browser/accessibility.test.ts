import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, reactive, ref, type App } from 'vue'
import { Drawer, type DrawerProps, type SnapPoint } from '../../src'
import { setReducedMotion } from './helpers'

let app: App | undefined
let host: HTMLElement | undefined

const mountDrawer = async (
  initialProps: DrawerProps & Record<string, unknown> = {},
  customHeader = false,
) => {
  const props = reactive<DrawerProps & Record<string, unknown>>({
    title: 'Nearby places',
    description: 'Choose a destination.',
    ...initialProps,
  })
  const header = ref(customHeader)
  const emptyHeader = ref(false)
  const snap = ref<SnapPoint>()
  const opened = ref(false)
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({
    setup: () => () =>
      h(
        Drawer,
        {
          ...props,
          open: true,
          snapPoint: snap.value,
          'onUpdate:snapPoint': (value: SnapPoint | undefined) => (snap.value = value),
          onOpened: () => (opened.value = true),
          'data-testid': 'accessible-drawer',
        },
        {
          default: () => h('button', { type: 'button', class: 'content-action' }, 'Choose'),
          ...(header.value
            ? {
                header: () =>
                  emptyHeader.value
                    ? []
                    : [
                        h('h2', { id: 'custom-title' }, 'Custom heading'),
                        h('p', { id: 'custom-description' }, 'Custom description'),
                      ],
              }
            : {}),
        },
      ),
  })
  app.mount(host)
  await expect.poll(() => opened.value).toBe(true)
  const panel = document.querySelector<HTMLElement>('[data-testid="accessible-drawer"]')!
  return { panel, props, header, emptyHeader, snap }
}

beforeEach(async () => {
  await setReducedMotion(true)
})

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
})

describe('accessible headers', () => {
  it('updates header visibility when a slot is added or removed without title props', async () => {
    const { panel, header } = await mountDrawer({ title: undefined, description: undefined })
    expect(panel.querySelector('.vnd-header')).toBeNull()
    header.value = true
    await nextTick()
    expect(panel.querySelector('#custom-title')?.textContent).toBe('Custom heading')
    header.value = false
    await nextTick()
    expect(panel.querySelector('.vnd-header')).toBeNull()
  })

  it('keeps label and description targets when a custom header replaces the visible defaults', async () => {
    const { panel, header } = await mountDrawer()
    const titleId = panel.getAttribute('aria-labelledby')!
    const descriptionId = panel.getAttribute('aria-describedby')!
    header.value = true
    await nextTick()

    expect(panel.querySelector('.vnd-title')).toBeNull()
    expect(panel.querySelector('#custom-title')?.textContent).toBe('Custom heading')
    expect(document.getElementById(titleId)?.hidden).toBe(true)
    expect(document.getElementById(descriptionId)?.hidden).toBe(true)
    await expect.element(panel).toHaveAccessibleName('Nearby places')
    await expect.element(panel).toHaveAccessibleDescription('Choose a destination.')

    header.value = false
    await nextTick()
    expect(document.getElementById(titleId)?.hidden).toBe(false)
    expect(document.querySelectorAll(`[id="${titleId}"]`)).toHaveLength(1)
  })

  it('lets consumers label and describe their custom header explicitly', async () => {
    const { panel } = await mountDrawer(
      { 'aria-labelledby': 'custom-title', 'aria-describedby': 'custom-description' },
      true,
    )
    expect(panel.getAttribute('aria-labelledby')).toBe('custom-title')
    expect(panel.getAttribute('aria-describedby')).toBe('custom-description')
    await expect.element(panel).toHaveAccessibleName('Custom heading')
    await expect.element(panel).toHaveAccessibleDescription('Custom description')
  })

  it('does not duplicate ARIA target IDs when an empty header slot renders its fallback', async () => {
    const { panel, emptyHeader } = await mountDrawer({}, true)
    emptyHeader.value = true
    await nextTick()

    expect(panel.querySelector('.vnd-title')?.textContent).toBe('Nearby places')
    expect(panel.querySelector('.vnd-description')?.textContent).toBe('Choose a destination.')
    for (const attribute of ['aria-labelledby', 'aria-describedby']) {
      const id = panel.getAttribute(attribute)!
      expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1)
    }
    await expect.element(panel).toHaveAccessibleName('Nearby places')
    await expect.element(panel).toHaveAccessibleDescription('Choose a destination.')
  })

  it('honors an explicit aria-label instead of letting the generated title reference override it', async () => {
    const { panel, props } = await mountDrawer({ 'aria-label': 'Destination picker' }, true)
    expect(panel.hasAttribute('aria-labelledby')).toBe(false)
    await expect.element(panel).toHaveAccessibleName('Destination picker')

    props['aria-label'] = 'Updated destination picker'
    await nextTick()
    await expect.element(panel).toHaveAccessibleName('Updated destination picker')
    delete props['aria-label']
    await nextTick()
    await expect.element(panel).toHaveAccessibleName('Nearby places')
  })

  it('does not add references without title or description and respects explicitly removed defaults', async () => {
    const { panel, props } = await mountDrawer({ title: undefined, description: undefined }, true)
    expect(panel.hasAttribute('aria-labelledby')).toBe(false)
    expect(panel.hasAttribute('aria-describedby')).toBe(false)

    Object.assign(props, {
      title: 'Nearby',
      description: 'Places around you',
      'aria-labelledby': null,
      'aria-describedby': null,
      'aria-label': 'Explicit label',
    })
    await nextTick()
    expect(panel.hasAttribute('aria-labelledby')).toBe(false)
    expect(panel.hasAttribute('aria-describedby')).toBe(false)
    await expect.element(panel).toHaveAccessibleName('Explicit label')
  })
})

describe('keyboard handle', () => {
  it('is reachable by Tab and cycles snap points with native Enter and Space activation', async () => {
    const { panel, snap } = await mountDrawer()
    const handle = panel.querySelector<HTMLButtonElement>('.vnd-handle')!
    expect(handle.tagName).toBe('BUTTON')
    expect(handle.type).toBe('button')
    await expect.element(handle).toHaveAccessibleName('Change drawer size')
    await userEvent.tab()
    expect(document.activeElement).toBe(handle)
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => snap.value).toBe(1 / 2)
    await userEvent.keyboard(' ')
    await expect.poll(() => snap.value).toBe(1)
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => snap.value).toBe(1 / 3)

    await userEvent.tab()
    expect(document.activeElement).toBe(panel.querySelector('.content-action'))
    await userEvent.tab()
    expect(document.activeElement).toBe(handle)
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(panel.querySelector('.content-action'))
  })

  it('keeps a single-snap drag handle out of the tab order without disabling pointer events', async () => {
    const { panel } = await mountDrawer({ snapPoints: [1] })
    const handle = panel.querySelector<HTMLButtonElement>('.vnd-handle')!
    expect(handle.getAttribute('aria-disabled')).toBe('true')
    expect(handle.tabIndex).toBe(-1)
    expect(handle.disabled).toBe(false)
    await userEvent.tab()
    expect(document.activeElement).toBe(panel.querySelector('.content-action'))
    await userEvent.tab()
    expect(document.activeElement).toBe(panel.querySelector('.content-action'))
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(panel.querySelector('.content-action'))
  })
})

describe('overlay custom properties', () => {
  it.each([
    { '--vnd-overlay-color': 'rgb(20, 25, 40)', '--vnd-z-index': 103, width: '240px' },
    '--vnd-overlay-color: rgb(20, 25, 40); --vnd-z-index: 103; width: 240px',
    [
      { '--vnd-z-index': 101 },
      '--vnd-overlay-color: rgb(20, 25, 40); --vnd-z-index: 103; width: 240px',
    ],
  ])('forwards shared inline variables without applying panel layout styles: %j', async (style) => {
    const { panel } = await mountDrawer({ style })
    const overlay = document.querySelector<HTMLElement>('.vnd-overlay')!
    expect(getComputedStyle(overlay).backgroundColor).toBe('rgb(20, 25, 40)')
    expect(getComputedStyle(overlay).zIndex).toBe('103')
    expect(getComputedStyle(panel).zIndex).toBe('103')
    expect(overlay.style.width).toBe('')
    expect(panel.style.width).toBe('240px')
  })

  it('updates and removes forwarded variables when the consumer changes its style attribute', async () => {
    const { props } = await mountDrawer({ style: { '--vnd-z-index': 101 } })
    const overlay = document.querySelector<HTMLElement>('.vnd-overlay')!
    expect(getComputedStyle(overlay).zIndex).toBe('101')
    props.style = { '--vnd-overlay-color': 'rgb(20, 25, 40)', '--vnd-z-index': 104 }
    await nextTick()
    expect(getComputedStyle(overlay).backgroundColor).toBe('rgb(20, 25, 40)')
    expect(getComputedStyle(overlay).zIndex).toBe('104')
    delete props.style
    await nextTick()
    expect(overlay.style.getPropertyValue('--vnd-overlay-color')).toBe('')
    expect(overlay.style.getPropertyValue('--vnd-z-index')).toBe('')
    expect(getComputedStyle(overlay).zIndex).toBe('50')
  })
})
