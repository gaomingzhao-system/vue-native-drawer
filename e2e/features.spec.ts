import { expect, test } from '@playwright/test'
import { drag, expectShare, openDemo, slowly } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('scrolling', () => {
  test('scrolls the list only once the drawer is fully open', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch scrolling')
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    const list = drawer.locator('.vnd-content')
    const scrollTop = () => list.evaluate((element) => element.scrollTop)

    // At a third, a swipe on the list moves the drawer instead.
    await drag(page, list, 0, -120, { ...slowly, from: { x: 200, y: 40 } })
    await expectShare(drawer, 1 / 2)
    expect(await scrollTop()).toBe(0)

    await drawer.locator('.vnd-handle').click()
    await expectShare(drawer, 1)

    // Fully open, the same swipe scrolls the list.
    await drag(page, list, 0, -200, { ...slowly, from: { x: 200, y: 300 } })
    await expect.poll(scrollTop).toBeGreaterThan(100)
    await expectShare(drawer, 1)

    // Swiping down scrolls back first and only then moves the drawer.
    await drag(page, list, 0, 150, { ...slowly, from: { x: 200, y: 200 } })
    await expectShare(drawer, 1)
    await list.evaluate((element) => element.scrollTo({ top: 0 }))
    await drag(page, list, 0, 300, { ...slowly, from: { x: 200, y: 200 } })
    await expectShare(drawer, 1 / 2)
  })

  test('scrolls the list with the mouse wheel once fully open', async ({ page, isMobile }) => {
    test.skip(isMobile, 'wheel scrolling')
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drawer.locator('.vnd-handle').click()
    await drawer.locator('.vnd-handle').click()
    await expectShare(drawer, 1)
    const list = drawer.locator('.vnd-content')
    await list.hover()
    await page.mouse.wheel(0, 400)
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(100)
  })

  test('keeps the page from scrolling behind a modal drawer', async ({ page }) => {
    await openDemo(page, 'open-fit', 'drawer-fit')
    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('drawer-fit')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
  })
})

test.describe('presentation', () => {
  test('sizes an action sheet to its content', async ({ page }) => {
    const drawer = await openDemo(page, 'open-fit', 'drawer-fit')
    const box = (await drawer.boundingBox())!
    const viewport = page.viewportSize()!
    expect(box.height).toBeLessThan(viewport.height * 0.7)
    expect(box.y + box.height).toBeCloseTo(viewport.height, 0)
  })

  test('pushes the page back while expanded', async ({ page }) => {
    const drawer = await openDemo(page, 'open-scale', 'drawer-scale')
    const app = page.locator('#app')
    await expect(app).toHaveAttribute('style', /scale\(0\.9\d+\)/)
    await expect(page.locator('html')).toHaveAttribute('data-vnd-scaled', '')

    // Halfway down the page comes forward again.
    await drag(page, drawer, 0, 400, slowly)
    await expectShare(drawer, 1 / 2)
    await expect(app).toHaveAttribute('style', /scale\(1\)/)

    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-vnd-scaled')
    await expect(app).not.toHaveAttribute('style', /transform/)
  })

  test('steps a drawer back while another one is open on top', async ({ page }) => {
    const outer = await openDemo(page, 'open-nested', 'drawer-nested')
    await page.getByTestId('open-inner').click()
    const inner = page.getByTestId('drawer-inner')
    await expect(inner).toHaveAttribute('data-state', 'open')
    await expect(outer).toHaveAttribute('style', /scale\(0\.9\d+\)/)

    await page.getByTestId('inner-close').click()
    await expect(inner).toHaveCount(0)
    await expect(outer).not.toHaveAttribute('style', /scale/)
    await expect(outer).toHaveAttribute('data-state', 'open')
  })

  test('slides in from every edge', async ({ page }) => {
    const left = await openDemo(page, 'open-left', 'drawer-left')
    expect((await left.boundingBox())!.x).toBeCloseTo(0, 0)
    await drag(page, left, -200, 0, { ...slowly, from: { x: 150, y: 300 } })
    await expect(left).toHaveCount(0)

    const right = await openDemo(page, 'open-right', 'drawer-right')
    const viewport = page.viewportSize()!
    const box = (await right.boundingBox())!
    expect(box.x + box.width).toBeCloseTo(viewport.width, 0)
    await drag(page, right, 200, 0, { ...slowly, from: { x: 100, y: 300 } })
    await expect(right).toHaveCount(0)

    const top = await openDemo(page, 'open-top', 'drawer-top')
    expect((await top.boundingBox())!.y).toBeCloseTo(0, 0)
    await drag(page, top, 0, -150, { ...slowly, from: { x: 150, y: 40 } })
    await expect(top).toHaveCount(0)
  })

  test('fades the overlay in on the way to the last snap point', async ({ page }) => {
    const drawer = await openDemo(page, 'open-fade', 'drawer-fade')
    const overlay = page.locator('.vnd-overlay')
    const box = (await drawer.boundingBox())!
    expect(page.viewportSize()!.height - box.y).toBeCloseTo(148, 0)
    await expect(overlay).toHaveCSS('opacity', '0')
    await drawer.locator('.vnd-handle').click()
    await expect(overlay).toHaveCSS('opacity', '0')
    await drawer.locator('.vnd-handle').click()
    await expect(overlay).toHaveCSS('opacity', '1')
  })

  test('leaves the page interactive when not modal', async ({ page }) => {
    const drawer = await openDemo(page, 'open-nonmodal', 'drawer-nonmodal')
    await expect(page.locator('.vnd-overlay')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')

    // The page controls the snap point from the outside.
    await page.getByTestId('open-nonmodal').evaluate((button) => button.scrollIntoView())
    await page.getByTestId('nonmodal-snap-1').click()
    await expectShare(drawer, 1 / 2)
    await page.getByTestId('nonmodal-snap-0').click()
    await expect
      .poll(async () => page.viewportSize()!.height - (await drawer.boundingBox())!.y)
      .toBeCloseTo(140, 0)
  })
})

test.describe('accessibility', () => {
  test('keeps keyboard focus inside a modal drawer', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard navigation')
    const drawer = await openDemo(page, 'open-locked', 'drawer-locked')
    await expect(drawer).toBeFocused()
    const accept = page.getByTestId('locked-accept')
    await page.keyboard.press('Tab')
    await expect(accept).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(accept).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(accept).toBeFocused()
  })

  test('labels the drawer with its title and description', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await expect(drawer).toHaveAccessibleName('Nearby')
    await expect(drawer).toHaveAccessibleDescription('20 places within walking distance')
    await expect(drawer).toHaveAttribute('aria-modal', 'true')
  })
})
