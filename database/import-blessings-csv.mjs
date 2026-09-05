// ============================================================
// 活动数据重置（用户拍板 2026-09-05）：
//   1. DELETE 全部祝福记录 blessings（1364 条测试/历史数据，likes 级联清）
//   2. DELETE 全部旧词库 blessing_templates（210 条测试句）
//   3. 导入 祝福.csv（165 条真实祝福）全部可选
// 语义标签：句内含关键词 → 命中即 tag；未命中兜底分类关键词
// （与 src/app/api/ai/recommend/route.ts 的 MOOD_KEYWORDS 保持一致）
// ⚠️ 不可逆操作，执行前确认备份/导出已留档
// ============================================================

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const env = {};
for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const password = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF || 'ldykmebzzvszuxpuxqkt';
const poolerIp = process.env.SUPABASE_POOLER_IP || env.SUPABASE_POOLER_IP || '54.64.190.72';

// 情绪 → 推荐关键词（与 recommend 路由同源）
const MOOD_KEYWORDS = {
  感恩: ['谢谢', '感恩', '感谢', '教诲', '陪伴'],
  祝愿: ['祝福', '幸福', '健康', '顺利', '桃李'],
  青春: ['青春', '回忆', '毕业', '校园', '课堂'],
  温暖: ['温暖', '温柔', '陪伴', '安心', '光'],
  文艺: ['诗意', '春风', '星空', '岁月', '远方'],
  趣味: ['轻松', '幽默', '可爱', '有趣', '魔法'],
};
const FALLBACK_TAG = { 感恩: '感谢', 祝愿: '祝福', 青春: '青春', 温暖: '温暖', 文艺: '诗意', 趣味: '有趣' };

const csvPath = resolve(dirname(fileURLToPath(import.meta.url)), 'exports', '祝福.csv');
const rows = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).slice(1);

/** 解析 CSV 行（仅 3 列：序号,原文,分类 —— 句子不含逗号则简单 split 即可；含逗号时按首尾引号处理） */
function parseLine(line) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  parts.push(cur);
  return parts;
}

async function main() {
  const client = new pg.Client({ host: poolerIp, port: 6543, user: `postgres.${ref}`, password, database: 'postgres' });
  await client.connect();
  console.log('🔌 已连接\n');

  // 1. 清空祝福记录（likes 通过 ON DELETE CASCADE 级联删除）
  const delBless = await client.query('DELETE FROM blessings');
  console.log(`1️⃣ 已删除祝福记录 ${delBless.rowCount} 条（点赞记录级联清除）\n`);

  // 2. 清空旧词库
  const delTpl = await client.query('DELETE FROM blessing_templates');
  console.log(`2️⃣ 已删除旧词库 ${delTpl.rowCount} 条\n`);

  // 3. 逐句导入 祝福.csv
  let inserted = 0, skipped = 0;
  const seen = new Set(); // CSV 内去重（已确认 0，双保险）
  for (const line of rows) {
    const [seq, contentRaw, catRaw] = parseLine(line);
    const content = (contentRaw || '').trim();
    const category = (catRaw || '').trim();
    if (!content || !MOOD_KEYWORDS[category] || seen.has(content)) { skipped++; continue; }
    seen.add(content);

    // 语义标签：句内含关键词命中；无命中兜底分类代表词
    const tags = MOOD_KEYWORDS[category].filter((kw) => content.includes(kw));
    if (tags.length === 0) tags.push(FALLBACK_TAG[category]);
    const sortOrder = parseInt(seq, 10) || 999;

    await client.query(
      `INSERT INTO blessing_templates (content, category, tags, sort_order, is_active, remark)
       VALUES ($1, $2, $3, $4, true, '祝福.csv 导入')`,
      [content, category, tags, sortOrder]
    );
    inserted++;
  }

  console.log(`3️⃣ 导入完成: 新增 ${inserted} 条 | 跳过 ${skipped} 条\n`);

  // 4. 校验
  const check = await client.query(
    `SELECT category, count(*) FROM blessing_templates WHERE is_active = true GROUP BY category ORDER BY category`
  );
  const total = await client.query(`SELECT count(*) AS n FROM blessing_templates WHERE is_active = true`);
  console.log(`4️⃣ 当前可选词库: ${total.rows[0].n} 条`);
  for (const r of check.rows) console.log(`   ${r.category}: ${r.count}`);
  const b = await client.query(`SELECT count(*) AS n FROM blessings`);
  console.log(`   祝福记录: ${b.rows[0].n} 条（已清空，等真实活动数据）`);

  await client.end();
}

main().catch((e) => { console.error('❌ 导入失败:', e.message); process.exit(1); });
