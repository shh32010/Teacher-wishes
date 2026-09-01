// ============================================================
// 词库相似句 AI 去重 — 识别语义重复的祝福句，保留最优、停用其余
// 用法: SUPABASE_DB_PASSWORD=xxx SUPABASE_POOLER_IP=54.64.190.72 AI_API_KEY=sk-xxx node database/dedup-templates.mjs
// 停用可逆：被停用的句子后台可随时重新启用
// ============================================================

import pg from 'pg';

const password = process.env.SUPABASE_DB_PASSWORD;
const poolerIp = process.env.SUPABASE_POOLER_IP;
const apiKey = process.env.AI_API_KEY;

if (!password || !poolerIp || !apiKey) {
  console.error('❌ 需要环境变量: SUPABASE_DB_PASSWORD / SUPABASE_POOLER_IP / AI_API_KEY');
  process.exit(1);
}

/** 宽松提取 LLM 返回的 JSON（容忍代码块/前后缀） */
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

const DEDUP_PROMPT = [
  '你是教师节祝福语词库的去重助手。以下祝福语中，有些是同一句话的变体（语义几乎相同，只是个别字词不同或尾部增减）。',
  '请找出所有「语义重复组」：每组包含 2 条及以上语义相同的句子。',
  '只输出 JSON，格式：{"groups":[{"keep":"保留的最优句子原文","remove":["应停用的句子原文"]}]}',
  '规则：',
  '1. 保留组内措辞最完整、最通用、最有感染力的一条',
  '2. 仅合并「语义几乎相同」的句子；主题相近但表达不同（如都提到辛苦/桃李）不算重复',
  '3. 没有重复组时输出 {"groups":[]}',
].join('\n');

async function main() {
  // 1. 取全部词库
  const client = new pg.Client({
    host: poolerIp,
    port: 6543,
    user: `postgres.${process.env.SUPABASE_PROJECT_REF || 'ldykmebzzvszuxpuxqkt'}`,
    password,
    database: 'postgres',
  });
  await client.connect();

  const { rows } = await client.query(
    'SELECT id, content, is_active FROM blessing_templates ORDER BY id'
  );
  console.log(`📚 词库共 ${rows.length} 条，发送 DeepSeek 去重分析...`);

  // 2. 调 DeepSeek
  const contents = rows.map((r, i) => `${i + 1}. ${r.content}`).join('\n');
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是词库去重助手，只输出 JSON。' },
        { role: 'user', content: `${DEDUP_PROMPT}\n\n祝福语列表：\n${contents}` },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    console.error('❌ DeepSeek 调用失败:', res.status, (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const data = await res.json();
  const parsed = extractJson(data.choices[0].message.content);
  const groups = parsed.groups || [];

  console.log(`\n发现 ${groups.length} 组语义重复：\n`);

  // 3. 执行停用（软隐藏 + 完整去重元数据；管理员已覆盖的句子跳过）
  let removedCount = 0;
  let groupIdx = 0;
  for (const g of groups) {
    groupIdx++;
    const groupId = `grp_${String(groupIdx).padStart(3, '0')}`;
    const keep = g.keep;
    const removes = Array.isArray(g.remove) ? g.remove : [];
    console.log(`  ⭐ 保留（${groupId}）: ${keep}`);
    // 保留句标记组 id
    const keepRow = rows.find((row) => row.content === keep);
    if (keepRow) {
      await client.query(
        'UPDATE blessing_templates SET dedup_group_id = $1 WHERE id = $2',
        [groupId, keepRow.id]
      );
    }
    for (const r of removes) {
      const target = rows.find((row) => row.content === r);
      if (!target) {
        console.log(`     ⚠️ 未在词库中找到（跳过）: ${r.slice(0, 30)}...`);
        continue;
      }
      // 管理员已覆盖的句子不再隐藏
      const { rows: overrideRows } = await client.query(
        'SELECT dedup_override FROM blessing_templates WHERE id = $1',
        [target.id]
      );
      if (overrideRows[0]?.dedup_override) {
        console.log(`     ↩️ 管理员已恢复（跳过）: ${r.slice(0, 30)}...`);
        continue;
      }
      await client.query(
        `UPDATE blessing_templates
         SET is_active = false, dedup_group_id = $1, dedup_reason = 'semantic_duplicate', dedup_by = 'ai'
         WHERE id = $2`,
        [groupId, target.id]
      );
      removedCount++;
      console.log(`     🔗 隐藏变体: ${r.slice(0, 40)}${r.length > 40 ? '...' : ''}`);
    }
  }

  console.log(`\n✅ 去重完成：${groups.length} 组、停用 ${removedCount} 条（后台可随时重新启用）`);
  await client.end();
}

main().catch((e) => {
  console.error('❌ 执行失败:', e.message);
  process.exit(1);
});
