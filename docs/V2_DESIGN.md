# Teacher Wishes v2.0 · 设计文档

> **状态**：✅ 设计定稿（2026-08-29 决策确认，见第 18 章） | **目标版本**：v2.0.0 | **上线时间**：2026-09-05
> 本文档是 v2.0 开发施工的唯一蓝图。

---

## 1. 产品定位

从「给某位老师写祝福」升级为：

> **AI 沉浸式教师节互动送礼平台** — 学生进入活动 → 选择一句官方祝福 → 选择一份数字礼物 → AI 生成专属呈现 → 礼物化作光点飞入「全校教师节祝福星河」。

| 对比项 | v1.x（现状） | v2.0（目标） |
| :--- | :--- | :--- |
| 祝福来源 | 学生自由输入 | **甲方收集的祝福语库**，学生选择 |
| 指定老师 | 必选（数据不均） | **取消**，送给全体教师 |
| 互动形式 | 纯文字 | 祝福 + **数字礼物 + 送礼动画** |
| 数据结果 | 老师之间数量对比 | **全校祝福汇聚星河**（无个人排名） |
| 内容安全 | 敏感词过滤 + 人工审核 | 官方词库 + 敏感词过滤 + 数据库契约触发器（自动上墙，事后治理） |
| 亮点 | 视觉体验 | **AI 贯穿推荐/分类/总结全链路** |

## 2. 甲方需求 → 产品方案映射

| # | 甲方需求 | 产品方案 |
| :--- | :--- | :--- |
| 1 | 祝福语由甲方收集，放页面供学生选择 | 新建 `blessing_templates` 词库表 + 后台祝福语库管理（支持 CSV 批量导入 + AI 自动分类） |
| 2 | 增加送礼物效果 | 新建 `gifts` 礼物表（8 种数字礼物）+ 送礼仪式动画 + 礼物粒子飞入星河 |
| 3 | 取消指定老师，防止数据不均 | `blessings` 新流程不再绑定 `teacher_id`；公开展示页全面取消教师维度的数量对比 |
| 4 | AI 创意点（自主发挥） | 见第 5 章：8 个 AI 创意点，全部遵循「AI 辅助而非替代」原则 |

## 3. 产品原则（红线，写死）

1. **不比较老师** — 任何公开页面不出现教师排名/数量/热度对比。
2. **AI 辅助，不替代** — AI 只做推荐/分类/分析/总结；学生最终看到的祝福语全部来自甲方词库。
3. **礼物是情绪，不是消费** — 数字礼物无价格、无购买、无价值排名。
4. **仪式感** — 每次参与必须是「选择 → 确认 → 动画 → 星河汇聚」完整流程，不允许「点一下数据 +1」。
5. **后台可运营** — 甲方可自行改词库/礼物/开关/AI/看数据，不依赖开发。
6. **AI 不影响核心链路** — AI 服务不可用时，选祝福/选礼物/送礼全部可用，AI 只能降级（见第 12 章）。

## 4. 学生端流程（v2.0 核心）

```
/gift 页面（6 步状态机）
Step 1 情绪选择     AI 小助手：「今天想送出怎样的心意？」
                    😊 温暖 🌸 温柔 📚 感恩 ✨ 祝愿 😆 趣味
Step 2 选择祝福语   AI 从甲方词库推荐 3 句 + 分类浏览 + 「换一句」随机
Step 3 选择礼物     🌹 鲜花 / 🌟 星星 / 📚 书本 / ✏️ 粉笔 / ☕ 咖啡 / 💌 信件 / 🍎 苹果 / 🌱 小树
Step 4 确认送出     预览：祝福语 + 礼物 + AI 仪式文案 + 昵称/班级（可选）+ 匿名开关
Step 5 沉浸式动画   礼物动画（3~5 秒）→ 礼物化作光点 → 飞入祝福星河
Step 6 完成         「您的心意已经送达」+ 分享卡 + 「再送一份」
```

**参与规则（已确认）**：允许一个学生多次送礼，每轮完整流程算一次。提交成功后 3 秒冷却 + 服务端 IP 限流（每 10 分钟 200 条，校园 NAT 场景阈值）双保险，无需强唯一约束。

## 5. AI 创意点（8 个）

> 总体策略：**活动期间零实时 LLM 调用**（成本 + 稳定性），所有 AI 结果预计算入库；LLM 仅在低频任务（分类/金句/总结）触发。学生端"推荐"实为数据库语义查询，AI 挂了也不影响。

### P0（不依赖 LLM key 也可上线）

| # | 创意点 | 说明 | 技术实现 |
| :--- | :--- | :--- | :--- |
| AI-1 | **智能祝福推荐** | 学生选情绪 → 从词库按 `tags` 匹配推荐 3 句 + 「换一句」随机 | 纯 DB 查询（`tags && mood` + `random()`），**不调 LLM** |
| AI-2 | **情绪标签体系** | 每条词库祝福带分类/情绪标签，支撑推荐与统计 | 导入时预打标签（AI 或人工） |

### P1（建议做，低频 LLM 调用）

| # | 创意点 | 说明 | 技术实现 |
| :--- | :--- | :--- | :--- |
| AI-3 | **送礼仪式文案** | 根据「祝福 + 礼物」生成 2~3 句仪式感文案，随动画呈现 | 后台预生成模板矩阵（7 情绪 × 8 礼物 = 56 组）入库缓存；LLM 生成后人工可改 |
| AI-4 | **今日金句** | 从当日真实祝福中挑选「最温暖的一句话」展示在首页 | AI 打分排序候选 → 管理员后台一键确认 → 展示。AI 不修改原文，只筛选 |
| AI-5 | **全校情绪洞察** | 首页/管理后台展示情绪分布（感恩 42%、温柔 23%…），不展示老师个体数据 | 聚合统计（DB） + AI 生成一句总结文案（每日 1 次，可缓存） |
| AI-6 | **活动收官总结** | 活动结束生成「2026 教师节纪念」：参与人数、礼物构成、高频关键词、AI 收官诗 | 活动结束后管理员手动触发一次，结果入库 |

### P2（锦上添花）

| # | 创意点 | 说明 |
| :--- | :--- | :--- |
| AI-7 | **关键词云** | 从真实祝福提取高频词（谢谢/陪伴/成长…）在祝福星河页展示，纯 DB 统计 |
| AI-8 | **里程碑 AI 文案** | 礼物数达 100/500/1000/2000 时星河页显示 AI 一句话（如「1000 份礼物，汇成一句话——谢谢您」），文案预生成 + 缓存 |

## 6. 数据模型设计

### 6.1 迁移方案：ALTER 现有表（保留 353 条历史祝福）

**不改表名、不重建**，历史数据平滑迁移：

```sql
-- 011_v2_gift_and_templates.sql（新增迁移文件）

-- 1. 祝福语模板表（甲方词库）
CREATE TABLE blessing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                          -- 官方祝福语原文
  category TEXT NOT NULL DEFAULT '感恩',           -- 感恩|祝愿|青春|温暖|文艺|趣味
  tags TEXT[] NOT NULL DEFAULT '{}',              -- 语义标签，如 {'谢谢','成长','陪伴'}
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,                      -- 被学生选用次数（冗余计数）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 礼物表（slug 主键，运营可读）
CREATE TABLE gifts (
  id TEXT PRIMARY KEY,                            -- 'rose' | 'star' | 'book' | 'chalk'
                                                  -- | 'coffee' | 'letter' | 'apple' | 'sapling'
  name TEXT NOT NULL,                             -- 鲜花
  icon TEXT NOT NULL,                             -- 🌹
  description TEXT,                               -- 含义说明
  animation TEXT NOT NULL,                        -- bloom|twinkle|page|write|steam|envelope|bounce|grow
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. blessings 表 ALTER（新列全部可空，历史数据不受影响）
ALTER TABLE blessings
  ADD COLUMN template_id UUID REFERENCES blessing_templates(id),  -- 新流程：模板快照引用
  ADD COLUMN gift_id TEXT REFERENCES gifts(id),                   -- 新流程：礼物
  ADD COLUMN emotion TEXT,                                        -- 情绪快照（冗余，防模板分类后改）
  ADD COLUMN ai_message TEXT;                                     -- 仪式文案快照

-- 4. AI 生成物表（审计 + 缓存复用）
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                  -- classify|gift_message|quote_score|daily_summary|closing
  input JSONB,                         -- 输入快照
  output JSONB,                        -- 输出快照
  model TEXT,                          -- 模型名
  status TEXT DEFAULT 'done',          -- pending|done|failed
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 核心关系变化

```
v1.x：blessings ──FK──→ teachers（祝福绑定老师）

v2.0：blessings ──FK──→ blessing_templates（模板引用）
       blessings ──FK──→ gifts（礼物）
       blessings.teacher_id = NULL（新流程不绑定老师）
```

`teachers` 表**保留**（仅星河教师天体展示用，后台教师管理已删除）；教师主页 `/teacher/[id]` 已于 08-31 删除（往年数据已并入词库，页面失去独立价值）。

### 6.3 初始礼物数据（8 种）

| id | name | icon | animation | 含义 |
| :--- | :--- | :--- | :--- | :--- |
| rose | 鲜花 | 🌹 | bloom | 感谢 |
| star | 星星 | 🌟 | twinkle | 感恩 |
| book | 书本 | 📚 | page | 教诲 |
| chalk | 粉笔 | ✏️ | write | 讲台 |
| coffee | 咖啡 | ☕ | steam | 陪伴 |
| letter | 信件 | 💌 | envelope | 心意 |
| apple | 苹果 | 🍎 | bounce | 敬意 |
| sapling | 小树 | 🌱 | grow | 成长 |

## 7. RLS 权限矩阵（v2.0 增量）

| 资源 | anon | authenticated | service_role |
| :--- | :---: | :---: | :---: |
| blessing_templates SELECT（is_active） | ✅ | ✅ | ✅ |
| blessing_templates INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |
| gifts SELECT（is_active） | ✅ | ✅ | ✅ |
| gifts INSERT/UPDATE/DELETE | ❌ | ❌ | ✅ |
| blessings INSERT（新列） | ✅（触发器强制 `status='pending'`、`teacher_id=NULL`） | ✅ | ✅ |
| blessings SELECT（approved） | ✅ | ✅ | ✅ |
| ai_generations 全部操作 | ❌ | ❌ | ✅ |

沿用 v1.3.x 全部安全机制：CSRF 全环境、`check_rate_limit` 限流、`requireAdmin()` 二次验签、敏感词过滤、审核触发器。**新增触发器**：INSERT 时若 `template_id` 为空且 `teacher_id` 非空则拒绝（防止旧流程绕过——可选严格模式，甲方确认后启用）。

## 8. API 契约

> 所有 POST/PATCH/DELETE 遵循现有模式：CSRF → 输入校验 → 敏感词过滤 → 限流 → 业务逻辑。GET 带缓存头 `s-maxage=5, stale-while-revalidate=30`。

### 8.1 学生端（anon）

| 路由 | 方法 | 说明 |
| :--- | :--- | :--- |
| `GET /api/templates?category=温暖&page=1` | GET | 词库分页（仅 active），支持分类筛选 |
| `GET /api/templates/random?mood=感恩` | GET | 随机一条（「换一句」按钮） |
| `GET /api/gifts` | GET | 礼物列表（仅 active，按 sort_order） |
| `POST /api/blessings` | POST | **改造**：`{ template_id, gift_id, nickname?, class?, is_anonymous? }` — **服务端查模板取 content，不信任客户端** |
| `GET /api/ai/recommend?mood=温暖` | GET | 推荐 3 句（DB tags 匹配 + 随机，无 LLM） |
| `GET /api/ai/insights` | GET | 情绪分布 + 礼物分布 + 高频词（预计算聚合） |
| `GET /api/blessings/stats` | GET | 改造：新增 `total_gifts` 字段 |

POST /api/blessings 新契约：

```json
// 请求
{ "template_id": "uuid", "gift_id": "rose", "nickname": "浩浩", "class": "网络2401", "is_anonymous": false }
// 服务端：查模板(必须 is_active) → 取 content → 敏感词过滤 → 触发器强制 pending → 返回 201
// 模板不存在/停用 → 400；限流触发 → 429
```

### 8.2 管理端（requireAdmin + CSRF）

| 路由 | 方法 | 说明 |
| :--- | :--- | :--- |
| `GET /api/admin/templates` | GET | 词库列表（分页 + 分类筛选 + 关键词搜索） |
| `POST /api/admin/templates` | POST | 新增单条（content/category/tags） |
| `PATCH /api/admin/templates` | PATCH | 批量改：分类/启用停用/排序 |
| `DELETE /api/admin/templates` | DELETE | 批量删除（已引用的模板禁止物理删除，改停用） |
| `POST /api/admin/templates/import` | POST | **CSV 导入**（≤2MB、≤1000 行/次、逐行敏感词过滤） |
| `GET /api/admin/gifts` | GET | 礼物列表 |
| `PATCH /api/admin/gifts` | PATCH | 启用/排序/说明 |
| `POST /api/admin/ai/classify` | POST | 触发 AI 批量分类（给未打标签的模板生成 tags） |
| `POST /api/admin/ai/quotes` | POST | 生成今日金句候选（AI 打分，返回 top5 待确认） |
| `PATCH /api/admin/ai/quotes` | PATCH | 确认/驳回金句 |
| `POST /api/admin/ai/summary` | POST | 生成活动收官总结 |
| `GET /api/admin/ai/insights` | GET | 后台 AI 洞察面板数据 |

## 9. 页面与组件

### 9.1 路由

| 路由 | 状态 | 说明 |
| :--- | :--- | :--- |
| `/gift` | **新增** | 送礼主流程（6 步状态机） |
| `/` | 改造 | CTA 改「送出我的礼物」；新增今日金句区块；星河改为礼物汇聚视觉（GiftGalaxy） |
| `/wall` | 改造 | 卡片显示礼物 icon + 情绪标签；**不再显示老师** |
| `/display` | **已删除** | 用户拍板整体砍掉（含 QRCode 组件与 qrcode 依赖） |
| `/teacher/[id]` | **已删除**（08-31） | 往年数据并入词库后页面无独立价值，用户拍板删除 |
| `/admin` | 改造 | 新增 3 个 tab：祝福语库 / 礼物管理 / AI 中心 |

### 9.2 新增组件

```
src/components/gift/
├── GiftFlow.tsx            # 6 步状态机容器（idle→emotion→blessing→gift→confirm→sending→success）
├── EmotionPicker.tsx       # 情绪选择（6 类）
├── TemplatePicker.tsx      # 祝福卡片列表 + 换一句
├── GiftSelector.tsx        # 8 格礼物宫格
├── GiftAnimation.tsx       # 全屏礼物动画（Framer Motion，按 gifts.animation 分派）
├── GiftSuccess.tsx         # 完成页 + 分享卡 + 再送一份
src/components/ai/
├── AIRecommendPanel.tsx    # 「AI 为你挑了 3 句」
├── QuoteOfDay.tsx          # 今日金句
├── EmotionInsights.tsx     # 情绪分布可视化
src/components/galaxy/
├── GiftGalaxy.tsx          # 礼物星河（改造自 BlessingGalaxy：中心 TEACHERS + 礼物粒子环绕）
src/components/admin/
├── TemplateManager.tsx     # 词库管理 + CSV 导入
├── GiftManager.tsx         # 礼物管理
├── AICenter.tsx            # AI 控制中心（分类/金句/总结触发面板）
```

### 9.3 状态机（GiftFlow）

```
idle → emotion → blessing → gift → confirm → sending → success
                                                     ↓（失败）
                                                   error → confirm（可重试，禁止重复提交）
```

`sending` 期间按钮禁用 + 服务端限流双保险；`success` 后 3 秒冷却。

## 10. 礼物动画设计（GiftAnimation）

复用现有 Framer Motion + canvas-confetti，按 `gifts.animation` 分派 8 种动画，统一时间轴：

```
0~1.2s   背景暗下，礼物主体入场（如鲜花从底部升起）
1.2~2.8s 主体动画（绽放/蒸汽/书页…）
2.8~3.8s AI 仪式文案渐显（ai_message）+ 祝福文字出现
3.8~5.0s 礼物化作光点 → 飞向右上角「星河入口」→ 完成
```

约束：总时长 ≤ 5s；尊重 `prefers-reduced-motion`（跳过动画直接完成）；动画失败不影响提交成功状态（提交在 Step 4 确认时已完成，动画只是呈现）。

## 11. 星河改造（GiftGalaxy）

- 中心：「TEACHERS」光核（不再是单个教师天体）
- 环绕：学生送出的礼物粒子（按礼物类型着色），新礼物经 Realtime INSERT 即时飞入
- 数据上限：展示前 N 个礼物粒子（沿用 v1.x「按热度取前 100」策略防 DOM 爆炸）
- 隐藏所有教师维度数量对比

## 12. AI 架构与降级策略

### 12.1 供应商选择（中国大陆可访问）

采用 **adapter 模式**（`src/lib/ai/provider.ts`），默认 **智谱 GLM-4-Flash（官方免费）**，备选 SiliconFlow / DeepSeek（openai 兼容，总量 < ¥1）；**09-05 上线前接真实 key**，开发期用 mock：

```env
AI_PROVIDER=deepseek                 # deepseek | qwen | zhipu | mock
AI_API_KEY=                          # 对应平台 key
AI_MODEL=deepseek-chat
AI_BASE_URL=                         # 可选，openai 兼容地址
```

`mock` 模式：无 key 时所有 AI 功能返回预设规则结果（分类走关键词规则、文案走模板矩阵），保证无 key 也能上线。

### 12.2 调用策略（成本控制核心）

| 场景 | 调用时机 | 频率 | 说明 |
| :--- | :--- | :--- | :--- |
| 学生推荐祝福 | **不调 LLM** | — | DB tags 查询 |
| 仪式文案 | 后台预生成 | 56 组一次性 | 缓存入库，学生读取 |
| 模板分类打标签 | 后台导入时 | 批量 | 500 条 ≈ 1 次调用（批量返回 JSON） |
| 金句打分 | 每日定时/手动 | 1 次/日 | 返回 top5 候选待人工确认 |
| 情绪总结文案 | 每日定时 | 1 次/日 | 结果缓存 |
| 里程碑文案 | 预生成 | 4 条一次性 | 100/500/1000/2000 |
| 收官总结 | 活动结束 | 1 次 | 手动触发 |

全部 AI 结果写 `ai_generations` 表（审计 + 防重复调用）。

### 12.3 降级矩阵

| 故障 | 学生端表现 | 恢复 |
| :--- | :--- | :--- |
| LLM 不可用 | 推荐退化为随机推荐；仪式文案用内置模板矩阵 | 自动 |
| 推荐 API 超时 | 前端直接展示分类浏览（不阻塞 Step 2） | 自动 |
| insights 失败 | 情绪区块隐藏 | 自动 |
| **核心链路（模板/礼物/提交）** | **永不依赖 AI** | — |

## 13. 后台设计（Admin）

### 13.1 祝福语库（TemplateManager）

- 表格：内容 / 分类 / 标签 / 使用次数 / 状态 / 排序
- 操作：新增、编辑、批量启停、批量删除（被引用 → 仅停用）、**CSV 导入**
- CSV 格式（甲方提供的 Excel 转 CSV）：`content,category`（分类列为空时由 AI 自动分类）
- 导入校验：≤1000 行/次、内容长度 5~200 字、逐行敏感词过滤、重复检测

### 13.2 礼物管理（GiftManager）

- 8 种礼物的开关/排序/文案，活动换主题不改代码
- 字段白名单：`is_active`、`sort_order`、`description`

### 13.3 AI 中心（AICenter）

- 批量分类（显示进度：已分类 312/500）
- 金句候选列表（top5 打分 + 确认/驳回）
- 收官总结生成按钮 + 结果预览
- 活动洞察面板：参与/礼物/情绪/高频词 + AI 一句话总结

### 13.4 活动配置（轻量版）

激活 `events` 表（001 已预留）：当前活动开关、开始/结束时间、是否允许重复参与。不做多活动管理（v2.3 再做）。

## 14. 性能与容量

- 学生端 AI 推荐 = 索引查询（`blessing_templates.tags` 建 GIN 索引），p95 < 200ms
- 礼物动画全部前端 CSS/Framer Motion，零额外带宽
- Realtime 沿用现有 INSERT-only 订阅 + 防抖（v1.3.1 已根治请求风暴）
- 预计新增表数据量：词库 ≤500 条、礼物 8 条、ai_generations ≤100 条 —— 对现有容量评估无影响

## 15. 测试计划

| 类型 | 用例 |
| :--- | :--- |
| 单元 | 模板推荐查询、CSV 解析与校验、AI adapter mock、状态机、仪式文案矩阵 |
| API 集成 | POST /api/blessings 新契约（模板停用→400、伪造 content→忽略）、导入限流、礼物 CRUD 白名单 |
| E2E | /gift 完整流程 6 步、匿名提交、礼物动画降级（reduced-motion）、管理后台词库导入 |
| 安全回归 | `database/security-check.mjs` 扩展：新表 RLS、触发器、anonym 无法写 gifts/templates |
| 负载 | 现有 k6 脚本适配新 POST 契约 |

## 16. 文件改动清单

### 新增

| 路径 | 说明 |
| :--- | :--- |
| `database/migrations/011_v2_gift_and_templates.sql` | 新表 + ALTER + RLS + 触发器 + 种子礼物数据 |
| `src/app/gift/page.tsx` | 送礼主流程页 |
| `src/app/api/templates/route.ts` | 词库公开查询 |
| `src/app/api/templates/random/route.ts` | 换一句 |
| `src/app/api/gifts/route.ts` | 礼物列表 |
| `src/app/api/ai/recommend/route.ts` | 推荐（DB 查询） |
| `src/app/api/ai/insights/route.ts` | 情绪洞察 |
| `src/app/api/admin/templates/route.ts` + `import/route.ts` | 词库管理 + CSV 导入 |
| `src/app/api/admin/gifts/route.ts` | 礼物管理 |
| `src/app/api/admin/ai/{classify,quotes,summary}/route.ts` | AI 任务触发 |
| `src/lib/ai/provider.ts` + `prompts.ts` | AI adapter + 提示词 |
| `src/lib/gifts.ts` | 礼物配置读取 |
| `src/components/gift/*`（6 个组件） | 送礼流程 |
| `src/components/ai/*`（3 个组件） | AI 展示组件 |
| `src/components/galaxy/GiftGalaxy.tsx` | 礼物星河 |
| `src/components/admin/{TemplateManager,GiftManager,AICenter}.tsx` | 后台 3 个管理面板 |

### 修改

| 路径 | 改动 |
| :--- | :--- |
| `src/types/index.ts` | 新增 `BlessingTemplate` / `Gift` / `Emotion` 类型；`Blessing` 加新字段；`CreateBlessingPayload` 改为 template_id + gift_id |
| `src/app/api/blessings/route.ts` | POST 新契约：服务端查模板取 content |
| `src/app/api/blessings/stats/route.ts` | 新增 total_gifts |
| `src/app/page.tsx` | CTA 文案 + 今日金句 + 星河入口调整 |
| `src/app/wall/page.tsx` + `BlessingCard.tsx` | 礼物 icon + 情绪标签，移除老师显示（后续演进为同句聚合 GroupedBlessingCard） |
| `src/app/display/page.tsx` | ~~4 场景循环~~ **已删除**（用户拍板，决策 11） |
| `src/app/admin/page.tsx` | 新增 3 个 tab |
| `src/components/blessing/BlessingForm.tsx` | ~~移除教师选择~~ **已删除**（Turnstile 提取为 useTurnstile，昵称/班级并入 /gift Step 4） |
| `src/middleware.ts` | 无改动（admin 路由已覆盖） |
| `database/security-check.mjs` | 扩展新表检查 |
| `CLAUDE.md` / `docs/API.md` / `docs/SECURITY.md` / `docs/ARCHITECTURE.md` | 文档同步 |

### 保留不动

`src/lib/profanity.ts`（敏感词）、`src/lib/csrf.ts`、`src/lib/client-ip.ts`、`src/lib/auth/admin.ts`、`src/hooks/*`、教师相关 SSR 页面。

## 17. 版本规划

**2026-09-05 一次性发布完整 v2.0.0**（含 AI 全量，AI 供应商接真实 key）。施工按里程碑推进，非分版本发布：

| 里程碑 | 内容 | 工期 |
| :--- | :--- | :--- |
| M1 数据层 | 迁移 011 SQL + 类型定义 + RLS/触发器 + 种子礼物 + 占位词库（AI 生成 60~100 条，6 分类） | 08-29 → 08-30 |
| M2 后台运营 | 词库 CRUD + CSV 导入 + 礼物管理 + AI 中心 | 08-30 → 08-31 |
| M3 送礼流程 | /gift 6 步状态机 + 8 种礼物动画 + POST 契约改造 | 08-31 → 09-01 |
| M4 展示层 | 星河（GiftGalaxy）/祝福墙/首页/大屏改造 | 09-01 → 09-02 |
| M5 AI 全量 | AI adapter（DeepSeek）+ 分类/金句/总结/情绪洞察 + 仪式文案矩阵 | 09-02 → 09-03 |
| M6 测试收口 | 单元/API 集成/E2E/安全回归/负载 + 文档同步 | 09-03 → 09-04 |
| M7 发布 | 生产部署 + 冒烟测试 + 甲方词库导入验收 | 09-04 → 09-05 |

## 18. 设计决策记录（已确认 2026-08-29）

| # | 决策点 | 结论 | 拍板方 |
| :--- | :--- | :--- | :--- |
| 1 | 上线时间 | **推迟到 09-05 左右**，做完整 v2.0（含 AI 全量），不赶 09-01 | ✅ 用户确认 |
| 2 | 学生参与次数 | **允许多次**（每轮完整流程一次，3 秒冷却 + IP 限流防刷） | ✅ 用户确认 |
| 3 | 学生身份显示 | **保留昵称+班级可选**，与 v1 一致，匿名开关保留 | ✅ 用户确认 |
| 4 | 历史 353 条祝福 | 保留展示（含老师标签），新祝福不带老师，平滑迁移 | ✅ Claude 拍板 |
| 5 | 自由输入祝福 | **完全移除**，v2.0 纯词库选择（甲方意图 + 内容安全） | ✅ Claude 拍板 |
| 6 | AI 供应商 | **DeepSeek**（用户拍板，全活动用量 < ¥1），adapter 保留智谱免费/SiliconFlow 备选；无 key 时规则降级（mock） | ✅ 用户拍板（08-29） |
| 7 | 严格模式触发器 | 启用（新 INSERT 必须带 template_id） | ✅ Claude 拍板 |
| 8 | teachers 表 | 保留（教师介绍页 + 历史数据 + 未来扩展） | ✅ Claude 拍板 |
| 9 | 词库素材 | 测试数据由 Claude 直接生成（种子 SQL，6 分类 × 10 条）；甲方 Excel 到位后 CSV 覆盖导入 | ✅ 用户确认 |
| 10 | 仪式文案 | 预生成「6 情绪 × 8 礼物」= 48 组矩阵入库缓存，管理员可改 | ✅ Claude 拍板 |
| 11 | 大屏模式（/display） | **整体删除**，v2.0 不做大屏（含 QRCode 组件、display-stability 测试、qrcode 依赖一并移除） | ✅ 用户拍板（08-29） |

---

*本文档由 Claude Code 基于 v1.3.4 现状 + 甲方需求撰写，2026-08-29 完成设计定稿。*
