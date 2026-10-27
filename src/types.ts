/** Edge of the screen the drawer slides in from. */
export type DrawerDirection = 'top' | 'bottom' | 'left' | 'right'

/**
 * A resting position of the drawer, expressed as how much of it is visible:
 *
 * - a number from `0` to `1` is a fraction of the drawer's full size (`0.5` is half open)
 * - a number above `1`, or a `px` string, is a size in pixels (`240` or `'240px'`)
 * - a `%` string is a percentage of the full size (`'50%'`)
 */
export type SnapPoint = number | `${number}px` | `${number}%`

export interface DrawerProps {
  /**
   * Snap points, from the smallest to the largest. The drawer opens at the first one.
   *
   * @default [1 / 3, 1 / 2, 1] for top and bottom drawers, [1] otherwise
   */
  snapPoints?: SnapPoint[]
  /**
   * Edge of the screen the drawer slides in from.
   *
   * @default 'bottom'
   */
  direction?: DrawerDirection
  /**
   * Whether the drawer can be closed by dragging it away, tapping the overlay or pressing Escape.
   *
   * @default true
   */
  dismissible?: boolean
  /**
   * Show an overlay, lock page scrolling and keep focus inside the drawer while it is open.
   * Set to `false` to keep the page interactive behind the drawer.
   *
   * @default true
   */
  modal?: boolean
  /**
   * Size the drawer to its content (up to the full height) instead of filling the screen.
   *
   * @default false
   */
  fit?: boolean
  /**
   * Show the grab handle.
   *
   * @default true for top and bottom drawers
   */
  handle?: boolean
  /**
   * Only start drags from the handle (or elements with `data-vnd-handle`).
   *
   * @default false
   */
  handleOnly?: boolean
  /**
   * Index of the snap point from which the overlay is fully visible. The overlay fades in
   * while the drawer moves from the previous snap point (or from closed) to this one.
   *
   * @default 0
   */
  fadeFrom?: number
  /**
   * Push the page back like a stack of iOS cards while the drawer is expanded. Pass `true` to
   * scale the element with the `data-vnd-background` attribute, or a CSS selector.
   *
   * @default false
   */
  scaleBackground?: boolean | string
  /**
   * How far (0–1) between the smallest snap point and closed a release has to land for the
   * drawer to close.
   *
   * @default 0.25
   */
  closeThreshold?: number
  /** Accessible title, rendered in the drawer header. */
  title?: string
  /** Accessible description, rendered under the title. */
  description?: string
  /**
   * Where the drawer is teleported to. `false` renders it in place.
   *
   * @default 'body'
   */
  to?: string | HTMLElement | false
}

/** Props passed to the `default`, `header` and `footer` slots. */
export interface DrawerSlotProps {
  /** Close the drawer. */
  close: () => void
  /** Animate the drawer to one of its snap points. */
  snapTo: (point: SnapPoint) => void
  /** The snap point the drawer rests at. */
  snapPoint: SnapPoint
  /** Whether the drawer rests at its largest snap point. */
  expanded: boolean
}

/** Methods available on a template ref of the drawer. */
export interface DrawerExposed {
  /** Open the drawer. */
  show: () => void
  /** Close the drawer. */
  close: () => void
  /** Animate the drawer to one of its snap points. */
  snapTo: (point: SnapPoint) => void
}
