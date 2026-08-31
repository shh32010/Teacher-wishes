// ============================================================
// 活动概览 — 只读 Dashboard（单一聚合接口 /api/admin/overview）
// ============================================================

'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
};

interface OverviewData {
  kpis: {
    total_blessings: number;
    total_gifts: number;
    total_participants: number;
    total_likes: number;
  };
  emotions: { emotion: string; count: number }[];
  gifts: { name: string; icon: string; count: number }[];
  top_blessings: { content: string; count: number }[];
  top_keywords: { word: string; count: number }[];
  summary: string | null;
}

export default function OverviewPanel() {
  const { data, error, isLoading } = useSWR<OverviewData>('/api/admin/overview', fetcher);

  if (isLoading) return <div className="py-20 text-center text-ink-muted">加载中...</div>;
  if (error || !data)
    return <div className="py-20 text-center text-red-500">加载失败，请刷新重试</div>;

  const kpis = [
    { label: '💌 祝福总数', value: data.kpis.total_blessings, color: 'text-accent' },
    { label: '🎁 礼物送出', value: data.kpis.total_gifts, color: 'text-primary' },
    { label: '👥 参与人数', value: data.kpis.total_participants, color: 'text-primary' },
    { label: '❤️ 点赞总数', value: data.kpis.total_likes, color: 'text-secondary' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink">📊 活动概览</h2>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 情绪分布 */}
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-bold text-ink">情绪分布</p>
          {data.emotions.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {data.emotions.map((e, i) => (
                <div key={e.emotion} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-ink-light">{e.emotion}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(e.count / data.kpis.total_blessings) * 100}%`,
                        background: `hsl(${28 + i * 30} 80% 55%)`,
                      }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-ink-muted">{e.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 热门礼物 + 高频词 */}
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-bold text-ink">热门礼物</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {data.gifts.slice(0, 4).map((g) => (
              <span
                key={g.name}
                className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent"
              >
                {g.icon} {g.name} ×{g.count}
              </span>
            ))}
          </div>
          <p className="mb-2 text-sm font-bold text-ink">高频关键词</p>
          <div className="flex flex-wrap gap-2">
            {data.top_keywords.map((k) => (
              <span
                key={k.word}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
              >
                {k.word} ×{k.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 热门祝福 Top5 */}
      {data.top_blessings.length > 0 && (
        <div className="glass-card p-4">
          <p className="mb-3 text-sm font-bold text-ink">热门祝福 Top5</p>
          <div className="space-y-2">
            {data.top_blessings.map((g, i) => (
              <div key={g.content} className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-ink">
                  <span className="mr-2 text-xs text-ink-muted">#{i + 1}</span>
                  {g.content}
                </p>
                <span className="shrink-0 text-xs text-ink-muted">{g.count} 位同学</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 总结 */}
      {data.summary && (
        <div className="glass-card p-4">
          <p className="mb-2 text-sm font-bold text-ink">🤖 AI 活动洞察</p>
          <p className="text-sm leading-relaxed text-ink">{data.summary}</p>
        </div>
      )}
    </div>
  );
}
