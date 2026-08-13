// ============================================================
// 祝福提交表单 — 玻璃态弹出表单 · 暖色主题
// ============================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import GlassCard from '@/components/ui/GlassCard';
import { getCsrfToken } from '@/lib/csrf-client';

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
    csrfToken?: string;
  }) => void;
  teachers?: { id: string; name: string; avatar_url?: string | null }[];
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
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [error, setError] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileLoaded = useRef(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(e.target as Node)) {
        setShowTeacherDropdown(false);
        setTeacherSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTeachers = teachers.filter((t) => {
    if (!teacherSearch.trim()) return true;
    return t.name.includes(teacherSearch.trim());
  });

  const selectedTeacher = teachers.find((t) => t.id === teacherId);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setNickname(localStorage.getItem('blessing_nickname') || '');
    setClass(localStorage.getItem('blessing_class') || '');
  }, [isOpen]);

  // 焦点 trap
  useEffect(() => {
    if (!isOpen) return;

    const modalEl = document.querySelector('[data-modal="blessing-form"]');
    if (!modalEl) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = (): HTMLElement[] => {
      const elements = modalEl.querySelectorAll<HTMLElement>(focusableSelector);
      return Array.from(elements).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
      );
    };

    const timer = setTimeout(() => {
      const firstInput = modalEl.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled])'
      );
      firstInput?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === firstEl || !modalEl.contains(activeEl)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (activeEl === lastEl || !modalEl.contains(activeEl)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // 记录 widget id — 重复 render 会抛 "already rendered" 被吞导致二次提交无 token
  const turnstileWidgetRef = useRef<string | null>(null);

  // 表单关闭时销毁 widget：AnimatePresence 卸载了容器 DOM，
  // 旧 widget id 变为悬空引用，reset 旧 id 拿不到 token → 二次提交直接失败
  useEffect(() => {
    if (isOpen) return;
    if (turnstileWidgetRef.current && typeof window !== 'undefined' && window.turnstile) {
      try {
        window.turnstile.remove(turnstileWidgetRef.current);
      } catch {
        /* 已销毁则忽略 */
      }
      turnstileWidgetRef.current = null;
    }
  }, [isOpen]);

  const getTurnstileToken = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (!TURNSTILE_SITE_KEY || typeof window === 'undefined' || !window.turnstile) {
        resolve('');
        return;
      }
      try {
        if (!turnstileWidgetRef.current) {
          // 首次：渲染 widget，保存返回的 widget id
          turnstileWidgetRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (token: string) => resolve(token),
            'error-callback': () => resolve(''),
            'expired-callback': () => resolve(''),
          });
        } else {
          // 后续：reset 获取新 token（callback 会再次触发 resolve）
          window.turnstile.reset(turnstileWidgetRef.current);
        }
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
    const csrfToken = await getCsrfToken();
    onSubmit({ nickname, class_, content: content.trim(), teacherId, turnstileToken, csrfToken });

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
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="写下祝福"
            data-modal="blessing-form"
          >
            <GlassCard
              className="w-full max-w-lg"
              hover={false}
              padding="lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 标题 */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-ink">✏️ 写下你的祝福</h2>
                <button
                  onClick={onClose}
                  aria-label="关闭祝福表单"
                  className="glass rounded-full p-2 text-ink-muted hover:text-ink transition-colors"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
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
                  <label
                    htmlFor="blessing-nickname"
                    className="mb-1.5 block text-sm text-ink-light"
                  >
                    你的昵称（选填）
                  </label>
                  <input
                    id="blessing-nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={20}
                    placeholder="小明"
                    className="input-glass"
                  />
                </div>

                {/* 班级 */}
                <div>
                  <label htmlFor="blessing-class" className="mb-1.5 block text-sm text-ink-light">
                    班级（选填）
                  </label>
                  <input
                    id="blessing-class"
                    type="text"
                    value={class_}
                    onChange={(e) => setClass(e.target.value)}
                    maxLength={30}
                    placeholder="例如：高一(3)班"
                    className="input-glass"
                  />
                </div>

                {/* 教师选择 — 可搜索 */}
                {teachers.length > 0 && (
                  <div ref={teacherDropdownRef} className="relative">
                    <span
                      id="blessing-teacher-label"
                      className="mb-1.5 block text-sm text-ink-light"
                    >
                      送给哪位老师（选填）
                    </span>
                    <button
                      type="button"
                      aria-labelledby="blessing-teacher-label"
                      aria-expanded={showTeacherDropdown}
                      aria-haspopup="listbox"
                      onClick={() => {
                        setShowTeacherDropdown(!showTeacherDropdown);
                        setTeacherSearch('');
                      }}
                      className="w-full rounded-xl border border-ink/10 bg-white/60 px-4 py-2.5 text-left text-ink outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    >
                      {selectedTeacher ? (
                        <span className="flex items-center gap-2">
                          {selectedTeacher.avatar_url ? (
                            <span className="relative inline-block h-5 w-5 overflow-hidden rounded-full">
                              <Image
                                src={selectedTeacher.avatar_url}
                                alt=""
                                fill
                                sizes="20px"
                                className="object-cover"
                              />
                            </span>
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-xs">
                              {selectedTeacher.name[0]}
                            </span>
                          )}
                          {selectedTeacher.name}老师
                        </span>
                      ) : (
                        <span className="text-ink-muted">送给全体老师</span>
                      )}
                    </button>

                    {/* 下拉面板 */}
                    {showTeacherDropdown && (
                      <div
                        role="listbox"
                        aria-label="教师列表"
                        className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl glass border border-ink/10 bg-white/95 overflow-hidden shadow-lg"
                      >
                        <div className="border-b border-ink/5 p-2">
                          <input
                            type="text"
                            autoFocus
                            value={teacherSearch}
                            onChange={(e) => setTeacherSearch(e.target.value)}
                            placeholder="搜索教师姓名..."
                            aria-label="搜索教师姓名"
                            className="input-glass-sm"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            role="option"
                            aria-selected={!teacherId}
                            onClick={() => {
                              setTeacherId('');
                              setShowTeacherDropdown(false);
                              setTeacherSearch('');
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/5 ${
                              !teacherId ? 'text-accent bg-accent/10' : 'text-ink'
                            }`}
                          >
                            🌟 送给全体老师
                          </button>
                          {filteredTeachers.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              role="option"
                              aria-selected={teacherId === t.id}
                              onClick={() => {
                                setTeacherId(t.id);
                                setShowTeacherDropdown(false);
                                setTeacherSearch('');
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-ink/5 flex items-center gap-2 ${
                                teacherId === t.id ? 'text-accent bg-accent/10' : 'text-ink'
                              }`}
                            >
                              {t.avatar_url ? (
                                <span className="relative inline-block h-6 w-6 overflow-hidden rounded-full">
                                  <Image
                                    src={t.avatar_url}
                                    alt=""
                                    fill
                                    sizes="24px"
                                    className="object-cover"
                                  />
                                </span>
                              ) : (
                                <span
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs text-primary"
                                  aria-hidden="true"
                                >
                                  {t.name[0]}
                                </span>
                              )}
                              {t.name}老师
                            </button>
                          ))}
                          {filteredTeachers.length === 0 && (
                            <p className="px-4 py-3 text-sm text-ink-muted">未找到匹配的教师</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 祝福内容 */}
                <div>
                  <label
                    htmlFor="blessing-content"
                    className="mb-1.5 flex items-center justify-between text-sm text-ink-light"
                  >
                    <span>祝福语 *</span>
                    <span className={content.length > 500 ? 'text-danger' : 'text-ink-muted'}>
                      {content.length}/500
                    </span>
                  </label>
                  <textarea
                    id="blessing-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    maxLength={500}
                    placeholder="写下你想对老师说的话..."
                    className="w-full resize-none rounded-xl border border-ink/10 bg-white/60 px-4 py-3 text-ink placeholder-ink-muted outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* 错误提示 */}
                {error && <p className="text-sm text-danger">{error}</p>}

                {/* Turnstile */}
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
