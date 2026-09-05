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
const r = await c.query('SELECT id, name, department, created_at FROM teachers ORDER BY created_at');
console.log('teachers 共', r.rows.length, '条:');
for (const x of r.rows) console.log(`  ${x.name} | ${x.department || '无部门'} | ${new Date(x.created_at).toISOString().slice(0,10)}`);
const refs = await c.query('SELECT count(*) AS n FROM blessings WHERE teacher_id IS NOT NULL');
console.log('blessings 引用 teacher_id:', refs.rows[0].n);
await c.end();
