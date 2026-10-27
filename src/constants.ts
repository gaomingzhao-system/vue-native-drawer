import type { SnapPoint } from './types'

/** Snap points of top and bottom drawers: a third, half and the full height. */
export const DEFAULT_SNAP_POINTS: readonly SnapPoint[] = [1 / 3, 1 / 2, 1]

/** Length (ms) of every drawer animation, as long as a UIKit sheet transition. */
export const DURATION = 500

/** The curve UIKit sheets settle with. */
export const EASE = [0.32, 0.72, 0, 1] as const

/** Distance (px) a finger or pen has to travel before a gesture is recognised. */
export const TOUCH_SLOP = 10

/** Distance (px) a mouse has to travel before a gesture is recognised. */
export const MOUSE_SLOP = 2

/** Distance (px) from fully open at which a drawer settling there already lets its content scroll. */
export const SCROLL_SLOP = 24

/** Release velocity (px/ms) from which a release counts as a flick. */
export const FLICK_VELOCITY = 0.4

/**
 * How far (px) a release keeps travelling per px/ms of velocity before a snap point is picked.
 * This is UIScrollView's fast deceleration rate: `0.99 / (1 - 0.99)`.
 */
export const MOMENTUM = 99

/** Default share of the way from the smallest snap point to closed that closes the drawer. */
export const CLOSE_THRESHOLD = 0.25

/** UIScrollView's rubber band constant: how much an overdrag follows the finger at first. */
export const RUBBER_BAND = 0.55

/** Furthest (px) the drawer can be pulled past its range. */
export const MAX_OVERDRAG = 64

/** Pixels the page loses on each side when it is pushed back behind a drawer. */
export const BACKGROUND_INSET = 13

/** Pixels the page moves towards the drawer when it is pushed back. */
export const BACKGROUND_SHIFT = 14

/** Corner radius (px) of the pushed back page. */
export const BACKGROUND_RADIUS = 10

/** Pixels a drawer moves back while another drawer is open on top of it. */
export const NESTED_SHIFT = 16
