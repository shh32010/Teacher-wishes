// ============================================================
// E2E 测试 — v2.0 送礼主流程（6 步状态机）
// ============================================================

import { test, expect } from '@playwright/test';
import { registerAllApiMocks, disableAnimations } from './mocks';

test.describe('送礼流程 (/gift)', () => {
  test.beforeEach(async ({ page }) => {
    await registerAllApiMocks(page);
    await disableAnimations(page);
  });

  test('完整流程：选情绪 → 选祝福 → 选礼物 → 确认 → 动画 → 成功页', async ({ page }) => {
    await page.goto('/gift');

    // Step 1：情绪选择（motion 入场动画期间点击会漂移，使用 force）
    const emotionBtn = page.getByRole('button', { name: /❤️ 感恩/ });
    await expect(emotionBtn).toBeVisible({ timeout: 10_000 });
    await emotionBtn.click({ force: true });

    // Step 2：AI 推荐区出现，选择第一句推荐
    // （同一条祝福语会同时出现在推荐区和浏览区，用 .first() 取推荐区的）
    const firstRecommendation = page.getByRole('button', { name: /感谢您的谆谆教诲/ }).first();
    await expect(firstRecommendation).toBeVisible({ timeout: 10_000 });
    await firstRecommendation.click({ force: true });

    // Step 3：礼物宫格，选鲜花
    const roseGift = page.getByRole('button', { name: /🌹 鲜花/ });
    await expect(roseGift).toBeVisible({ timeout: 10_000 });
    await roseGift.click({ force: true });

    // Step 4：确认页 — 预览 + 昵称填写
    const confirmTitle = page.getByText('准备好了吗？');
    await expect(confirmTitle).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder('昵称（选填，如：浩浩）').fill('测试同学');

    // 送出（mock API 返回 201 → 进入动画）
    await page.getByRole('button', { name: '送出🌹 鲜花' }).click();

    // Step 5~6：动画结束（3.8s）→ 成功页
    await expect(page.getByText('您的心意已经送达 ✨')).toBeVisible({ timeout: 10_000 });

    // 「再送一份」回到情绪选择
    await page.getByRole('button', { name: /再送一份/ }).click();
    await expect(page.getByRole('button', { name: /❤️ 感恩/ })).toBeVisible({ timeout: 10_000 });
  });

  test('匿名送出：勾选匿名开关后成功页仍正常', async ({ page }) => {
    await page.goto('/gift');

    await page.getByRole('button', { name: /❤️ 感恩/ }).click({ force: true });
    await page
      .getByRole('button', { name: /感谢您的谆谆教诲/ })
      .first()
      .click({ force: true });
    await page.getByRole('button', { name: /🌹 鲜花/ }).click({ force: true });

    // 勾选匿名
    await page.getByText('匿名送出（不显示昵称和班级）').click();

    await page.getByRole('button', { name: '送出🌹 鲜花' }).click();
    await expect(page.getByText('您的心意已经送达 ✨')).toBeVisible({ timeout: 10_000 });
  });

  test('返回按钮可回退步骤', async ({ page }) => {
    await page.goto('/gift');

    // 情绪 → 祝福（推荐加载失败也应有分类浏览）
    await page.getByRole('button', { name: /❤️ 感恩/ }).click({ force: true });
    await expect(page.getByText('✨ AI 为你挑了 3 句')).toBeVisible({ timeout: 10_000 });

    // 返回情绪
    await page.getByRole('button', { name: '← 返回重选情绪' }).click();
    await expect(page.getByRole('button', { name: /❤️ 感恩/ })).toBeVisible();
  });
});
