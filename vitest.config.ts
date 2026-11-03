import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { vuePlugin } from './scripts/vue-plugin.ts'

// Use a locally installed Chromium instead of the one Playwright downloads, if set.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

export default defineConfig({
  plugins: [vuePlugin()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { executablePath } }),
            instances: [{ browser: 'chromium' }],
            viewport: { width: 390, height: 844 },
          },
        },
      },
    ],
  },
})
