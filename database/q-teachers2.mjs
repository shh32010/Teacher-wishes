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
const r = await c.query(`SELECT t.id, t.name, count(b.id) AS refs
  FROM teachers t LEFT JOIN blessings b ON b.teacher_id = t.id
  GROUP BY t.id, t.name ORDER BY refs DESC`);
for (const x of r.rows) console.log(`${x.name.padEnd(8)} 被引用 ${x.refs} 条`);
await c.end();
