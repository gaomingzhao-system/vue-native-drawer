import { describe, expect, it } from 'vitest'
import {
  clamp,
  findSnapIndex,
  getReleaseTarget,
  getSnapOffsets,
  resolveSnapPoint,
  rubberBand,
  type Release,
} from '../../src/utils/snap'

describe('resolveSnapPoint', () => {
  it('treats numbers up to 1 as fractions of the drawer', () => {
    expect(resolveSnapPoint(1 / 3, 900)).toBeCloseTo(300)
    expect(resolveSnapPoint(0.5, 900)).toBe(450)
    expect(resolveSnapPoint(1, 900)).toBe(900)
  })

  it('treats larger numbers and px strings as pixels', () => {
    expect(resolveSnapPoint(240, 900)).toBe(240)
    expect(resolveSnapPoint('240px', 900)).toBe(240)
  })

  it('treats % strings as percentages of the drawer', () => {
    expect(resolveSnapPoint('25%', 800)).toBe(200)
  })

  it('never exceeds the drawer', () => {
    expect(resolveSnapPoint('2000px', 900)).toBe(900)
    expect(resolveSnapPoint(-1, 900)).toBe(0)
  })

  it('falls back to fully open for unparsable values', () => {
    expect(resolveSnapPoint('abcpx' as `${number}px`, 900)).toBe(900)
  })
})

describe('getSnapOffsets', () => {
  it('measures how far the drawer moves towards its edge for each snap point', () => {
    const offsets = getSnapOffsets([1 / 3, 1 / 2, 1], 900)
    expect(offsets[0]).toBeCloseTo(600)
    expect(offsets[1]).toBe(450)
    expect(offsets[2]).toBe(0)
    expect(getSnapOffsets(['148px', '355px', 1], 800)).toEqual([652, 445, 0])
  })
})

describe('findSnapIndex', () => {
  it('finds snap points, comparing numbers loosely', () => {
    const points = [1 / 3, 0.5, 1]
    expect(findSnapIndex(points, 0.333333333)).toBe(0)
    expect(findSnapIndex(points, 1)).toBe(2)
    expect(findSnapIndex(['148px', 1], '148px')).toBe(0)
  })

  it('returns -1 for unknown or missing points', () => {
    expect(findSnapIndex([0.5, 1], 0.25)).toBe(-1)
    expect(findSnapIndex([0.5, 1], undefined)).toBe(-1)
    expect(findSnapIndex([0.5, 1], null)).toBe(-1)
  })
})

describe('rubberBand', () => {
  it('follows the finger less and less', () => {
    const small = rubberBand(20, 64)
    const large = rubberBand(200, 64)
    expect(small).toBeGreaterThan(0)
    expect(small).toBeLessThan(20 * 0.56)
    expect(large / 200).toBeLessThan(small / 20)
  })

  it('never goes past its limit', () => {
    expect(rubberBand(1e6, 64)).toBeLessThan(64)
    expect(rubberBand(1e6, 64)).toBeGreaterThan(63)
  })

  it('does nothing without a distance or a limit', () => {
    expect(rubberBand(0, 64)).toBe(0)
    expect(rubberBand(-10, 64)).toBe(0)
    expect(rubberBand(10, 0)).toBe(0)
  })
})

describe('getReleaseTarget', () => {
  // A 900px drawer with the default snap points: a third (600), half (450) and full (0).
  const base = { offsets: [600, 450, 0], closed: 900, dismissible: true }
  const release = (position: number, velocity: number, extra: Partial<Release> = {}) =>
    getReleaseTarget({ ...base, position, velocity, ...extra })

  it('settles on the nearest snap point after a slow release', () => {
    expect(release(560, 0)).toEqual({ type: 'snap', index: 0 })
    expect(release(500, 0)).toEqual({ type: 'snap', index: 1 })
    expect(release(250, 0)).toEqual({ type: 'snap', index: 1 })
    expect(release(150, 0)).toEqual({ type: 'snap', index: 2 })
  })

  it('carries the momentum of a release forward', () => {
    // Released between half and full while moving up quickly.
    expect(release(300, -2)).toEqual({ type: 'snap', index: 2 })
    // Released between half and full while moving down quickly.
    expect(release(150, 2)).toEqual({ type: 'snap', index: 1 })
  })

  it('moves on to the next snap point after a short flick', () => {
    expect(release(590, -0.6)).toEqual({ type: 'snap', index: 1 })
    expect(release(440, -0.6)).toEqual({ type: 'snap', index: 2 })
    expect(release(10, 0.6)).toEqual({ type: 'snap', index: 1 })
    expect(release(460, 0.6)).toEqual({ type: 'snap', index: 0 })
  })

  it('stays at the largest snap point when flicked further open', () => {
    expect(release(-20, -3)).toEqual({ type: 'snap', index: 2 })
  })

  it('closes when flicked down from the smallest snap point', () => {
    expect(release(610, 0.6)).toEqual({ type: 'close' })
  })

  it('closes past the close threshold', () => {
    // A quarter of the way from the smallest snap point (600) to closed (900) is 675.
    expect(release(670, 0)).toEqual({ type: 'snap', index: 0 })
    expect(release(680, 0)).toEqual({ type: 'close' })
    expect(release(680, 0, { closeThreshold: 0.5 })).toEqual({ type: 'snap', index: 0 })
  })

  it('closes after a strong flick from anywhere', () => {
    expect(release(100, 6)).toEqual({ type: 'close' })
  })

  it('never closes a drawer that is not dismissible', () => {
    expect(release(610, 0.6, { dismissible: false })).toEqual({ type: 'snap', index: 0 })
    expect(release(850, 3, { dismissible: false })).toEqual({ type: 'snap', index: 0 })
  })

  it('works with a single snap point', () => {
    const single = { offsets: [0], closed: 300, dismissible: true }
    expect(getReleaseTarget({ ...single, position: 60, velocity: 0 })).toEqual({
      type: 'snap',
      index: 0,
    })
    expect(getReleaseTarget({ ...single, position: 80, velocity: 0 })).toEqual({ type: 'close' })
    expect(getReleaseTarget({ ...single, position: 20, velocity: 0.5 })).toEqual({ type: 'close' })
  })

  it('does not depend on the order of the snap points', () => {
    expect(
      getReleaseTarget({ ...base, offsets: [0, 600, 450], position: 500, velocity: 0 }),
    ).toEqual({ type: 'snap', index: 2 })
  })
})

describe('clamp', () => {
  it('keeps values within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })
})
