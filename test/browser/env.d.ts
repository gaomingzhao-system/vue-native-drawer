/// <reference types="@vitest/browser-playwright" />
import 'vitest/browser'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setReducedMotion: (reduce: boolean) => Promise<void>
  }
}
