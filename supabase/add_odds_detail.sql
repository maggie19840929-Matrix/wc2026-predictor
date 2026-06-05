-- 在 Supabase SQL Editor 运行，给 matches 表加赔率详情字段
alter table public.matches add column if not exists odds_detail jsonb;
