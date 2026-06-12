-- 大小球（Over/Under）数据
alter table matches
  add column if not exists totals_detail   jsonb,   -- 各庄大小球赔率 [{key,title,line,over,under}]
  add column if not exists ayx_total_line  numeric, -- AYX 盘口线，如 2.5
  add column if not exists ayx_over         numeric, -- AYX 大球赔率
  add column if not exists ayx_under        numeric; -- AYX 小球赔率
