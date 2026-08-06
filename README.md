# 🌟 教师节祝福墙

基于 **Next.js 14 + Supabase** 的教师节活动网站。学生可以在线发布祝福语，实时查看祝福墙，感受节日温暖。

> **开发进度**：73/74 (99%) · [详细进度 →](./PROGRESS.md)

---

## ✨ 功能

- 🎆 **沉浸式首页** — 星空粒子背景 + 语录渐显 + 渐变标题动画 + 页面过渡动画
- 🌌 **祝福星河** — 斐波那契螺旋分布，教师天体（蓝色光晕）+ 祝福星星（金色闪烁），layoutId 平滑重排
- 📝 **发布祝福** — 昵称 / 班级 / 祝福内容 / 教师搜索下拉（含头像）（玻璃态弹窗）
- 💬 **祝福墙** — 瀑布流卡片 + 时间/点赞排序 + Supabase Realtime 实时更新 + 无限滚动
- 👩‍🏫 **教师主页** — `/teacher/:id` 教师信息 + 时间/点赞排序 + 精选祝福标记 + 一键分享
- 📺 **大屏模式** — `/display` 全屏自动轮播 + QR 码，适用于活动现场
- 🔐 **管理后台** — 审核 / 置顶 / 精选 / 拒绝 + 教师头像上传 + 数据统计看板
- 🛡️ **安全防护** — Supabase Auth 鉴权 + Middleware + CSRF Token + IP 限流 + RLS + Turnstile
- ♿ **无障碍** — focus-visible 焦点环 + aria-label/role + 弹窗焦点陷阱 + WCAG AA 对比度

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
| 监控 | Vercel Analytics + Sentry（DSN 可选激活） |
| 测试 | Vitest（81 单元测试） + Playwright（25 E2E）+ k6（负载） |
| 性能 | Bundle Analyzer + next/image WebP/AVIF + 懒加载 |
| 部署 | Vercel |
| 工程化 | ESLint + Prettier + Husky + lint-staged |

---

## 🚀 本地运行

### 前提条件

- Node.js 18+
- [Supabase](https://supabase.com) 账号（免费）

### 步骤

```bash
# 1. 克隆仓库
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

# 5. 启动开发服务器
npm run dev
```

访问 `http://localhost:3000`。

---

## 🧪 测试

```bash
# 单元测试 + 集成测试（Vitest，81 个用例）
npm test

# E2E 测试（Playwright，25 个用例）
npm run test:e2e
npm run test:e2e:ui          # UI 模式

# k6 负载测试（需先安装 k6）
npm run test:smoke            # 冒烟测试
npm run test:load             # 负载测试
npm run test:stress           # 压力测试

# Bundle 分析
npm run analyze
```

---

## 📁 项目结构

```
src/
├── app/                         # Next.js App Router 页面
│   ├── page.tsx                 # 首页（沉浸式动画 + 祝福星河）
│   ├── layout.tsx               # 根布局 + SEO + preconnect
│   ├── globals.css              # 全局样式 + 毛玻璃 + 焦点 + 性能降级
│   ├── wall/page.tsx            # 祝福墙（无限滚动 + Realtime）
│   ├── display/page.tsx         # 大屏模式（全屏轮播 + QR）
│   ├── teacher/[id]/page.tsx    # 教师主页（SSR + 精选祝福）
│   ├── admin/                   # 管理后台
│   └── api/                     # API 路由
│       ├── blessings/           # 祝福 CRUD + 统计 + 点赞
│       ├── admin/               # 管理操作（审核/上传）
│       ├── teachers/            # 教师信息
│       └── csrf/                # CSRF Token 颁发
├── components/
│   ├── ui/                      # GlassCard / ShareButton
│   ├── blessing/                # BlessingCard / BlessingForm / ConfettiTrigger
│   ├── home/                    # StarBackground / BlessingGalaxy / StatsPanel
│   └── admin/                   # TeacherManager
├── lib/
│   ├── supabase/                # Supabase 客户端（浏览器/服务端/实时）
│   ├── csrf.ts                  # CSRF 服务端
│   ├── csrf-client.ts           # CSRF 浏览器端
│   └── utils.ts                 # 工具函数
├── hooks/                       # useInfiniteScroll
├── types/                       # TypeScript 类型定义
├── tests/                       # 单元测试 + 集成测试
└── middleware.ts                 # 路由保护（/admin + /api/admin）
e2e/                             # Playwright E2E 测试（含 API Mock）
load-tests/                      # k6 负载测试脚本
database/migrations/             # 数据库迁移 SQL
docs/                            # 架构图 + API 文档
```

---

## 📦 部署

### Vercel（推荐）

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库
2. 添加环境变量（同 `.env.local`）
3. 部署 — Vercel 自动构建并分配域名

### 数据库迁移

部署前确保 Supabase 生产项目中已执行 `database/migrations/` 下所有 SQL 文件。

---

## 🔮 后续计划

- [ ] **敏感词过滤** — `bad-words` 服务端接入
- [ ] **移动端 PWA** — 独立应用体验
- [ ] **多活动模板** — 毕业季 / 校庆快速复用

---

## 📄 许可

MIT License
