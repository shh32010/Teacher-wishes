// ============================================================
// Sentry Edge 配置（Middleware / Edge Runtime 错误捕获）
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  environment: process.env.NODE_ENV || 'development',

  enabled: process.env.NODE_ENV === 'production',
});
