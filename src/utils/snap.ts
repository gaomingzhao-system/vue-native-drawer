import { CLOSE_THRESHOLD, FLICK_VELOCITY, MOMENTUM, RUBBER_BAND } from '../constants'
import type { SnapPoint } from '../types'

/** Snap points closer than this (px) to a position count as reached. */
const EPSILON = 0.5

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Visible size (px) of `point` for a drawer whose full size is `size`. */
export function resolveSnapPoint(point: SnapPoint, size: number): number {
  let visible: number
  if (typeof point === 'number') visible = point <= 1 ? point * size : point
  else if (point.endsWith('%')) visible = (Number.parseFloat(point) / 100) * size
  else visible = Number.parseFloat(point)
  return Number.isFinite(visible) ? clamp(visible, 0, size) : size
}

/**
 * Offsets of every snap point: how far (px) the drawer is moved towards its edge to rest there.
 * `0` is fully open, `size` is closed.
 */
export function getSnapOffsets(points: readonly SnapPoint[], size: number): number[] {
  return points.map((point) => size - resolveSnapPoint(point, size))
}

/** Index of `point` in `points`, or `-1`. Numbers are compared loosely so `1 / 3` matches `0.333…`. */
export function findSnapIndex(
  points: readonly SnapPoint[],
  point: SnapPoint | null | undefined,
): number {
  if (point == null) return -1
  return points.findIndex(
    (candidate) =>
      candidate === point ||
      (typeof candidate === 'number' &&
        typeof point === 'number' &&
        Math.abs(candidate - point) < 1e-6),
  )
}

/**
 * Rubber banding as UIScrollView does it: an overdrag of `distance` px moves the drawer less and
 * less the further it goes, and never more than `limit` px.
 */
export function rubberBand(distance: number, limit: number): number {
  if (distance <= 0 || limit <= 0) return 0
  return (1 - 1 / ((distance * RUBBER_BAND) / limit + 1)) * limit
}

export interface Release {
  /** Snap point offsets (see `getSnapOffsets`). */
  offsets: readonly number[]
  /** Offset at which the drawer is fully hidden. */
  closed: number
  /** Offset at release. */
  position: number
  /** Release velocity in px/ms, positive towards closed. */
  velocity: number
  dismissible: boolean
  closeThreshold?: number
}

export type ReleaseTarget = { type: 'snap'; index: number } | { type: 'close' }

/**
 * Where a drawer goes once it is released. The release is projected forward by its momentum and
 * the nearest snap point wins, while a flick always moves on to the next snap point in its
 * direction, like iOS sheets.
 */
export function getReleaseTarget({
  offsets,
  closed,
  position,
  velocity,
  dismissible,
  closeThreshold = CLOSE_THRESHOLD,
}: Release): ReleaseTarget {
  const projected = position + velocity * MOMENTUM
  const lowest = Math.max(...offsets)
  const flick = Math.abs(velocity) > FLICK_VELOCITY

  if (dismissible) {
    if (flick && velocity > 0 && position >= lowest - EPSILON) return { type: 'close' }
    if (projected >= lowest + clamp(closeThreshold, 0, 1) * (closed - lowest)) {
      return { type: 'close' }
    }
  }

  let index = nearest(offsets, projected)
  if (flick) {
    const target = offsets[index] ?? 0
    // A flick never settles behind the point it was released at.
    const next =
      velocity > 0
        ? target <= position + EPSILON && nextSnap(offsets, position, 1)
        : target >= position - EPSILON && nextSnap(offsets, position, -1)
    if (next !== false && next !== -1) index = next
  }
  return { type: 'snap', index }
}

function nearest(offsets: readonly number[], position: number): number {
  let best = 0
  for (const [index, offset] of offsets.entries()) {
    if (Math.abs(offset - position) < Math.abs((offsets[best] ?? 0) - position)) best = index
  }
  return best
}

/** Closest snap point past `position`: towards closed when `direction` is 1, else towards open. */
function nextSnap(offsets: readonly number[], position: number, direction: 1 | -1): number {
  let best = -1
  for (const [index, offset] of offsets.entries()) {
    const ahead = direction > 0 ? offset > position + EPSILON : offset < position - EPSILON
    if (
      ahead &&
      (best === -1 || Math.abs(offset - position) < Math.abs(offsets[best]! - position))
    ) {
      best = index
    }
  }
  return best
}
