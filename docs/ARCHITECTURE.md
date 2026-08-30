# 🏗 架构文档 — 教师节祝福墙

> **版本状态**：v2.0.0 开发中，目标 **2026-09-05** 上线。v2.0 设计蓝图见 [`docs/V2_DESIGN.md`](./V2_DESIGN.md)（2026-08-29 定稿），本文档按 v2.0 目标架构描述。

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
| **AI（v2.0）** | DeepSeek adapter（openai 兼容，备选智谱/SiliconFlow）+ 无 key 规则降级 |
| **部署** | Vercel + Cloudflare DNS 代理 |
| **测试** | Vitest + Playwright E2E + k6 负载测试 |

---

## 目录结构

```
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # 首页（时间线 + 礼物星河 + 今日金句）
│   │   ├── layout.tsx             # 根布局 + SEO metadata
│   │   ├── gift/page.tsx          # v2.0 送礼主流程（6 步状态机）
│   │   ├── wall/page.tsx          # 祝福墙（无限滚动 + Realtime）
│   │   ├── teacher/[id]/page.tsx  # 教师主页（SSR，历史祝福）
│   │   ├── admin/
│   │   │   ├── page.tsx           # 管理后台（审核/词库/礼物/AI 中心/教师 5 tab）
│   │   │   └── login/page.tsx     # 管理员登录
│   │   └── api/                   # API Route Handlers
│   │       ├── blessings/         # 祝福 CRUD + 点赞 + 统计（v2.0 送礼契约）
│   │       ├── teachers/          # 教师列表 + 详情
│   │       ├── templates/         # v2.0 公开词库（含 random）
│   │       ├── gifts/             # v2.0 公开礼物
│   │       ├── ai/                # v2.0 AI（recommend/quote/insights）
│   │       └── admin/             # 管理端（blessings/templates/gifts/ai/login/logout/upload）
│   ├── components/
│   │   ├── home/                  # 首页组件
│   │   │   ├── StarBackground.tsx # tsParticles 星空
│   │   │   ├── GiftGalaxy.tsx     # v2.0 礼物星河（中心 TEACHERS 光核 + 礼物粒子）
│   │   │   ├── StatsPanel.tsx     # 数据看板
│   │   │   ├── CountUp.tsx        # 数字滚动动画
│   │   │   └── FallingPetals.tsx  # 花瓣飘落动画
│   │   ├── blessing/              # 祝福相关组件
│   │   │   ├── BlessingCard.tsx   # 祝福卡片（礼物/情绪标签 + 点赞）
│   │   │   ├── ConfettiTrigger.tsx # 彩带庆祝特效
│   │   │   ├── LikeBurst.tsx      # 点赞爱心爆发动画
│   │   │   └── SortToggle.tsx     # 排序切换按钮
│   │   ├── gift/                  # v2.0 送礼流程组件
│   │   │   ├── GiftFlow.tsx       # 6 步状态机容器（含确认步 + Turnstile）
│   │   │   ├── EmotionPicker.tsx  # 情绪选择
│   │   │   ├── TemplatePicker.tsx # 祝福选择（AI 推荐 + 换一句 + 分类浏览）
│   │   │   ├── GiftSelector.tsx   # 礼物宫格
│   │   │   ├── GiftAnimation.tsx  # 8 种礼物动画（3.8s）
│   │   │   └── GiftSuccess.tsx    # 完成页 + 分享
│   │   ├── ai/                    # v2.0 AI 展示组件
│   │   │   └── QuoteOfDay.tsx     # 今日金句
│   │   ├── admin/                 # 管理后台组件
│   │   │   ├── TeacherManager.tsx # 教师管理面板
│   │   │   ├── TemplateManager.tsx # v2.0 词库管理（含 CSV 导入）
│   │   │   ├── GiftManager.tsx    # v2.0 礼物管理
│   │   │   └── AICenter.tsx       # v2.0 AI 中心（分类/金句/总结/洞察）
│   │   └── ui/                    # 通用 UI 组件
│   │       ├── GlassCard.tsx      # 毛玻璃卡片
│   │       ├── NavHeader.tsx      # 玻璃态导航栏
│   │       ├── PageTransition.tsx # 页面转场动画
│   │       ├── ThemeToggle.tsx    # 主题切换按钮
│   │       └── ShareButton.tsx    # 分享链接复制
│   ├── lib/
│   │   ├── supabase/              # Supabase 客户端封装
│   │   │   ├── client.ts          # 浏览器端（含 Realtime）
│   │   │   └── server.ts          # 服务端（含 Admin + Anon）
│   │   ├── ai/                    # v2.0 AI 层
│   │   │   ├── provider.ts        # adapter（DeepSeek 默认 + 宽松 JSON 解析）
│   │   │   ├── prompts.ts         # 提示词 + 规则降级（ruleClassify）
│   │   │   └── messages.ts        # 仪式文案矩阵（6 情绪 × 8 礼物）
│   │   ├── auth/admin.ts          # 管理员认证（requireAdmin）
│   │   ├── csrf.ts                # CSRF 令牌生成（Double Submit Cookie）
│   │   ├── csrf-client.ts         # 客户端 CSRF 工具（缓存 + 获取）
│   │   ├── csv.ts                 # v2.0 CSV 解析（RFC 4180 子集）
│   │   ├── client-ip.ts           # 客户端 IP 获取
│   │   ├── profanity.ts           # 敏感词过滤（词库导入双保险）
│   │   └── utils.ts               # 工具函数
│   ├── hooks/
│   │   ├── useInfiniteScroll.ts   # 无限滚动 Hook
│   │   ├── useTheme.ts            # 主题切换 Hook
│   │   └── useTurnstile.ts        # v2.0 Turnstile Hook（widget 生命周期）
│   ├── types/
│   │   ├── index.ts               # 全局类型定义（含 v2.0 模板/礼物/AI 类型）
│   │   └── turnstile.d.ts         # Turnstile 类型声明
│   ├── tests/                     # 测试文件
│   │   ├── setup.ts               # Vitest 配置
│   │   ├── utils.test.ts          # 工具函数测试
│   │   ├── validation.test.ts     # API 验证逻辑测试
│   │   ├── api-types.test.ts      # API 类型守卫测试
│   │   ├── csv.test.ts            # v2.0 CSV 解析测试
│   │   ├── ai-lib.test.ts         # v2.0 AI 工具层测试
│   │   ├── GlassCard.test.tsx     # GlassCard 组件测试
│   │   └── BlessingCard.test.tsx  # BlessingCard 组件测试
│   └── middleware.ts              # Admin 路由鉴权中间件
├── e2e/                           # Playwright E2E 测试
│   ├── homepage.spec.ts           # 首页测试
│   ├── gift.spec.ts               # v2.0 送礼流程测试
│   ├── blessing.spec.ts           # 祝福墙测试
│   ├── admin.spec.ts              # 管理后台测试
│   ├── teacher.spec.ts            # 教师页测试
│   └── a11y.spec.ts               # 无障碍测试
├── load-tests/                    # k6 负载测试（v2.0 契约）
│   ├── smoke.js                   # 冒烟测试
│   ├── load.js                    # 负载测试
│   └── stress.js                  # 压力测试
├── database/
│   └── migrations/                # SQL 迁移脚本（001~013）
├── docs/                          # 文档（含 V2_DESIGN.md 设计蓝图）
└── public/                        # 静态资源
```

> **v2.0 移除**：大屏模式 `/display`、`QRCode.tsx`、`BlessingForm.tsx`（逻辑并入 GiftFlow）、`BlessingGalaxy.tsx`（由 GiftGalaxy 替代）。

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

    blessing_templates {
        uuid id PK "模板唯一标识"
        text content "官方祝福语原文"
        text category "分类: 感恩/祝愿/青春/温暖/文艺/趣味"
        text[] tags "语义标签数组"
        int sort_order "排序"
        bool is_active "是否启用"
        int usage_count "被选用次数"
        timestamptz created_at "创建时间"
    }

    gifts {
        text id PK "礼物 slug (rose/star/book/chalk/coffee/letter/apple/sapling)"
        text name "礼物名称"
        text icon "emoji 图标"
        text description "含义说明"
        text animation "动画类型 (bloom/twinkle/page/write/steam/envelope/bounce/grow)"
        int sort_order "排序"
        bool is_active "是否启用"
        int usage_count "送出次数"
    }

    ai_generations {
        uuid id PK "生成记录ID"
        text type "类型: classify/quote_score/quote_of_day/closing"
        jsonb input "输入快照"
        jsonb output "输出快照"
        text model "模型名"
        text status "状态: done/failed"
        timestamptz created_at "生成时间"
    }

    teachers ||--o{ blessings : "历史祝福（v2.0 新流程不再绑定）"
    blessings }o--o| blessing_templates : "引用官方词库（template_id）"
    blessings }o--o| gifts : "送出礼物（gift_id）"
    blessings ||--o{ blessing_likes : "被点赞"
```

---

## 数据流图

```mermaid
flowchart TB
    subgraph Client["🖥 浏览器"]
        Home["首页 /\n礼物星河 + 今日金句"]
        Gift["送礼流程 /gift\n6 步状态机"]
        Wall["祝福墙 /wall"]
        Teacher["教师页 /teacher/[id]"]
        Admin["管理后台 /admin\n5 tab"]
    end

    subgraph Next["⚡ Next.js 14"]
        Middleware["Middleware\nadmin_token 验签"]
        API["Route Handlers\nrequireAdmin() 二次验签"]
        SSR["Server Components"]
    end

    subgraph AI["🤖 AI 层（v2.0）"]
        Adapter["DeepSeek adapter\nopenai 兼容"]
        Fallback["规则降级\n（无 key / 调用失败）"]
        Matrix["仪式文案矩阵\n6情绪 × 8礼物"]
    end

    subgraph Supabase["🗄 Supabase"]
        PG[("PostgreSQL\nblessings/templates/gifts/ai_generations")]
        RLS["RLS 策略\n（词库/礼物仅读启用项）"]
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
    API -.->|低频批量任务| AI
    AI -->|结果入库| PG
    PG --> RLS
    Gift -->|模板/礼物查询| PG
    Wall -.->|WebSocket| RT
    RT --> PG
```

---

## 核心交互流程

### 送礼提交（v2.0）

```mermaid
sequenceDiagram
    actor User
    participant Flow as /gift GiftFlow
    participant API as POST /api/blessings
    participant RPC as check_rate_limit
    participant DB as PostgreSQL
    participant RT as Realtime

    User->>Flow: 选情绪 → 选祝福（AI 推荐）→ 选礼物 → 确认
    Flow->>API: POST {template_id, gift_id, nickname?, turnstile_token}
    API->>API: CSRF + 输入校验（UUID/slug/长度）
    API->>RPC: check_rate_limit(ip)
    RPC-->>API: remaining > 0
    API->>DB: 查询模板（RLS 仅返回启用项）
    DB-->>API: 模板 content + category
    API->>DB: 查询礼物（RLS 仅返回启用项）
    API->>API: 敏感词双保险 + 仪式文案矩阵取 ai_message
    API->>DB: INSERT blessings（teacher_id=null, status=pending）
    API-->>Flow: 201 Created
    Flow->>User: 礼物动画（3.8s）→ 成功页
    Note over User,Flow: 等待管理员审核
    Admin->>API: PATCH status=approved
    API->>DB: UPDATE blessings
    DB-->>RT: postgres_changes INSERT
    RT-->>Wall: 实时推送新祝福上墙/星河
```

### AI 后台任务（v2.0，低频手动触发）

```mermaid
sequenceDiagram
    actor Admin
    participant UI as AICenter
    participant API as /api/admin/ai/*
    participant AI as DeepSeek adapter
    participant DB as ai_generations

    Admin->>UI: 点击「批量分类 / 金句候选 / 总结」
    UI->>API: POST（requireAdmin + CSRF）
    API->>AI: chat(messages)
    alt AI 调用成功
        AI-->>API: JSON 结果（宽松解析）
    else 无 key / 调用失败
        API->>API: 规则降级（关键词分类 / 点赞排序 / 模板文案）
    end
    API->>DB: INSERT ai_generations（审计快照）
    API-->>UI: 结果展示
    Note over Admin,UI: 金句需人工确认 → quote_of_day → 首页展示
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
| **数据库** | RLS — 公开 SELECT 仅看 `approved`，INSERT 默认 `pending`；词库/礼物 anon 仅读 `is_active=true` |
| **v2.0 服务端取词** | 客户端只传 `template_id`，服务端查词库取 content（伪造 content 无效）；停用模板因 RLS 查不到 → 400 |
| **v2.0 严格触发器** | 013 迁移：INSERT 强制 `template_id` 非空（与前端同步上线后启用） |
| **点赞** | `SECURITY DEFINER` RPC 绕过 RLS |
| **管理 API** | admin_token HMAC 签名 cookie + Middleware 验签 + requireAdmin() 二次验签（Supabase Auth 不参与） |
| **上传** | service_role key，仅服务端使用 |
| **限流** | `check_rate_limit` RPC：提交 3次/10分钟/IP、点赞 20次/分钟/IP、管理员登录 5次/分钟/IP |
| **人机验证** | Cloudflare Turnstile（生产 fail-closed，`useTurnstile` hook 管理 widget 生命周期） |
| **输入校验** | 服务端严格校验（长度、必填、类型）；Admin PATCH 字段白名单；CSV 导入逐行校验（≤2MB/≤1000 行/敏感词过滤） |
| **v2.0 AI 隔离** | `ai_generations` 无 anon 策略；AI key 仅服务端环境变量；AI 故障不影响核心链路（全部规则降级） |

---

## 性能策略

| 策略 | 实现 |
| :--- | :--- |
| **组件懒加载** | `next/dynamic` — tsParticles / Confetti / QuoteOfDay / 管理面板 |
| **图片优化** | `next/image` → WebP |
| **API 缓存** | `Cache-Control: s-maxage + stale-while-revalidate`；随机推荐 `no-store` |
| **无限滚动** | `useSWRInfinite` + `IntersectionObserver` |
| **真实时** | Supabase Realtime WebSocket（替代轮询） |
| **粒子渲染** | Canvas（非 DOM，tsParticles） |
| **动画降级** | `prefers-reduced-motion` 媒体查询（礼物动画 3.8s → 0.8s 收尾） |
| **v2.0 AI 零实时调用** | 学生端推荐 = DB tags 索引查询（p95 < 200ms）；LLM 仅低频后台任务（分类/金句/总结）；仪式文案为静态矩阵直读 |
| **星河视觉上限** | GiftGalaxy 按热度取前 100 个粒子，防大量 Motion DOM |
