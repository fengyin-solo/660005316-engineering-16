#!/usr/bin/env bash
# 启动前端（Vite dev server）。
# 端口来自 frontend/.env 的 VITE_DEV_PORT（默认 3000），/api 与 /ws 代理到 VITE_BACKEND_ORIGIN。
# 依赖缺失或端口被占用时明确报错退出，不会静默失败。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

need_cmd node "请先安装 Node.js 18+"
need_cmd npm  "npm 未安装，通常随 Node.js 一起提供"
check_frontend_deps

PORT="$(frontend_port)"
ensure_port_free "$PORT" "前端" "修改frontend/.env 的 VITE_DEV_PORT"

info "启动前端  http://localhost:$PORT  （/api、/ws 代理到后端）"
cd "$ROOT/frontend"
# 直接执行 vite 而不是 npm run dev：进程信号可直达，便于 dev.sh 统一停止
exec ./node_modules/.bin/vite
