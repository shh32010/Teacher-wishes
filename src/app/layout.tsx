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
 * 使用 @fontsource/lxgw-wenkai 本地 woff2 文件
 * 构建时内联，运行时零 CDN 依赖
 * 仅加载 Bold (700) 权重用于标题，正文使用系统无衬线
 */
const wenkaiFont = localFont({
  src: '../../node_modules/@fontsource/lxgw-wenkai/files/lxgw-wenkai-latin-700-normal.woff2',
  variable: '--font-wenkai',
  weight: '700',
  display: 'swap',
  preload: true,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+2E80-2FDF, U+3000-303F, U+31C0-31EF, U+3200-4DBF, U+4E00-9FFF, U+F900-FAFF, U+FE10-FE1F, U+FE30-FE4F, U+FF00-FFEF, U+20000-2FFFF',
    },
  ],
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
