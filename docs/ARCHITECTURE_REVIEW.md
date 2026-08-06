# 🏗 ARCHITECTURE_REVIEW.md — 教师节祝福平台 架构审查报告

> 审查日期：2026-08-07 | 审查范围：全栈（组件/API/中间件/lib/测试/数据库） | 审查方法：逐模块深度审查

---

## 📊 总览

| 维度 | 评分 | 说明 |
|:---|:---|:---|
| 架构设计 | ⭐⭐⭐⭐⭐ | App Router + Supabase 选型合理，Server/Client 组件边界清晰 |
| 安全性 | ⭐⭐⭐⭐ | CSRF/RLS/RateLimit/Turnstile 多层防护，但有几个 P0 漏洞 |
| 代码质量 | ⭐⭐⭐⭐ | 类型覆盖好，大部分遵循最佳实践，2 个超长文件需拆分 |
| 测试覆盖 | ⭐⭐⭐ | 81 单元 + 25 E2E + k6，但缺 API/CSRF/Middleware 测试 |
| 性能 | ⭐⭐⭐⭐⭐ | CDN 缓存 + 懒加载 + 图片优化 + Realtime，策略完善 |
| 无障碍 | ⭐⭐⭐⭐ | WCAG AA 基本覆盖，emoji aria-hidden 缺失，动画未适配 |
| 文档 | ⭐⭐⭐⭐⭐ | README/ARCHITECTURE/API/CAPACITY/PROGRESS 五件套完整 |

**综合评分：8.5/10** — 工程化水平远超个人项目平均水准，P0 安全问题需立即修复。

---

## 🔴 P0 — 必须立即修复（4 项）

### 1. middleware.ts — `/api/admin/login` 被拦截导致无法登录

```typescript
// ❌ 当前代码（第12-14行）
const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
if (!isAdminPath || pathname.startsWith('/admin/login')) {
  return NextResponse.next();
}
// 问题：/api/admin/login 满足 isAdminPath，但不满足 startsWith('/admin/login')
// 结果：POST /api/admin/login → 被拦截 → 无 Session → 重定向 → 永远无法调用登录接口
```

```typescript
// ✅ 修复
if (!isAdminPath || pathname.startsWith('/admin/login') || pathname === '/api/admin/login') {
  return NextResponse.next();
}
```

### 2. admin/login/route.ts — 硬编码默认密码

```typescript
// ❌ 当前代码（第10行）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
```

```typescript
// ✅ 修复
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  return NextResponse.json({ error: '服务未配置，请联系管理员' }, { status: 500 });
}
```

### 3. admin/login/route.ts — Cookie 值为明文 `'authenticated'`

```typescript
// ❌ 当前代码（第27行）
response.cookies.set('admin_token', 'authenticated', { ... });
// 任何人知道此值即可伪造 Cookie 绕过登录
```

```typescript
// ✅ 修复
import { randomBytes } from 'crypto';
const token = randomBytes(32).toString('hex');
// 后续中间件应验证此 token
response.cookies.set('admin_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600 });
```

### 4. api/blessings/route.ts — 速率限制 RPC 失败时静默放行

```typescript
// ❌ 当前代码（第100-109行）
const { data: remaining, error: rateError } = await supabase.rpc('check_rate_limit', {...});
if (!rateError && remaining !== null && remaining <= 0) { ... }
// 若 RPC 抛异常 → rateError 为 truthy → 请求直接放行
```

```typescript
// ✅ 修复（fail-closed 模式）
if (rateError || remaining === null) {
  return NextResponse.json({ error: '系统繁忙，请稍后重试' }, { status: 503 });
}
if (remaining <= 0) {
  return NextResponse.json({ error: '发送太频繁，请10分钟后再试' }, { status: 429 });
}
```

---

## 🟠 P1 — 强烈建议修复（10 项）

### 安全类

| # | 文件 | 问题 | 建议 |
|:---|:---|:---|:---|
| 5 | `csrf.ts:62-65` | Cookie 缺失时返回 true，攻击者不携带 Cookie 即可绕过 | 生产环境 `cookie` 缺失时返回 false |
| 6 | `csrf-client.ts:26` | fetch 失败后 `fetchPromise` 永不重置，后续调用永久返回空字符串 | catch 中重置 `fetchPromise = null` |
| 7 | `admin/upload/route.ts:38` | `file.name.split('.').pop()` 存在路径穿越风险 | 用 `crypto.randomUUID()` 生成文件名 |
| 8 | `admin/upload/route.ts:24` | 仅检查 MIME，可伪造 `image/png` 上传恶意文件 | 用 sharp 等库验证真实图片内容 |
| 9 | `middleware.ts:42` | `ADMIN_EMAIL` 未设置时任意登录用户可访问管理后台 | 未配置时拒绝所有访问 |
| 10 | `admin/blessings/route.ts:52` | PATCH 无运行时白名单校验 | 显式提取 status/is_featured 并校验合法值 |

### 功能/正确性类

| # | 文件 | 问题 | 建议 |
|:---|:---|:---|:---|
| 11 | `stats/route.ts:19` | `total_participants` 查询与 `total_blessings` 完全相同，实为冗余查询 | 修复为去重参与人数统计或删除冗余查询 |
| 12 | `blessings/route.ts:87` | 空格不 trim 先做长度校验，纯空格可写入数据库 | 先 trim 再同时做空值和长度校验 |
| 13 | `teacher/[id]/page.tsx:55` | `sortField` 来自 URL 参数未做白名单校验，可注入任意列名 | 添加 `ALLOWED_SORT_FIELDS = ['created_at', 'likes']` |
| 14 | `like/route.ts` | 点赞接口无速率限制，可无限刷赞 | 复用 `check_rate_limit`，每分钟最多 10 次 |

---

## 🟡 P2 — 建议优化（14 项）

### 组件拆分（2 个超长文件）

| 文件 | 当前行数 | 建议拆分 |
|:---|:---|:---|
| `BlessingForm.tsx` | 455 行 | `TeacherSelector.tsx`（~120行）+ `useTurnstile.ts` hook + 主表单缩减至 ~250 行 |
| `BlessingGalaxy.tsx` | 521 行 | `useGalaxyData.ts` hook + `GalaxyStar.tsx` + `GalaxyDetailModal.tsx` + 主组件缩减至 ~200 行 |

### 共用方案缺失

| 问题 | 影响文件 | 建议 |
|:---|:---|:---|
| 7 个组件未适配 `prefers-reduced-motion` | GlassCard/PageTransition/ConfettiTrigger/StarBackground/BlessingGalaxy/CountUp/StatsPanel | 封装 `useReducedMotion` hook，条件禁用动画 |
| 5 个组件缺少 loading/error 状态 | StatsPanel/TeacherTeam/BlessingGalaxy/StarBackground/TeacherManager | 统一 loading/error/empty 三态处理模式 |
| 多处 `alert()` 弹窗 | wall/admin/TeacherManager | 实现轻量 toast 通知组件 |
| `BlessingGalaxy` 中 `Math.random()` 在渲染时调用 | 导致 SSR hydration mismatch | 将随机值移入 `useEffect` 或 `useMemo` |
| 非空断言 `teacher!` 无前置守卫 | BlessingCard/BlessingGalaxy | 添加 `if (!teacher) return null` 守卫 |

### API/数据层

| 问题 | 文件 | 建议 |
|:---|:---|:---|
| `SELECT *` 反模式 | teachers/route.ts, stats/route.ts | 明确列名：`select('id, name, department, avatar_url')` |
| 教师 API 无缓存头 | teachers/route.ts, teachers/[id]/route.ts | 添加 `Cache-Control: s-maxage=300` |
| 教师页双重查询 | teacher/[id]/page.tsx | `generateMetadata` 和页面组件各自查一次，用 `React.cache()` 去重 |
| 日期格式化无输入校验 | utils.ts:formatDate | `Invalid Date` → `NaN月NaN日` → 加 `isNaN(date.getTime())` 守卫 |
| `createAdminClient` 不必要耦合 Cookie | server.ts | Admin 客户端直接用 `createSupabaseClient`，无需 cookie 处理 |

### 工程化

| 问题 | 建议 |
|:---|:---|
| 缺少 `error.tsx` + `loading.tsx` | 创建 `src/app/error.tsx`（全局错误边界）和 `src/app/loading.tsx` |
| `page.tsx` 全页 `'use client'` 损害 SEO | 拆分为 Server Component 外壳 + Client Component 动画内核 |
| admin 页 `return null` 水合 hack | 在 SWR key 中判断状态，而非靠 return null 跳过渲染 |
| 批量拒绝无二次确认 | 添加 Modal 确认 |
| `display/page.tsx` fetcher 无错误检查 | 统一使用带 `res.ok` 检查的 fetcher |
| middleware 死代码（第47-50行） | 删除不可达的代码块 |
| vitest 无覆盖率阈值 | 添加 `test.coverage.thresholds: { lines: 70, branches: 60 }` |

### 数据库迁移

| 问题 | 建议 |
|:---|:---|
| `blessings.status` 无 CHECK 约束 | 添加 `CHECK (status IN ('pending','approved','rejected'))` |
| `blessings.likes` 无 `>= 0` 约束 | 添加 `CHECK (likes >= 0)` |
| `storage_avatars` 策略无鉴权 | upload 策略添加 `auth.role() = 'authenticated'` |

---

## ✅ 做得好的地方

### 架构设计
- App Router Server/Client Component 边界把握准确（仅首页和祝福墙需要客户端交互）
- `createClient` / `createAdminClient` / `createAnonClient` 三层客户端工厂职责清晰
- Middleware matcher 精确匹配，避免全局中间件性能开销

### 安全
- Double Submit Cookie CSRF 模式实现正确
- RLS 4 条策略覆盖 CRUD
- IP 限流 + Turnstile 双重写入防护
- Service Role Key 仅用于管理操作
- `httpOnly` / `secure` / `sameSite` Cookie 配置正确

### 性能
- `Cache-Control: s-maxage=5, stale-while-revalidate=30` 精细控制
- `next/dynamic` + `splitChunks` 懒加载非首屏组件
- `Promise.all` 并行数据获取
- Realtime WebSocket 替代轮询
- `next/image` WebP/AVIF 自动优化

### 工程化
- ESLint + Prettier + Husky + lint-staged 完整链路
- 81 单元 + 25 E2E + k6 三级测试体系
- GitHub Actions CI 已配置
- 五件套文档齐全

---

## 🔧 快速修复建议（Quick Wins）

以下修复工作量小、收益大，建议优先处理：

| 序号 | 修复内容 | 预估工作量 | 文件 |
|:---|:---|:---|:---|
| Q1 | P0-1: middleware 拦截 login API | 1 行 | `middleware.ts` |
| Q2 | P0-2: 移除硬编码默认密码 | 3 行 | `admin/login/route.ts` |
| Q3 | P0-3: Cookie token 改为随机值 | 5 行 | `admin/login/route.ts` |
| Q4 | P0-4: 速率限制 fail-closed | 3 行 | `blessings/route.ts` |
| Q5 | P1-5: CSRF 生产环境不跳过 | 3 行 | `csrf.ts` |
| Q6 | P1-11: 删除冗余 stats 查询 | 5 行 | `stats/route.ts` |
| Q7 | stats 改用 anonClient | 1 行 | `stats/route.ts` |
| Q8 | 删除 middleware 死代码 | 4 行 | `middleware.ts` |
| Q9 | 添加教师 API 缓存头 | 2 行 × 2 | `teachers/*/route.ts` |
| Q10 | 日期格式化无效输入守卫 | 2 行 | `utils.ts` |

**总计：约 30 行修改，覆盖 9 个文件，解决 4 个 P0 + 4 个 P1 + 2 个 P2。**

---

## 📋 后续建议

1. **立即**：修复 4 个 P0 问题 → Quick Wins 中的 Q1-Q4
2. **本周**：修复 10 个 P1 问题
3. **下个迭代**：拆分 BlessingForm（455行）和 BlessingGalaxy（521行）
4. **持续**：补充 CSRF/Middleware/API 测试覆盖
5. **长期**：将 `admin_token` Cookie 方案迁移到 Supabase Auth 统一鉴权
