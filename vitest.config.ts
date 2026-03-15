/**
 * @file vitest.config.ts
 * @brief Vitest configuration for renderer-side unit tests with @renderer alias resolution.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    include: ['src/renderer/src/**/*.test.ts']
  }
})
