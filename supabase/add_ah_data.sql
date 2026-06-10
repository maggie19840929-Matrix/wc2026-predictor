-- 添加让球盘数据字段
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_ah_win_rate NUMERIC,  -- 主队近10场赢盘率 0-1
  ADD COLUMN IF NOT EXISTS away_ah_win_rate NUMERIC,  -- 客队近10场赢盘率 0-1
  ADD COLUMN IF NOT EXISTS home_over_rate   NUMERIC,  -- 主队近10场大球率 0-1
  ADD COLUMN IF NOT EXISTS away_over_rate   NUMERIC;  -- 客队近10场大球率 0-1
