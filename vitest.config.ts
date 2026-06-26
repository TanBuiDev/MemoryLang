import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: ['e2e/**', 'node_modules/**', 'dist/**', '**/.opencode/**', '**/node_modules/**'],
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  }),
)
