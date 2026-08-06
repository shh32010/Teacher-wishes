// ============================================================
// Sentry 服务端初始化 — Next.js Instrumentation Hook
// 在服务启动时注册，捕获 API Route / SSR 错误
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
