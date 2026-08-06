// ============================================================
// Sentry 客户端配置（浏览器端错误捕获）
// DSN 通过环境变量 NEXT_PUBLIC_SENTRY_DSN 配置（可选）
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 采样率（生产环境建议降低以减少配额消耗）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 环境标识
  environment: process.env.NODE_ENV || 'development',

  // 过滤本地开发环境的报错
  enabled: process.env.NODE_ENV === 'production',

  // 不捕获这些错误
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
  ],
});
