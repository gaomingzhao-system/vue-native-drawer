import { expect, type Locator, type Page } from '@playwright/test'

export interface DragOptions {
  /** Where the press starts, relative to the top-left corner of the element. */
  from?: { x: number; y: number }
  steps?: number
  /** Time (ms) between moves. */
  delay?: number
  /** Time (ms) the pointer rests before it is released, dropping its velocity. */
  hold?: number
}

/** A slow drag that is released at rest. */
export const slowly: DragOptions = { steps: 15, delay: 16, hold: 120 }

/** A quick flick. */
export const quickly: DragOptions = { steps: 4, delay: 8, hold: 0 }

/**
 * Drag `locator` by `dx`, `dy`: with a finger on touch devices (through the Chrome DevTools
 * Protocol, so the browser scrolls and cancels exactly as it would for a real finger), with the
 * mouse otherwise.
 */
export async function drag(
  page: Page,
  locator: Locator,
  dx: number,
  dy: number,
  { from, steps = 10, delay = 16, hold = 0 }: DragOptions = {},
) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Nothing to drag')
  const x = box.x + (from?.x ?? box.width / 2)
  const y = box.y + (from?.y ?? 10)
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0)

  if (touch) {
    const client = await page.context().newCDPSession(page)
    const point = (step: number) => ({ x: x + (dx * step) / steps, y: y + (dy * step) / steps })
    // Events are spaced out in real time for the browser's own gesture handling (scrolling),
    // and carry explicit timestamps so velocities stay exact whatever round trips cost.
    const start = Date.now() / 1000
    const at = (ms: number) => start + ms / 1000
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point(0)],
      timestamp: at(0),
    })
    for (let step = 1; step <= steps; step++) {
      await page.waitForTimeout(delay)
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [point(step)],
        timestamp: at(step * delay),
      })
    }
    if (hold) await page.waitForTimeout(hold)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
      timestamp: at(steps * delay + hold),
    })
    await client.detach()
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
    for (let step = 1; step <= steps; step++) {
      await page.waitForTimeout(delay)
      await page.mouse.move(x + (dx * step) / steps, y + (dy * step) / steps)
    }
    if (hold) await page.waitForTimeout(hold)
    await page.mouse.up()
  }
}

/** Visible share of a bottom drawer, from 0 to 1. */
export function visibleShare(locator: Locator): Promise<number> {
  return locator.evaluate(
    (element: HTMLElement) =>
      (window.innerHeight - element.getBoundingClientRect().top) / element.offsetHeight,
  )
}

/** Wait until a bottom drawer rests with `share` of it visible. */
export async function expectShare(locator: Locator, share: number) {
  await expect.poll(() => visibleShare(locator)).toBeCloseTo(share, 2)
}

/** Open the demo behind `trigger` and wait until its drawer has settled. */
export async function openDemo(page: Page, trigger: string, drawer: string) {
  const button = page.getByTestId(trigger)
  await button.scrollIntoViewIfNeeded()
  await button.click()
  const locator = page.getByTestId(drawer)
  await expect(locator).toHaveAttribute('data-state', 'open')
  await waitForRest(locator)
  return locator
}

/** Wait until `locator` stops moving. */
export async function waitForRest(locator: Locator) {
  let last = ''
  await expect
    .poll(async () => {
      const box = await locator.boundingBox()
      const position = box ? `${box.x},${box.y}` : ''
      const resting = position === last
      last = position
      return resting
    })
    .toBe(true)
}
