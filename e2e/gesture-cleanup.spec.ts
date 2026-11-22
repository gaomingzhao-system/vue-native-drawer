import { expect, test } from '@playwright/test'
import { drag, expectShare, openDemo, slowly } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('does not activate the handle on drag release, then accepts the next click', async ({
  page,
  isMobile,
}) => {
  const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
  const handle = drawer.locator('.vnd-handle')
  const height = (await drawer.boundingBox())!.height
  await drawer.evaluate((element) => {
    // Register before the release arms suppression, so the capture observer still sees it.
    window.addEventListener(
      'click',
      (event) => {
        if (event.isTrusted && event.target instanceof Node && element.contains(event.target)) {
          element.setAttribute('data-release-click', 'received')
        }
      },
      true,
    )
    element.addEventListener('click', () => element.setAttribute('data-bubbled-click', 'received'))
  })
  // A real browser-generated release click must not advance from half to full height.
  await drag(page, handle, 0, -height / 6, slowly)
  await expectShare(drawer, 1 / 2)
  // Touch browsers may produce no click after a native scroll/drag. A mouse release does.
  if (!isMobile) await expect(drawer).toHaveAttribute('data-release-click', 'received')
  await expect(drawer).not.toHaveAttribute('data-bubbled-click')
  await handle.click()
  await expectShare(drawer, 1)
})

test('keeps a keyboard activation immediately after a drag', async ({ page }) => {
  const drawer = await openDemo(page, 'open-snap', 'drawer-snap')
  // Observe the trusted keyboard-generated click independently of any synthetic test events.
  await drawer.evaluate((element) => {
    const button = element.querySelector<HTMLButtonElement>('[data-testid="snap-done"]')!
    element.addEventListener('pointerup', () => button.focus())
  })
  await drag(page, drawer.locator('.vnd-handle'), 0, -20, slowly)
  await page.keyboard.press('Enter')
  await expect(drawer).toHaveCount(0)
})
