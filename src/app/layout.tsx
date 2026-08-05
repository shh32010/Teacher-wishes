import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: '教师节祝福墙 — 致敬每一位引路人',
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
