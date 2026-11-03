# vue-native-drawer

A drawer for the web that moves like a native iOS sheet, built for **Vue 3.6 Vapor mode**.

It opens from the bottom at a third of the screen. Drag it up to half and full height, flick it
to skip ahead, or drag it down to close. The drag follows your finger 1:1, a release keeps its
momentum, and pulling past the edge rubber-bands like UIKit.

- **One flat component.** `<Drawer v-model:open="open">` is the whole API: no root, portal,
  overlay or content components to nest.
- **Native feel.** Snap points with momentum projection, velocity-matched settle animations on
  UIKit's sheet curve, rubber banding, and a page that steps back like a stack of cards.
- **Gesture aware.** Content scrolls once the drawer is fully open, and drags the drawer while it
  isn't. Horizontal swipes, text fields and `data-vnd-no-drag` areas are left alone.
- **Vapor first.** Written with `<script setup vapor>`. It works in Vapor apps and in regular apps
  with `vaporInteropPlugin`.
- **Small.** Plain TypeScript and CSS. The only runtime dependency is VueUse.

## Install

```sh
npm install vue-native-drawer
```

`vue` 3.6 or later is a peer dependency.

> **Vue 3.6 pre-releases with npm:** VueUse declares `vue@^3.5.0` as its peer, and that range
> doesn't include pre-releases such as `3.6.0-rc.13`. Until Vue 3.6 is stable, add an override to
> your `package.json`:
>
> ```json
> "overrides": {
>   "@vueuse/core": { "vue": "$vue" },
>   "@vueuse/shared": { "vue": "$vue" }
> }
> ```

## Usage

```vue
<script setup vapor lang="ts">
import { ref } from 'vue'
import { Drawer } from 'vue-native-drawer'
import 'vue-native-drawer/style.css'

const open = ref(false)
</script>

<template>
  <button @click="open = true">Open</button>

  <Drawer v-model:open="open" title="Nearby" description="Places around you">
    <p>Drag me up, down or away.</p>

    <template #footer="{ close }">
      <button @click="close">Done</button>
    </template>
  </Drawer>
</template>
```

Vapor apps (`createVaporApp`) can use the drawer as is. A regular (virtual DOM) app needs Vue's
interop plugin to render Vapor components:

```ts
import { createApp, vaporInteropPlugin } from 'vue'

createApp(App).use(vaporInteropPlugin).mount('#app')
```

## Snap points

Snap points are the drawer's resting positions. Each one says how much of the drawer is visible:

| Value                      | Meaning                                            |
| -------------------------- | -------------------------------------------------- |
| `0`–`1`                    | Fraction of the drawer's full size (`0.5` is half) |
| a number above `1`, `'px'` | Pixels (`240` or `'240px'`)                        |
| `'%'`                      | Percentage of the full size (`'50%'`)              |

The default is `[1 / 3, 1 / 2, 1]` for top and bottom drawers, so they open at a third. Left and
right drawers, and drawers with `fit`, default to `[1]`. List snap points from smallest to largest.
The drawer opens at the first one and goes back to it every time it closes.

```vue
<Drawer v-model:open="open" v-model:snap-point="snap" :snap-points="['148px', 0.5, 1]" />
```

`v-model:snap-point` reports where the drawer rests and moves it when you change it. At the
largest snap point the drawer is _expanded_ (`data-expanded`), and only then does its content
scroll.

A release is projected forward by its momentum and lands on the nearest snap point. A quick flick
always moves on to the next snap point in its direction, and a hard one can skip several. The
drawer closes when a release lands more than `closeThreshold` (a quarter, by default) of the way
from the smallest snap point to closed, or when it is flicked down from the smallest snap point.

## API

### Props

| Prop              | Type                                     | Default                   | Description                                                                                                                             |
| ----------------- | ---------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `snapPoints`      | `SnapPoint[]`                            | `[1/3, 1/2, 1]`, or `[1]` | Resting positions, from smallest to largest. See [Snap points](#snap-points).                                                           |
| `direction`       | `'bottom' \| 'top' \| 'left' \| 'right'` | `'bottom'`                | Edge the drawer comes from.                                                                                                             |
| `dismissible`     | `boolean`                                | `true`                    | Whether dragging away, tapping the overlay or Escape close it.                                                                          |
| `modal`           | `boolean`                                | `true`                    | Show an overlay, lock page scroll and keep focus in the drawer. Set to `false` to keep the page interactive.                            |
| `fit`             | `boolean`                                | `false`                   | Size the drawer to its content instead of the full height.                                                                              |
| `handle`          | `boolean`                                | `true` for top/bottom     | Show the grab handle. Tapping it steps through the snap points.                                                                         |
| `handleOnly`      | `boolean`                                | `false`                   | Only drag from the handle, or from elements with `data-vnd-handle`.                                                                     |
| `fadeFrom`        | `number`                                 | `0`                       | Index of the snap point from which the overlay is fully visible. It fades in from the snap point before it.                             |
| `scaleBackground` | `boolean \| string`                      | `false`                   | Push the page back like iOS while the drawer is expanded. `true` scales the element with `data-vnd-background`; a string is a selector. |
| `closeThreshold`  | `number`                                 | `0.25`                    | Share of the way from the smallest snap point to closed that closes the drawer.                                                         |
| `title`           | `string`                                 |                           | Title, rendered in the header and used as the dialog's accessible name.                                                                 |
| `description`     | `string`                                 |                           | Description under the title, used as the accessible description.                                                                        |
| `to`              | `string \| HTMLElement \| false`         | `'body'`                  | Teleport target. `false` renders the drawer in place.                                                                                   |

Other attributes (`class`, `style`, `aria-*`, `data-*`, listeners) go to the drawer element.

### Models

| Model                | Type        | Description                                                                         |
| -------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `v-model:open`       | `boolean`   | Whether the drawer is open. If the parent doesn't update it, the drawer stays open. |
| `v-model:snap-point` | `SnapPoint` | The snap point the drawer rests at.                                                 |

### Events

| Event    | Payload            | Description                                                |
| -------- | ------------------ | ---------------------------------------------------------- |
| `drag`   | `progress: number` | While dragging: how much of the drawer is visible (0–1).   |
| `opened` |                    | The opening animation has finished.                        |
| `closed` |                    | The closing animation has finished and the drawer is gone. |

### Slots

`default` (scrollable content), `header` (replaces the title and description) and `footer`
(stays on screen at every snap point). Each one receives:

| Slot prop   | Type                         | Description                                 |
| ----------- | ---------------------------- | ------------------------------------------- |
| `close`     | `() => void`                 | Close the drawer.                           |
| `snapTo`    | `(point: SnapPoint) => void` | Animate to a snap point.                    |
| `snapPoint` | `SnapPoint`                  | The snap point the drawer rests at.         |
| `expanded`  | `boolean`                    | Whether it rests at its largest snap point. |

### Template ref

`show()`, `close()` and `snapTo(point)`.

## Examples

```vue
<!-- An action sheet as tall as its content -->
<Drawer v-model:open="open" fit title="Share">…</Drawer>

<!-- A side menu -->
<Drawer v-model:open="open" direction="left" title="Menu">…</Drawer>

<!-- The iOS card stack: mark your app root with data-vnd-background -->
<div id="app" data-vnd-background>…</div>
<Drawer v-model:open="open" :snap-points="[1]" scale-background>…</Drawer>

<!-- A Maps-style panel that leaves the page usable -->
<Drawer v-model:open="open" :modal="false" :snap-points="['140px', 0.5, 1]">…</Drawer>

<!-- Must be confirmed -->
<Drawer v-model:open="open" :dismissible="false">…</Drawer>
```

Drawers can be nested: a drawer opened from inside another one makes the first step back.

The playground in [`playground/`](./playground) shows all of these. Run `npm run dev` to try it.

## Styling

The drawer comes with iOS-like styles that follow `color-scheme`. Theme it with custom properties
on `.vnd-drawer` or any ancestor:

```css
.vnd-drawer {
  --vnd-background: #f2f2f7;
  --vnd-radius: 16px;
  --vnd-max-width: 40rem; /* center top and bottom drawers on large screens */
}
```

| Property               | Default             | Description                                                                               |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| `--vnd-background`     | white / `#1c1c1e`   | Drawer background                                                                         |
| `--vnd-color`          | `inherit`           | Text color                                                                                |
| `--vnd-muted-color`    | iOS secondary label | Description color                                                                         |
| `--vnd-radius`         | `12px`              | Corner radius                                                                             |
| `--vnd-shadow`         | subtle              | Drawer shadow                                                                             |
| `--vnd-gap`            | `1.5rem`            | Space between a fully open top/bottom drawer and the far screen edge (plus the safe area) |
| `--vnd-max-width`      | `100%`              | Maximum width of top and bottom drawers                                                   |
| `--vnd-width`          | `min(85%, 24rem)`   | Width of left and right drawers                                                           |
| `--vnd-padding`        | `0 1rem 1rem`       | Padding of the content area                                                               |
| `--vnd-handle-color`   | iOS tertiary label  | Grab handle                                                                               |
| `--vnd-overlay-color`  | `rgb(0 0 0 / 0.4)`  | Overlay                                                                                   |
| `--vnd-backdrop-color` | `#000`              | Behind the page while `scale-background` pushes it back                                   |
| `--vnd-z-index`        | `50`                | Stacking order                                                                            |

State is exposed as data attributes for your own CSS: `data-state="open|closed"`,
`data-direction`, `data-expanded`, `data-dragging` and `data-fit`. Elements are `.vnd-overlay`,
`.vnd-drawer`, `.vnd-handle`, `.vnd-header`, `.vnd-title`, `.vnd-description`, `.vnd-content` and
`.vnd-footer`.

Add `data-vnd-no-drag` to an element to keep it from starting a drag, for example a slider.

## Accessibility

A modal drawer is a `dialog` with `aria-modal`, labelled by `title` and `description`. Opening it
moves focus into it, Tab and Shift+Tab stay inside, Escape closes it, and focus goes back to where
it was when it closes. With `prefers-reduced-motion`, the drawer moves without animation.

## Browser support

Chrome and Edge 123+, Safari 17.5+ and Firefox 120+ (the styles use `light-dark()`). Add
`viewport-fit=cover` to your viewport meta tag to get safe area insets. On Android,
`interactive-widget=resizes-content` in the same tag resizes the drawer above the on-screen
keyboard.

## Development

Requirements: Node.js 24 LTS (see `.nvmrc`) and npm.

```sh
npm install
npm run dev          # playground on http://localhost:5173
npm run build        # dist/index.js, dist/style.css and type declarations
npm run lint         # oxlint
npm run format       # oxfmt
npm run typecheck    # TypeScript 7 for .ts, vue-tsc for .vue
npm test             # Vitest: unit tests in Node and component tests in Chromium
npm run test:e2e     # Playwright: gestures on the playground, on a phone and on a desktop
npm run check        # lint, format check, typecheck, tests and build
```

Browser tests need Playwright's Chromium (`npx playwright install chromium`). To use a Chromium
that is already installed, set `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`.

Notes on the toolchain:

- **TypeScript 7** is a native compiler and no longer ships the JavaScript API that `vue-tsc` is
  built on. `tsc` (TypeScript 7) checks plain `.ts` files, and `scripts/vue-tsc.mjs` runs
  `vue-tsc` on the TypeScript 6 API from `@typescript/typescript6` for `.vue` files and type
  declarations.
- For the same reason, `scripts/vue-plugin.ts` hands Node's file system to the Vue SFC compiler,
  which otherwise reads files through `ts.sys` to resolve imported prop types.

### Layout

```
src/
  Drawer.vue                 the component (<script setup vapor>)
  composables/useDrawer.ts   gestures, snapping, animation and focus handling
  utils/                     snap math, velocity tracking, easing, scroll lock, page scaling
  style.css                  styles
playground/                  demo app (createVaporApp)
test/unit/                   Vitest, Node
test/browser/                Vitest browser mode, Chromium through Playwright
e2e/                         Playwright, against the playground
```

## Credits

Inspired by [vaul](https://github.com/emilkowalski/vaul) by Emil Kowalski and its Vue port
[vaul-vue](https://github.com/unovue/vaul-vue), with a flat, Vapor-native API.
