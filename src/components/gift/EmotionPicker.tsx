// ============================================================
// Step 1 情绪选择 — 「今天想送出怎样的心意？」
// ============================================================

'use client';

import { motion } from 'framer-motion';
import type { EmotionCategory } from '@/types';

interface EmotionPickerProps {
  onSelect: (mood: EmotionCategory) => void;
  /** 跳过情绪选择，直接浏览全部祝福（UX-5） */
  onSkip?: () => void;
}

const EMOTIONS: { id: EmotionCategory; icon: string; desc: string }[] = [
  { id: '感恩', icon: '❤️', desc: '谢谢您的教导' },
  { id: '祝愿', icon: '✨', desc: '愿您一切都好' },
  { id: '青春', icon: '🌈', desc: '那些年的课堂' },
  { id: '温暖', icon: '🌻', desc: '温柔一点的心意' },
  { id: '文艺', icon: '📖', desc: '诗意一点的心意' },
  { id: '趣味', icon: '😄', desc: '让老师笑一笑' },
];

export default function EmotionPicker({ onSelect, onSkip }: EmotionPickerProps) {
  return (
    <div className="glass-card p-6 text-center">
      <h2 className="mb-1 text-xl font-bold text-ink">告诉 AI，今天想送出怎样的心意？</h2>
      <p className="mb-6 text-sm text-ink-muted">
        AI 会从老师们准备的祝福语库中，为你挑选最合适的 3 句
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {EMOTIONS.map((e, i) => (
          <motion.button
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            onClick={() => onSelect(e.id)}
            className="glass-card group p-4 transition-transform hover:-translate-y-0.5"
          >
            <p className="mb-1 text-3xl">{e.icon}</p>
            <p className="font-bold text-ink">{e.id}</p>
            <p className="text-xs text-ink-muted">{e.desc}</p>
          </motion.button>
        ))}
      </div>

      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          不确定选什么？直接浏览全部祝福 →
        </button>
      )}
    </div>
  );
}
