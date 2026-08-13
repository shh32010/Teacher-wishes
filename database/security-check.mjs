// ============================================================
// 数据库安全回归测试 — RLS / RPC 权限断言
// 用法: npm run test:security
// 通过 REST API 用 anon key 验证最小权限矩阵
// 保证: 测试不污染生产数据（try/finally 清理 + 唯一 marker）
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error(
    '❌ 需要环境变量: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const anon = createClient(URL, ANON);
const admin = createClient(URL, SERVICE);

// 唯一 marker：测试数据隔离，清理时精确删除
const marker = `sec-check-${Date.now()}-${randomBytes(4).toString('hex')}`;

let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
    if (detail) console.log(`     detail: ${detail}`);
  }
}

// 记录测试过程中产生的数据 id，finally 统一清理
const createdBlessingIds = [];

// ── 断言 ──
async function runAssertions() {
  console.log('═══ 数据库安全回归测试 ═══\n');

  // 1. anon 只能看到 approved
  const q1 = await anon.from('blessings').select('id').eq('status', 'pending').limit(1);
  check('anon 不可见 pending 祝福', !q1.error && (q1.data?.length || 0) === 0, q1.error?.message);

  // 2. anon 可以 SELECT approved
  const q2 = await anon.from('blessings').select('id').limit(1);
  check('anon 可读 approved 祝福', !q2.error, q2.error?.message);

  // 3. anon 不能 UPDATE blessings
  await anon.from('blessings').update({ likes: 888888 }).eq('status', 'approved');
  const q3 = await admin.from('blessings').select('id').eq('likes', 888888).limit(1);
  check('anon 不能 UPDATE blessings', (q3.data?.length || 0) === 0);

  // 4. anon 不能 SELECT rate_limits（RLS 无策略 → 空数组而非报错）
  const q4 = await anon.from('rate_limits').select('id').limit(1);
  check('anon 不能读 rate_limits', !q4.error && (q4.data?.length || 0) === 0);

  // 5. anon 不能 INSERT rate_limits
  const q5 = await anon.from('rate_limits').insert([{ ip: marker, action: marker }]).select();
  check('anon 不能 INSERT rate_limits', !!q5.error);

  // 6. anon 不能 INSERT blessing_likes
  const q6 = await anon
    .from('blessing_likes')
    .insert([{ blessing_id: '00000000-0000-0000-0000-000000000000', ip_address: marker }])
    .select();
  check('anon 不能 INSERT blessing_likes', !!q6.error);

  // 7. anon 不能 SELECT blessing_likes（RLS 无策略 → 空数组）
  const q7 = await anon.from('blessing_likes').select('id').limit(1);
  check('anon 不能读 blessing_likes', !q7.error && (q7.data?.length || 0) === 0);

  // 8. anon 不能执行 increment_likes
  const q8 = await anon.rpc('increment_likes', {
    blessing_id: '00000000-0000-0000-0000-000000000000',
    client_ip: marker,
  });
  check('anon 不能执行 increment_likes', !!q8.error);

  // 9. anon 不能执行 cleanup_rate_limits
  const q9 = await anon.rpc('cleanup_rate_limits');
  check('anon 不能执行 cleanup_rate_limits', !!q9.error);

  // 10. anon 可以执行 check_rate_limit（原子限流入口，会产生测试记录，finally 清理）
  const q10 = await anon.rpc('check_rate_limit', {
    client_ip: marker,
    action_name: 'sec_check',
    max_requests: 3,
    window_minutes: 10,
  });
  check('anon 可执行 check_rate_limit', !q10.error && q10.data !== null, q10.error?.message);

  // 11. 触发器：插入 approved+高赞 被强制为 pending+0
  const ins = await anon.from('blessings').insert([{ content: marker, status: 'approved', likes: 99999 }]);
  check('anon 可 INSERT blessings', !ins.error, ins.error?.message);
  if (!ins.error) {
    const row = await admin
      .from('blessings')
      .select('status,likes,id')
      .eq('content', marker)
      .single();
    check(
      '触发器强制 pending + likes=0',
      row.data?.status === 'pending' && row.data?.likes === 0,
      `实际 ${row.data?.status}/${row.data?.likes}`
    );
    if (row.data?.id) createdBlessingIds.push(row.data.id);
  }

  // 12. anon 可读教师列表
  const q12 = await anon.from('teachers').select('id').limit(1);
  check('anon 可读 teachers', !q12.error, q12.error?.message);

  // 13. anon 不能 UPDATE teachers（读取原始值 → 尝试修改 → 验证未变）
  const t0 = await admin.from('teachers').select('id,name').limit(1).single();
  if (t0.data) {
    const originalName = t0.data.name;
    await anon.from('teachers').update({ name: `${marker}-hacked` }).eq('id', t0.data.id);
    const t1 = await admin.from('teachers').select('name').eq('id', t0.data.id).single();
    check(
      'anon 不能 UPDATE teachers',
      t1.data?.name === originalName,
      `原始 ${originalName} → 现在 ${t1.data?.name}`
    );
  } else {
    check('anon 不能 UPDATE teachers', false, '无法获取测试教师: ' + t0.error?.message);
  }

  // 14. anon 可读 avatars Storage
  const q14 = await anon.storage.from('avatars').list();
  check('anon 可读 avatars 存储桶', !q14.error, q14.error?.message);

  // 15. anon 不能写 avatars Storage
  const q15 = await anon.storage
    .from('avatars')
    .upload(`sec-check-${marker}.txt`, new Blob(['x']));
  check('anon 不能写 avatars Storage', !!q15.error);
}

// ── 清理：无论成功失败都执行 ──
async function cleanup() {
  try {
    if (createdBlessingIds.length > 0) {
      await admin.from('blessings').delete().in('id', createdBlessingIds);
    }
    // 清理 check_rate_limit 产生的限流记录
    await admin.from('rate_limits').delete().eq('ip', marker);
    // 兜底：按内容 marker 清理任何残留测试祝福
    await admin.from('blessings').delete().eq('content', marker);
  } catch (e) {
    console.error('  ⚠️ 清理异常:', e.message);
  }
}

async function main() {
  try {
    await runAssertions();
  } catch (e) {
    fail++;
    console.error('  ❌ 执行异常');
    console.error('     detail:', e.message);
  } finally {
    await cleanup();
  }

  console.log(`\n═══ 结果: ${pass} 通过 / ${fail} 失败 ═══`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
