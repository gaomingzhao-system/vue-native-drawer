import { BACKGROUND_INSET, BACKGROUND_RADIUS, BACKGROUND_SHIFT } from '../constants'
import type { DrawerDirection } from '../types'

const PROPERTIES = ['transform', 'transformOrigin', 'transition', 'clipPath', 'willChange'] as const

export interface BackgroundScale {
  /** Prepare `selector`'s element to be pushed back by a drawer coming from `direction`. */
  activate: (selector: string, direction: DrawerDirection) => void
  /** Push the page back by `progress` (0–1), animated by `transition` when given. */
  render: (progress: number, transition?: string) => void
  /** Restore the page. */
  deactivate: () => void
}

/** Pushes the page back behind a drawer like a stack of iOS cards. */
export function createBackgroundScale(): BackgroundScale {
  let element: HTMLElement | null = null
  let direction: DrawerDirection = 'bottom'
  let inset = '0px'
  const saved: Partial<Record<(typeof PROPERTIES)[number], string>> = {}

  return {
    activate(selector, from) {
      element = document.querySelector<HTMLElement>(selector)
      if (!element) return
      direction = from
      for (const property of PROPERTIES) saved[property] = element.style[property]

      // Scale around the edge of the viewport facing away from the drawer and round off only the
      // part of the page that is on screen, so a scrolled page is pushed back in place.
      const rect = element.getBoundingClientRect()
      const width = window.innerWidth
      const height = window.innerHeight
      const top = Math.max(0, -rect.top)
      const left = Math.max(0, -rect.left)
      const bottom = Math.max(0, rect.bottom - height)
      const right = Math.max(0, rect.right - width)
      inset = `${top}px ${right}px ${bottom}px ${left}px`
      const centerX = width / 2 - rect.left
      const centerY = height / 2 - rect.top
      element.style.transformOrigin = {
        bottom: `${centerX}px ${top}px`,
        top: `${centerX}px ${height - rect.top}px`,
        left: `${width - rect.left}px ${centerY}px`,
        right: `${left}px ${centerY}px`,
      }[direction]
      element.style.willChange = 'transform'
      document.documentElement.setAttribute('data-vnd-scaled', '')
    },

    render(progress, transition) {
      if (!element) return
      const vertical = direction === 'top' || direction === 'bottom'
      const scale =
        1 -
        ((2 * BACKGROUND_INSET) / (vertical ? window.innerWidth : window.innerHeight)) * progress
      const shift =
        BACKGROUND_SHIFT * progress * (direction === 'bottom' || direction === 'right' ? 1 : -1)
      // Clear the notch when the page moves down.
      const safeArea =
        direction === 'bottom' ? ` + env(safe-area-inset-top, 0px) * ${progress}` : ''
      const translate = vertical
        ? `translate3d(0, calc(${shift}px${safeArea}), 0)`
        : `translate3d(${shift}px, 0, 0)`

      element.style.transition = transition
        ? `transform ${transition}, clip-path ${transition}`
        : 'none'
      element.style.transform = `${translate} scale(${scale})`
      element.style.clipPath = `inset(${inset} round ${BACKGROUND_RADIUS * progress}px)`
    },

    deactivate() {
      if (element) {
        for (const property of PROPERTIES) element.style[property] = saved[property] ?? ''
      }
      element = null
      document.documentElement.removeAttribute('data-vnd-scaled')
    },
  }
}
