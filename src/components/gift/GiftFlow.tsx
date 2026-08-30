// ============================================================
// 送礼主流程容器 — 6 步状态机
// emotion → blessing → gift → confirm → sending(动画) → success
// 提交在 confirm 步完成；sending 仅为礼物动画呈现（动画失败不影响提交）
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BlessingTemplate, EmotionCategory, Gift } from '@/types';
import EmotionPicker from './EmotionPicker';
import TemplatePicker from './TemplatePicker';
import GiftSelector from './GiftSelector';
import GiftAnimation from './GiftAnimation';
import GiftSuccess from './GiftSuccess';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { useTurnstile } from '@/hooks/useTurnstile';

export type GiftStep = 'emotion' | 'blessing' | 'gift' | 'confirm' | 'sending' | 'success';

/** 步骤指示器：选祝福 → 选礼物 → 送出 */
function StepsIndicator({ step }: { step: GiftStep }) {
  const steps: { key: string; label: string; active: boolean }[] = [
    { key: 'blessing', label: '选祝福', active: step === 'emotion' || step === 'blessing' },
    { key: 'gift', label: '选礼物', active: step === 'gift' },
    {
      key: 'send',
      label: '送出',
      active: step === 'confirm' || step === 'sending' || step === 'success',
    },
  ];
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          {i > 0 && <div className="h-px w-8 bg-ink/20" />}
          <span
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              s.active ? 'bg-primary text-white' : 'bg-ink/10 text-ink-muted'
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const stepVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export default function GiftFlow() {
  const [step, setStep] = useState<GiftStep>('emotion');
  // mood 为 null 表示「跳过情绪选择，直接浏览全部」（UX-5）
  const [mood, setMood] = useState<EmotionCategory | null>(null);
  const [template, setTemplate] = useState<BlessingTemplate | null>(null);
  const [gift, setGift] = useState<Gift | null>(null);
  const [nickname, setNickname] = useState('');
  const [class_, setClass_] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Turnstile 人机验证（生产 fail-closed 红线）；仅在 confirm 步渲染 widget
  const {
    containerRef: turnstileRef,
    getToken: getTurnstileToken,
    enabled: turnstileEnabled,
  } = useTurnstile(step === 'confirm');

  // localStorage 记忆昵称/班级（与 v1 表单同 key，老用户无缝衔接）
  useEffect(() => {
    setNickname(localStorage.getItem('blessing_nickname') || '');
    setClass_(localStorage.getItem('blessing_class') || '');
  }, []);

  /** 提交祝福 + 礼物（sending 期间按钮禁用 + 服务端限流双保险） */
  const handleSend = async () => {
    if (!template || !gift || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const turnstileToken = await getTurnstileToken();
      const headers = await getCsrfHeaders();
      const res = await fetch('/api/blessings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          template_id: template.id,
          gift_id: gift.id,
          nickname: nickname.trim() || undefined,
          class: class_.trim() || undefined,
          is_anonymous: isAnonymous,
          turnstile_token: turnstileToken || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSendError(err.error || '送出失败，请稍后重试');
        return;
      }
      localStorage.setItem('blessing_nickname', nickname.trim());
      localStorage.setItem('blessing_class', class_.trim());
      setStep('sending');
    } catch {
      setSendError('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  /** 再送一份：清空选择回到第一步 */
  const restart = () => {
    setMood(null);
    setTemplate(null);
    setGift(null);
    setSendError(null);
    setStep('emotion');
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <StepsIndicator step={step} />

      <AnimatePresence mode="wait">
        {step === 'emotion' && (
          <motion.div key="emotion" {...stepVariants} transition={{ duration: 0.3 }}>
            <EmotionPicker
              onSelect={(m) => {
                setMood(m);
                setStep('blessing');
              }}
              onSkip={() => {
                setMood(null);
                setStep('blessing');
              }}
            />
          </motion.div>
        )}

        {step === 'blessing' && (
          <motion.div key="blessing" {...stepVariants} transition={{ duration: 0.3 }}>
            <TemplatePicker
              mood={mood}
              onSelect={(t) => {
                setTemplate(t);
                setStep('gift');
              }}
              onBack={() => setStep('emotion')}
            />
          </motion.div>
        )}

        {step === 'gift' && (
          <motion.div key="gift" {...stepVariants} transition={{ duration: 0.3 }}>
            <GiftSelector
              onSelect={(g) => {
                setGift(g);
                setStep('confirm');
              }}
              onBack={() => setStep('blessing')}
            />
          </motion.div>
        )}

        {step === 'confirm' && template && gift && (
          <motion.div key="confirm" {...stepVariants} transition={{ duration: 0.3 }}>
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-bold text-ink">准备好了吗？</h2>

              {/* 预览卡片 */}
              <div className="glass-card mb-4 p-5 text-center">
                <p className="mb-2 text-4xl">{gift.icon}</p>
                <p className="mb-1 text-ink">&ldquo;{template.content}&rdquo;</p>
                <p className="text-sm text-ink-muted">— 一份{gift.name}，献给全体老师</p>
              </div>

              {/* 昵称/班级/匿名（可选） */}
              <div className="mb-4 space-y-3">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  placeholder="昵称（选填，如：浩浩）"
                  className="input-glass w-full"
                />
                <input
                  value={class_}
                  onChange={(e) => setClass_(e.target.value)}
                  maxLength={30}
                  placeholder="班级（选填，如：网络2401）"
                  className="input-glass w-full"
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded"
                  />
                  匿名送出（不显示昵称和班级）
                </label>
              </div>

              {sendError && (
                <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {sendError}
                </p>
              )}

              {/* Turnstile 人机验证（配置 site key 时展示） */}
              {turnstileEnabled && <div ref={turnstileRef} className="mb-4 flex justify-center" />}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('gift')}
                  disabled={sending}
                  className="btn-ghost flex-1"
                >
                  ← 返回
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-1 rounded-xl bg-primary px-4 py-2.5 font-bold text-white hover:bg-primary-light disabled:opacity-50"
                >
                  {sending ? '送出中...' : `送出${gift.icon} ${gift.name}`}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'sending' && gift && template && (
          <motion.div key="sending" {...stepVariants} transition={{ duration: 0.3 }}>
            <GiftAnimation
              gift={gift}
              content={template.content}
              onComplete={() => setStep('success')}
            />
          </motion.div>
        )}

        {step === 'success' && gift && template && (
          <motion.div key="success" {...stepVariants} transition={{ duration: 0.3 }}>
            <GiftSuccess gift={gift} content={template.content} onRestart={restart} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
