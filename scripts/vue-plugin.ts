import { existsSync, readFileSync, realpathSync } from 'node:fs'
import vue from '@vitejs/plugin-vue'

/**
 * `@vitejs/plugin-vue` set up for TypeScript 7.
 *
 * Vue's SFC compiler reads files through TypeScript's `ts.sys` to resolve prop types imported
 * from other files. TypeScript 7 no longer exposes it, so the compiler gets Node's file system.
 */
export function vuePlugin() {
  return vue({
    script: {
      fs: {
        fileExists: existsSync,
        readFile: (file) => readFileSync(file, 'utf8'),
        realpath: realpathSync,
      },
    },
  })
}
