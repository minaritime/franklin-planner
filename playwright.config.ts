import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  use: {
    baseURL: 'http://localhost:4317/franklin-planner/',
    launchOptions: process.env.CHROME ? { executablePath: process.env.CHROME } : {},
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4317 --strictPort',
    url: 'http://localhost:4317/franklin-planner/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
