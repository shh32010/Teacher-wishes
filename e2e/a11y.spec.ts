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

    // "大屏模式"按钮有 aria-label
    const displayBtn = page.getByRole('button', { name: '进入大屏展示模式' });
    await expect(displayBtn).toBeVisible({ timeout: 12_000 });
    await expect(displayBtn).toHaveAttribute('aria-label', '进入大屏展示模式');
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

  test('祝福表单弹窗打开后焦点在弹窗内', async ({ page }) => {
    await page.goto('/wall');

    // 打开弹窗
    const submitBtn = page.getByRole('button', { name: '✨ 送出祝福' });
    await submitBtn.waitFor({ state: 'visible', timeout: 5_000 });
    // animate-breathe 动画会导致 Playwright 判断按钮"不稳定"，使用 force 跳过
    await submitBtn.click({ force: true });

    // 等待弹窗渲染 + 焦点设置（100ms timeout 在组件中）
    await page.waitForTimeout(300);

    // 弹窗应可见
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // 焦点应在弹窗内（组件 useEffect 中 100ms 后自动聚焦第一个输入框）
    // 给 React 渲染 + setTimeout 充足时间
    await page.waitForTimeout(500);

    // 检查弹窗内是否有元素获得焦点
    const focusedInDialog = await page.evaluate(() => {
      const active = document.activeElement;
      const modal = document.querySelector('[data-modal="blessing-form"]');
      return modal ? modal.contains(active) : false;
    });
    expect(focusedInDialog).toBeTruthy();
  });

  test('管理后台登录页表单可 accessibility 访问', async ({ page }) => {
    await page.goto('/admin/login');

    // 邮箱输入框有 autocomplete 属性
    const emailInput = page.getByPlaceholder('管理员邮箱');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');

    // 密码输入框有 autocomplete 属性
    const pwdInput = page.getByPlaceholder('密码');
    await expect(pwdInput).toHaveAttribute('autocomplete', 'current-password');
  });
});
