// ============================================================
// Sentry 服务端配置（API Route / SSR 错误捕获）
// DSN 通过环境变量 SENTRY_DSN 配置（可选）
// ============================================================

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  environment: process.env.NODE_ENV || 'development',

  enabled: process.env.NODE_ENV === 'production',
});
