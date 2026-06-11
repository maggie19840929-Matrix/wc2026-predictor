-- 世界杯小账本：记录每日投注输赢
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  username    text not null,
  entry_date  date not null default current_date,
  stake       numeric not null default 0,   -- 当日投入
  payout      numeric not null default 0,    -- 当日收回（0=全输；盈利时填回本总额）
  note        text,                          -- 备注（买了什么）
  created_at  timestamptz default now()
);

create index if not exists idx_ledger_username on ledger_entries (username);
create index if not exists idx_ledger_date on ledger_entries (entry_date);

-- 个人汇总视图
create or replace view ledger_summary as
select
  username,
  count(*)                          as days_played,
  sum(stake)                        as total_stake,
  sum(payout)                       as total_payout,
  sum(payout - stake)               as net_profit,
  case when sum(stake) > 0
       then round(sum(payout - stake) / sum(stake) * 100, 1)
       else 0 end                   as roi_pct
from ledger_entries
group by username;
