// ============================================================
// E2E 测试 — 祝福提交流程
// ============================================================

import { test, expect } from '@playwright/test';
import { registerAllApiMocks, disableAnimations } from './mocks';

test.describe('祝福墙 & 祝福提交', () => {
  test.beforeEach(async ({ page }) => {
    await registerAllApiMocks(page);
    await disableAnimations(page);
  });

  test('祝福墙页面能正常加载，显示祝福列表', async ({ page }) => {
    await page.goto('/wall');

    // 页面标题
    const header = page.getByRole('link', { name: '返回首页 教师节祝福墙' });
    await expect(header).toBeVisible();

    // 应显示至少一条祝福卡片内容
    await expect(page.getByText('张老师，感谢您三年来的谆谆教诲！')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('提交祝福 → 弹窗出现 → 表单填写 → 提交成功 → 关闭弹窗', async ({ page }) => {
    await page.goto('/wall');

    // 1. 点击"送出祝福"按钮 → 弹窗出现
    const submitBtn = page.getByRole('button', { name: '✨ 送出祝福' });
    await submitBtn.waitFor({ state: 'visible', timeout: 5_000 });
    // animate-breathe 动画会导致 Playwright 判断按钮"不稳定"，使用 force 跳过
    await submitBtn.click({ force: true });

    // 弹窗应可见
    const dialog = page.getByRole('dialog', { name: '写下祝福' });
    await expect(dialog).toBeVisible();

    // 2. 填写表单
    await page.fill('#blessing-nickname', '测试同学');
    await page.fill('#blessing-class', '高一(1)班');
    await page.fill('#blessing-content', '老师您辛苦了，祝您教师节快乐！');

    // 3. 提交
    const submitFormBtn = page.locator('form').getByRole('button', { name: '✨ 送出祝福' });
    await submitFormBtn.click();

    // 4. 弹窗关闭（提交成功后 onClose 被调用）
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('祝福卡片显示发送者昵称、班级和内容', async ({ page }) => {
    await page.goto('/wall');

    // 第一条祝福 — 小明，高一(3)班
    await expect(page.getByText('小明')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('高一(3)班')).toBeVisible();
    await expect(page.getByText('张老师，感谢您三年来的谆谆教诲！')).toBeVisible();
  });

  test('点击祝福卡片的教师标签可跳转到教师详情页', async ({ page }) => {
    await page.goto('/wall');

    // 第一条祝福带有教师标签 "张老师 →"（用 button + aria-label）
    const teacherTag = page.getByRole('button', { name: '查看张老师老师的详情页' });
    await teacherTag.waitFor({ state: 'visible', timeout: 5_000 });
    await teacherTag.click();

    // 应跳转到 /teacher/t1
    await expect(page).toHaveURL(/\/teacher\/t1/, { timeout: 5000 });
  });

  test('祝福墙统计数字显示正确', async ({ page }) => {
    await page.goto('/wall');

    // 头部显示 "共 3 条"
    await expect(page.getByText('共 3 条')).toBeVisible({ timeout: 5_000 });
  });

  test('表单弹窗可关闭', async ({ page }) => {
    await page.goto('/wall');

    // 使用 header 中的 "写祝福" 按钮
    const writeBtn = page.getByRole('button', { name: '✏️ 写祝福' });
    await writeBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await writeBtn.click();

    const dialog = page.getByRole('dialog', { name: '写下祝福' });
    await expect(dialog).toBeVisible();

    // 关闭按钮
    const closeBtn = page.getByRole('button', { name: '关闭祝福表单' });
    await closeBtn.click();
    await expect(dialog).not.toBeVisible({ timeout: 2_000 });
  });
});
