const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Translation of `element` along one axis, as currently rendered (mid-transition included). */
export function readTranslate(element: HTMLElement, vertical: boolean): number {
  const { transform } = getComputedStyle(element)
  if (!transform || transform === 'none') return 0
  const matrix = new DOMMatrixReadOnly(transform)
  return vertical ? matrix.m42 : matrix.m41
}

/** Nearest ancestor of `target`, below `boundary`, that scrolls along the given axis. */
export function findScrollable(
  target: Element,
  boundary: Element,
  vertical: boolean,
): HTMLElement | null {
  for (let element: Element | null = target; element && element !== boundary;) {
    if (element instanceof HTMLElement && isScrollable(element, vertical)) return element
    element = element.parentElement
  }
  return null
}

function isScrollable(element: HTMLElement, vertical: boolean): boolean {
  const style = getComputedStyle(element)
  const overflow = vertical ? style.overflowY : style.overflowX
  if (overflow !== 'auto' && overflow !== 'scroll') return false
  return vertical
    ? element.scrollHeight > element.clientHeight + 1
    : element.scrollWidth > element.clientWidth + 1
}

/**
 * Whether `element` can still scroll when a finger moves along the axis: content scrolls back
 * towards its start when `towardStart` (the finger moves down or right), else towards its end.
 */
export function canScroll(element: HTMLElement, vertical: boolean, towardStart: boolean): boolean {
  const position = Math.abs(vertical ? element.scrollTop : element.scrollLeft)
  const max = vertical
    ? element.scrollHeight - element.clientHeight
    : element.scrollWidth - element.clientWidth
  return towardStart ? position > 0.5 : position < max - 0.5
}

/** Elements inside `container` that can receive keyboard focus, in tab order. */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]'),
  )
}
