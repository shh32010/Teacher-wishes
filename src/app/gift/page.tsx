// ============================================================
// /gift — 送礼主流程页（v2.0 核心入口）
// ============================================================

import type { Metadata } from 'next';
import NavHeader from '@/components/ui/NavHeader';
import GiftFlow from '@/components/gift/GiftFlow';

export const metadata: Metadata = {
  title: '送出我的祝福 | 教师节祝福墙',
  description: '选择一句祝福，送上一份礼物，让心意化作星河里的光',
};

export default function GiftPage() {
  return (
    <main className="min-h-screen">
      <NavHeader
        maxWidth="max-w-6xl"
        left={
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-ink">🎁 送出我的祝福</h1>
            <a href="/wall" className="text-sm text-ink-muted hover:text-ink">
              祝福星河 →
            </a>
          </div>
        }
        right={
          <a href="/" className="text-sm text-ink-muted hover:text-ink">
            返回首页
          </a>
        }
      />
      <GiftFlow />
    </main>
  );
}
