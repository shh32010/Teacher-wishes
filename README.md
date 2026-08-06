# 🌟 Teacher Wishes Platform · 教师节祝福平台

<p align="center">
  <strong>沉浸式教师节活动平台</strong> — 星空祝福星河 · 实时互动 · 大屏展示
</p>

<p align="center">
  <a href="https://github.com/shh32010/Teacher-wishes/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen" alt="Build Status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
  <a href="./PROGRESS.md"><img src="https://img.shields.io/badge/progress-99%25-success" alt="Progress"></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14-black" alt="Next.js 14"></a>
  <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-backend-3ecf8e" alt="Supabase"></a>
  <img src="https://img.shields.io/badge/tests-81%2B%20unit%20%7C%2025%20E2E%20%7C%20k6%20load-8b5cf6" alt="Tests">
</p>

---

## 📸 预览

<p align="center">
  <img src="./public/screenshots/homepage.png" alt="首页 — 星空+祝福星河" width="48%">
  <img src="./public/screenshots/wall.png" alt="祝福墙 — 瀑布流卡片" width="48%">
</p>

<p align="center">
  <img src="./public/screenshots/teacher.png" alt="教师主页 — 精选祝福" width="48%">
  <img src="./public/screenshots/display.png" alt="大屏模式 — 全屏轮播" width="48%">
</p>

---

## 🚀 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/shh32010/Teacher-wishes&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=从%20Supabase%20Dashboard%20获取)

> ⚠️ 部署前需在 [Supabase](https://supabase.com) 创建项目，并在 SQL Editor 中执行 `database/migrations/001_schema.sql`。

---

## ✨ 功能

- 🎆 **沉浸式首页** — 星空粒子背景 + 语录渐显 + 渐变标题动画 + 页面过渡动画
- 🌌 **祝福星河** — 斐波那契螺旋分布，教师天体（蓝色光晕）+ 祝福星星（金色闪烁），layoutId 平滑重排
- 📝 **发布祝福** — 昵称 / 班级 / 祝福内容 / 教师搜索下拉（含头像）（玻璃态弹窗）
- 💬 **祝福墙** — 瀑布流卡片 + 时间/点赞排序 + Supabase Realtime 实时更新 + 无限滚动
- 👩‍🏫 **教师主页** — `/teacher/:id` 教师信息 + 时间/点赞排序 + 精选祝福标记 + 一键分享
- 📺 **大屏模式** — `/display` 全屏自动轮播 + QR 码，适用于活动现场投影
- 🔐 **管理后台** — 审核 / 置顶 / 精选 / 拒绝 + 教师头像上传 + 数据统计看板
- 🛡️ **安全防护** — Supabase Auth 鉴权 + Middleware + CSRF Token + IP 限流 + RLS + Turnstile
- ♿ **无障碍** — focus-visible 焦点环 + aria-label/role + 弹窗焦点陷阱 + WCAG AA 对比度
- 📊 **监控** — Vercel Analytics 页面统计 + Sentry 错误追踪（DSN 可选激活）

---

## 🛠 技术栈

| 类别 | 技术 |
| :--- | :--- |
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS + 毛玻璃（Glassmorphism） |
| 后端 | Supabase（PostgreSQL + RLS + Realtime + Storage） |
| 动画 | Framer Motion / tsParticles v4 / Canvas Confetti |
| 数据请求 | SWR / useSWRInfinite |
| 安全 | CSRF Token + IP Rate Limit + Turnstile + RLS |
| 监控 | Vercel Analytics + Sentry（DSN 可选激活，零配置） |
| 测试 | Vitest（81+ 单元测试）+ Playwright（25 E2E）+ k6（负载） |
| 性能 | Bundle Analyzer + next/image WebP/AVIF + 懒加载 + CDN 缓存 |
| 部署 | Vercel + Supabase Free（可支撑 200-500 并发） |
| 工程化 | ESLint + Prettier + Husky + lint-staged |

---

## 🚀 本地运行

**前提条件**

- Node.js 18+
- [Supabase](https://supabase.com) 账号（免费）

```bash
# 1. 克隆
git clone git@github.com:shh32010/Teacher-wishes.git
cd Teacher-wishes

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.local.example .env.local
```

编辑 `.env.local`，填入 Supabase 项目信息（Dashboard → Settings → API）：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
# 4. 执行数据库迁移
# 在 Supabase SQL Editor 中运行 database/migrations/001_schema.sql

# 5. 启动
npm run dev
```

访问 `http://localhost:3000`。

---

## 🧪 测试

```bash
npm test                     # Vitest 单元测试（81+ 用例）
npm run test:e2e             # Playwright E2E（25 用例）
npm run test:e2e:ui          # E2E UI 模式
npm run test:smoke           # k6 冒烟测试
npm run test:load            # k6 负载测试
npm run test:stress          # k6 压力测试
npm run analyze              # Bundle 分析
```

---

## 📁 项目结构

```
src/
├── app/                      # App Router 页面
│   ├── page.tsx              #   首页（星空 + 星河 + 时间线）
│   ├── wall/page.tsx         #   祝福墙（无限滚动 + Realtime）
│   ├── display/page.tsx      #   大屏模式（轮播 + QR）
│   ├── teacher/[id]/page.tsx #   教师主页（SSR + 排序）
│   ├── admin/                #   管理后台
│   └── api/                  #   API 路由
├── components/
│   ├── ui/                   #   GlassCard / PageTransition / ShareButton
│   ├── blessing/             #   BlessingCard / BlessingForm / SortToggle
│   ├── home/                 #   StarBackground / BlessingGalaxy / StatsPanel
│   └── admin/                #   TeacherManager
├── lib/
│   ├── supabase/             #   客户端（浏览器/服务端/实时）
│   ├── csrf.ts / csrf-client.ts
│   └── utils.ts
├── hooks/ / types/ / tests/
└── middleware.ts
e2e/                          # Playwright E2E
load-tests/                   # k6 负载测试
database/migrations/          # SQL 迁移
docs/                         # ARCHITECTURE / API / CAPACITY
```

---

## 📖 文档

| 文档 | 说明 |
| :--- | :--- |
| [PROGRESS.md](./PROGRESS.md) | 开发进度追踪（73/74 项） |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构图 + ER 图 + 数据流 |
| [docs/API.md](./docs/API.md) | API 端点文档 |
| [docs/CAPACITY.md](./docs/CAPACITY.md) | 容量评估 + 扩容指南 |

---

## 🔮 后续计划

- [ ] 敏感词过滤（`bad-words` 已安装，服务端逻辑待接入）
- [ ] GitHub Actions CI（lint → typecheck → test → build）
- [ ] `TECHNICAL_DESIGN.md` 深度设计文档
- [ ] `ARCHITECTURE_REVIEW.md` 模块级代码审查
- [ ] Demo 视频 + Project Board
- [ ] v1.0 Release + Semantic Release

---

## 📄 许可

MIT License
