// ============================================================
// CSRF 客户端工具 — 浏览器端获取和缓存 Token
// ============================================================

let cachedToken: string | null = null;
let fetchPromise: Promise<string> | null = null;

/**
 * 获取 CSRF Token（从 /api/csrf 端点获取并缓存）
 * - 首次调用时请求服务端获取新 token
 * - 后续调用直接返回缓存值
 * - 请求失败时返回空字符串（调用方可据此提示用户，服务端将拒绝无 token 请求）
 */
export async function getCsrfToken(): Promise<string> {
  if (cachedToken !== null) return cachedToken;

  // 防止并发重复请求
  if (!fetchPromise) {
    fetchPromise = fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => {
        const token = (data?.token as string) || '';
        cachedToken = token;
        return token;
      })
      .catch(() => {
        // 失败时重置 promise，允许下次调用重试，
        // 否则后续所有 POST 将永久 403 直到页面刷新
        fetchPromise = null;
        return '';
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return fetchPromise!;
}

/**
 * 清除缓存的 token（例如登录/登出后调用，确保下次请求获取新 token）
 */
export function clearCsrfToken(): void {
  cachedToken = null;
}

/**
 * 获取带 CSRF 头的请求头对象
 * 用于 fetch 调用时直接展开到 headers 中
 *
 * 使用示例：
 *   const headers = await getCsrfHeaders();
 *   fetch('/api/blessings', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', ...headers },
 *     body: JSON.stringify(data),
 *   });
 */
export async function getCsrfHeaders(): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return token ? { 'X-CSRF-Token': token } : {};
}
