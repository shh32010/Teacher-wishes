// ============================================================
// 教师节祝福墙 · 全局类型定义
// ============================================================

/** 祝福状态 */
export type BlessingStatus = 'pending' | 'approved' | 'rejected';

/** 情绪/词库分类（v2.0）；「未分类」为导入兜底类，AI 分类后自动归入前 6 类 */
export type EmotionCategory = '感恩' | '祝愿' | '青春' | '温暖' | '文艺' | '趣味' | '未分类';

/** 礼物动画类型（v2.0） */
export type GiftAnimation =
  'bloom' | 'twinkle' | 'page' | 'write' | 'steam' | 'envelope' | 'bounce' | 'grow';

/** 教师 */
export interface Teacher {
  id: string;
  name: string;
  department: string | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
}

/** 祝福语模板（甲方词库，v2.0） */
export interface BlessingTemplate {
  id: string;
  content: string;
  category: EmotionCategory;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  usage_count: number;
  /** 运营备注（如「甲方提供」「待替换」） */
  remark: string | null;
  created_at: string;
  updated_at: string;
}

/** 数字礼物（v2.0） */
export interface Gift {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  animation: GiftAnimation;
  sort_order: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

/** AI 生成物记录（v2.0） */
export interface AiGeneration {
  id: string;
  type: 'classify' | 'gift_message' | 'quote_score' | 'daily_summary' | 'closing';
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  model: string | null;
  status: 'pending' | 'done' | 'failed';
  error: string | null;
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
  /** v2.0：词库模板引用（新流程必填，历史数据为 null） */
  template_id: string | null;
  /** v2.0：礼物引用（新流程必填，历史数据为 null） */
  gift_id: string | null;
  /** v2.0：情绪快照（冗余存储，防模板分类后改） */
  emotion: EmotionCategory | null;
  /** v2.0：AI 仪式文案快照 */
  ai_message: string | null;
  /** 关联查询时可带出教师信息 */
  teacher?: Teacher | null;
  /** 关联查询时可带出礼物信息 */
  gift?: Gift | null;
  /** 管理端附加：该句祝福共有多少位同学送出（同句计数） */
  sentence_count?: number;
}

/** 提交祝福的请求体（v2.0：只传模板/礼物 ID，服务端查官方词库取内容） */
export interface CreateBlessingPayload {
  template_id: string;
  gift_id: string;
  nickname?: string;
  class?: string;
  is_anonymous?: boolean;
  turnstile_token?: string;
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
