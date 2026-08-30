// ============================================================
// CSV 解析单元测试 — 词库批量导入的解析器
// ============================================================

import { describe, it, expect } from 'vitest';
import { parseCsv } from '@/lib/csv';

describe('parseCsv', () => {
  it('应该解析基本的两列表格', () => {
    const { headers, rows } = parseCsv('content,category\n祝福语一,感恩\n祝福语二,祝愿\n');
    expect(headers).toEqual(['content', 'category']);
    expect(rows).toEqual([
      ['祝福语一', '感恩'],
      ['祝福语二', '祝愿'],
    ]);
  });

  it('应该处理中文表头', () => {
    const { headers, rows } = parseCsv('内容,分类\n感谢老师,感恩\n');
    expect(headers).toEqual(['内容', '分类']);
    expect(rows).toEqual([['感谢老师', '感恩']]);
  });

  it('应该处理双引号包裹的字段（含逗号）', () => {
    const { rows } = parseCsv('content,category\n"谢谢您，老师",感恩\n');
    expect(rows[0][0]).toBe('谢谢您，老师');
  });

  it('应该处理引号转义（"" 表示一个引号）', () => {
    const { rows } = parseCsv('content,category\n他说"谢谢您",感恩\n');
    expect(rows[0][0]).toBe('他说"谢谢您"');
  });

  it('应该处理包裹字段内的转义引号', () => {
    const { rows } = parseCsv('content,category\n"他说""谢谢您""",感恩\n');
    expect(rows[0][0]).toBe('他说"谢谢您"');
  });

  it('应该处理 CRLF 换行', () => {
    const { rows } = parseCsv('content,category\r\n祝福一,感恩\r\n祝福二,祝愿\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe('祝福二');
  });

  it('应该处理末尾无换行的最后一行', () => {
    const { rows } = parseCsv('content,category\n祝福一,感恩');
    expect(rows).toEqual([['祝福一', '感恩']]);
  });

  it('空文本应返回空表头和空行', () => {
    const { headers, rows } = parseCsv('');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it('缺失分类列时内容列仍可解析', () => {
    const { rows } = parseCsv('content\n只有内容一列\n');
    expect(rows).toEqual([['只有内容一列']]);
  });
});
