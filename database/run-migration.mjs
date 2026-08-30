// ============================================================
// 数据库迁移执行脚本（v2.0）
// 用法: node database/run-migration.mjs <migration-file.sql> [--force]
// - 读取 .env.local 的 SUPABASE_DB_PASSWORD（绝不打印）
// - 支持直连 (5432) 与事务池 (6543) 自动回退
// - SQL 智能拆分（跳过字符串/注释/$$ 块内的分号），逐条执行
// ============================================================

import { readFileSync } from 'fs';
import { resolve } from 'path';
import http from 'http';
import net from 'net';
import pg from 'pg';

const FORCE = process.argv.includes('--force');
const fileArg = process.argv.find((a) => a.endsWith('.sql'));
if (!fileArg) {
  console.error('❌ 用法: node database/run-migration.mjs <migration-file.sql> [--force]');
  process.exit(1);
}

// ── 1. 解析 .env.local（只读 KEY=VALUE，不输出任何值） ──
function loadEnvLocal() {
  const env = {};
  try {
    const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    }
  } catch {
    // .env.local 不存在时依赖环境变量
  }
  return env;
}

const env = loadEnvLocal();
const password = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF || '';

if (!password) {
  console.error('❌ 缺少 SUPABASE_DB_PASSWORD（.env.local 或环境变量）');
  process.exit(1);
}
if (!ref) {
  console.error('❌ 缺少 SUPABASE_PROJECT_REF（项目 ref，如 ldykmebzzvszuxpuxqkt）');
  process.exit(1);
}

// ── 2. SQL 智能拆分：跳过 '字符串' / -- 注释 / $$ 块 内的分号 ──
function splitSql(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  let inString = false;
  let inDollar = false;
  let dollarTag = '';
  let inLineComment = false;

  while (i < sql.length) {
    const ch = sql[i];

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inString) {
      current += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          inString = false;
        }
      }
      i++;
      continue;
    }
    if (inDollar) {
      current += ch;
      if (ch === '$') {
        const m = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
        if (m && m[0] === dollarTag) {
          inDollar = false;
          current += m[0].slice(1);
          i += m[0].length;
          continue;
        }
      }
      i++;
      continue;
    }

    // 非特殊状态
    if (ch === '-' && sql[i + 1] === '-') {
      inLineComment = true;
      current += '--';
      i += 2;
      continue;
    }
    if (ch === "'") {
      inString = true;
      current += ch;
      i++;
      continue;
    }
    if (ch === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        inDollar = true;
        dollarTag = m[0];
        current += m[0];
        i += m[0].length;
        continue;
      }
    }
    if (ch === ';') {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    } else {
      current += ch;
    }
    i++;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

// ── 3. 连接候选：直连（IPv6）→ 事务池全区域探测 ──
// 直连域名仅 AAAA 记录（本机 IPv6 栈可能不可用）；
// pooler 域名通配解析，需逐个区域尝试，认证通过 = 正确区域
const regions = [
  'ap-southeast-1',
  'ap-northeast-1',
  'ap-southeast-2',
  'ap-northeast-2',
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'eu-west-1',
  'ap-south-1',
  'sa-east-1',
  'ca-central-1',
];
// 优先使用显式指定的 pooler IP（本机 DNS 污染时绕过域名解析，如 52.77.146.31）
const poolerIp = process.env.SUPABASE_POOLER_IP || '';
const candidates = poolerIp
  ? [`postgresql://postgres.${ref}:${encodeURIComponent(password)}@${poolerIp}:6543/postgres`]
  : [
      `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`,
      ...regions.map(
        (r) =>
          `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${r}.pooler.supabase.com:6543/postgres`
      ),
    ];

async function run() {
  const sql = readFileSync(resolve(process.cwd(), fileArg), 'utf-8');
  const statements = splitSql(sql);
  console.log(`📄 ${fileArg} → 解析出 ${statements.length} 条语句`);

  // 012 种子文件防重复：非 force 且表内已有种子数据则跳过
  const seedMarker = '感谢您的谆谆教诲，让成长的路上充满方向。';

  // HTTP 代理 CONNECT 隧道（本机网络受限时使用，如 PROXY_URL=http://127.0.0.1:7897）
  // 关键：目标域名由代理端远程解析，绕过本机 DNS 干扰
  const proxyUrl = process.env.PROXY_URL || '';
  const proxy = proxyUrl ? new URL(proxyUrl) : null;

  /** 建立到目标 host:port 的 TCP 隧道（CONNECT 方法） */
  function openTunnel(targetHost, targetPort) {
    return new Promise((resolveTunnel, reject) => {
      const req = http.request({
        host: proxy.hostname,
        port: parseInt(proxy.port || '7897', 10),
        method: 'CONNECT',
        path: `${targetHost}:${targetPort}`,
        timeout: 10000,
      });
      req.on('connect', (res, socket) => {
        if (res.statusCode === 200) resolveTunnel(socket);
        else {
          socket.destroy();
          reject(new Error(`CONNECT ${res.statusCode} ${targetHost}:${targetPort}`));
        }
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('CONNECT 超时'));
      });
      req.end();
    });
  }

  /** 本地端口转发：127.0.0.1:随机端口 → CONNECT 隧道 → 目标（pg 连本地端口，规避 DNS） */
  function startLocalForward(targetHost, targetPort) {
    return new Promise((resolveForward, reject) => {
      const server = net.createServer((localSocket) => {
        openTunnel(targetHost, targetPort)
          .then((raw) => {
            raw.setNoDelay(true);
            localSocket.setNoDelay(true);
            localSocket.pipe(raw);
            raw.pipe(localSocket);
            localSocket.on('error', () => raw.destroy());
            raw.on('error', () => localSocket.destroy());
          })
          .catch(() => localSocket.destroy());
      });
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        resolveForward({ server, port: server.address().port });
      });
    });
  }

  /** 建立连接：有代理走本地转发，无代理直连 */
  async function connectOne(connStr) {
    const u = new URL(connStr);
    if (!proxy) {
      const c = new pg.Client({ connectionString: connStr, connectionTimeoutMillis: 5000 });
      await c.connect();
      return c;
    }
    const { server, port } = await startLocalForward(
      u.hostname,
      parseInt(u.port || '5432', 10)
    );
    const c = new pg.Client({
      host: '127.0.0.1',
      port,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.slice(1) || 'postgres',
      connectionTimeoutMillis: 5000,
    });
    // 连接结束（成功或失败）后关闭转发服务器
    c.on('end', () => server.close());
    c.on('error', () => server.close());
    await c.connect();
    return c;
  }

  let client = null;
  let lastError = null;
  for (const connStr of candidates) {
    const host = new URL(connStr).hostname;
    try {
      client = await connectOne(connStr);
      console.log(`🔌 已连接: ${host}${proxy ? `（经代理 ${proxy.hostname}:${proxy.port}）` : ''}`);
      break;
    } catch (e) {
      lastError = e;
      // 认证失败 = 区域正确但密码错误 → 立即终止（换区域无意义）
      if (/password authentication|SASL|28P01/i.test(e.message)) {
        console.error(`❌ ${host} 认证失败（区域正确，密码错误）:`, e.message);
        process.exit(1);
      }
      console.log(`  ⏭️  ${host} 失败: ${e.code || e.message}`);
      // 连接拒绝/超时 = 区域错误 → 继续尝试下一个
      try {
        await client?.end();
      } catch {
        /* 未连接 */
      }
      client = null;
    }
  }
  if (!client) {
    console.error('❌ 无法连接数据库（直连与全部区域事务池均失败）:', lastError?.message);
    process.exit(1);
  }

  try {
    let okCount = 0;
    for (let idx = 0; idx < statements.length; idx++) {
      const stmt = statements[idx];
      // 种子文件重复执行保护
      if (!FORCE && fileArg.includes('012') && stmt.includes(seedMarker)) {
        const { rows } = await client.query(
          'SELECT COUNT(*)::int AS c FROM blessing_templates WHERE content = $1',
          [seedMarker]
        );
        if (rows[0].c > 0) {
          console.log('⏭️  检测到种子数据已存在，跳过 012（如需强制重新执行加 --force）');
          break;
        }
      }
      try {
        await client.query(stmt);
        okCount++;
      } catch (e) {
        console.error(`❌ 第 ${idx + 1} 条语句执行失败:`);
        console.error(`   ${stmt.slice(0, 120)}${stmt.length > 120 ? '...' : ''}`);
        console.error(`   错误: ${e.message}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log(`✅ ${fileArg} 执行完成：${okCount}/${statements.length} 条语句成功`);
  } finally {
    await client.end();
  }
}

run();
