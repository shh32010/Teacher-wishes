// ============================================================
// Step 6 完成页 — 送达提示 + 分享 + 再送一份
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import type { Gift } from '@/types';

interface GiftSuccessProps {
  /** 礼物（跳过礼物时为 null） */
  gift: Gift | null;
  content: string;
  onRestart: () => void;
}

/** 再送一份的冷却秒数（设计文档承诺：提交成功后 3 秒冷却，配合服务端限流双保险） */
const COOLDOWN_SECONDS = 3;

export default function GiftSuccess({ gift, content, onRestart }: GiftSuccessProps) {
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

  // 冷却倒计时：防止连点刷屏，给服务端限流留缓冲
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleShare = async () => {
    const text = gift
      ? `教师节快乐！我送出了${gift.icon}${gift.name}和一句祝福——「${content}」`
      : `教师节快乐！我送出了一份祝福——「${content}」`;
    const url = `${window.location.origin}/wall`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 用户取消分享或剪贴板不可用 → 静默降级
    }
  };

  return (
    <div className="glass-card p-8 text-center">
      <p className="mb-3 text-5xl">{gift?.icon ?? '💌'}</p>
      <h2 className="mb-1 text-xl font-bold text-ink">您的心意已经送达 ✨</h2>
      <p className="mb-4 text-sm text-ink-muted">它已经汇入全体老师的祝福星河</p>

      <div className="glass-card mb-6 p-4">
        <p className="text-ink">&ldquo;{content}&rdquo;</p>
        <p className="mt-1 text-xs text-ink-muted">
          {gift ? `${gift.icon} 一份${gift.name} · 献给全体老师` : '一份祝福 · 献给全体老师'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onRestart}
          disabled={cooldown > 0}
          className="rounded-xl bg-primary px-4 py-2.5 font-bold text-white hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `再送一份 🎁（${cooldown} 秒）` : '再送一份 🎁'}
        </button>
        <a
          href="/wall"
          className="rounded-xl bg-accent px-4 py-2.5 text-center font-bold text-ink hover:bg-accent-light"
        >
          查看祝福墙 →
        </a>
        <button onClick={handleShare} className="btn-ghost">
          {copied ? '✅ 已复制' : '分享这一刻'}
        </button>
      </div>
    </div>
  );
}
