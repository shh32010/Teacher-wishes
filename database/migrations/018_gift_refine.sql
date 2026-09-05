-- ============================================================
-- 018 礼物精调（甲方拍板 2026-09-05）：活动可选 6 种
--   停用：书本 book / 粉笔 chalk / 信件 letter（软停用保历史引用）
--   新增：千纸鹤 crane（animation='fly'，sort 6）
--   目标排序：鲜花1 星星2 咖啡3 苹果4 小树5 千纸鹤6
-- 注：仪式文案矩阵/动画变体已在代码同步（messages.ts / GiftAnimation.tsx）
-- ============================================================

-- 1. 停用书本/粉笔/信件
UPDATE gifts SET is_active = false WHERE id IN ('book', 'chalk', 'letter');

-- 2. 重排启用礼物
UPDATE gifts
SET sort_order = CASE id
  WHEN 'rose'    THEN 1
  WHEN 'star'    THEN 2
  WHEN 'coffee'  THEN 3
  WHEN 'apple'   THEN 4
  WHEN 'sapling' THEN 5
END
WHERE is_active = true;

-- 3. 新增千纸鹤
INSERT INTO gifts (id, name, icon, description, animation, sort_order, is_active)
VALUES ('crane', '千纸鹤', '🕊️', '折一只千纸鹤，把祝福轻轻捎到您手边', 'fly', 6, true)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, icon = EXCLUDED.icon,
      description = EXCLUDED.description, animation = EXCLUDED.animation,
      sort_order = EXCLUDED.sort_order, is_active = true;
