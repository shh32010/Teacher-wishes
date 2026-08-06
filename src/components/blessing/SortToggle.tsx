// ============================================================
// 排序切换按钮 — 客户端组件，通过 URL searchParam 驱动
// 用于 SSR 页面（如教师主页），切换排序后 reload
// ============================================================

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type SortMode = 'time' | 'likes';

export default function SortToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get('sort') as SortMode) || 'time';

  const switchTo = useCallback(
    (mode: SortMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (mode === 'time') {
        params.delete('sort'); // 默认值不显示在 URL
      } else {
        params.set('sort', mode);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="flex rounded-lg bg-white/5 p-0.5" role="radiogroup" aria-label="排序方式">
      <button
        onClick={() => switchTo('time')}
        role="radio"
        aria-checked={current === 'time'}
        className={`rounded-md px-3 py-1 text-xs transition-all ${
          current === 'time' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🕐 最新
      </button>
      <button
        onClick={() => switchTo('likes')}
        role="radio"
        aria-checked={current === 'likes'}
        className={`rounded-md px-3 py-1 text-xs transition-all ${
          current === 'likes' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        🔥 最热
      </button>
    </div>
  );
}
