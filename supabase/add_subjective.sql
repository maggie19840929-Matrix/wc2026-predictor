-- 在 Supabase SQL Editor 运行
alter table public.matches
  add column if not exists subj_home_form integer check (subj_home_form between 1 and 5),
  add column if not exists subj_away_form integer check (subj_away_form between 1 and 5),
  add column if not exists subj_motivation integer check (subj_motivation between -2 and 2), -- 负数=客队更有动力，正数=主队更有动力
  add column if not exists subj_venue integer check (subj_venue between -2 and 2),           -- 负数=不利主队，正数=有利主队
  add column if not exists subj_intel text,   -- 特别情报文字
  add column if not exists subj_home_intel integer check (subj_home_intel between -2 and 2), -- 特别情报对主队影响
  add column if not exists subj_away_intel integer check (subj_away_intel between -2 and 2); -- 特别情报对客队影响
