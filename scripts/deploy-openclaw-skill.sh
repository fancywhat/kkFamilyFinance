#!/usr/bin/env bash
set -euo pipefail

FINANCE_PROJECT_DIR="${FINANCE_PROJECT_DIR:-/opt/kkFamilyFinance}"
OPENCLAW_HOST="${OPENCLAW_HOST:-101.35.251.139}"
OPENCLAW_USER="${OPENCLAW_USER:-ubuntu}"

LOCAL_SKILL_FILE="${LOCAL_SKILL_FILE:-$FINANCE_PROJECT_DIR/.trae/skills/kk-family-finance/SKILL.md}"
REMOTE_USER_SKILL_DIR="${REMOTE_USER_SKILL_DIR:-/home/${OPENCLAW_USER}/.openclaw/skills/kk-family-finance}"
REMOTE_ROOT_SKILL_DIR="${REMOTE_ROOT_SKILL_DIR:-/root/.openclaw/skills/kk-family-finance}"
REMOTE_ROOT_SKILL_FILE="${REMOTE_ROOT_SKILL_FILE:-$REMOTE_ROOT_SKILL_DIR/SKILL.md}"

ssh "${OPENCLAW_USER}@${OPENCLAW_HOST}" "mkdir -p '$REMOTE_USER_SKILL_DIR'"
scp "$LOCAL_SKILL_FILE" "${OPENCLAW_USER}@${OPENCLAW_HOST}:$REMOTE_USER_SKILL_DIR/SKILL.md"

ssh "${OPENCLAW_USER}@${OPENCLAW_HOST}" "sudo mkdir -p '$REMOTE_ROOT_SKILL_DIR' && sudo rm -f '$REMOTE_ROOT_SKILL_FILE' && sudo cp '$REMOTE_USER_SKILL_DIR/SKILL.md' '$REMOTE_ROOT_SKILL_FILE' && sudo chown -R root:root '$REMOTE_ROOT_SKILL_DIR'"

ssh "${OPENCLAW_USER}@${OPENCLAW_HOST}" "sudo bash -lc 'source /root/.nvm/nvm.sh && openclaw skills info kk-family-finance >/dev/null && tail -n 3 $REMOTE_ROOT_SKILL_FILE'"
echo "OK: openclaw skill synced."

