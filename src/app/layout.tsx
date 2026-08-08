import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
import PageTransition from '@/components/ui/PageTransition';
import './globals.css';

/* ── 正文系统无衬线字体 ── */
const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

/*
 * 标题字体 — 霞鹜文楷（LXGW WenKai）
 *
 * 使用 @fontsource/lxgw-wenkai 本地 woff2
 * ⚠️ 文件名含 "latin" 是 fontsource 命名惯例，实际 7.5MB 含 CJK 全量字形
 * （纯 Latin 子集仅 ~50KB，7.5MB 必然是 CJK 全量）
 * preload: false — 不阻塞首屏渲染，依靠 font-display: swap 降级
 * 用户先看到系统字体，字体加载完成后自动切换
 */
const wenkaiFont = localFont({
  src: '../../node_modules/@fontsource/lxgw-wenkai/files/lxgw-wenkai-latin-700-normal.woff2',
  variable: '--font-wenkai',
  weight: '700',
  display: 'swap',
  preload: false,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFF8F0',
};

export const metadata: Metadata = {
  title: {
    default: '教师节祝福墙 - 致敬每一位引路人',
    template: '%s | 教师节祝福墙',
  },
  description: '教师节活动网站，学生们可以在这里发布对老师的祝福，查看实时祝福墙，感受节日温暖。',
  keywords: ['教师节', '祝福墙', '教师节祝福', '教师节活动'],
  authors: [{ name: 'Teacher Wishes Team' }],
  openGraph: {
    title: '教师节祝福墙',
    description: '致敬每一位引路人，写下你最真挚的祝福。',
    type: 'website',
    locale: 'zh_CN',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 预连接 Supabase API + Storage，加速首字节请求 */}
        {SUPABASE_URL && (
          <>
            <link rel="preconnect" href={SUPABASE_URL} />
            <link rel="dns-prefetch" href={SUPABASE_URL} />
          </>
        )}
        {/* Turnstile 人机验证（按需加载，提前 DNS 预解析） */}
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${wenkaiFont.variable} antialiased`}
      >
        <PageTransition>{children}</PageTransition>
        <Analytics />
      </body>
    </html>
  );
}
