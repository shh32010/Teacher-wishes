// ============================================================
// 今日金句 — 首页展示管理员确认的最温暖一句话（AI-4）
// 无金句时自动隐藏，不阻塞页面
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function QuoteOfDay() {
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai/quote')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setQuote(data.quote || null))
      .catch(() => setQuote(null));
  }, []);

  if (!quote) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card mx-auto mb-6 max-w-md px-6 py-4 text-center"
    >
      <p className="mb-1 text-xs font-bold tracking-wider text-accent">✨ 精选金句</p>
      <p className="text-sm leading-relaxed text-ink">&ldquo;{quote}&rdquo;</p>
    </motion.div>
  );
}
