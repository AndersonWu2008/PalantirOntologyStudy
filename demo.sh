#!/usr/bin/env bash
# 起数据库、接口、页面，并写入涨停回马枪 1 这一套演示对象。
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
cd "$root"
mkdir -p .demo

docker compose up -d
ready=0
for _ in $(seq 1 30); do
  if docker compose exec -T stock_ontology pg_isready -U ontology -d stock_ontology >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "数据库没起来。"
  exit 1
fi

if ! curl -sf http://127.0.0.1:3010/schema >/dev/null; then
  if [ ! -d database-api/node_modules ]; then
    (cd database-api && npm install)
  fi
  (cd database-api && npm start) >.demo/api.log 2>&1 &
  echo $! >.demo/api.pid
  ready=0
  for _ in $(seq 1 30); do
    if curl -sf http://127.0.0.1:3010/schema >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [ "$ready" -ne 1 ]; then
    echo "接口没起来。看 .demo/api.log"
    exit 1
  fi
fi

if [ ! -d database-api/node_modules ]; then
  (cd database-api && npm install)
fi
(cd database-api && npx tsx ../pipeline/seed-demo.ts)
docker compose exec -T stock_ontology \
  psql -U ontology -d stock_ontology \
  -c "UPDATE strategy SET display_name = '涨停回马枪 1' WHERE strategy_id = 'v46-huimaqiang';"

if ! curl -sf http://127.0.0.1:5173 >/dev/null; then
  if [ ! -d frontend/node_modules ]; then
    (cd frontend && npm install)
  fi
  (cd frontend && npm run dev -- --host 127.0.0.1) >.demo/web.log 2>&1 &
  echo $! >.demo/web.pid
  ready=0
  for _ in $(seq 1 40); do
    if curl -sf http://127.0.0.1:5173 >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [ "$ready" -ne 1 ]; then
    echo "页面没起来。看 .demo/web.log"
    exit 1
  fi
fi

cat <<'EOF'

演示已经写好。打开这四页：

课程
http://localhost:5173/course

类型
http://localhost:5173/ontology

涨停回马枪 1
http://localhost:5173/ontology/object-view?type=Strategy&id=v46-huimaqiang

明早那一页
http://localhost:5173/workshop/pre-open?date=2026-10-15

登录页已填好 admin@example.com / admin123。点「牛市」，看这一套止盈和只数。
EOF
