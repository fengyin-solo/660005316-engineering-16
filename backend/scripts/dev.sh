#!/usr/bin/env sh
# 后端本地开发启动（可重复执行）：
#   1. 前置检查：.venv / 依赖 / 端口，缺失会自动修复或给出明确提示
#   2. 以 backend/.env 中的 BACKEND_HOST / BACKEND_PORT 启动 uvicorn
# 用法: sh scripts/dev.sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/.."

# precheck：诊断信息走 stderr 直接显示，stdout 只输出解释器路径；
# 非零退出（缺依赖/端口占用）直接终止。
VENV_PY=$(python3 scripts/precheck.py) || rc=$?
if [ -n "${rc:-}" ]; then
  exit "$rc"
fi
[ -x "$VENV_PY" ] || { echo "[backend] 前置检查未通过，终止启动" >&2; exit 1; }

# 从 .env 读取启动参数（与 app/main.py 的 Settings 默认值保持一致）
get_env() {
  key="$1"; default="$2"
  val=$(printenv "$key" 2>/dev/null || true)
  if [ -z "$val" ] && [ -f .env ]; then
    val=$(sed -n "s/^${key}=//p" .env | tail -n 1 | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')
  fi
  [ -n "$val" ] && printf '%s' "$val" || printf '%s' "$default"
}

HOST=$(get_env BACKEND_HOST 127.0.0.1)
PORT=$(get_env BACKEND_PORT 8000)

echo "[backend] 启动 uvicorn: http://$HOST:$PORT  (Ctrl+C 停止)"
exec "$VENV_PY" -m uvicorn app.main:app --host "$HOST" --port "$PORT"
