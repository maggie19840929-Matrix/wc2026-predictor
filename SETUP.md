# WC2026 预测平台 — 部署指南

## 1. 安装依赖

```bash
cd wc2026-predictor
npm install   # 或 pnpm install / bun install
```

## 2. 创建 Supabase 项目

1. 前往 https://supabase.com 创建新项目
2. 进入 **SQL Editor**，粘贴并运行 `supabase/schema.sql` 的全部内容
3. 在 **Authentication → Email** 中开启邮件登录

## 3. 获取 football-data.org API Key

1. 注册：https://www.football-data.org/client/register
2. 免费套餐支持世界杯赛程数据

## 4. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入：
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key（用于同步赛程）
- `FOOTBALL_DATA_API_KEY` — football-data.org API key

## 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 6. 同步赛程数据

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

建议设置 Vercel Cron 每小时同步一次。

## 7. 手动录入赔率（可选）

```bash
curl -X PATCH http://localhost:3000/api/odds \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"match_id": "uuid", "home_odds": 2.10, "draw_odds": 3.40, "away_odds": 3.20}'
```

## 8. 部署到 Vercel

```bash
npm install -g vercel
vercel --prod
```

在 Vercel 控制台添加上述环境变量即可。

## 积分规则

| 情况 | 积分 |
|------|------|
| 猜中胜平负 | +3 |
| 猜中净胜球差 | +5（含基础） |
| 猜中精确比分 | +8（含基础） |

## 价值投注算法

当社区预测概率 > 庄家隐含概率 + 5%，标记为"价值投注"。
- 庄家隐含概率 = 1/赔率（已去除抽水）
- 正边界越大，潜在价值越高
- **仅供参考，理性博彩**
