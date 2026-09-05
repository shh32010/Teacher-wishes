// ============================================================
// 残留测试数据清理（用户拍板 2026-09-05，活动上线前）
// 1. ai_generations：清空（测试分类/金句/总结产物）
// 2. gifts.usage_count：归零（blessings 已清，历史累加计数失效）
// rate_limits/events/blessing_likes/storage 已确认空，无需处理
// ⚠️ 不可逆
// ============================================================
import { readFileSync } from 'fs';
import pg from 'pg';
const env = {};
for (const line of readFileSync('.env.local','utf-8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0 && !line.trim().startsWith('#')) env[line.slice(0,i).trim()] = line.slice(i+1).trim();
}
const c = new pg.Client({ host: env.SUPABASE_POOLER_IP || '54.64.190.72', port: 6543,
  user: `postgres.${env.SUPABASE_PROJECT_REF || 'ldykmebzzvszuxpuxqkt'}`, password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres' });
await c.connect();
const a = await c.query('DELETE FROM ai_generations');
console.log(`✅ ai_generations 已清空: ${a.rowCount} 条`);
const g = await c.query('UPDATE gifts SET usage_count = 0');
console.log(`✅ gifts.usage_count 已归零: ${g.rowCount} 种礼物`);
await c.end();
