// ============================================================
// 二维码生成组件 — Canvas 渲染 · 暖色主题
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 128 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCodeLib.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      color: {
        dark: '#3B2F2F', // 暖深棕（替代纯黑）
        light: '#00000000', // 透明背景
      },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" style={{ width: size, height: size }} />;
}
