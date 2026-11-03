import { defineConfig } from 'vite'
import { vuePlugin } from './scripts/vue-plugin.ts'

// Library build: `dist/index.js` (ES module) and `dist/style.css`.
// Type declarations are emitted separately by `npm run build:types`.
export default defineConfig({
  plugins: [vuePlugin()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rolldownOptions: {
      external: ['vue', /^@vueuse\//],
    },
    minify: false,
    sourcemap: true,
  },
})
