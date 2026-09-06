// ============================================================
// 背景音乐开关 — 全站常驻（挂在根 layout，跨路由不中断）
// - 点击播放/暂停（循环，低音量 0.35）
// - localStorage 记忆偏好：再次访问自动续播（被浏览器拦截则静默，再点一次即可）
// - 默认不自动播放（移动端有声自动播放被禁 + 自习场景礼仪）
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const BGM_SRC = '/music/bgm.mp3';
const STORAGE_KEY = 'bgm_enabled';

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // 初始化：尝试恢复上次偏好（浏览器可能拦截自动播放 → catch 静默）
  useEffect(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.volume = 0.35;
    audio.preload = 'none'; // 未开启前不下载，节省流量
    audioRef.current = audio;
    let cancelled = false;

    const resume = () => {
      if (cancelled) return;
      if (localStorage.getItem(STORAGE_KEY) === '1') {
        audio
          .play()
          .then(() => setPlaying(true))
          .catch(() => setPlaying(false));
      }
    };
    resume();
    return () => {
      cancelled = true;
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
      localStorage.setItem(STORAGE_KEY, '0');
    } else {
      // 用户手势触发播放 → 移动端放行
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
    </motion.button>
  );
}
