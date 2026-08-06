// ============================================================
// E2E 测试 — 首页沉浸式体验
// ============================================================

import { test, expect } from '@playwright/test';
import { registerAllApiMocks, disableAnimations } from './mocks';

test.describe('首页 (Homepage)', () => {
  test.beforeEach(async ({ page }) => {
    await registerAllApiMocks(page);
    await disableAnimations(page);
    await page.goto('/');
  });

  test('首页能正常加载，标题最终可见', async ({ page }) => {
    // 等待标题动画完成（约 6 秒后标题出现）
    const title = page.getByRole('heading', { name: '教师节快乐' });
    await expect(title).toBeVisible({ timeout: 10_000 });
    await expect(title).toHaveText('教师节快乐');
  });

  test('副标题正常显示', async ({ page }) => {
    const subtitle = page.getByText('致敬每一位引路人');
    await expect(subtitle).toBeVisible({ timeout: 10_000 });
  });

  test('语录会逐渐出现', async ({ page }) => {
    // 第一句语录 — 约 2~4 秒后可见
    const quote1 = page.getByText('教育不是灌满一桶水，而是点燃一把火。');
    await expect(quote1).toBeVisible({ timeout: 8_000 });

    // 第二句语录
    const quote2 = page.getByText('一支粉笔，两袖清风，三尺讲台，四季晴雨。');
    await expect(quote2).toBeVisible({ timeout: 8_000 });
  });

  test('"进入祝福墙"按钮最终可见并可点击', async ({ page }) => {
    const enterBtn = page.getByRole('button', { name: '✨ 进入祝福墙' });
    await expect(enterBtn).toBeVisible({ timeout: 12_000 });
    await expect(enterBtn).toBeEnabled();

    // animate-breathe 动画导致按钮不稳定，使用 force 跳过稳定性检查
    await enterBtn.click({ force: true });
    await expect(page).toHaveURL(/\/wall/);
  });

  test('首页底部入口按钮在动画结束后可见', async ({ page }) => {
    // "管理后台"和"大屏模式"入口在动画最终阶段出现
    const adminLink = page.getByRole('button', { name: '进入管理后台' });
    await expect(adminLink).toBeVisible({ timeout: 12_000 });

    const displayLink = page.getByRole('button', { name: '进入大屏展示模式' });
    await expect(displayLink).toBeVisible({ timeout: 12_000 });

    // 点击管理后台 → 跳转到 /admin
    await adminLink.click();
    await expect(page).toHaveURL(/\/admin/);
  });

  test('星空背景区域存在（tsParticles 容器渲染）', async ({ page }) => {
    // tsParticles 懒加载组件，检查渲染容器是否存在
    // 容器至少有 fixed inset-0 定位
    const starContainer = page.locator('.fixed.inset-0').first();
    await expect(starContainer).toBeAttached({ timeout: 8_000 });
  });
});
