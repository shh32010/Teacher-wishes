import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── 暖色主色板 — 教师节 · 金黄暖阳 ──
        primary: {
          DEFAULT: '#D97706', // 琥珀金（主按钮、强调）
          light: '#F59E0B',
          dark: '#B45309',
        },
        secondary: {
          DEFAULT: '#FBBF24', // 明金黄（渐变、点缀）
          light: '#FDE68A',
          dark: '#F59E0B',
        },
        accent: {
          DEFAULT: '#F59E0B', // 暖阳金（标签、徽章）
          light: '#FBBF24',
          dark: '#D97706',
        },
        // ── 暖色背景色阶 ──
        warm: {
          DEFAULT: '#FFF8F0', // 主背景（暖白）
          light: '#FFFDF9', // 更浅
          dark: '#FDF6EC', // 奶油色
          deeper: '#F8F3FF', // 淡紫（渐变底部）
        },
        // ── 暖色文字色阶 ──
        ink: {
          DEFAULT: '#3B2F2F', // 正文（暖深棕）
          light: '#6B5B5B', // 辅助文字
          muted: '#9B8B8B', // 提示文字
        },
        // ── 保留夜色调色板（深色模式） ──
        night: {
          DEFAULT: '#0B1020',
          light: '#1A2040',
          lighter: '#252D52',
        },
        // ── 功能色 ──
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        like: {
          DEFAULT: '#EC4899',
          light: '#F472B6',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans SC"',
          'sans-serif',
        ],
        // 标题字体 — 霞鹜文楷，教师节书卷气
        wenkai: ['"LXGW WenKai"', '"霞鹜文楷"', '"Noto Serif SC"', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        breathe: 'breathe 3s ease-in-out infinite',
        'star-twinkle': 'twinkle 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'petal-fall': 'petalFall linear infinite',
        'ginkgo-fall': 'ginkgoFall linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        petalFall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(360deg)', opacity: '0' },
        },
        ginkgoFall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg) translateX(0)', opacity: '0.9' },
          '25%': { transform: 'translateY(25vh) rotate(90deg) translateX(30px)', opacity: '0.8' },
          '50%': { transform: 'translateY(50vh) rotate(180deg) translateX(-20px)', opacity: '0.7' },
          '75%': { transform: 'translateY(75vh) rotate(270deg) translateX(15px)', opacity: '0.5' },
          '100%': { transform: 'translateY(110vh) rotate(360deg) translateX(-10px)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
