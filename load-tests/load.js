// ============================================================
// 教师节祝福墙 — 负载测试 (k6 Load Test)
// ============================================================
// 用途：模拟真实用户访问的并发负载
// 运行：k6 run load-tests/load.js
// 调试：k6 run --http-debug load-tests/load.js
//
// 场景：
//   - 从 50 VU 逐步增加到 100 VU，持续 2 分钟
//   - 模拟真实用户行为分布：
//       40% 浏览首页
//       30% 浏览祝福墙
//       20% 获取祝福列表 API
//       10% 提交祝福 POST
//   - 检查 p95 延迟 < 1000ms
//   - 检查错误率 < 1%
//
// 注意：
//   - POST /api/blessings 有 IP 速率限制（每10分钟3条）
//     负载测试中每个 VU 来自同一台机器（同 IP），POST 会很快受限
//     因此 POST 比例设得较低（10%），且每次迭代仅提交 1 次
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';

// ---- 测试目标 ----
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
// 使用：k6 run -e BASE_URL=https://teacher.shh32010.dpdns.org load-tests/load.js

// ---- 测试数据池 ----
// 模拟不同学生提交的祝福内容
const BLESSING_POOL = [
  {
    content: '老师您辛苦了，祝您节日快乐！',
    nickname: '小明',
    class: '高三(1)班',
    is_anonymous: false,
  },
  {
    content: '感谢您一年的悉心教导，祝您身体健康！',
    nickname: '小红',
    class: '高三(2)班',
    is_anonymous: false,
  },
  { content: '教诲如春风，师恩似海深。', nickname: '小李', class: '高二(3)班', is_anonymous: true },
  {
    content: '您是我遇到的最好的老师！',
    nickname: '小王',
    class: '高三(4)班',
    is_anonymous: false,
  },
  {
    content: '祝老师桃李满天下，春晖遍四方！',
    nickname: '小张',
    class: '高一(1)班',
    is_anonymous: false,
  },
  {
    content: '一支粉笔，两袖清风，三尺讲台，四季晴雨。',
    nickname: '小刘',
    class: '高二(5)班',
    is_anonymous: true,
  },
  {
    content: '老师，您就像蜡烛一样燃烧自己照亮别人。',
    nickname: '小陈',
    class: '高三(6)班',
    is_anonymous: false,
  },
  {
    content: '谢谢您让我爱上了这门课！',
    nickname: '小周',
    class: '高一(3)班',
    is_anonymous: false,
  },
];

// 随机选取祝福
function randomBlessing() {
  return BLESSING_POOL[Math.floor(Math.random() * BLESSING_POOL.length)];
}

// ---- 测试配置 ----
export const options = {
  // 场景：两个阶段
  //   阶段1（0-30s）：从 1 逐步增加至 50 VU（预热）
  //   阶段2（30-120s）：从 50 逐步增加至 100 VU（目标负载）
  stages: [
    { duration: '30s', target: 50 }, // 预热：1 → 50 VU
    { duration: '90s', target: 100 }, // 目标：50 → 100 VU
  ],

  thresholds: [
    // p95 延迟 < 1000ms（核心 SLA）
    { threshold: 'http_req_duration{type:page}:p(95)<1000', abortOnFail: false },
    { threshold: 'http_req_duration{type:api}:p(95)<1000', abortOnFail: false },
    // 错误率 < 1%
    { threshold: 'http_req_failed:rate<0.01', abortOnFail: false },
  ],
};

// ---- 每个 VU 初始化一次 ----
// 获取教师列表用于后续 POST 请求（随机选择 teacher_id）
let teachers = [];

export function setup() {
  const res = http.get(`${BASE_URL}/api/teachers`);
  if (res.status === 200) {
    const data = res.json();
    teachers = data.teachers || [];
    console.log(`[setup] 已加载 ${teachers.length} 位教师`);
  }
  return { teachers };
}

// ---- 主测试逻辑 ----
export default function (data) {
  // 收集 teacher IDs（从 setup 阶段传入）
  const teacherIds = (data?.teachers || []).map((t) => t.id);

  // 加权随机路由：根据用户行为分布选择操作
  const route = Math.random();

  if (route < 0.4) {
    // ============================================================
    // 40%：浏览首页
    // ============================================================
    group('浏览首页', () => {
      const res = http.get(`${BASE_URL}/`, {
        tags: { type: 'page' },
      });
      check(res, {
        '首页 → 200': (r) => [200, 304].includes(r.status),
      });
    });
    sleep(3 + Math.random() * 5); // 停留 3~8 秒
  } else if (route < 0.7) {
    // ============================================================
    // 30%：浏览祝福墙
    // ============================================================
    group('浏览祝福墙', () => {
      const res = http.get(`${BASE_URL}/wall`, {
        tags: { type: 'page' },
      });
      check(res, {
        '祝福墙 → 200': (r) => [200, 304].includes(r.status),
      });
    });
    sleep(2 + Math.random() * 4); // 停留 2~6 秒

    // 有时会在祝福墙上滚动加载更多（获取 API 数据）
    if (Math.random() < 0.3) {
      const page = 1 + Math.floor(Math.random() * 3);
      const res = http.get(`${BASE_URL}/api/blessings?page=${page}&pageSize=10`, {
        tags: { type: 'api' },
      });
      check(res, {
        '祝福列表 → 200': (r) => r.status === 200,
      });
    }
  } else if (route < 0.9) {
    // ============================================================
    // 20%：获取祝福列表 API（纯 API 调用，不渲染页面）
    // ============================================================
    group('获取祝福列表', () => {
      const page = 1 + Math.floor(Math.random() * 5);
      const res = http.get(`${BASE_URL}/api/blessings?page=${page}&pageSize=20`, {
        tags: { type: 'api' },
      });
      check(res, {
        '祝福列表API → 200': (r) => r.status === 200,
      });
    });
    sleep(1 + Math.random() * 2);
  } else {
    // ============================================================
    // 10%：提交祝福 POST
    // ============================================================
    group('提交祝福', () => {
      const blessing = randomBlessing();

      // 如果有教师数据，随机选择一位
      const payload = {
        content: `${blessing.content} [k6-test-${Date.now()}]`,
        nickname: blessing.nickname,
        class: blessing.class,
        is_anonymous: blessing.is_anonymous,
      };
      if (teacherIds.length > 0) {
        payload.teacher_id = teacherIds[Math.floor(Math.random() * teacherIds.length)];
      }

      const res = http.post(`${BASE_URL}/api/blessings`, JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'api' },
      });

      // 201 = 成功创建，429 = 速率限制（预期行为）
      check(res, {
        '提交祝福 → 201/429': (r) => r.status === 201 || r.status === 429,
      });
    });
    sleep(5 + Math.random() * 10); // 填写表单需要更长时间
  }
}

// ---- 测试结束摘要 ----
export function teardown() {
  console.log('[teardown] 负载测试结束');
}
