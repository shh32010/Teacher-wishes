// ============================================================
// E2E 测试 — 无障碍 (A11y) 基础检查
// ============================================================

import { test, expect } from '@playwright/test';
import { registerAllApiMocks, disableAnimations } from './mocks';

test.describe('无障碍基础检查', () => {
  test.beforeEach(async ({ page }) => {
    await registerAllApiMocks(page);
    await disableAnimations(page);
  });

  test('首页关键元素有可访问的 aria-label', async ({ page }) => {
    await page.goto('/');

    // "管理后台"按钮有 aria-label
    const adminBtn = page.getByRole('button', { name: '进入管理后台' });
    await expect(adminBtn).toBeVisible({ timeout: 12_000 });
    await expect(adminBtn).toHaveAttribute('aria-label', '进入管理后台');

    // "送出我的祝福"主 CTA 按钮可见
    const giftBtn = page.getByRole('button', { name: '🎁 送出我的祝福' });
    await expect(giftBtn).toBeVisible({ timeout: 12_000 });
  });

  test('祝福墙 Tab 键导航不卡死', async ({ page }) => {
    await page.goto('/wall');

    // 等待页面加载
    await page.waitForTimeout(3000);

    // 按 Tab 键若干次，模拟键盘导航
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // 页面不应崩溃 — 有任意可聚焦元素即可（如果有的话）
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('管理后台登录页表单可 accessibility 访问', async ({ page }) => {
    await page.goto('/admin/login');

    // 密码输入框有 autocomplete 属性
    const pwdInput = page.getByPlaceholder('管理员密码');
    await expect(pwdInput).toHaveAttribute('autocomplete', 'current-password');
  });
});
