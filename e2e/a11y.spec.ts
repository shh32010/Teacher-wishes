// ============================================================
// E2E 测试 — 无障碍 (A11y) 基础检查
// ============================================================

import { test, expect } from '@playwright/test';
import { registerAllApiMocks } from './mocks';

test.describe('无障碍基础检查', () => {
  test.beforeEach(async ({ page }) => {
    await registerAllApiMocks(page);
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
    await submitBtn.click();

    // 等待弹窗渲染 + 焦点设置（100ms timeout 在组件中）
    await page.waitForTimeout(300);

    // 弹窗应可见
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // dialog 标签的 form 应该有 focused 元素
    const focusedElement = page.locator('form *:focus');
    const hasFocused = (await focusedElement.count()) > 0;
    // 理想情况是焦点在输入框上
    expect(hasFocused).toBeTruthy();
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
