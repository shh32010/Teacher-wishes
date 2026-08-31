// ============================================================
// Supabase 分页取全量查询 — 绕过 PostgREST 单次 1000 行上限
// （.limit(3000) 会被服务端静默截断为 1000 行，导致聚合统计丢数据）
// ============================================================

interface PageResult {
  data: unknown[] | null;
  error: { message?: string } | null;
}

/**
 * 循环 range 分页取全量查询结果
 * @param queryPage 执行单页查询（接收 from/to 偏移），返回 supabase 查询结果
 *   （supabase-js 查询链是 thenable 而非 Promise，参数类型用 PromiseLike）
 * @param maxRows 活动规模保护上限（默认 5000）
 * @param pageSize 单页大小（PostgREST 上限 1000）
 */
export async function fetchAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult>,
  maxRows = 5000,
  pageSize = 1000
): Promise<{ rows: T[]; error: { message?: string } | null }> {
  const rows: T[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const { data, error } = await queryPage(offset, offset + pageSize - 1);
    if (error) return { rows, error };
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break; // 最后一页
  }

  return { rows, error: null };
}
