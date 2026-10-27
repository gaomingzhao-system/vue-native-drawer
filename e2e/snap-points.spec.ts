import { expect, test } from '@playwright/test'
import { drag, expectShare, openDemo, quickly, slowly, visibleShare } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('snap points', () => {
  test('opens at a third of the screen', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await expectShare(drawer, 1 / 3)
    await expect(page.getByTestId('snap-value')).toHaveText('1/3')
    await expect(drawer).toHaveAttribute('role', 'dialog')
    await expect(drawer).toBeFocused()
  })

  test('drags up through half to full height', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    const height = await drawer.evaluate((element: HTMLElement) => element.offsetHeight)

    await drag(page, drawer, 0, -height / 6, slowly)
    await expectShare(drawer, 1 / 2)
    await expect(page.getByTestId('snap-value')).toHaveText('1/2')

    await drag(page, drawer, 0, -height / 2, slowly)
    await expectShare(drawer, 1)
    await expect(page.getByTestId('snap-value')).toHaveText('full')
    await expect(drawer).toHaveAttribute('data-expanded', 'true')
  })

  test('flicks ahead to the next snap point', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drag(page, drawer, 0, -40, quickly)
    await expectShare(drawer, 1 / 2)
  })

  test('skips snap points on a strong flick', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drag(page, drawer, 0, -320, quickly)
    await expectShare(drawer, 1)
  })

  test('snaps back after a short drag', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drag(page, drawer, 0, 30, slowly)
    await expectShare(drawer, 1 / 3)
  })

  test('follows the finger while dragging', async ({ page, isMobile }) => {
    test.skip(isMobile, 'measured with the mouse')
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    const before = await visibleShare(drawer)
    const box = (await drawer.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 10)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y - 90, { steps: 10 })
    const height = await drawer.evaluate((element: HTMLElement) => element.offsetHeight)
    expect(await visibleShare(drawer)).toBeCloseTo(before + 100 / height, 2)
    await page.mouse.up()
  })

  test('tapping the handle steps through the snap points', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    const handle = drawer.locator('.vnd-handle')
    await handle.click()
    await expectShare(drawer, 1 / 2)
    await handle.click()
    await expectShare(drawer, 1)
    await handle.click()
    await expectShare(drawer, 1 / 3)
  })

  test('keeps the footer on screen', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    const done = page.getByTestId('snap-done')
    await expect(done).toBeInViewport()
    await done.click()
    await expect(drawer).toHaveCount(0)
  })

  test('a drag that ends on a button does not press it', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    const done = page.getByTestId('snap-done')
    const box = (await done.boundingBox())!
    const panel = (await drawer.boundingBox())!
    // Press on the footer button, drag the drawer up and let go.
    await drag(page, drawer, 0, -150, {
      ...slowly,
      from: { x: box.x - panel.x + box.width / 2, y: box.y - panel.y + box.height / 2 },
    })
    await expectShare(drawer, 1 / 2)
    await expect(drawer).toHaveAttribute('data-state', 'open')
  })
})

test.describe('dismissing', () => {
  test('drags down to close', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drag(page, drawer, 0, 160, slowly)
    await expect(drawer).toHaveCount(0)
    await expect(page.getByTestId('snap-value')).toHaveText('1/3')
  })

  test('flicks down to close', async ({ page }) => {
    const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drag(page, drawer, 0, 60, quickly)
    await expect(drawer).toHaveCount(0)
  })

  test('closes on a tap outside', async ({ page }) => {
    const drawer = await openDemo(page, 'open-fit', 'drawer-fit')
    await page.mouse.click(20, 20)
    await expect(drawer).toHaveCount(0)
  })

  test('closes with Escape and returns focus', async ({ page }) => {
    const drawer = await openDemo(page, 'open-fit', 'drawer-fit')
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(page.getByTestId('open-fit')).toBeFocused()
  })

  test('returns to the first snap point when reopened', async ({ page }) => {
    let drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await drawer.locator('.vnd-handle').click()
    await expectShare(drawer, 1 / 2)
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    drawer = await openDemo(page, 'open-snap', 'drawer-snap')
    await expectShare(drawer, 1 / 3)
  })

  test('cannot be dismissed when not dismissible', async ({ page }) => {
    const drawer = await openDemo(page, 'open-locked', 'drawer-locked')
    await page.keyboard.press('Escape')
    await page.mouse.click(20, 20)
    await drag(page, drawer, 0, 250, slowly)
    await expect(drawer).toHaveAttribute('data-state', 'open')
    await expectShare(drawer, 1)
    await page.getByTestId('locked-accept').click()
    await expect(drawer).toHaveCount(0)
  })
})
