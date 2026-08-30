// ============================================================
// AI 控制中心 — 批量分类 / 金句候选确认 / 收官总结 / 活动洞察
// 所有 AI 任务为低频手动触发；无 key 时自动规则降级
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { getCsrfToken } from '@/lib/csrf-client';

interface QuoteCandidate {
  blessing_id: string;
  content: string;
  score: number;
  reason: string;
}

interface InsightsData {
  total_blessings: number;
  total_participants: number;
  emotions: { emotion: string; count: number }[];
  gifts: { name: string; icon: string; count: number }[];
  summary: string | null;
}

/** 请求管理端 AI 任务（携带 CSRF） */
async function aiTask(
  url: string,
  method: 'POST' | 'PATCH',
  body?: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `操作失败 (${res.status})` };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: '网络错误，请重试' };
  }
}

export default function AICenter() {
  const [classifyResult, setClassifyResult] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [candidates, setCandidates] = useState<QuoteCandidate[] | null>(null);
  const [quoteMode, setQuoteMode] = useState<string>('');
  const [scoring, setScoring] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyResult(null);
    const result = await aiTask('/api/admin/ai/classify', 'POST');
    setClassifying(false);
    if (!result.ok) {
      setClassifyResult(`❌ ${result.error}`);
      return;
    }
    const d = result.data as { classified: number; mode: string; message: string };
    setClassifyResult(`✅ ${d.message}`);
  };

  const handleScoreQuotes = async () => {
    setScoring(true);
    setCandidates(null);
    const result = await aiTask('/api/admin/ai/quotes', 'POST');
    setScoring(false);
    if (!result.ok) {
      setQuoteMode(`❌ ${result.error}`);
      return;
    }
    const d = result.data as { candidates: QuoteCandidate[]; mode: string; message: string };
    setCandidates(d.candidates);
    setQuoteMode(d.mode === 'ai' ? 'AI 打分' : '规则排序（未配置 AI key）');
  };

  const handleConfirmQuote = async (candidate: QuoteCandidate) => {
    setBusy(true);
    const result = await aiTask('/api/admin/ai/quotes', 'PATCH', {
      blessing_id: candidate.blessing_id,
      content: candidate.content,
    });
    setBusy(false);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    alert('✅ 金句已上线，首页立即展示');
    setCandidates(null);
  };

  const handleSummary = async () => {
    setSummarizing(true);
    const result = await aiTask('/api/admin/ai/summary', 'POST');
    setSummarizing(false);
    if (!result.ok) {
      setSummary(`❌ ${result.error}`);
      return;
    }
    const d = result.data as { summary: string };
    setSummary(d.summary);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-ink">AI 活动助手</h2>

      {/* 批量分类 */}
      <div className="glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">词库批量分类</p>
          <button
            onClick={handleClassify}
            disabled={classifying}
            className="rounded-lg bg-primary px-3 py-1 text-xs text-white hover:bg-primary-light disabled:opacity-50"
          >
            {classifying ? '分类中...' : '▶ 开始分类'}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          对未打标签的祝福语生成分类与标签（每批 50 条，无 AI key 时按关键词规则分类）
        </p>
        {classifyResult && <p className="mt-2 text-sm text-ink-light">{classifyResult}</p>}
      </div>

      {/* 今日金句 */}
      <div className="glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">今日金句</p>
          <button
            onClick={handleScoreQuotes}
            disabled={scoring}
            className="rounded-lg bg-primary px-3 py-1 text-xs text-white hover:bg-primary-light disabled:opacity-50"
          >
            {scoring ? '打分中...' : '▶ 生成候选'}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          从已审核祝福中打分选出最温暖的 5 句，人工确认后展示在首页
        </p>
        {quoteMode && <p className="mt-2 text-xs text-ink-light">排序方式：{quoteMode}</p>}
        {candidates && (
          <div className="mt-3 space-y-2">
            {candidates.map((c) => (
              <div
                key={c.blessing_id}
                className="flex items-center justify-between gap-3 rounded-xl bg-ink/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">{c.content}</p>
                  <p className="text-xs text-ink-muted">
                    评分 {c.score} · {c.reason}
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmQuote(c)}
                  disabled={busy}
                  className="shrink-0 rounded-lg bg-success px-3 py-1 text-xs text-white hover:bg-success-dark disabled:opacity-50"
                >
                  确认展示
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 收官总结 */}
      <div className="glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">活动收官总结</p>
          <button
            onClick={handleSummary}
            disabled={summarizing}
            className="rounded-lg bg-primary px-3 py-1 text-xs text-white hover:bg-primary-light disabled:opacity-50"
          >
            {summarizing ? '生成中...' : '▶ 生成总结'}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          聚合全站参与数据，生成活动总结（可反复生成，最新一条生效）
        </p>
        {summary && (
          <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm leading-relaxed text-ink">
            {summary}
          </p>
        )}
      </div>

      {/* 活动洞察 */}
      <InsightsPanel />
    </div>
  );
}

/** 活动洞察面板（公开洞察数据，只读展示） */
function InsightsPanel() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/ai/insights')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  return (
    <div className="glass-card p-4">
      <p className="mb-3 text-sm font-bold text-ink">活动洞察</p>
      {!data ? (
        <p className="text-xs text-ink-muted">加载中...</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-ink/5 p-3 text-center">
              <p className="text-xl font-bold text-accent">{data.total_blessings}</p>
              <p className="text-xs text-ink-muted">已审核祝福</p>
            </div>
            <div className="rounded-xl bg-ink/5 p-3 text-center">
              <p className="text-xl font-bold text-primary">{data.total_participants}</p>
              <p className="text-xs text-ink-muted">参与人数</p>
            </div>
          </div>

          {data.emotions.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-ink-muted">情绪分布</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {data.emotions.map((e, i) => (
                  <div
                    key={e.emotion}
                    title={`${e.emotion} ${e.count}条`}
                    className="h-full"
                    style={{
                      width: `${(e.count / data.total_blessings) * 100}%`,
                      background: `hsl(${28 + i * 30} 80% 55%)`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {data.emotions.map((e) => (
                  <span key={e.emotion} className="text-xs text-ink-light">
                    {e.emotion} {e.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.gifts.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-ink-muted">最受欢迎的礼物</p>
              <div className="flex flex-wrap gap-2">
                {data.gifts.slice(0, 4).map((g) => (
                  <span
                    key={g.name}
                    className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
                  >
                    {g.icon} {g.name} ×{g.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
