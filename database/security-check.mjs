// ============================================================
// 数据库安全回归测试 — RLS / RPC 权限断言
// 用法: npm run test:security
// 通过 REST API 用 anon key 验证最小权限矩阵
// ============================================================

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('❌ 需要环境变量: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const anon = createClient(URL, ANON);
const admin = createClient(URL, SERVICE);

let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${detail}`);
  }
}

const marker = `sec-check-${Date.now()}`;

// ── 断言表 ──
async function run() {
  console.log('═══ 数据库安全回归测试 ═══\n');

  // 1. anon 只能看到 approved
  const q1 = await anon.from('blessings').select('id').eq('status', 'pending').limit(1);
  check('anon 不可见 pending 祝福', (q1.data?.length || 0) === 0, q1.error?.message || '');

  // 2. anon 可以 SELECT approved
  const q2 = await anon.from('blessings').select('id').limit(1);
  check('anon 可读 approved 祝福', !q2.error, q2.error?.message || '');

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

  // 7. anon 不能执行 increment_likes
  const q7 = await anon.rpc('increment_likes', {
    blessing_id: '00000000-0000-0000-0000-000000000000',
    client_ip: marker,
  });
  check('anon 不能执行 increment_likes', !!q7.error);

  // 8. anon 不能执行 cleanup_rate_limits
  const q8 = await anon.rpc('cleanup_rate_limits');
  check('anon 不能执行 cleanup_rate_limits', !!q8.error);

  // 9. anon 可以执行 check_rate_limit（原子限流入口）
  const q9 = await anon.rpc('check_rate_limit', {
    client_ip: marker,
    action_name: 'sec_check',
    max_requests: 3,
    window_minutes: 10,
  });
  check('anon 可执行 check_rate_limit', !q9.error && q9.data !== null);

  // 10. 触发器：插入 approved+高赞 被强制为 pending+0
  const ins = await anon.from('blessings').insert([{ content: marker, status: 'approved', likes: 99999 }]);
  check('anon 可 INSERT blessings', !ins.error);
  if (!ins.error) {
    const row = await admin
      .from('blessings')
      .select('status,likes,id')
      .eq('content', marker)
      .single();
    check('触发器强制 pending + likes=0', row.data?.status === 'pending' && row.data?.likes === 0,
      `实际 ${row.data?.status}/${row.data?.likes}`);
    if (row.data?.id) await admin.from('blessings').delete().eq('id', row.data.id);
  }

  // 11. anon 可读教师列表
  const q11 = await anon.from('teachers').select('id').limit(1);
  check('anon 可读 teachers', !q11.error);

  // 12. anon 可读 avatars Storage
  const q12 = await anon.storage.from('avatars').list();
  check('anon 可读 avatars 存储桶', !q12.error);

  // 13. anon 不能写 avatars Storage
  const q13 = await anon.storage.from('avatars').upload(`sec-check-${marker}.txt`, new Blob(['x']));
  check('anon 不能写 avatars Storage', !!q13.error);

  console.log(`\n═══ 结果: ${pass} 通过 / ${fail} 失败 ═══`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('执行异常:', e.message);
  process.exit(1);
});
