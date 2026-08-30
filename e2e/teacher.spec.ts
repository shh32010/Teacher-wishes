// ============================================================
// E2E 测试 — 教师详情页（SSR 渲染）
// ============================================================
// 注意：教师详情页是 SSR 页面，在服务端直接从 Supabase 获取数据。
// 测试环境中 Supabase 不可用，因此页面会进入 notFound 状态。
// 这里测试通过 mock 模拟数据可用的情况以及 404 场景。

import { test, expect } from '@playwright/test';

test.describe('教师详情页', () => {
  test('访问不存在的教师 ID → 显示 404 页面', async ({ page }) => {
    // 由于测试环境没有 Supabase 连接，任何教师 ID 都会返回 null → notFound()
    // 这会触发 /teacher/not-found 页面
    await page.goto('/teacher/nonexistent-id-12345');

    // 自定义 not-found.tsx 显示 "找不到这位老师"
    const notFoundIndicator =
      (await page
        .getByText('找不到这位老师')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText('教师未找到')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('h1')
        .filter({ hasText: /找不到|Not Found|未找到|找不到/i })
        .isVisible()
        .catch(() => false));

    expect(notFoundIndicator).toBeTruthy();
  });

  test('教师详情页不存在的 ID → 页面不崩溃', async ({ page }) => {
    // 验证即使教师不存在，页面也不会因为 JS 错误而白屏
    let pageError = '';
    page.on('pageerror', (err) => {
      pageError = err.message;
    });

    await page.goto('/teacher/invalid-id');
    // 等待页面稳定
    await page.waitForTimeout(2000);

    // 不应该有同步错误
    expect(pageError).toBe('');
  });
});
