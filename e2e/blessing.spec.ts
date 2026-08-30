// ============================================================
// E2E 测试 — 祝福墙（v2.0 同句聚合展示）
// ============================================================

import { test, expect } from '@playwright/test';
import { registerAllApiMocks, disableAnimations } from './mocks';

test.describe('祝福墙 & 祝福提交', () => {
  test.beforeEach(async ({ page }) => {
    await registerAllApiMocks(page);
    await disableAnimations(page);
  });

  test('祝福墙页面能正常加载，显示聚合祝福列表', async ({ page }) => {
    await page.goto('/wall');

    // 页面标题
    const header = page.getByRole('link', { name: '返回首页 教师节祝福墙' });
    await expect(header).toBeVisible();

    // 应显示聚合后的祝福内容（同句聚合卡片）
    await expect(page.getByText('张老师，感谢您三年来的谆谆教诲！')).toBeVisible({
      timeout: 10_000,
    });
    // 聚合卡显示「N 位同学送出了这句祝福」
    await expect(page.getByText('1 位同学送出了这句祝福').first()).toBeVisible();
  });

  test('v2.0 底部浮动按钮跳转送礼流程', async ({ page }) => {
    await page.goto('/wall');

    // 页面有两个同名链接（NavHeader 桌面入口 + 底部浮动按钮），取 DOM 最后的浮动按钮
    const giftBtn = page.getByRole('link', { name: '🎁 送出礼物' }).last();
    await giftBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await giftBtn.click({ force: true });
    await expect(page).toHaveURL(/\/gift/);
  });

  test('聚合卡片：历史祝福保留老师标签，新祝福显示礼物与全体老师', async ({ page }) => {
    await page.goto('/wall');

    // 历史祝福（mock 数据有 teacher_name）→ 「（往年）」标签
    await expect(page.getByText('张老师（往年）')).toBeVisible({ timeout: 10_000 });

    // v2 新祝福（mock 数据有 gift_icons）→ 「献给全体老师」
    await expect(page.getByText('献给全体老师')).toBeVisible();
  });

  test('祝福墙统计数字显示正确', async ({ page }) => {
    await page.goto('/wall');

    // 头部显示 "共 3 句祝福 · 3 位同学送出"
    await expect(page.getByText(/共 3 句祝福 · 3 位同学送出/)).toBeVisible({ timeout: 5_000 });
  });

  test('排序切换可点击且不崩溃', async ({ page }) => {
    await page.goto('/wall');

    const likesBtn = page.getByRole('radio', { name: '🔥 最热' });
    await likesBtn.click();
    await expect(page.getByText('张老师，感谢您三年来的谆谆教诲！')).toBeVisible({
      timeout: 10_000,
    });
  });
});
