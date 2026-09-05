// ============================================================
// 教师数据替换：虚构测试名 → 甲方提供的 41 个真实姓氏
// 18 行全部被历史祝福引用（外键）→ 只 UPDATE 名 + INSERT 补齐，
// 不删除任何行，历史引用完好
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

// 旧虚构全名 → 真实姓氏（保留「王老师/李老师/张老师」三行原名，已在真实姓氏内）
const RENAME = {
  '王建国': '盛老师', '李秀琴': '林老师', '张明远': '卢老师',
  '刘淑华': '陈老师', '陈大伟': '丁老师', '赵丽萍': '杜老师',
  '孙志强': '高老师', '周雅文': '顾老师', '吴启明': '郭老师',
  '黄婉秋': '何老师', '马俊峰': '姜老师', '林洁仪': '蒋老师',
  '杨恒': '刘老师', '沈桂芳': '陆老师', '郑伟强': '马老师',
};
for (const [old, neu] of Object.entries(RENAME)) {
  await c.query('UPDATE teachers SET name=$1, department=$2 WHERE name=$3', [neu, '信息工程学院', old]);
  console.log(`  ${old} → ${neu}`);
}
// 保留的原「王老师/李老师/张老师」行：部门统一
await c.query(`UPDATE teachers SET department='信息工程学院' WHERE department <> '信息工程学院'`);
console.log('  部门已统一为信息工程学院');

// 补插剩余 23 个姓氏（41 - 已占用 18）
const INSERT = ['梅','缪','穆','钱','沈','施','唐','田','汪','吴','肖','谢','徐','薛','袁','曾','赵','钟','周','朱','秦','夏','鞠'];
for (const s of INSERT) {
  await c.query('INSERT INTO teachers (name, department) VALUES ($1, $2)', [`${s}老师`, '信息工程学院']);
}
console.log(`  补插 ${INSERT.length} 行: ${INSERT.map(s=>s+'老师').join('、')}`);

const check = await c.query('SELECT name FROM teachers ORDER BY name');
console.log(`\n✅ 完成：teachers 共 ${check.rows.length} 行`);
console.log('  ' + check.rows.map(r => r.name).join(' '));
const refs = await c.query('SELECT count(*) AS n FROM blessings WHERE teacher_id IS NOT NULL');
console.log(`历史祝福引用 teacher_id 仍为 ${refs.rows[0].n} 条（完好）`);
await c.end();
