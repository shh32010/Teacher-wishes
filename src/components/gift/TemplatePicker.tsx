// ============================================================
// Step 2 选择祝福语 — AI 推荐 3 句 + 「换一句」 + 分类浏览
// 推荐为纯数据库语义匹配（无 LLM），失败时自动降级为分类浏览
// ============================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { BlessingTemplate, EmotionCategory } from '@/types';

interface TemplatePickerProps {
  /** 情绪/分类；null 表示跳过情绪选择，直接浏览全部（UX-5） */
  mood: EmotionCategory | null;
  onSelect: (template: BlessingTemplate) => void;
  onBack: () => void;
}

const CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味'];

export default function TemplatePicker({ mood, onSelect, onBack }: TemplatePickerProps) {
  // AI 推荐区状态（仅 mood 存在时使用）
  const [recommendations, setRecommendations] = useState<BlessingTemplate[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(true);
  const [recommendFailed, setRecommendFailed] = useState(false);
  // 浏览区状态（category 为 null 表示「全部」）
  const [category, setCategory] = useState<EmotionCategory | null>(mood);
  const [browse, setBrowse] = useState<BlessingTemplate[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  // 请求序号守卫：快速切换分类时仅最新一次请求可写入 state（防过期响应覆盖）
  const browseReqRef = useRef(0);

  /** 加载 AI 推荐（换一批 = 重新加载，no-store 保证随机；完成后刷新浏览区去重） */
  const loadRecommendations = async () => {
    if (!mood) return; // 跳过情绪模式无推荐（类型守卫 + 语义保护）
    setRecommendLoading(true);
    setRecommendFailed(false);
    try {
      const res = await fetch(`/api/ai/recommend?mood=${encodeURIComponent(mood)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      // 推荐变化后重新过滤浏览区（推荐区与浏览区不重复展示同一句）
      setBrowse((prev) => {
        const recommendedIds = new Set(
          (data.recommendations as BlessingTemplate[]).map((t) => t.id)
        );
        return prev.filter((t) => !recommendedIds.has(t.id));
      });
    } catch {
      // 推荐失败 → 降级：仅展示分类浏览，不阻塞核心流程
      setRecommendFailed(true);
      setRecommendations([]);
    } finally {
      setRecommendLoading(false);
    }
  };

  /** 加载分类浏览列表（带请求序号守卫；过滤掉推荐区已展示的条目，避免同一句重复出现）
   *  cat 为 null 时加载全部 */
  const loadBrowse = async (cat: EmotionCategory | null) => {
    const reqId = ++browseReqRef.current;
    setBrowseLoading(true);
    try {
      const categoryParam = cat ? `category=${encodeURIComponent(cat)}&` : '';
      const res = await fetch(`/api/templates?${categoryParam}pageSize=20`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (reqId === browseReqRef.current) {
        const recommendedIds = new Set(recommendations.map((t) => t.id));
        setBrowse((data.data || []).filter((t: BlessingTemplate) => !recommendedIds.has(t.id)));
      }
    } catch {
      if (reqId === browseReqRef.current) {
        setBrowse([]);
      }
    } finally {
      if (reqId === browseReqRef.current) {
        setBrowseLoading(false);
      }
    }
  };

  useEffect(() => {
    if (mood) {
      loadRecommendations();
    } else {
      // 跳过情绪选择：无推荐区，直接浏览全部
      setRecommendLoading(false);
      setRecommendFailed(true);
      setRecommendations([]);
    }
    loadBrowse(mood);
  }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* AI 推荐区（仅选择了情绪时展示；跳过情绪则直接浏览全部） */}
      {mood && (
        <div className="glass-card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">✨ AI 为你挑了 3 句</h2>
            <button
              onClick={loadRecommendations}
              disabled={recommendLoading}
              className="rounded-lg bg-accent/20 px-3 py-1 text-sm text-ink hover:bg-accent/30 disabled:opacity-50"
            >
              {recommendLoading ? '挑选中...' : '🔄 换一批'}
            </button>
          </div>

          {recommendLoading ? (
            <p className="py-8 text-center text-ink-muted">AI 正在挑选...</p>
          ) : recommendFailed ? (
            <p className="py-4 text-center text-sm text-ink-muted">
              推荐暂时不可用，请在下方浏览全部祝福语
            </p>
          ) : (
            <div className="space-y-3">
              {recommendations.map((t, i) => (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => onSelect(t)}
                  className="glass-card group w-full p-4 text-left transition-colors hover:border-accent"
                >
                  <p className="text-ink">{t.content}</p>
                  <p className="mt-1 text-xs text-ink-muted">{t.category} · 点击选择这句 →</p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 分类浏览区 */}
      <div className="glass-card p-6">
        <h2 className="mb-3 text-lg font-bold text-ink">
          {mood ? '浏览更多祝福语' : '浏览全部祝福语'}
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setCategory(null);
              loadBrowse(null);
            }}
            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
              category === null
                ? 'bg-primary text-white'
                : 'bg-ink/5 text-ink-muted hover:bg-ink/10'
            }`}
          >
            全部
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c);
                loadBrowse(c);
              }}
              className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                category === c ? 'bg-primary text-white' : 'bg-ink/5 text-ink-muted hover:bg-ink/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {browseLoading ? (
          <p className="py-6 text-center text-sm text-ink-muted">加载中...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {browse.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="glass-card p-3 text-left text-sm text-ink transition-colors hover:border-accent"
              >
                {t.content}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onBack} className="btn-ghost w-full">
        ← 返回重选情绪
      </button>
    </div>
  );
}
