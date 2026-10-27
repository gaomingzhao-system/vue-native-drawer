import { describe, expect, it } from 'vitest'
import { EASE } from '../../src/constants'
import { cubicBezier, EASING, easingForVelocity } from '../../src/utils/easing'
import { createVelocityTracker } from '../../src/utils/velocity'

describe('createVelocityTracker', () => {
  it('measures the speed of the latest movement in px/ms', () => {
    const tracker = createVelocityTracker()
    tracker.add(0, 0)
    tracker.add(16, 32)
    tracker.add(32, 64)
    expect(tracker.velocity(32)).toBe(2)
  })

  it('only looks at the last 100ms', () => {
    const tracker = createVelocityTracker()
    tracker.add(0, 0)
    tracker.add(500, 0)
    tracker.add(520, -20)
    tracker.add(540, -40)
    expect(tracker.velocity(540)).toBe(-1)
  })

  it('reports no velocity when the pointer rested before the release', () => {
    const tracker = createVelocityTracker()
    tracker.add(0, 0)
    tracker.add(16, 40)
    expect(tracker.velocity(16)).toBe(2.5)
    expect(tracker.velocity(200)).toBe(0)
  })

  it('ignores samples that did not move', () => {
    const tracker = createVelocityTracker()
    tracker.add(0, 0)
    tracker.add(16, 32)
    tracker.add(32, 64)
    // Released 20ms later at the same position: still the speed of the movement.
    tracker.add(52, 64)
    expect(tracker.velocity(52)).toBe(2)
    // Released after resting.
    tracker.add(120, 64)
    expect(tracker.velocity(120)).toBe(0)
  })

  it('needs two samples', () => {
    const tracker = createVelocityTracker()
    expect(tracker.velocity(0)).toBe(0)
    tracker.add(0, 10)
    expect(tracker.velocity(0)).toBe(0)
    tracker.add(10, 20)
    tracker.reset()
    expect(tracker.velocity(10)).toBe(0)
  })
})

describe('easingForVelocity', () => {
  it('uses the UIKit sheet curve by default', () => {
    expect(EASING).toBe(cubicBezier(EASE))
    expect(EASING).toBe('cubic-bezier(0.32, 0.72, 0, 1)')
    expect(easingForVelocity(0, 300)).toBe(EASING)
  })

  it('keeps the curve when the release is slower than the curve starts', () => {
    // The curve starts at 0.72 / 0.32 = 2.25 times its average speed: 2.25 * 300 / 500.
    expect(easingForVelocity(1.3, 300)).toBe(EASING)
  })

  it('starts as fast as a quick release', () => {
    const easing = easingForVelocity(3, 300)
    const [x1, y1] = easing.match(/[\d.]+/g)!.map(Number)
    // Initial slope y1 / x1 matches 3 px/ms over 300px in 500ms.
    expect(y1! / x1!).toBeCloseTo((3 * 500) / 300, 1)
    expect(easing.endsWith(', 0, 1)')).toBe(true)
  })

  it('stays a valid curve for extreme velocities', () => {
    const [x1] = easingForVelocity(1000, 1)
      .match(/[\d.]+/g)!
      .map(Number)
    expect(x1).toBeGreaterThan(0)
  })
})
