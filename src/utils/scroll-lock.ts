let locks = 0
let unlock: (() => void) | undefined

/**
 * Stop the page behind modal drawers from scrolling. Locks are counted, so nested drawers can
 * lock and release independently. Returns the release function.
 */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  if (locks++ === 0) unlock = applyLock()

  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) {
      unlock?.()
      unlock = undefined
    }
  }
}

function applyLock(): () => void {
  const root = document.documentElement
  const { body } = document
  const previous = { overflow: root.style.overflow, paddingRight: body.style.paddingRight }

  // Keep the layout from shifting when the scrollbar disappears.
  const scrollbar = window.innerWidth - root.clientWidth
  if (scrollbar > 0) {
    const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0
    body.style.paddingRight = `${padding + scrollbar}px`
  }
  root.style.overflow = 'hidden'
  document.addEventListener('touchmove', onTouchMove, { passive: false })

  return () => {
    root.style.overflow = previous.overflow
    body.style.paddingRight = previous.paddingRight
    document.removeEventListener('touchmove', onTouchMove)
  }
}

// iOS Safari still scrolls the page from touches that start outside a scroll container.
function onTouchMove(event: TouchEvent) {
  const inDrawer = event.target instanceof Element && event.target.closest('[data-vnd-drawer]')
  if (!inDrawer && event.cancelable) event.preventDefault()
}
