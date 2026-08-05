// ============================================================
// 祝福提交表单 — 玻璃态弹出表单
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

interface BlessingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nickname: string;
    class_: string;
    content: string;
    teacherId: string;
    turnstileToken?: string;
  }) => void;
  teachers?: { id: string; name: string }[];
  isSubmitting?: boolean;
}

export default function BlessingForm({
  isOpen,
  onClose,
  onSubmit,
  teachers = [],
  isSubmitting = false,
}: BlessingFormProps) {
  const [nickname, setNickname] = useState('');
  const [class_, setClass] = useState('');
  const [content, setContent] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [error, setError] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileLoaded = useRef(false);

  // 加载 Turnstile 脚本（如果配置了 site key）
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || turnstileLoaded.current) return;
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    turnstileLoaded.current = true;
  }, []);

  // 从 localStorage 恢复
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setNickname(localStorage.getItem('blessing_nickname') || '');
    setClass(localStorage.getItem('blessing_class') || '');
  }, [isOpen]);

  const getTurnstileToken = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!TURNSTILE_SITE_KEY || typeof window === 'undefined' || !window.turnstile) {
        resolve('');
        return;
      }
      try {
        window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => resolve(token),
          'error-callback': () => resolve(''),
          'expired-callback': () => resolve(''),
        });
      } catch {
        resolve('');
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('请写下你的祝福语');
      return;
    }
    if (content.length > 500) {
      setError('祝福语不能超过500字哦');
      return;
    }

    const turnstileToken = await getTurnstileToken();
    onSubmit({ nickname, class_, content: content.trim(), teacherId, turnstileToken });

    if (typeof window !== 'undefined') {
      localStorage.setItem('blessing_nickname', nickname);
      localStorage.setItem('blessing_class', class_);
    }
    setContent('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <GlassCard
              className="w-full max-w-lg"
              hover={false}
              padding="lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题 */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">✏️ 写下你的祝福</h2>
                <button
                  onClick={onClose}
                  className="glass rounded-full p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* 表单 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 昵称 */}
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">你的昵称（选填）</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    placeholder="小明"
                    className="w-full rounded-xl glass border-white/10 bg-transparent px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* 班级 */}
                <div>
                  <label className="mb-1.5 block text-sm text-slate-400">班级（选填）</label>
                  <input
                    type="text"
                    value={class_}
                    onChange={(e) => setClass(e.target.value)}
                    maxLength={30}
                    placeholder="例如：高一(3)班"
                    className="w-full rounded-xl glass border-white/10 bg-transparent px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* 教师选择 */}
                {teachers.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-400">
                      送给哪位老师（选填）
                    </label>
                    <select
                      value={teacherId}
                      onChange={(e) => setTeacherId(e.target.value)}
                      className="w-full rounded-xl glass border-white/10 bg-transparent px-4 py-2.5 text-white outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="" className="bg-night">
                        送给全体老师
                      </option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id} className="bg-night">
                          {t.name}老师
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 祝福内容 */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-sm text-slate-400">
                    <span>祝福语 *</span>
                    <span className={content.length > 500 ? 'text-red-400' : 'text-slate-500'}>
                      {content.length}/500
                    </span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="写下你想对老师说的话..."
                    className="w-full resize-none rounded-xl glass border-white/10 bg-transparent px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* 错误提示 */}
                {error && <p className="text-sm text-red-400">{error}</p>}

                {/* Turnstile 人机验证（如果配置了 site key） */}
                {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="flex justify-center" />}

                {/* 提交按钮 */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '发送中...' : '✨ 送出祝福'}
                </button>
              </form>
            </GlassCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
