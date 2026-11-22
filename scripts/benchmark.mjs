/* eslint-disable no-await-in-loop -- Measurements must run sequentially without competing browsers. */
// Run after building both checkouts: npm run benchmark -- /path/to/baseline
// The batching prototype exists only in Vite's in-memory benchmark transform.
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const baselineRoot = process.argv[2] && resolve(process.argv[2])
if (!baselineRoot)
  throw new Error('Pass a built baseline checkout with its own npm ci installation')

const measureBundle = async (root) => {
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
  const files = await Promise.all(
    ['index.js', 'style.css'].map(async (name) => {
      const bytes = await readFile(resolve(root, 'dist', name))
      return [name, { bytes: bytes.length, gzipBytes: gzipSync(bytes).length }]
    }),
  )
  return {
    vue: manifest.devDependencies.vue,
    runtimeDependencies: Object.keys(manifest.dependencies).length,
    files: Object.fromEntries(files),
  }
}

const instrument = (batch) => ({
  name: 'drawer-benchmark',
  enforce: 'pre',
  transform: (code, id) => {
    const drawer = id.endsWith('/src/composables/useDrawer.ts')
    if (!drawer && !id.endsWith('/src/utils/background.ts')) return
    // CSSStyleDeclaration exposes named properties differently across browser versions.
    // Count the actual source assignments instead of replacing browser-specific setters.
    code = code.replace(
      /^(\s*)(\w+\.style\.(?:transform|transition|opacity|clipPath)\s*=)/gm,
      '$1if (window.drawerBenchmarkMetrics) window.drawerBenchmarkMetrics.styleWrites++\n$1$2',
    )
    if (!drawer) return code
    const start = code.indexOf('    position = offset\n')
    const end = code.indexOf('\n  }', start)
    if (start < 0 || end < 0) throw new Error('Cannot locate the drawer render body')
    const body = code.slice(start, end)
    let result = `${code.slice(0, start)}
    const metrics = window.drawerBenchmarkMetrics
    const started = performance.now()
    try {
${body}
    } finally {
      if (metrics) {
        metrics.renderTimes.push(performance.now() - started)
        metrics.inputLatency.push(started - metrics.lastInputAt)
      }
    }${code.slice(end)}`
    result = result.replace(
      '    options.onDrag(',
      '    if (window.drawerBenchmarkMetrics) window.drawerBenchmarkMetrics.dragEvents++\n    options.onDrag(',
    )
    if (!batch) return result
    // Queue only rendering. The drag event remains synchronous, and release flushes position.
    const marker = '  const drag = (offset: number) => {'
    if (!result.includes(marker)) throw new Error('Cannot locate the candidate drag handler')
    result = result.replace(
      marker,
      `  let pendingFrame = 0
  let pendingOffset = 0
  const flushRender = () => {
    if (!pendingFrame) return
    cancelAnimationFrame(pendingFrame)
    pendingFrame = 0
    render(pendingOffset)
  }
  const queueRender = (offset: number) => {
    pendingOffset = offset
    if (!pendingFrame) pendingFrame = requestAnimationFrame(flushRender)
  }
${marker}`,
    )
    result = result.replace('    render(next)\n', '    queueRender(next)\n')
    result = result.replaceAll('    endGesture()\n', '    flushRender()\n    endGesture()\n')
    return result
  },
})

const measureDrag = async (page) =>
  page.evaluate(async () => {
    const panel = document.querySelector('[data-testid="drawer-scale"]')
    const handle = panel?.querySelector('.vnd-handle')
    if (!panel || !handle) throw new Error('Scaled drawer is not mounted')
    const rect = handle.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const fire = (type, delta = 0) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 17,
          pointerType: 'mouse',
          isPrimary: true,
          button: type === 'pointermove' ? -1 : 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y + delta,
        }),
      )
    fire('pointerdown')
    fire('pointermove', 20)
    // Let the initial drag state and resize observers settle before counting steady-state work.
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    const metrics = {
      renderTimes: [],
      inputLatency: [],
      lastInputAt: performance.now(),
      dragEvents: 0,
      sorts: 0,
      geometryReads: 0,
      styleWrites: 0,
    }
    window.drawerBenchmarkMetrics = metrics
    const restores = []
    const observe = (owner, key, member, count) => {
      const descriptor = Object.getOwnPropertyDescriptor(owner, key)
      if (!descriptor?.[member]) throw new Error(`Cannot instrument ${key}`)
      Object.defineProperty(owner, key, {
        ...descriptor,
        [member]: new Proxy(descriptor[member], {
          apply: (target, receiver, args) => {
            count()
            return Reflect.apply(target, receiver, args)
          },
        }),
      })
      restores.push(() => Object.defineProperty(owner, key, descriptor))
    }
    observe(Array.prototype, 'toSorted', 'value', () => metrics.sorts++)
    observe(Element.prototype, 'getBoundingClientRect', 'value', () => metrics.geometryReads++)
    for (const property of ['offsetWidth', 'offsetHeight', 'offsetTop']) {
      observe(HTMLElement.prototype, property, 'get', () => metrics.geometryReads++)
    }
    const frameIntervals = []
    const dispatchTimes = []
    let previousFrame = 0
    let staleMoves = 0
    let moves = 0
    try {
      // Two movements per display frame model coalescible input without a busy-loop benchmark.
      for (let frame = 0; frame < 120; frame++) {
        const timestamp = await new Promise(requestAnimationFrame)
        if (previousFrame) frameIntervals.push(timestamp - previousFrame)
        previousFrame = timestamp
        for (let sample = 0; sample < 2; sample++) {
          const before = panel.style.transform
          const delta = 30 + ((frame * 2 + sample) % 120) * 2
          metrics.lastInputAt = performance.now()
          const started = performance.now()
          fire('pointermove', delta)
          dispatchTimes.push(performance.now() - started)
          if (panel.style.transform === before) staleMoves++
          moves++
        }
      }
      await new Promise(requestAnimationFrame)
    } finally {
      delete window.drawerBenchmarkMetrics
      for (const restore of restores.toReversed()) restore()
      fire('pointerup', 268)
    }
    if (moves !== 240 || metrics.dragEvents !== moves || !metrics.renderTimes.length) {
      throw new Error('Benchmark did not exercise every drag event')
    }
    // eslint-disable-next-line unicorn/consistent-function-scoping -- This callback is serialized into the browser.
    const summary = (values) => {
      const sorted = values.toSorted((a, b) => a - b)
      return {
        mean: values.reduce((sum, value) => sum + value, 0) / values.length,
        p95: sorted[Math.floor((sorted.length - 1) * 0.95)],
      }
    }
    return {
      moves,
      dragEvents: metrics.dragEvents,
      renders: metrics.renderTimes.length,
      sorts: metrics.sorts,
      styleWrites: metrics.styleWrites,
      geometryReads: metrics.geometryReads,
      movesWithoutSynchronousRender: staleMoves,
      renderMs: summary(metrics.renderTimes),
      dispatchMs: summary(dispatchTimes),
      latestInputToRenderMs: summary(metrics.inputLatency),
      frameIntervalMs: summary(frameIntervals),
    }
  })

const bundle = {
  baseline: await measureBundle(baselineRoot),
  candidate: await measureBundle(projectRoot),
}
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
})
const results = []
try {
  for (const [name, root, batch] of [
    ['baseline', baselineRoot, false],
    ['candidate', projectRoot, false],
    ['candidate-batched-prototype', projectRoot, true],
  ]) {
    const require = createRequire(resolve(root, 'package.json'))
    const { createServer } = await import(pathToFileURL(require.resolve('vite')).href)
    const server = await createServer({
      root: resolve(root, 'playground'),
      configFile: resolve(root, 'playground/vite.config.ts'),
      plugins: [instrument(batch)],
      logLevel: 'error',
      server: { host: '127.0.0.1', port: 0, strictPort: true },
    })
    await server.listen()
    try {
      const samples = []
      for (let run = 0; run < 3; run++) {
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
          reducedMotion: 'reduce',
        })
        try {
          await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`)
          await page.getByTestId('open-scale').click()
          await page.waitForFunction(() => {
            const panel = document.querySelector('[data-testid="drawer-scale"]')
            return panel && panel.getBoundingClientRect().top < 50
          })
          samples.push(await measureDrag(page))
        } finally {
          await page.close()
        }
      }
      results.push({ name, samples })
    } finally {
      await server.close()
    }
  }
  process.stdout.write(
    `${JSON.stringify({ node: process.version, browser: browser.version(), bundle, results }, null, 2)}\n`,
  )
} finally {
  await browser.close()
}
