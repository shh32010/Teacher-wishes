// ============================================================
// 给无礼物的祝福 AI 语义匹配礼物并回填 gift_id（一次性运营脚本）
// 用法: SUPABASE_DB_PASSWORD=xxx SUPABASE_POOLER_IP=54.64.190.72 AI_API_KEY=sk-xxx node database/assign-gifts.mjs
// 按去重内容匹配（同 content 分配同一礼物），91 句 ≈ 1 次 LLM 调用
// ============================================================

import pg from 'pg';

const password = process.env.SUPABASE_DB_PASSWORD;
const poolerIp = process.env.SUPABASE_POOLER_IP;
const apiKey = process.env.AI_API_KEY;

if (!password || !poolerIp || !apiKey) {
  console.error('❌ 需要环境变量: SUPABASE_DB_PASSWORD / SUPABASE_POOLER_IP / AI_API_KEY');
  process.exit(1);
}

/** 8 种礼物语义说明（与 gifts 表一致） */
const GIFTS = [
  { id: 'rose', name: '鲜花', desc: '感谢老师的辛勤付出' },
  { id: 'star', name: '星星', desc: '感恩老师的指引之光' },
  { id: 'book', name: '书本', desc: '感谢老师的谆谆教诲' },
  { id: 'chalk', name: '粉笔', desc: '致敬三尺讲台的坚守' },
  { id: 'coffee', name: '咖啡', desc: '愿老师忙碌中有片刻温暖' },
  { id: 'letter', name: '信件', desc: '一封写给老师的心意' },
  { id: 'apple', name: '苹果', desc: '一份朴素的敬意' },
  { id: 'sapling', name: '小树', desc: '感谢老师的浇灌与陪伴' },
];

function extractJson(raw) {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  else {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }
  text = text.replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(text);
}

async function main() {
  const client = new pg.Client({
    host: poolerIp,
    port: 6543,
    user: `postgres.${process.env.SUPABASE_PROJECT_REF || 'ldykmebzzvszuxpuxqkt'}`,
    password,
    database: 'postgres',
  });
  await client.connect();

  // 1. 无礼物的去重内容
  const { rows } = await client.query(
    "SELECT DISTINCT content FROM blessings WHERE status='approved' AND gift_id IS NULL"
  );
  if (rows.length === 0) {
    console.log('✅ 没有无礼物的祝福');
    process.exit(0);
  }
  console.log(`📦 无礼物的去重祝福 ${rows.length} 句，请求 DeepSeek 语义匹配...`);

  // 2. DeepSeek 匹配
  const giftDesc = GIFTS.map((g) => `${g.id} ${g.name}（${g.desc}）`).join('；');
  const contents = rows.map((r, i) => `${i}. ${r.content}`).join('\n');
  const prompt = [
    '你是教师节礼物的语义匹配助手。为下列每句祝福从 8 种礼物中选择**最合适的一种**：',
    giftDesc,
    '只输出 JSON，格式：{"results":[{"index":0,"gift_id":"rose"}]}',
    '祝福语列表：',
    contents,
  ].join('\n');

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是礼物匹配助手，只输出 JSON。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    console.error('❌ DeepSeek 调用失败:', res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const data = await res.json();
  const parsed = extractJson(data.choices[0].message.content);
  const results = parsed.results || [];
  console.log(`AI 返回 ${results.length} 条匹配`);

  // 3. 回填（content → gift_id 映射，同内容同礼物）
  const validGiftIds = new Set(GIFTS.map((g) => g.id));
  let updated = 0;
  for (const item of results) {
    const row = rows[Number(item.index)];
    const giftId = validGiftIds.has(item.gift_id) ? item.gift_id : 'rose';
    if (!row) continue;
    const upd = await client.query(
      "UPDATE blessings SET gift_id = $1 WHERE status='approved' AND gift_id IS NULL AND content = $2",
      [giftId, row.content]
    );
    updated += upd.rowCount;
  }
  console.log(`✅ 回填完成：${updated} 条祝福获得礼物`);
  await client.end();
}

main().catch((e) => {
  console.error('❌ 执行失败:', e.message);
  process.exit(1);
});
