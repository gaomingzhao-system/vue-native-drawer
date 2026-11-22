# Refactor verification

## Bundle measurements

Baseline: `9e039ee9104b440b54d0c5212376dbc6ab158167`. Both builds use the existing unminified
ES-module library configuration with Vue and VueUse external, and Node 24.22.3. Gzip uses
Node's `gzipSync` with its default options. Source maps and declarations are excluded.
The baseline uses its committed dependencies; the candidate uses the updated lockfile.

| Output                      | Baseline bytes | Candidate bytes | Change |
| --------------------------- | -------------: | --------------: | -----: |
| JavaScript                  |         36,554 |          37,988 | +1,434 |
| JavaScript gzip             |         10,716 |          10,954 |   +238 |
| CSS                         |          6,064 |           6,588 |   +524 |
| CSS gzip                    |          1,685 |           1,886 |   +201 |
| Direct runtime dependencies |              1 |               1 |      0 |

The migration and accessibility fixes increase the distributed library slightly. These
measurements do not establish a bundle-size reduction. VueUse remains the sole direct runtime
dependency, and the Vue 3.5.46 dependency tree resolves without overrides or duplicate Vue copies.

## Drag rendering

Sorted snap offsets and the overlay fade interval are now cached with Vue `computed`. They
invalidate when their reactive inputs change instead of sorting or rebuilding the interval on
each pointer movement. Duplicate snap points and changed fade/snap settings have regression tests.
Existing panel/footer measurements already happen outside steady-state dragging; no extra
geometry cache was introduced that could become stale after a resize.

Rendering remains synchronous. No animation-frame scheduling change ships in the library.
The benchmark compares the previous implementation, the updated implementation, and an isolated
render-only animation-frame prototype. The prototype is injected into the development server
in memory; it never changes production sources or the built package. It keeps drag events
synchronous and flushes pending rendering before release/cancellation.

Run with two independently installed and built checkouts:

```sh
# In the baseline checkout:
npm ci
npm run build

# In this checkout:
npm ci
npm run build
npx playwright install --with-deps chromium
npm run benchmark -- /absolute/path/to/baseline
```

The PR performance job performs this comparison against the PR base and uploads
`drawer-benchmark.json`. Each variant runs three samples of 240 synthetic pointer movements
over 120 display frames in the scaled-background playground. It records:

- Drag event/render counts, snap-array sorts, and style writes.
- Layout geometry reads (`getBoundingClientRect`, `offsetWidth`, `offsetHeight`, `offsetTop`).
- Render and synchronous event-dispatch duration, and frame intervals.
- Latest input-to-render delay and movements without synchronous rendering. The batching
  prototype coalesces the first of each pair of movements, so its delay is not a latency
  measurement for every original input.

These instrumented headless results compare the same browser and viewport. They are not native
touch-device frame-rate or input-to-display guarantees; instrumentation adds overhead. Read
counts and timing results together, and do not adopt batching solely because it performs fewer
style writes.

## Cleanup and accessibility regressions

Click suppression now expires after its existing 100 ms eligibility window and is disposed on
unmount, the next press/click, and replacement by a later gesture. Keyboard-generated clicks
remain usable. Browser tests observe capture-listener cleanup; E2E tests cover trusted release
clicks and the next intentional interaction.

Accessibility tests cover custom/empty/dynamic headers, explicit ARIA overrides, keyboard handle
activation, focus wrapping with a single snap point, and overlay variable forwarding/update/removal.
Chromium, Firefox, and WebKit run the browser suites; native touch E2E uses Chromium CDP, while
Firefox/WebKit E2E exercises mouse and keyboard interactions.

## Local execution limitations

The implementation environment passes clean installation, lint, formatting, type checking, all
31 unit tests, the library/declaration build, and the playground build. Browser suites and the
live benchmark cannot execute in this environment: Playwright downloads return HTTP 403, and
the installed system Chromium aborts with `socket() failed: Operation not permitted` before
opening a page. The PR CI is configured to run these checks on a browser-capable runner. Local
browser checks are not reported as passing.
