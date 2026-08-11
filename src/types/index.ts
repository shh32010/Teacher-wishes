// ============================================================
// 教师节祝福墙 · 全局类型定义
// ============================================================

/** 祝福状态 */
export type BlessingStatus = 'pending' | 'approved' | 'rejected';

/** 教师 */
export interface Teacher {
  id: string;
  name: string;
  department: string | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
}

/** 祝福 */
export interface Blessing {
  id: string;
  user_id: string | null;
  teacher_id: string | null;
  nickname: string | null;
  class: string | null;
  content: string;
  likes: number;
  is_featured: boolean;
  is_anonymous: boolean;
  status: BlessingStatus;
  created_at: string;
  /** 关联查询时可带出教师信息 */
  teacher?: Teacher | null;
}

/** 提交祝福的请求体 */
export interface CreateBlessingPayload {
  teacher_id?: string;
  nickname?: string;
  class?: string;
  content: string;
  is_anonymous?: boolean;
}

/** 统计信息 */
export interface BlessingStats {
  total_blessings: number;
  total_participants: number;
  total_likes: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_count: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

/** 管理后台 - 祝福更新 */
export interface AdminUpdateBlessing {
  status?: BlessingStatus;
  is_featured?: boolean;
}

/** 事件模板（未来扩展） */
export interface Event {
  id: string;
  name: string;
  theme_config: Record<string, unknown>;
  start_time: string;
  end_time: string;
}
