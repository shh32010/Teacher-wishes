import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime, truncate } from '@/lib/utils';

describe('cn()', () => {
  it('应该合并多个类名', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('应该过滤假值', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });

  it('应该处理空参数', () => {
    expect(cn()).toBe('');
  });
});

describe('formatDate()', () => {
  it('应该格式化日期为月日', () => {
    expect(formatDate('2026-08-05T12:00:00Z')).toMatch(/8月5日/);
  });

  it('应该处理不同月份', () => {
    expect(formatDate('2026-01-15T00:00:00Z')).toMatch(/1月15日/);
  });
});

describe('formatDateTime()', () => {
  it('应该格式化完整日期时间', () => {
    const result = formatDateTime('2026-08-05T14:30:00Z');
    expect(result).toContain('2026年');
    expect(result).toContain('8月5日');
  });
});

describe('truncate()', () => {
  it('应该截断长文本', () => {
    expect(truncate('1234567890', 5)).toBe('12345...');
  });

  it('不截断短文本', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
});
