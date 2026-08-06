// ============================================================
// Playwright E2E 测试配置 — 教师节祝福墙
// ============================================================

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  /* 完全并行运行测试 */
  fullyParallel: true,
  /* CI 环境下禁止 test.only */
  forbidOnly: !!process.env.CI,
  /* CI 环境下失败重试 2 次 */
  retries: process.env.CI ? 2 : 0,
  /* CI 环境下单 worker 运行 */
  workers: process.env.CI ? 1 : undefined,
  /* 测试报告格式 */
  reporter: [['html'], ['list']],
  /* 全局超时配置 */
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },

  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:3000',
    /* 首次重试时记录 trace */
    trace: 'on-first-retry',
    /* 失败时截图 */
    screenshot: 'only-on-failure',
    /* 视口大小 */
    viewport: { width: 1280, height: 720 },
  },

  /* 需要测试的浏览器项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'msedge' },
    },
  ],

  /* 自动启动开发服务器 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
