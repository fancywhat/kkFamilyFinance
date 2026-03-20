#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/kkFamilyFinance}"
BRANCH="${BRANCH:-master}"
PM2_NAME="${PM2_NAME:-kk-finance-api}"
PORT="${PORT:-8080}"

cd "$PROJECT_DIR"

git stash push -u -m "before deploy $(date -u +%F_%T)" >/dev/null 2>&1 || true
git fetch --all --prune
git checkout "$BRANCH"
git pull --rebase

npm install

npm --prefix server install
npm --prefix server run prisma:generate
npm --prefix server run db:push

pm2 restart "$PM2_NAME" --update-env

npm --prefix client install
npm --prefix client run build

sudo nginx -t
sudo systemctl reload nginx

curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null
echo "OK: finance deployed. health=/api/health"

