// ============================================================
// 教师节祝福墙 — 冒烟测试 (k6 Smoke Test)
// ============================================================
// 用途：部署后快速验证核心端点是否正常
// 运行：k6 run load-tests/smoke.js
// 调试：k6 run --http-debug load-tests/smoke.js
//
// 配置：
//   1 VU（虚拟用户），持续 30 秒
//   每个端点都会验证 HTTP 200 状态码
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';

// ---- 测试目标 ----
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
// 生产环境示例：
// const BASE_URL = 'https://teacher.shh32010.dpdns.org';
// 使用：k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/smoke.js

// ---- 测试配置 ----
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    // 所有端点请求应成功（状态码 200-399）
    http_req_failed: ['rate<0.01'],
    // 每个请求应在 5 秒内完成
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  // ============================================================
  // 1. 首页 /
  // ============================================================
  {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      '首页 GET / → 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // ============================================================
  // 2. 祝福墙 /wall
  // ============================================================
  {
    const res = http.get(`${BASE_URL}/wall`);
    check(res, {
      '祝福墙 GET /wall → 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // ============================================================
  // 3. 祝福列表 API /api/blessings
  // ============================================================
  {
    const res = http.get(`${BASE_URL}/api/blessings?page=1&pageSize=10`);
    check(res, {
      '祝福列表 GET /api/blessings → 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // ============================================================
  // 4. 统计数据 API /api/blessings/stats
  // ============================================================
  {
    const res = http.get(`${BASE_URL}/api/blessings/stats`);
    check(res, {
      '统计 GET /api/blessings/stats → 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // ============================================================
  // 5. 教师列表 API /api/teachers
  // ============================================================
  {
    const res = http.get(`${BASE_URL}/api/teachers`);
    check(res, {
      '教师列表 GET /api/teachers → 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  // ============================================================
  // 6. CSRF Token API /api/csrf（写操作前置依赖）
  // ============================================================
  {
    const res = http.get(`${BASE_URL}/api/csrf`);
    check(res, {
      'CSRF GET /api/csrf → 200': (r) => r.status === 200,
    });
    sleep(1);
  }

  console.log('[冒烟测试] 所有端点验证完成');
}
