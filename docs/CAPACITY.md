# 📊 容量评估与扩容指南

> 基于当前架构（Vercel Hobby + Supabase Free）的容量分析

---

## 当前设施

| 层 | 服务 | 方案 | 关键限制 |
|:---|:---|:---|:---|
| 前端托管 | Vercel | Hobby | 100GB 带宽/月，12 并发 Serverless 函数 |
| 数据库 | Supabase | Free | 500MB 存储，5GB 带宽/月 |
| 实时推送 | Supabase Realtime | Free | **200 并发 WebSocket 连接**，200万消息/月 |
| 文件存储 | Supabase Storage | Free | 1GB 存储 |
| 静态缓存 | Vercel Edge CDN | 自动 | `Cache-Control: s-maxage=5, stale-while-revalidate=30` |
| 图片优化 | `next/image` | 内置 | WebP/AVIF 自动转换，CDN 分发 |

---

## 现有优化

| 优化项 | 效果 |
|:---|:---|
| API `Cache-Control: s-maxage=5, stale-while-revalidate=30` | 读请求 80%+ 命中 CDN，不触发 Serverless 函数 |
| `next/image` WebP/AVIF + `remotePatterns` | 图片经 CDN 压缩分发，首屏 ~200KB |
| `next/dynamic` 懒加载 + `splitChunks` | 首屏 JS ~87KB，非首屏组件按需加载 |
| IP 限流（送礼 200条/10分钟、点赞 20次/分钟） + CSRF + Turnstile | 防恶意刷量，保护写入路径 |
| Supabase RLS + RPC（`increment_likes`） | 原子化操作，减少数据库往返 |
| v2.0 同句聚合（`/api/blessings/grouped`） | 全量 approved 一次取回 JS 聚合（≤3000 条、内容短，约 1MB 响应），分页请求从「每页一次」降为「每组一次」 |
| 后台活动概览（`/api/admin/overview`） | 服务端单次全量读取 + JS 聚合（替代 3 个请求）。**适用预期活动规模（数千条）；若祝福总量达约 1 万条以上，应迁移到数据库聚合/RPC 方案**（get_sentence_stats 已示范该模式） |

---

## 各场景容量

### 纯浏览（首页 / 祝福墙读）

- 瓶颈：Vercel Hobby 12 并发 Serverless 函数
- CDN 缓存命中率 80%+（`s-maxage=5s`），未命中才触发函数
- 单函数响应 ~200ms → 60 未命中请求/秒
- 加上命中 → **~300 请求/秒 ≈ 500-800 人同时浏览**

### 实时在线（祝福墙常驻 + Realtime 订阅）

- 瓶颈：**Supabase Realtime 200 并发 WebSocket 连接**
- 每个打开祝福墙的浏览器标签页占 1 个连接
- 离开页面后连接自动释放
- **~200 人同时在祝福墙页面**

### 写操作（送礼提交）

- 瓶颈：Vercel 函数并发 + IP 限流
- 无验证码时 ~20 条/秒
- 有 Turnstile 验证时 ~10 条/秒
- **保守估计 50-100 条/分钟**
- v2.0 学生端 AI 推荐 = 数据库 tags 索引查询，无 LLM 调用，写入路径零 AI 依赖

### 管理后台

- 仅管理员使用，无并发瓶颈
- 审核/置顶操作走 Service Role Key，无 RLS 开销

---

## 瓶颈总结

```
用户量增加 →
  → 200 人同时在线 ← Supabase Realtime Free 上限
  → 500-800 人浏览 ← Vercel Serverless 并发 + CDN 缓存
  → 5GB/月 带宽   ← Supabase Free（图片/API 响应）
  → 100GB/月 带宽  ← Vercel Hobby（页面/静态资源）
```

**最大瓶颈：Supabase Realtime 200 连接**，其次是 Vercel 12 并发函数。

---

## 扩容路径

### 方案一：最小升级（推荐）

| 升级 | 月费 | 效果 |
|:---|:---|:---|
| Supabase Pro | $25 | 500 Realtime 连接 + 50GB 带宽 + 8GB 数据库 + 100GB 存储 |
| Vercel Pro | $20 | 1TB 带宽 + 更多函数并发 + 1000 函数执行秒 |

> **$45/月 可支撑 2000+ 并发用户**

### 方案二：仅升级 Supabase

| 升级 | 月费 | 效果 |
|:---|:---|:---|
| Supabase Pro | $25 | 打破 200 Realtime 连接瓶颈 |

> **$25/月，配合 Vercel CDN 缓存，可支撑 1000+ 并发用户**

### 方案三：活动期间临时升级

教师节活动周期短（1-2 天高峰），可以：
1. 活动前一天升级到 Supabase Pro
2. 活动结束后降回 Free
3. 实际花费 ≈ $1-2

---

## 监控指标

上线后关注以下指标（需接入 Vercel Analytics / Sentry）：

| 指标 | 告警阈值 | 说明 |
|:---|:---|:---|
| Realtime 连接数 | > 150 | 接近 200 上限时预警 |
| API p95 延迟 | > 1000ms | CDN 缓存失效或 DB 慢查询 |
| Serverless 函数错误率 | > 1% | CSRF 失败、IP 限流等 |
| 带宽消耗 | > 80% 配额 | 防止超额断流 |

---

## k6 压测结果

| 测试 | 配置 | 结果 |
|:---|:---|:---|
| 冒烟测试 | 1 VU / 30s / 6 端点 | ✅ 全部 200 |
| 负载测试 | 50→100 VU / 2min | 本地未跑，上线后建议跑 |
| 压力测试 | 10→200 VU / 4min | 本地未跑，上线后建议跑 |
| 生产验证 | 20 VU / 620 req | ✅ 0 失败 / p95=1.37s |

```bash
# 本地运行（不会影响线上）
k6 run load-tests/smoke.js

# 生产环境（谨慎！会产生真实流量）
k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/load.js
k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/stress.js
```

---

## 推荐策略

对于教师节场景（高峰短、流量集中）：

1. **保持 Free 方案** — 200 并发足够中小型学校使用
2. 如果推送给多个学校/区域 → **活动前一天升级 Supabase Pro（$25/月）**
3. 活动后降回 Free
4. Vercel Hobby 通常足够，CDN 缓存承担大部分读流量
