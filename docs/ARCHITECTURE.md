# 🏗 架构文档 — 教师节祝福墙

---

## 技术栈

| 层 | 技术 |
| :--- | :--- |
| **前端框架** | Next.js 14 (App Router) + TypeScript |
| **样式** | Tailwind CSS（Glassmorphism 毛玻璃主题） |
| **动画** | Framer Motion + tsParticles v4 + Canvas Confetti |
| **数据获取** | SWR + useSWRInfinite + Supabase Realtime |
| **后端 API** | Next.js Route Handlers |
| **数据库** | Supabase PostgreSQL + RLS + Realtime |
| **存储** | Supabase Storage（教师头像） |
| **认证** | Admin: admin_token HMAC (Supabase Auth 不参与) |
| **部署** | Vercel + Cloudflare DNS 代理 |
| **测试** | Vitest + Playwright E2E + k6 负载测试 |

---

## 目录结构

```
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # 首页（故事式时间线）
│   │   ├── layout.tsx             # 根布局 + SEO metadata
│   │   ├── wall/page.tsx          # 祝福墙（无限滚动 + Realtime）
│   │   ├── display/page.tsx       # 大屏模式（全屏轮播）
│   │   ├── teacher/[id]/page.tsx  # 教师主页（SSR）
│   │   ├── admin/
│   │   │   ├── page.tsx           # 管理后台（审核 + 统计 + 教师管理）
│   │   │   └── login/page.tsx     # 管理员登录
│   │   └── api/                   # API Route Handlers
│   │       ├── blessings/         # 祝福 CRUD + 点赞 + 统计
│   │       ├── teachers/          # 教师列表 + 详情
│   │       └── admin/             # 管理审核 + 批量删除 + 头像上传
│   ├── components/
│   │   ├── home/                  # 首页组件
│   │   │   ├── StarBackground.tsx # tsParticles 星空
│   │   │   ├── BlessingGalaxy.tsx # 祝福星河（斐波那契螺旋）
│   │   │   ├── StatsPanel.tsx     # 数据看板
│   │   │   ├── CountUp.tsx        # 数字滚动动画
│   │   │   └── FallingPetals.tsx  # 花瓣飘落动画
│   │   ├── blessing/              # 祝福相关组件
│   │   │   ├── BlessingCard.tsx   # 祝福卡片（点赞）
│   │   │   ├── BlessingForm.tsx   # 提交表单（弹窗）
│   │   │   ├── ConfettiTrigger.tsx # 彩带庆祝特效
│   │   │   ├── LikeBurst.tsx      # 点赞爱心爆发动画
│   │   │   └── SortToggle.tsx     # 排序切换按钮
│   │   ├── admin/                 # 管理后台组件
│   │   │   └── TeacherManager.tsx # 教师管理面板
│   │   └── ui/                    # 通用 UI 组件
│   │       ├── GlassCard.tsx      # 毛玻璃卡片
│   │       ├── NavHeader.tsx      # 玻璃态导航栏
│   │       ├── PageTransition.tsx # 页面转场动画
│   │       ├── ThemeToggle.tsx    # 主题切换按钮
│   │       ├── QRCode.tsx         # Canvas QR 码
│   │       └── ShareButton.tsx    # 分享链接复制
│   ├── lib/
│   │   ├── supabase/              # Supabase 客户端封装
│   │   │   ├── client.ts          # 浏览器端（含 Realtime）
│   │   │   └── server.ts          # 服务端（含 Admin + Anon）
│   │   ├── csrf.ts                # CSRF 令牌生成（Double Submit Cookie）
│   │   ├── csrf-client.ts         # 客户端 CSRF 工具（缓存 + 获取）
│   │   └── utils.ts               # 工具函数
│   ├── hooks/
│   │   ├── useInfiniteScroll.ts   # 无限滚动 Hook
│   │   └── useTheme.ts            # 主题切换 Hook
│   ├── types/
│   │   ├── index.ts               # 全局类型定义
│   │   └── turnstile.d.ts         # Turnstile 类型声明
│   ├── tests/                     # 测试文件
│   │   ├── setup.ts               # Vitest 配置
│   │   ├── utils.test.ts          # 工具函数测试
│   │   ├── validation.test.ts     # API 验证逻辑测试
│   │   ├── api-types.test.ts      # API 类型守卫测试
│   │   ├── GlassCard.test.tsx     # GlassCard 组件测试
│   │   └── BlessingCard.test.tsx  # BlessingCard 组件测试
├── e2e/                           # Playwright E2E 测试
│   ├── homepage.spec.ts           # 首页测试
│   ├── blessing.spec.ts           # 祝福墙测试
│   ├── admin.spec.ts              # 管理后台测试
│   ├── teacher.spec.ts            # 教师页测试
│   └── a11y.spec.ts               # 无障碍测试
├── load-tests/                    # k6 负载测试
│   ├── smoke.js                   # 冒烟测试
│   ├── load.js                    # 负载测试
│   └── stress.js                  # 压力测试
│   └── middleware.ts              # Admin 路由鉴权中间件
├── database/
│   └── migrations/                # SQL 迁移脚本
├── docs/                          # 文档
└── public/                        # 静态资源
```

---

## ER 图

```mermaid
erDiagram
    teachers {
        uuid id PK "教师唯一标识"
        text name "教师姓名"
        text department "所属部门"
        text avatar_url "头像 URL (Supabase Storage)"
        text description "教师简介"
        timestamptz created_at "创建时间"
    }

    blessings {
        uuid id PK "祝福唯一标识"
        uuid teacher_id FK "关联教师"
        uuid user_id "关联用户 (预留)"
        text nickname "发送者昵称"
        text class "发送者班级"
        text content "祝福内容 (max 500)"
        int likes "点赞数 (default 0)"
        bool is_featured "是否精选"
        bool is_anonymous "是否匿名"
        text status "审核状态: pending/approved/rejected"
        timestamptz created_at "创建时间"
    }

    rate_limits {
        uuid id PK "记录唯一标识"
        text ip "客户端IP"
        text action "操作类型"
        timestamptz created_at "记录时间"
    }

    blessing_likes {
        uuid blessing_id PK "祝福ID"
        text ip_address PK "点赞IP"
        timestamptz created_at "点赞时间"
    }

    events {
        uuid id PK "活动唯一标识（预留）"
        text name "活动名称"
        jsonb theme_config "主题配置"
        timestamptz start_time "开始时间"
        timestamptz end_time "结束时间"
        timestamptz created_at "创建时间"
    }

    teachers ||--o{ blessings : "收到祝福"
    blessings ||--o{ blessing_likes : "被点赞"
```

---

## 数据流图

```mermaid
flowchart TB
    subgraph Client["🖥 浏览器"]
        Home["首页 /"]
        Wall["祝福墙 /wall"]
        Display["大屏 /display"]
        Teacher["教师页 /teacher/[id]"]
        Admin["管理后台 /admin"]
    end

    subgraph Next["⚡ Next.js 14"]
        Middleware["Middleware\nadmin_token 验签"]
        API["Route Handlers\nrequireAdmin() 二次验签"]
        SSR["Server Components"]
    end

    subgraph Supabase["🗄 Supabase"]
        PG[("PostgreSQL")]
        RLS["RLS 策略"]
        RPC["RPC 函数"]
        RT["Realtime WebSocket"]
        Storage["Storage 头像"]
    end

    subgraph CDN["🌐 部署层"]
        Vercel["Vercel Edge"]
        CF["Cloudflare DNS"]
    end

    Client -->|HTTPS| CF
    CF --> Vercel
    Vercel --> Next
    Next --> Middleware
    Middleware -->|Admin 路由| Token["admin_token HMAC 验签"]
    Middleware -->|通过| API
    API --> PG
    API --> Storage
    API --> RPC
    PG --> RLS
    Wall -.->|WebSocket| RT
    Display -.->|WebSocket| RT
    RT --> PG
```

---

## 核心交互流程

### 提交祝福

```mermaid
sequenceDiagram
    actor User
    participant Form as BlessingForm
    participant API as POST /api/blessings
    participant RPC as check_rate_limit
    participant DB as PostgreSQL
    participant RT as Realtime

    User->>Form: 填写祝福 → 提交
    Form->>API: POST {content, nickname, ...}
    API->>API: 输入校验 (长度/必填)
    API->>RPC: check_rate_limit(ip)
    RPC-->>API: remaining > 0
    API->>DB: INSERT rate_limits (防TOCTOU并发)
    API->>DB: INSERT blessings (status=pending)
    API-->>Form: 201 Created
    Note over User,Form: 等待管理员审核
    Admin->>API: PATCH status=approved
    API->>DB: UPDATE blessings
    DB-->>RT: postgres_changes INSERT
    RT-->>Wall: 实时推送新祝福
```

### 点赞流程

```mermaid
sequenceDiagram
    actor User
    participant Card as BlessingCard
    participant LS as localStorage
    participant API as POST /api/blessings/[id]/like
    participant RPC as increment_likes
    participant Rate as check_rate_limit

    User->>Card: 点击 ❤
    Card->>LS: 检查 liked_blessings
    LS-->>Card: 未点赞
    Card->>Card: 乐观更新 (likes+1, 变红)
    Card->>LS: 保存已点赞 ID
    Card->>API: POST like
    API->>Rate: check_rate_limit(ip, like_blessing)
    Rate-->>API: remaining > 0 (20次/分钟)
    API->>RPC: increment_likes(id)
    RPC-->>API: new_likes_count
    API->>DB: INSERT rate_limits
    API-->>Card: 200 OK
```

---

## 安全模型

| 层 | 机制 |
| :--- | :--- |
| **传输** | HTTPS (Vercel + Cloudflare) |
| **CSRF** | Double Submit Cookie 模式 — GET `/api/csrf` 生成随机 token → Cookie + 响应体 → 前端 POST/PATCH 携带 `X-CSRF-Token` → 服务端比对 |
| **数据库** | RLS — 公开 SELECT 仅看 `approved`，INSERT 默认 `pending` |
| **点赞** | `SECURITY DEFINER` RPC 绕过 RLS |
| **管理 API** | admin_token HMAC 签名 cookie + Middleware 验签 + requireAdmin() 二次验签（Supabase Auth 不参与） |
| **上传** | service_role key，仅服务端使用 |
| **限流** | `check_rate_limit` RPC：提交 3次/10分钟/IP、点赞 20次/分钟/IP、管理员登录 5次/分钟/IP |
| **人机验证** | Cloudflare Turnstile（可选，配置密钥后激活） |
| **输入校验** | 服务端严格校验（长度、必填、类型）；Admin PATCH 字段白名单仅允许 status + is_featured |

---

## 性能策略

| 策略 | 实现 |
| :--- | :--- |
| **组件懒加载** | `next/dynamic` — tsParticles / Confetti / QRCode / 表单 |
| **图片优化** | `next/image` → WebP |
| **API 缓存** | `Cache-Control: s-maxage + stale-while-revalidate` |
| **无限滚动** | `useSWRInfinite` + `IntersectionObserver` |
| **真实时** | Supabase Realtime WebSocket（替代轮询） |
| **粒子渲染** | Canvas（非 DOM，tsParticles） |
| **动画降级** | `prefers-reduced-motion` 媒体查询 |
