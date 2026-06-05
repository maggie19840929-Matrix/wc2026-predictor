#!/bin/bash
set -e

echo ""
echo "⚽  WC2026 竞猜平台 — 一键安装"
echo "================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装：https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 配置环境变量
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo ""
  echo "📝 请填写 .env.local 中的配置项（需要 4 个值）："
  echo ""
  echo "   1. NEXT_PUBLIC_SUPABASE_URL"
  echo "      → 去 https://supabase.com 新建项目后在 Settings → API 找到"
  echo ""
  echo "   2. NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "      → 同上页面，anon public key"
  echo ""
  echo "   3. SUPABASE_SERVICE_ROLE_KEY"
  echo "      → 同上页面，service_role key（保密）"
  echo ""
  echo "   4. FOOTBALL_DATA_API_KEY"
  echo "      → 免费注册：https://www.football-data.org/client/register"
  echo ""
  echo "   5. SYNC_SECRET"
  echo "      → 随便写一串字符，比如 wc2026-my-secret"
  echo ""

  # 尝试用默认编辑器打开
  if command -v code &> /dev/null; then
    code .env.local
  elif command -v nano &> /dev/null; then
    nano .env.local
  else
    open .env.local
  fi

  echo ""
  read -p "填好后按回车继续..." _
else
  echo "✅ .env.local 已存在，跳过配置"
fi

# 提示建表
echo ""
echo "🗄️  数据库建表"
echo "   请在 Supabase SQL Editor 中运行以下文件的内容："
echo "   $(pwd)/supabase/schema.sql"
echo ""
if command -v open &> /dev/null; then
  read -p "是否用 Finder 打开该文件所在目录？[Y/n] " choice
  if [[ "$choice" != "n" && "$choice" != "N" ]]; then
    open "$(pwd)/supabase"
  fi
fi

echo ""
read -p "建表完成后按回车继续..." _

# 同步赛程
echo ""
read -p "是否现在同步赛程数据？（需要先填好环境变量并建完表）[Y/n] " sync_choice
if [[ "$sync_choice" != "n" && "$sync_choice" != "N" ]]; then
  source .env.local 2>/dev/null || true
  SYNC_SECRET_VAL=$(grep SYNC_SECRET .env.local | cut -d= -f2)
  echo "🔄 正在同步赛程..."
  # 先启动 dev server 在后台
  npm run dev &
  DEV_PID=$!
  sleep 5
  RESULT=$(curl -s -X POST http://localhost:3000/api/sync \
    -H "Authorization: Bearer $SYNC_SECRET_VAL" 2>&1)
  echo "   结果: $RESULT"
  kill $DEV_PID 2>/dev/null || true
  wait $DEV_PID 2>/dev/null || true
fi

echo ""
echo "🚀 启动开发服务器..."
echo ""
echo "   访问地址：http://localhost:3000"
echo "   局域网访问（手机/其他电脑）：http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}'):3000"
echo ""
npm run dev
