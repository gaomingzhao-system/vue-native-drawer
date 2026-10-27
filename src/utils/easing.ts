import { DURATION, EASE } from '../constants'

const round = (value: number) => Math.round(value * 1000) / 1000

/** CSS `cubic-bezier()` of four control values. */
export function cubicBezier(points: readonly number[]): string {
  return `cubic-bezier(${points.map(round).join(', ')})`
}

/** The default drawer easing. */
export const EASING = cubicBezier(EASE)

/**
 * The drawer easing, bent so the animation starts at `velocity` (px/ms) and the drawer keeps the
 * speed the finger released it with instead of jumping to the speed built into the curve.
 * `distance` (px) is how far the animation travels.
 */
export function easingForVelocity(velocity: number, distance: number, duration = DURATION): string {
  const [x1, y1, x2, y2] = EASE
  if (velocity <= 0 || distance <= 0) return EASING
  // Initial slope of the curve needed to start at `velocity`.
  const slope = (velocity * duration) / distance
  if (slope <= y1 / x1) return EASING
  return cubicBezier([Math.max(y1 / slope, 0.01), y1, x2, y2])
}
