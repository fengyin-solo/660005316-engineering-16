#!/usr/bin/env bash
# 一键启动前后端联调：先做依赖与端口预检，再同时拉起两个服务并等待就绪。
# Ctrl-C 或脚本退出时，两个服务一起停止。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

# ---------- 预检：先失败先提示，避免一个起来了另一个起不来 ----------
need_cmd python3 "请先安装 Python 3.10+"
need_cmd node    "请先安装 Node.js 18+"
need_cmd npm     "npm 未安装，通常随 Node.js 一起提供"
check_backend_deps
check_frontend_deps

BACKEND_PORT="$(backend_port)"
FRONTEND_PORT="$(frontend_port)"
ensure_port_free "$BACKEND_PORT" "后端" "修改 backend/.env 的 BACKEND_PORT（同时同步 frontend/.env 的 VITE_BACKEND_ORIGIN）"
ensure_port_free "$FRONTEND_PORT" "前端" "修改 frontend/.env 的 VITE_DEV_PORT"

# ---------- 启动 ----------
PIDS=()
cleanup() {
  echo
  info "正在停止前后端服务…"
  kill "${PIDS[@]}" 2>/dev/null || true
  wait "${PIDS[@]}" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

"$ROOT/scripts/dev-backend.sh"  & BACKEND_PID=$!
PIDS+=($BACKEND_PID)
wait_ready "后端" "http://localhost:$BACKEND_PORT/api/health" "$BACKEND_PID" 30

"$ROOT/scripts/dev-frontend.sh" & FRONTEND_PID=$!
PIDS+=($FRONTEND_PID)
# 用 localhost 而不是 127.0.0.1：Vite 可能只绑定 IPv6 的 ::1，urllib 会按 getaddrinfo 逐个尝试
wait_ready "前端" "http://localhost:$FRONTEND_PORT/" "$FRONTEND_PID" 30

echo
ok "前后端已就绪并联调：
  前端页面   http://localhost:$FRONTEND_PORT
  后端接口   http://localhost:$BACKEND_PORT/api/devices
  实时通道   ws://localhost:$FRONTEND_PORT/ws （经 Vite 代理到后端）
按 Ctrl-C 停止全部服务。"

wait "${PIDS[@]}"
