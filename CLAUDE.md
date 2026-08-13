# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

教师节祝福墙 (Teacher Wishes) — 基于 Next.js 14 App Router 的沉浸式节日活动平台。暖色秋天美学 + 毛玻璃设计，支持祝福星河动画、实时祝福墙、教师主页、大屏轮播、管理后台。

## 常用命令

```bash
npm run dev              # 启动开发服务器 (localhost:3000)
npm run build            # 生产构建
npm run start            # 启动生产服务器
npm run lint             # ESLint 检查
npm run format           # Prettier 格式化全部文件
npm run format:check     # Prettier 格式检查
npm run typecheck        # TypeScript 类型检查 (tsc --noEmit)

# 测试
npm test                 # Vitest 单元测试 (watch 模式)
npm run test:run         # Vitest 单次运行
npm run test:e2e         # Playwright E2E
npm run test:e2e:ui      # Playwright E2E UI 模式
npm run test:smoke       # k6 冒烟测试
npm run test:load        # k6 负载测试
npm run test:stress      # k6 压力测试

# 分析
npm run analyze          # Bundle 分析 (ANALYZE=true 触发)
```

**CI 流水线** (.github/workflows/ci.yml)：`lint → typecheck → test → build`，push/PR 到 master 时触发。

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| 框架 | Next.js 14 (App Router) + TypeScript strict |
| 样式 | Tailwind CSS 3.4 + 暖色毛玻璃主题 |
| 后端 | Supabase (PostgreSQL + RLS + Realtime + Storage + Auth) |
| 数据请求 | SWR / useSWRInfinite |
| 动画 | Framer Motion + tsParticles v4 + Canvas Confetti |
| 安全 | CSRF (Double Submit Cookie) + IP 限流 (RPC) + Turnstile + RLS |
| 监控 | Vercel Analytics + Sentry (DSN 可选激活) |
| 测试 | Vitest (jsdom) + Playwright + k6 |
| 工程化 | ESLint + Prettier + Husky + lint-staged |

## 核心架构

### Supabase 客户端分层（`src/lib/supabase/`）

项目定义了 **5 种 Supabase 客户端**，按场景选择：

| 客户端 | 文件 | 使用场景 | 权限 |
| :--- | :--- | :--- | :--- |
| 浏览器客户端 | `client.ts` → `createClient()` | 客户端组件 Auth 操作 (SSR cookie) | anon key |
| Realtime 客户端 | `client.ts` → `createRealtimeClient()` | WebSocket 订阅，不依赖 Cookie | anon key |
| 服务端客户端 | `server.ts` → `createClient()` | Route Handler / Server Component / Server Action | anon key，依赖 cookies() |
| Admin 客户端 | `server.ts` → `createAdminClient()` | 管理后台操作，绕过 RLS | service_role key |
| Anon 客户端 | `server.ts` → `createAnonClient()` | 公开 API（无需 cookie/session） | anon key，受 RLS 限制 |

**选择原则**：公开读写 API（GET blessings、POST blessing、点赞）用 `createAnonClient()`；需要 Auth session 的服务端操作用 `createClient()`；管理后台 PATCH/DELETE 用 `createAdminClient()`。

**例外**：`/api/teachers` 路由使用 `createClient()`（需要 cookie session）而非 `createAnonClient()`，与 blessings API 的模式不同。

### 数据库核心表

- **teachers** — 教师信息（name, department, avatar_url, description）
- **blessings** — 祝福内容（content ≤ 500字），状态为 `pending → approved/rejected`，含 likes 计数、is_featured 标记
- **rate_limits** — IP + action 限流记录
- **blessing_likes** — 点赞唯一性约束（blessing_id + ip UNIQUE）

### RLS 安全策略

- blessings: 公开 SELECT 仅看 `status='approved'`；任何人可 INSERT（默认 pending）；仅 owner 可 UPDATE
- teachers: 公开 SELECT 所有人可读
- 点赞通过 `SECURITY DEFINER` RPC 函数 (`increment_likes`) 绕过 RLS，内部原子执行 INSERT + UPDATE

### 点赞流程

BlessingCard 点 ❤ → localStorage 乐观更新 (likes+1) → POST `/api/blessings/[id]/like` → RPC `increment_likes(blessing_id, client_ip)` → unique_violation 返回 -1（已点赞 409），否则返回新计数

### API 路由清单（9 个端点）

所有 API Route Handler 遵循统一模式：
1. CSRF 验证（POST/PATCH 请求）
2. 输入校验（trim + 长度/必填）
3. 业务逻辑（Supabase 查询/RPC）
4. 错误处理（区分 Supabase error code、网络异常）
5. 缓存头（GET 接口：`s-maxage=5, stale-while-revalidate=30`）

| 路由 | 方法 | Supabase 客户端 | 说明 |
| :--- | :--- | :--- | :--- |
| `/api/blessings` | GET/POST | `createAnonClient()` | 祝福列表（分页+排序）+ 提交祝福 |
| `/api/blessings/[id]/like` | POST | `createAnonClient()` | 点赞 RPC（`increment_likes`） |
| `/api/blessings/stats` | GET | `createAnonClient()` | 聚合统计（总数/教师数/点赞数） |
| `/api/teachers` | GET | `createClient()` ⚠️ | 教师列表（注意：用 cookie session，不用 anon） |
| `/api/teachers/[id]` | GET | `createClient()` ⚠️ | 教师详情 + 该教师的祝福列表 |
| `/api/admin/blessings` | GET/PATCH | `createAdminClient()` | 管理后台审核/置顶/精选/拒绝 |
| `/api/admin/login` | POST | `createAdminClient()` | 管理员密码登录，设置 `admin_token` cookie |
| `/api/admin/upload` | POST | `createAdminClient()` | 教师头像上传到 Supabase Storage |
| `/api/csrf` | GET | 无 | CSRF 令牌生成，纯服务端 crypto |

### 中间件 (`src/middleware.ts`)

拦截 `/admin/:path*` 和 `/api/admin/:path*` 路由，通过 Supabase Auth session 验证管理员身份（匹配 `ADMIN_EMAIL` 环境变量）。登录页 `/admin/login` 和登录 API `/api/admin/login` 自身被排除。

**⚠️ 架构陷阱**：Middleware 直接使用 `@supabase/ssr` 的 `createServerClient`，**不是** `src/lib/supabase/server.ts` 的 `createClient()`。因为 Middleware 运行在 Edge Runtime，无法使用 `cookies()` from `next/headers`（Node.js API），必须手动传递 request cookies 并写回 response cookies。修改鉴权逻辑时注意这个差异。

**⚠️ 双重认证系统**：管理后台涉及两套认证——
1. **登录 API** (`/api/admin/login`)：用 `ADMIN_PASSWORD` 环境变量验证密码，成功后设置 `admin_token` cookie（基于令牌）
2. **Middleware**：检查 **Supabase Auth session**（而非 `admin_token` cookie），验证用户邮箱匹配 `ADMIN_EMAIL`

这两套系统是独立的。登录 API 设置 `admin_token` 的同时也需要创建 Supabase Auth session，否则中间件会在下次导航时拦截。修改管理员认证逻辑时务必同时考虑两套系统。

### CSRF 防护 (`src/lib/csrf.ts` + `src/lib/csrf-client.ts`)

**服务端** (`csrf.ts`)：Double Submit Cookie 模式 — GET `/api/csrf` 生成随机 token → 设为 `httpOnly=false` Cookie → 前端从响应体取 token → 后续 POST/PATCH 请求头携带 `X-CSRF-Token` → 服务端比对 Cookie 与 Header 一致。

**客户端** (`csrf-client.ts`)：
- `getCsrfToken()` — 从 `/api/csrf` 获取并缓存 token（并发请求去重）
- `getCsrfHeaders()` — 返回 `{ 'X-CSRF-Token': token }`，可直接展开到 fetch headers
- `clearCsrfToken()` — 清除缓存（登录/登出后调用）

**跳过验证**：当 `csrf_token` Cookie 不存在且 `NODE_ENV !== 'production'` 时跳过验证（向后兼容）。生产环境下缺失 Cookie = 403 拒绝。

### 设计系统（v2.0 Design Token 体系）

**所有颜色通过 CSS 自定义属性（`globals.css` `:root`）定义，组件内禁止硬编码色值。** 改主题只需改一套变量。

完整的 Token 清单见 `src/app/globals.css :root` 块，核心层级：

| 层级 | Token | 用途 |
| :--- | :--- | :--- |
| 背景层 | `--bg-primary` / `--bg-secondary` / `--bg-tertiary` | 页面背景色阶 |
| 主色 | `--color-primary` (#D97706) | **仅 CTA / 强调**，不要满屏使用 |
| 情感点缀 | `--color-accent-gold` / `--color-accent-warm` / `--color-accent-earth` | 氛围装饰，非功能色 |
| 文字 | `--text-primary` / `--text-secondary` / `--text-muted` | 暖深棕文字色阶 |
| 玻璃态 | `--glass-bg` / `--glass-border` / `--glass-shadow` | 毛玻璃卡片 |

**暖色 ≠ 橙色**：`#D97706` 仅用于按钮/链接等 CTA 元素，情感点缀使用 `#E8A317`（金穗）、`#C9825B`（暖陶）、`#B98B73`（大地）。

**昼夜模式**：通过 `prefers-color-scheme: dark` 媒体查询自动切换（`useTheme` hook 还支持手动三态切换 light/dark/auto）。夜间是温暖深蓝紫 (`#1A1A2E`) + 暗金点缀，**不是纯黑**，保持"教师节"氛围。切换通过 `<html data-theme="dark|light">` 属性 + CSS 选择器实现。

**字体**：
- 正文：Geist (Sans + Mono)，`next/font/local` 本地加载，注入 CSS 变量 `--font-geist-sans` / `--font-geist-mono`
- 标题：霞鹜文楷 LXGW WenKai Bold (700)，`@fontsource/lxgw-wenkai` 本地 woff2，**零 CDN 依赖**，注入 CSS 变量 `--font-wenkai`
- 用 `font-wenkai` Tailwind 类名引用标题字体，`font-sans` 引用正文字体
- 霞鹜文楷**仅用于标题**（weight 仅 700），正文用系统无衬线

### Tailwind 自定义色板与工具类

**颜色类**（定义在 `tailwind.config.ts`，与 Design Token 一一对应）：

| 色板 | Tailwind 类 | 对应 Token | 用途 |
| :--- | :--- | :--- | :--- |
| `primary` | `primary-DEFAULT` / `primary-light` / `primary-dark` | `--color-primary` | CTA 按钮/链接（仅此场景用 `#D97706`） |
| `warm` | `warm-DEFAULT` / `warm-light` / `warm-dark` | `--bg-primary` / `--bg-secondary` | 页面背景色阶 |
| `ink` | `ink-DEFAULT` / `ink-light` / `ink-muted` | `--text-primary` / `--text-secondary` / `--text-muted` | 暖深棕文字色阶 |
| `sentiment` | `sentiment-gold` / `sentiment-warm` / `sentiment-earth` / `sentiment-rose` | `--color-accent-*` | 氛围装饰（粒子/花瓣/分隔线），非功能色 |
| `night` | `night-DEFAULT` / `night-light` / `night-lighter` / `night-accent` | 夜间 Token | 夜间模式背景 + 暗金点缀 |
| `success` / `danger` / `like` | `success-DEFAULT` / `danger-DEFAULT` / `like-DEFAULT` | — | 功能色（成功/危险/点赞） |

**注意**：优先用 CSS 变量（`var(--text-primary)`）做内联样式和动画参数；用 Tailwind 类（`text-ink-DEFAULT`、`bg-warm-DEFAULT`）做组件 className。两者是同一套颜色体系的不同入口。

**CSS 工具类**（定义在 `globals.css` `@layer utilities/components`，全项目可用）：

| 类名 | 说明 |
| :--- | :--- |
| `glass` | 毛玻璃容器（blur 16px + 白/深色半透明 bg + 暖色 border） |
| `glass-light` | 轻量毛玻璃（blur 12px，适合嵌套元素） |
| `glass-card` | 毛玻璃卡片（含 hover 上浮 + 阴影增强，移动端自动缩小 padding/圆角） |
| `btn-primary` | 暖金渐变 CTA 按钮（仅用于主操作） |
| `btn-glass` | 毛玻璃风格按钮 |
| `btn-ghost` | 幽灵按钮（透明底 + 边框，hover 显色） |
| `input-glass` | 标准玻璃态输入框（圆角 xl） |
| `input-glass-sm` | 小号玻璃态输入框（圆角 lg） |
| `text-gradient` | 文字渐变（暖金线性渐变，clip 到文字） |
| `text-glow` | 文字暖光发光阴影 |
| `decorative` | 装饰元素标记（`pointer-events: none` + `user-select: none`） |

> 所有动画/粒子元素都应加 `decorative` 类，避免阻挡用户交互

**自定义动画**（`animate-*` Tailwind 类）：

| 类名 | 效果 | 时长 |
| :--- | :--- | :--- |
| `animate-fade-in` | 淡入 + 上移 30px | 0.8s |
| `animate-slide-up` | 纯上移 30px 淡入 | 0.6s |
| `animate-breathe` | 呼吸缩放 (1→1.05) | 3s 循环 |
| `animate-star-twinkle` | 星光闪烁 (opacity 0.3↔1) | 2s 循环 |
| `animate-float` | 上下浮动 ±10px | 6s 循环 |
| `animate-petal-fall` | 花瓣飘落（旋转 + 下落） | 线性无限 |
| `animate-ginkgo-fall` | 银杏飘落（S 型轨迹 + 旋转） | 线性无限 |

> 详细视觉重构方案见 `docs/VISUAL_REDESIGN.md`

### 测试策略

- **Vitest** 单元测试在 `src/tests/`，环境 jsdom（`@vitejs/plugin-react` + `@` 别名），setup 文件 `src/tests/setup.ts` 引入 `@testing-library/jest-dom/vitest`。`globals: true`，可直接使用 `describe`/`it`/`expect` 无需导入
- **Playwright E2E** 在 `e2e/`，使用 mock 数据（`e2e/mocks.ts` 提供 `registerAllApiMocks`），自动启动 dev server。**注意**：使用 MS Edge 通道（`channel: 'msedge'`）而非标准 Chromium，行为可能略有差异。测试需调用 `disableAnimations(page)` 避免动画阻塞。含 5 个 spec：homepage、blessing、admin、teacher、a11y（无障碍）
- **k6 负载测试** 在 `load-tests/`，含 smoke/load/stress 三级

## 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=           # Supabase 项目 URL（必填）
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anon key（必填）
SUPABASE_SERVICE_ROLE_KEY=          # service_role key，仅服务端（必填）
ADMIN_EMAIL=                        # 管理员邮箱，匹配 Supabase Auth 用户
ADMIN_PASSWORD=                     # 管理员登录密码
NEXT_PUBLIC_TURNSTILE_SITE_KEY=     # Cloudflare Turnstile 站点 key（可选）
TURNSTILE_SECRET_KEY=               # Turnstile 密钥（可选）
NEXT_PUBLIC_SENTRY_DSN=             # Sentry DSN（可选，生产推荐）
SENTRY_DSN=                         # Sentry 服务端 DSN（可选）
SENTRY_ORG= / SENTRY_PROJECT=       # Sentry 组织/项目名（可选）
```

## 数据库迁移执行顺序

在 Supabase SQL Editor 中依次执行（**必须全部执行**，005/006/007 包含关键安全加固，缺失会导致限流失效、点赞可刷、审核可绕过）：
1. `database/migrations/001_schema.sql` — 基础表 + RLS + Realtime
2. `database/migrations/002_likes_rpc.sql` — 点赞 RPC 函数
3. `database/migrations/003_rate_limit.sql` — 限流 RPC 函数
4. `database/migrations/004_likes_unique.sql` — 点赞唯一约束
5. `database/migrations/004_storage_avatars.sql` — 头像存储桶策略
6. `database/migrations/005_security_hardening.sql` — RLS 启用 + 限流原子化 + 点赞权限收紧 + 审核触发器
7. `database/migrations/006_storage_policies.sql` — Storage 写策略收紧
8. `database/migrations/007_review_fixes.sql` — 删除 UPDATE 策略（审核绕过）+ rate_limits INSERT 策略（锁定攻击）

## 文档索引

| 文档 | 说明 |
| :--- | :--- |
| `docs/ARCHITECTURE.md` | 架构图（ER 图 + 数据流 + 安全模型 7 层） |
| `docs/API.md` | 全部 9 个 API 端点文档 |
| `docs/CAPACITY.md` | 容量评估 + Supabase Free 限制 + 扩容指南 |
| `docs/VISUAL_REDESIGN.md` | v2.0 视觉重构方案（Design Token + 字体 + 夜间模式） |
| `docs/ARCHITECTURE_REVIEW.md` | 全栈深度架构审查报告 |
| `docs/TECHNICAL_DESIGN.md` | 技术设计文档 |
| `PROGRESS.md` | 开发进度追踪 |
| `CHANGELOG.md` | 版本发布日志 |

## 页面路由

| 路由 | 渲染 | 说明 |
| :--- | :--- | :--- |
| `/` | 客户端 | 首页：暖色渐变 + tsParticles 星空 + 祝福星河 (斐波那契螺旋) |
| `/wall` | 客户端 | 祝福墙：SWR 无限滚动 + Supabase Realtime 实时推送 |
| `/display` | 客户端 | 大屏模式：全屏自动轮播 + QR 码，适用活动现场投影 |
| `/teacher/[id]` | SSR | 教师主页：服务端获取 teacher + blessings，支持排序 |
| `/admin/login` | 客户端 | 管理员登录 |
| `/admin` | 客户端 | 管理后台：审核/置顶/精选/拒绝 + 教师管理 + 数据统计 |

## 关键模式

- **懒加载**：tsParticles、Canvas Confetti、QRCode、BlessingForm 均使用 `next/dynamic(() => import(...), { ssr: false })` 按需加载
- **乐观更新**：点赞操作先更新 UI/localStorage，请求失败时回滚
- **Realtime 订阅**：祝福墙使用 `createRealtimeClient()` 订阅 `blessings` 表的 INSERT 事件，新祝福实时出现
- **无限滚动**：`useInfiniteScroll` hook 基于 `IntersectionObserver` + `useSWRInfinite`，返回 `{ sentinelRef }` 附加到哨兵 div
- **主题切换**：`useTheme()` hook 支持三态循环（light → dark → auto → light），通过 `data-theme` 属性 + CSS 选择器驱动，localStorage 持久化
- **Webpack chunk 分割**：framer-motion（优先级 15）、tsparticles（15）、supabase（**20 最高**）、confetti（async）、qrcode（async）各自独立 vendor chunk
- **可复用 UI 组件**：`NavHeader`（玻璃态导航栏）、`GlassCard`（毛玻璃卡片）、`input-glass`/`input-glass-sm`（统一输入框样式）
- **性能约束**：FallingPetals Desktop 20/Mobile 10 个，所有装饰元素加 `decorative` 类（`pointer-events: none`），优先使用 `transform` 动画
- **Pre-commit 钩子**：Husky + lint-staged，commit 时自动对 `*.{js,jsx,ts,tsx}` 运行 `eslint --fix` + Prettier，对 `*.{json,md,css}` 仅 Prettier。提交前确保代码已格式化
- **`bad-words` 包**：已安装但 **尚未接入** API 逻辑（TODO 项），不要在代码中使用它除非先完成集成
- **Sentry 隧道**：生产环境 Sentry 事件通过 `/monitoring` 路由发送（绕过广告拦截器），此路由不应被中间件拦截

## 视觉重构 (v2.0)

完整方案见 `docs/VISUAL_REDESIGN.md`。核心变更：
- **Design Token 体系**：40+ CSS 自定义属性（`:root` + 夜间模式 `@media`），所有组件禁止硬编码颜色
- **暖色 ≠ 橙色**：`#D97706` 仅 CTA 使用，情感点缀用 `#E8A317`/`#C9825B`/`#B98B73`
- **字体本地化**：霞鹜文楷 Bold 通过 `@fontsource/lxgw-wenkai` + `next/font/local` 加载，零 CDN 依赖
- **温暖夜间模式**：深蓝紫 (`#1A1A2E`) + 暗金点缀，非纯黑，保持教师节氛围
- **星光色 Token 化**：BlessingGalaxy 使用 `color-mix(in srgb, var(--color-primary) X%, transparent)` 替代硬编码 rgba
