// ============================================================
// POST /api/admin/templates/import — 词库 CSV 批量导入
// 格式：首行表头（content,category 或 内容,分类），每行一条
// 限制：≤2MB、≤1000 行/次；逐行 trim + 长度校验 + 敏感词过滤 + 去重
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import type { EmotionCategory } from '@/types';
import { validateCsrfToken, csrfErrorResponse } from '@/lib/csrf';
import { requireAdmin } from '@/lib/auth/admin';
import { parseCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** 导入限制 */
const MAX_CSV_CHARS = 2 * 1024 * 1024; // 2MB 文本
const MAX_ROWS = 1000;

/** 合法分类（导入时缺失 → 暂归感恩类，待 AI 分类功能重新归类） */
const VALID_CATEGORIES: EmotionCategory[] = ['感恩', '祝愿', '青春', '温暖', '文艺', '趣味'];

/** 表头别名映射 → 列名 */
const HEADER_ALIASES: Record<string, 'content' | 'category'> = {
  content: 'content',
  内容: 'content',
  祝福语: 'content',
  祝福内容: 'content',
  category: 'category',
  分类: 'category',
  类别: 'category',
};

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  if (!validateCsrfToken(request)) {
    return csrfErrorResponse();
  }

  try {
    const body: { csv?: string } = await request.json();

    if (typeof body.csv !== 'string' || body.csv.trim().length === 0) {
      return NextResponse.json({ error: '请提供 CSV 内容' }, { status: 400 });
    }
    if (body.csv.length > MAX_CSV_CHARS) {
      return NextResponse.json({ error: 'CSV 超过 2MB 限制，请分批导入' }, { status: 400 });
    }

    // 解析 CSV
    const { headers, rows } = parseCsv(body.csv);

    // 表头识别（兼容中英文列名）
    const colIndex: { content: number; category: number } = { content: -1, category: -1 };
    headers.forEach((h, i) => {
      const mapped = HEADER_ALIASES[h.trim().toLowerCase()] || HEADER_ALIASES[h.trim()];
      if (mapped && colIndex[mapped] === -1) {
        colIndex[mapped] = i;
      }
    });

    if (colIndex.content === -1) {
      return NextResponse.json(
        { error: '未识别到内容列，请使用表头：content（或 内容）' },
        { status: 400 }
      );
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `单次最多导入 ${MAX_ROWS} 行，请分批导入` },
        { status: 400 }
      );
    }

    const { containsProfanity } = await import('@/lib/profanity');
    const supabase = createAdminClient();

    // 现有词库 content 快照（数据量 ≤ 数千条，全量取回做去重）
    const { data: existingRows, error: existingError } = await supabase
      .from('blessing_templates')
      .select('content');

    if (existingError) {
      console.error('[Admin API] 词库快照查询失败:', existingError);
      return NextResponse.json({ error: '导入失败' }, { status: 500 });
    }

    const existingContents = new Set((existingRows || []).map((r) => r.content));

    // 逐行校验 + 去重
    const toInsert: { content: string; category: EmotionCategory; tags: string[] }[] = [];
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    for (const row of rows) {
      const rawContent = (row[colIndex.content] || '').trim();
      const rawCategory = colIndex.category >= 0 ? (row[colIndex.category] || '').trim() : '';

      // 内容校验：长度 + 敏感词
      if (rawContent.length < 5 || rawContent.length > 200 || containsProfanity(rawContent)) {
        skippedInvalid++;
        continue;
      }

      // 分类校验：缺失/非法 → 暂归感恩类
      const category = VALID_CATEGORIES.includes(rawCategory as EmotionCategory)
        ? (rawCategory as EmotionCategory)
        : '感恩';

      // 去重：库内已有 或 本批次重复
      if (existingContents.has(rawContent)) {
        skippedDuplicate++;
        continue;
      }
      existingContents.add(rawContent);

      toInsert.push({ content: rawContent, category, tags: [] });
    }

    if (toInsert.length === 0) {
      return NextResponse.json(
        {
          imported: 0,
          skippedInvalid,
          skippedDuplicate,
          total: rows.length,
          message: '没有可导入的有效数据',
        },
        { status: 200 }
      );
    }

    const { error: insertError } = await supabase.from('blessing_templates').insert(toInsert);

    if (insertError) {
      console.error('[Admin API] 词库批量导入失败:', insertError);
      return NextResponse.json({ error: '导入失败' }, { status: 500 });
    }

    return NextResponse.json({
      imported: toInsert.length,
      skippedInvalid,
      skippedDuplicate,
      total: rows.length,
      message: `成功导入 ${toInsert.length} 条`,
    });
  } catch (err) {
    console.error('[Admin API] 词库导入异常:', err);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
