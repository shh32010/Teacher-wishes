// ============================================================
// 二维码生成组件 — Canvas 渲染
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  /** 要编码的 URL/文本 */
  value: string;
  /** 尺寸，默认 128 */
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
        dark: '#FFFFFF',
        light: '#00000000', // 透明背景
      },
    });
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg" style={{ width: size, height: size }} />;
}
