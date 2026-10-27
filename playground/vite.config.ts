import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { vuePlugin } from '../scripts/vue-plugin.ts'

// Demo app. `vue-native-drawer` resolves to the library sources so edits hot-reload.
export default defineConfig({
  base: './',
  plugins: [vuePlugin()],
  resolve: {
    alias: {
      'vue-native-drawer': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
