// ============================================================
// 通用工具函数
// ============================================================

/**
 * Tailwind CSS 类名合并工具
 * 用于条件性地合并 className，过滤掉假值
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 格式化日期为友好的中文格式
 * 例如：2026-08-05 → "8月5日"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '日期无效';
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 格式化日期时间
 * 例如：2026-08-05 14:30 → "2026年8月5日 14:30"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '日期无效';
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * 截断文本（用于卡片预览）
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
