# 🚀 运维与部署指南

> 本文档描述教师节祝福平台的部署、监控、备份和应急处理流程。

---

## 部署架构

```
GitHub (源代码)
    ↓ Git Push
Vercel (自动构建)
    ├── Edge CDN (全球 100+ 节点)
    ├── Serverless Functions (API Routes)
    └── ISR Cache (教师页)

Supabase (数据库/认证/存储)
    ├── PostgreSQL (us-east-1)
    ├── Realtime (WebSocket)
    └── Storage (S3 兼容)

Cloudflare (DNS 代理)
    └── teacher.shh32010.dpdns.org
```

---

## 环境变量配置

### 必填变量

| 变量 | 说明 | 配置位置 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | Vercel + 本地 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Vercel + 本地 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key（仅服务端） | Vercel + 本地 |
| `ADMIN_PASSWORD` | 管理员登录密码 | Vercel + 本地 |
| `ADMIN_TOKEN_SECRET` | admin_token 签名密钥（生产强制） | Vercel |

### 生产必填（人机验证）

| 变量 | 说明 | 配置位置 |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile 站点 key | Vercel + 本地 |
| `TURNSTILE_SECRET_KEY` | Turnstile 密钥 | Vercel + 本地 |

> ⚠️ **生产环境必须配置 Turnstile**，否则 `POST /api/blessings` 将返回 503（fail-closed）。开发环境可不配置。

### 可选变量

| 变量 | 说明 | 配置位置 |
| :--- | :--- | :--- |
| `CRON_SECRET` | Cron 任务鉴权密钥 | Vercel |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN（前端） | Vercel |
| `SENTRY_DSN` | Sentry DSN（服务端） | Vercel |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry 组织/项目 | Vercel |

### 配置步骤

1. **Vercel Dashboard** → Settings → Environment Variables
2. **本地开发**：复制 `.env.local.example` 为 `.env.local` 并填写
3. **验证**：运行 `node -e "console.log(process.env.ADMIN_TOKEN_SECRET)"` 确认

---

## 数据库迁移

### 迁移文件

按编号顺序执行 `database/migrations/*.sql`：

```
001_schema.sql           — 基础表 + RLS + Realtime
002_likes_rpc.sql        — 点赞 RPC 函数
003_rate_limit.sql       — 限流 RPC 函数
004_likes_unique.sql     — 点赞唯一约束
005_storage_avatars.sql  — 头像存储桶策略
006_security_hardening.sql — 安全加固
007_storage_policies.sql — Storage 策略收紧
008_review_fixes.sql     — 审核绕过修复
009_rate_limit_cleanup.sql — 权限最小化
010_fix_events_rls.sql   — events 表 RLS 修复
011_v2_gift_and_templates.sql — v2.0 词库/礼物/ai_generations + blessings ALTER + RLS
012_seed_templates.sql   — v2.0 测试词库 60 条（甲方素材到位后 CSV 覆盖导入）
013_enable_v2_strict.sql — v2.0 严格触发器（⚠️ 须与 v2 前端同步上线后执行）
014_templates_remark.sql — 词库备注列
015_sentence_stats_rpc.sql — 同句计数 RPC（数据库聚合）
016_activity_settings.sql — 活动设置表（时间窗/开关）
017_dedup_metadata.sql — AI 去重元数据（分组/原因/覆盖标记）
```

### ⚠️ 上线顺序（硬性步骤，严禁打乱）

013 启用后数据库层会拒绝一切「无 template_id / content 非官方模板」的 INSERT——**旧版前端会当场无法提交**。因此：

```
① 执行 001~012（基础迁移，可提前完成）
② 部署 v2.0 前端/API 到 Vercel
③ 确认生产站点运行的是 v2 代码（访问 /gift 应返回 200 且可走通送礼）
④ 执行 013（严格触发器 + usage_count 计数 + ai_generations 最小公开策略）
⑤ 直连安全回归（见下方「013 执行后回归」）
⑥ 再开放活动入口
```

**严禁**：先执行 013 再部署前端；或把 013 混入 001~012 让甲方机械顺序执行。

### 013 执行后回归（数据库层契约验证）

013 生效后，用 anon key 直连 PostgREST 验证以下操作**全部被拒绝**：

| 攻击尝试 | 预期结果 |
| :--- | :--- |
| INSERT 无 template_id | 触发器拒绝 |
| INSERT 合法 template_id + 篡改 content | 触发器拒绝（content ≠ 官方原文） |
| INSERT 停用模板的 template_id | 触发器拒绝（查不到启用模板） |
| INSERT 非法 gift_id | 外键拒绝 |
| INSERT teacher_id 非 null | 触发器拒绝（content 校验不通过） |
| INSERT status=approved / likes=99999 | 被安全默认值触发器强制为 pending/0 |

### 执行方式

**方式 A（推荐，脚本化）**：`database/run-migration.mjs`

```bash
# 需要 .env.local 中配置 SUPABASE_DB_PASSWORD；网络受限时指定 pooler 真实 IP
SUPABASE_DB_PASSWORD=xxx node database/run-migration.mjs database/migrations/013_enable_v2_strict.sql
# 本机 DNS 污染时（pooler 域名解析异常），经 DoH 取区域真实 IP 后：
SUPABASE_DB_PASSWORD=xxx SUPABASE_POOLER_IP=54.64.190.72 node database/run-migration.mjs <文件>
```

**方式 B**：Supabase Dashboard → SQL Editor 按顺序粘贴执行。

3. 验证：运行 `node database/security-check.mjs`（21 项断言）

### 注意事项

- **必须全部执行**：006-009 包含关键安全加固
- **顺序重要**：后续文件依赖前面的表结构
- **不可回滚**：执行前备份数据（Supabase 自动备份）

---

## 部署流程

### 自动部署（推荐）

```bash
# 1. 本地验证
npm run lint
npm run typecheck
npm run test:run
npm run build

# 2. 提交推送
git add .
git commit -m "feat: 新功能"
git push origin master

# 3. Vercel 自动构建部署
# CI 流水线：lint → typecheck → test → build
```

### 手动部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署到生产
vercel --prod
```

### 部署后验证

1. 访问 https://teacher.shh32010.dpdns.org
2. 检查首页加载正常
3. 测试提交祝福功能
4. 测试管理后台登录
5. 查看 Vercel Analytics 确认无错误

---

## 数据生命周期

### 运行期间

| 数据 | 保留策略 |
| :--- | :--- |
| `rate_limits` | 仅活动期间防刷；RPC 概率清理 + 每日 Cron 清理 24 小时前记录 |
| `blessing_likes` | 仅活动期间防同 IP 重复点赞（存 `ip_address`） |
| `blessings` / 词库 / 礼物 / `ai_generations` | 长期保留（活动数据，不含个人 IP） |

### 活动结束后（2026-09-10 之后）

执行 `database/cleanup-after-event.sql`（Supabase SQL Editor）：

1. **`rate_limits` 全部删除** — 防刷记录无保留价值
2. **`blessing_likes` 清空** — 点赞总数已固化在 `blessings.likes` 冗余列，不影响展示；IP 一并清除
3. 祝福/词库/AI 产物保留；昵称匿名化为可选（脚本内有说明，默认不执行）

> 🔒 原则：**IP 不因「方便以后统计」永久保存**。所有含 IP 的表（`rate_limits`、`blessing_likes`）活动结束后必须清空。

---

## Cron 任务

### 清理限流记录

- **频率**：每日 04:00 UTC
- **端点**：`/api/cron/cleanup`
- **鉴权**：`CRON_SECRET` 环境变量
- **功能**：清理 24 小时前的 rate_limits 记录

### 配置方式

Vercel Dashboard → Settings → Cron Jobs

```
Schedule: 0 4 * * *
Path: /api/cron/cleanup
```

### fail-closed 机制

- 生产环境 `CRON_SECRET` 缺失 → 500 拒绝
- 开发环境可跳过鉴权

---

## 监控与告警

### 监控矩阵

| 层级 | 工具 | 指标 |
| :--- | :--- | :--- |
| 页面性能 | Vercel Analytics | Web Vitals (LCP/CLS/INP), PV/UV |
| 错误追踪 | Sentry | 客户端/服务端/Edge 异常 |
| API 延迟 | Supabase Dashboard | 查询耗时、慢查询日志 |
| 实时连接 | Supabase Dashboard | Realtime 并发连接数 |
| 带宽 | Vercel + Supabase Dashboard | 月度流量消耗 |

### 告警阈值

| 指标 | 阈值 | 通道 |
| :--- | :--- | :--- |
| API 错误率 > 1% | Sentry Alert | Email |
| Realtime 连接 > 150 | Supabase Dashboard | 手动检查 |
| p95 延迟 > 1000ms | k6 负载测试 | CI 输出 |
| 带宽 > 80% 配额 | Vercel Dashboard | 手动检查 |

### 查看日志

```bash
# Vercel 函数日志
vercel logs teacher.shh32010.dpdns.org

# Supabase 日志
# Dashboard → Logs → Postgres/Auth/Realtime

# Sentry 错误
# Dashboard → Issues
```

---

## 数据库备份

### 自动备份

备份策略以当前 Supabase Dashboard 中实际套餐能力为准。上线前必须确认：
- 自动备份已开启
- 最近一次备份时间
- 恢复方式
- PITR（Point-in-Time Recovery）是否可用

### 手动备份

```bash
# 使用 pg_dump（需要连接字符串）
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" > backup.sql

# 或通过 Supabase Dashboard
# Database → Backups → Create Backup
```

### 恢复

```bash
# 从备份恢复
psql "postgresql://..." < backup.sql

# 或通过 Supabase Dashboard
# Database → Backups → Restore
```

---

## 故障处理

### 常见问题

#### 1. 管理后台无法登录

**症状**：登录后仍被重定向到登录页

**排查**：
1. 检查 `ADMIN_PASSWORD` 环境变量是否设置
2. 检查 `ADMIN_TOKEN_SECRET` 是否设置（生产环境必须）
3. 查看浏览器 Cookie 是否有 `admin_token`
4. 查看 Vercel 函数日志是否有错误

**修复**：
```bash
# 重新设置环境变量
vercel env add ADMIN_TOKEN_SECRET
vercel env add ADMIN_PASSWORD

# 重新部署
vercel --prod
```

#### 2. CSRF 验证失败

**症状**：POST 请求返回 403

**排查**：
1. 检查浏览器 Cookie 是否有 `csrf_token`
2. 检查请求头是否携带 `X-CSRF-Token`
3. 确认两者值一致

**修复**：
```typescript
// 前端确保先获取 CSRF token
const headers = await getCsrfHeaders();
fetch('/api/...', {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
});
```

#### 3. 速率限制触发

**症状**：请求返回 429

**排查**：
1. 检查 `rate_limits` 表中的记录
2. 确认 IP 是否正确（Vercel 可信代理）

**修复**：
```sql
-- 清理特定 IP 的限流记录
DELETE FROM rate_limits
WHERE ip = 'x.x.x.x'
AND created_at > NOW() - INTERVAL '1 hour';
```

#### 4. Realtime 连接失败

**症状**：祝福墙不实时更新

**排查**：
1. 检查 Supabase Realtime 连接数（Dashboard → Realtime）
2. 检查浏览器 WebSocket 连接
3. 确认 RLS 策略允许 SELECT

**修复**：
- Free 方案限制 200 并发连接
- 升级到 Pro 方案可获得 500 连接

#### 5. 构建失败

**症状**：Vercel 部署失败

**排查**：
```bash
# 本地复现
npm run build

# 检查类型错误
npm run typecheck

# 检查 ESLint
npm run lint
```

**修复**：
- 修复类型错误
- 修复 ESLint 警告
- 确保所有依赖已安装

---

## 回滚策略

### 快速回滚

```bash
# 1. Vercel 回滚到上一版本
vercel rollback

# 或通过 Dashboard
# Deployments → 找到上一个成功的部署 → Promote to Production
```

### 数据库回滚

- **Supabase Pro**：使用 PITR（Point-in-Time Recovery）
- **Supabase Free**：从备份恢复（可能丢失最近数据）

### 回滚检查清单

1. [ ] 确认回滚版本可用
2. [ ] 通知团队/用户
3. [ ] 执行回滚
4. [ ] 验证功能正常
5. [ ] 检查日志无错误
6. [ ] 更新 PROGRESS.md 状态

---

## 活动前检查

### 教师节活动前（1-2 天）

1. **容量评估**
   - 检查 Supabase Realtime 连接数限制
   - 评估预期用户量
   - 考虑临时升级到 Pro

2. **性能测试**
   ```bash
   # 运行负载测试
   npm run test:load
   npm run test:stress
   ```

3. **安全检查**
   ```bash
   # 运行安全回归测试
   node database/security-check.mjs
   ```

4. **功能验证**
   - 测试送礼流程（/gift：选情绪 → 选祝福 → 选礼物 → 送出）
   - 测试点赞功能（祝福墙同句聚合卡片）
   - 测试管理后台（词库 / 礼物 / AI 中心）
   - 验证今日金句与情绪洞察展示

5. **监控配置**
   - 确认 Sentry 告警正常
   - 确认 Vercel Analytics 在线
   - 准备应急联系方式

---

## 活动后清理

### 数据清理

```sql
-- 清理测试数据（可选）
DELETE FROM blessings
WHERE content LIKE '%测试%'
OR nickname LIKE '%test%';

-- 清理过期限流记录
SELECT cleanup_rate_limits();
```

### 容量降级

- 如果临时升级了 Supabase Pro，活动后可降回 Free
- 注意：降级前确保 Realtime 连接数在 Free 限制内

### 数据导出

```sql
-- 导出祝福数据（可选）
COPY (
  SELECT b.content, b.nickname, b.class, t.name as teacher_name, b.created_at
  FROM blessings b
  LEFT JOIN teachers t ON b.teacher_id = t.id
  WHERE b.status = 'approved'
  ORDER BY b.created_at DESC
) TO '/tmp/blessings.csv' WITH CSV HEADER;
```

---

## 压力测试

### 测试类型

| 测试 | 命令 | 用途 |
| :--- | :--- | :--- |
| 冒烟测试 | `npm run test:smoke` | 部署后快速验证 |
| 负载测试 | `npm run test:load` | 模拟正常流量 |
| 压力测试 | `npm run test:stress` | 找到性能拐点 |

### 测试结果解读

| 指标 | 优秀 | 需关注 | 说明 |
| :--- | :--- | :--- | :--- |
| p95 延迟 | < 500ms | > 1s | 95%请求的响应时间 |
| 错误率 | < 0.1% | > 1% | 失败请求比例 |
| Realtime 连接 | < 150 | > 180 | 接近 200 上限 |

### 生产环境测试

```bash
# ⚠️ 谨慎！会产生真实流量
k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/load.js

# 建议在低峰期进行
# 提前通知团队/用户
```

---

## 文档更新

修改以下内容时，同步更新对应文档：

| 修改内容 | 更新文档 |
| :--- | :--- |
| API 端点变更 | `docs/API.md` |
| 安全策略变更 | `docs/SECURITY.md` |
| 架构变更 | `docs/ARCHITECTURE.md` |
| 部署流程变更 | `docs/OPERATIONS.md`（本文件） |
| 环境变量变更 | `CLAUDE.md` + `README.md` |
| 版本发布 | `CHANGELOG.md` + `PROGRESS.md` |
