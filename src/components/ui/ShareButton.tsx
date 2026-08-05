// ============================================================
// 分享按钮 — 复制当前页面链接到剪贴板
// ============================================================

'use client';

import { useState } from 'react';

interface ShareButtonProps {
  /** 要分享的文本（默认当前 URL） */
  text?: string;
}

export default function ShareButton({ text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = text || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级：选中文本手动复制
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleShare} className="btn-glass flex items-center gap-2 text-sm">
      {copied ? '✅ 已复制' : '🔗 分享链接'}
    </button>
  );
}
