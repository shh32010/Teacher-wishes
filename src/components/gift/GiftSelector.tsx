// ============================================================
// Step 3 选择礼物 — 8 格礼物宫格（仅展示运营启用的礼物）
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Gift } from '@/types';

interface GiftSelectorProps {
  onSelect: (gift: Gift) => void;
  onBack: () => void;
}

export default function GiftSelector({ onSelect, onBack }: GiftSelectorProps) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    fetch('/api/gifts')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setGifts(data.gifts || []))
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-card p-6">
      <h2 className="mb-1 text-center text-xl font-bold text-ink">再送上一份礼物吧</h2>
      <p className="mb-6 text-center text-sm text-ink-muted">
        礼物会化作光点，飞进全体老师的祝福星河
      </p>

      {loading ? (
        <p className="py-12 text-center text-ink-muted">加载中...</p>
      ) : loadFailed ? (
        // 区分「加载失败」与「暂无礼物」，避免误导文案
        <div className="py-12 text-center">
          <p className="text-ink-muted">礼物加载失败</p>
          <button onClick={() => window.location.reload()} className="btn-ghost mt-4 text-sm">
            点击重试
          </button>
        </div>
      ) : gifts.length === 0 ? (
        <p className="py-12 text-center text-ink-muted">暂无可用的礼物，请稍后再来</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gifts.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(g)}
              className="glass-card p-4 text-center transition-transform hover:-translate-y-1"
            >
              <p className="mb-1 text-4xl">{g.icon}</p>
              <p className="font-bold text-ink">{g.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{g.description}</p>
            </motion.button>
          ))}
        </div>
      )}

      <button onClick={onBack} className="btn-ghost mt-6 w-full">
        ← 返回重选祝福语
      </button>
    </div>
  );
}
