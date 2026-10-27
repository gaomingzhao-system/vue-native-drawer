// TypeScript 7 is a native binary and no longer ships the JavaScript compiler API
// that vue-tsc is built on, so vue-tsc runs on the TypeScript 6 API provided by
// `@typescript/typescript6`. Plain `.ts` files are still checked by `tsc` (TypeScript 7).
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

require('vue-tsc').run(require.resolve('@typescript/typescript6/lib/tsc.js'))
