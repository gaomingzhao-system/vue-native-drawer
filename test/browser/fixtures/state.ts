import { reactive } from 'vue'
import type { DrawerProps, SnapPoint } from '../../../src'

/** Everything the harness renders; tests change it and read it back. */
export const state = reactive({
  open: false,
  snap: undefined as SnapPoint | undefined,
  props: {} as DrawerProps,
  /** Ignore `update:open`, like a parent that keeps the drawer open. */
  keepOpen: false,
  items: 0,
  footer: false,
  header: false,
  nested: false,
  events: [] as string[],
  progress: [] as number[],
})

export function resetState() {
  Object.assign(state, {
    open: false,
    snap: undefined,
    props: {},
    keepOpen: false,
    items: 0,
    footer: false,
    header: false,
    nested: false,
    events: [],
    progress: [],
  })
}
