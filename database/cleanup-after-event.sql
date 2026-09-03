-- ============================================================
-- 活动结束后数据清理脚本（2026-09-10 活动结束后执行）
-- 原则：IP 不因「方便以后统计」永久保存；活动数据本身长期保留
-- 执行方式：Supabase Dashboard → SQL Editor 逐条执行
-- ============================================================

-- 1. 限流记录：全部删除
--    rate_limits 仅用于活动期间防刷（IP + 时间戳），无任何保留价值
DELETE FROM rate_limits;

-- 2. 点赞记录：清空
--    blessing_likes 存 ip_address（活动期间防同 IP 重复点赞用）。
--    点赞总数已固化在 blessings.likes 冗余计数列，清空此表不影响展示；
--    活动结束后防重复不再有意义，IP 一并清除。
DELETE FROM blessing_likes;

-- 3. 祝福 / 词库 / 礼物 / AI 产物（ai_generations）：长期保留
--    均为活动数据，不含个人 IP，无需处理。

-- 4. （可选）祝福昵称匿名化 —— 仅当甲方确定不需要昵称统计时执行：
-- UPDATE blessings SET nickname = NULL, class = NULL WHERE NOT is_anonymous;
-- 默认不执行：昵称/班级是活动氛围的一部分，且无 IP 关联。
