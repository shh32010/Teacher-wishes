# 🌟 教师节祝福墙

基于 **Next.js 14 + Supabase** 的教师节活动网站。学生可以在线发布祝福语，实时查看祝福墙，感受节日温暖。

---

## ✨ 功能

- 🎆 **沉浸式首页** — 星空粒子背景 + 语录渐显 + 渐变标题动画
- 📝 **发布祝福** — 昵称 / 班级 / 祝福内容 / 指定教师（玻璃态弹窗）
- 💬 **祝福墙** — Masonry 瀑布流卡片 + 点赞 + 实时更新
- 📺 **大屏模式** — `/display` 全屏自动轮播，适用于活动现场
- 👩‍🏫 **教师主页** — `/teacher/:id` 查看教师信息及收到的祝福
- 🔐 **管理后台** — 审核 / 置顶 / 精选 / 拒绝 + 数据统计看板
- 🎨 **毛玻璃 UI** — Apple + Glassmorphism 设计风格

---

## 🛠 技术栈

| 类别 | 技术 |
| :--- | :--- |
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS + 毛玻璃（Glassmorphism） |
| 后端 | Supabase（PostgreSQL + RLS + Realtime） |
| 动画 | Framer Motion / tsParticles v4 / Canvas Confetti |
| 数据 | SWR |
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

## 📁 项目结构

```
src/
├── app/                         # Next.js App Router 页面
│   ├── page.tsx                 # 首页（沉浸式动画）
│   ├── layout.tsx               # 根布局
│   ├── globals.css              # 全局样式 + 毛玻璃工具类
│   ├── wall/page.tsx            # 祝福墙
│   ├── display/page.tsx         # 大屏模式
│   ├── teacher/[id]/page.tsx    # 教师主页
│   ├── admin/
│   │   ├── page.tsx             # 管理后台
│   │   └── login/page.tsx       # 管理登录
│   └── api/                     # API 路由
│       ├── blessings/           # 祝福 CRUD + 统计
│       ├── admin/               # 管理操作
│       └── teachers/            # 教师信息
├── components/
│   ├── ui/GlassCard.tsx         # 毛玻璃卡片
│   ├── blessing/                # 祝福相关组件
│   └── home/StarBackground.tsx  # 星空背景
├── lib/
│   ├── supabase/                # Supabase 客户端（浏览器/服务端）
│   └── utils.ts                 # 工具函数
├── hooks/                       # 自定义 Hook
├── types/                       # TypeScript 类型
└── middleware.ts                 # 管理后台路由保护
```

---

## 📦 部署

### Vercel（推荐）

1. 在 [Vercel](https://vercel.com) 导入 GitHub 仓库
2. 添加环境变量（同 `.env.local`）
3. 部署 — Vercel 自动构建并分配域名

### 数据库迁移

部署前确保 Supabase 生产项目中已执行 `database/migrations/001_schema.sql`。

---

## 🔮 后续计划

- [ ] **祝福星河** — 每条祝福对应一颗星星，悬浮显示片段
- [ ] **时光信箱** — 定时发送 / 匿名留言给未来的老师
- [ ] **移动端 PWA** — 独立应用体验
- [ ] **多活动模板** — 毕业季 / 校庆快速复用
- [ ] **图片上传** — 祝福附带照片或手写卡片

---

## 📄 许可

MIT License
