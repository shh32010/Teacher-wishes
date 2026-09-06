// ============================================================
// 背景音乐开关 — 全站常驻（挂在根 layout，跨路由不中断）
// 默认开策略（浏览器有声自动播放被禁的现实约束下取最强方案）：
//   1. 页面加载即尝试有声播放（桌面 Chrome 对常访用户放行）
//   2. 被浏览器拦截 → 静音自动播放（移动端允许静音 autoplay），
//      学生任意一次点击/触摸/按键 → 立即恢复声音
//   3. 用户手动暂停过 → 尊重选择，不再自动（localStorage '0'）
// 音量 0.35 循环；图标亮 = 播放中（静音缓冲期也亮，提示已就绪）
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const BGM_SRC = '/music/bgm.mp3';
const STORAGE_KEY = 'bgm_enabled';

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  // 静音自动播放缓冲期（等首次手势出声）
  const [waitingGesture, setWaitingGesture] = useState(false);

  // 初始化：默认打开（被拦则静音自动播，首次交互恢复声音）
  useEffect(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'auto'; // 需预载才能自动播放
    audioRef.current = audio;
    let cancelled = false;

    // 用户曾手动暂停 → 尊重，不自动开
    if (localStorage.getItem(STORAGE_KEY) === '0') return;

    const unmuteOnGesture = () => {
      if (cancelled) return;
      audio.muted = false;
      setWaitingGesture(false);
      document.removeEventListener('pointerdown', unmuteOnGesture);
      document.removeEventListener('keydown', unmuteOnGesture);
      document.removeEventListener('touchstart', unmuteOnGesture);
    };

    audio
      .play() // 先试有声
      .then(() => {
        if (cancelled) return;
        setPlaying(true);
        localStorage.setItem(STORAGE_KEY, '1');
      })
      .catch(() => {
        if (cancelled) return;
        // 有声被拦 → 静音自动播放，首次任意交互恢复声音
        audio.muted = true;
        audio
          .play()
          .then(() => {
            if (cancelled) return;
            setPlaying(true);
            setWaitingGesture(true);
            document.addEventListener('pointerdown', unmuteOnGesture);
            document.addEventListener('keydown', unmuteOnGesture);
            document.addEventListener('touchstart', unmuteOnGesture, { passive: true });
          })
          .catch(() => setPlaying(false)); // 静音也被拦（罕见）→ 留给手动
      });

    return () => {
      cancelled = true;
      document.removeEventListener('pointerdown', unmuteOnGesture);
      document.removeEventListener('keydown', unmuteOnGesture);
      document.removeEventListener('touchstart', unmuteOnGesture);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      setWaitingGesture(false);
      localStorage.setItem(STORAGE_KEY, '0'); // 手动暂停 → 下次不自动
    } else {
      audio.muted = false;
      audio
        .play()
        .then(() => {
          setPlaying(true);
          localStorage.setItem(STORAGE_KEY, '1');
        })
        .catch(() => setPlaying(false));
    }
  };

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      aria-label={playing ? '暂停背景音乐' : '播放背景音乐'}
      title={playing ? '暂停音乐' : '播放音乐'}
      className={`fixed bottom-16 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full text-lg shadow-lg backdrop-blur-sm transition-colors ${
        playing
          ? 'bg-primary/90 text-white shadow-primary/30'
          : 'bg-ink/10 text-ink-muted hover:text-ink'
      }`}
    >
      <span aria-hidden="true" className={playing ? 'animate-pulse' : ''}>
        {playing ? '🎵' : '🔇'}
      </span>
      {/* 静音缓冲期：提示首次点击屏幕即出声（浏览器有声自动播放限制） */}
      {waitingGesture && (
        <span className="absolute -top-10 right-0 whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm">
          点击屏幕开启音乐 🎵
        </span>
      )}
    </motion.button>
  );
}
