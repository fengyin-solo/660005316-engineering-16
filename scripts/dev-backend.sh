#!/usr/bin/env bash
# 启动后端（FastAPI + 设备模拟器）。
# 地址/端口来自 backend/.env（BACKEND_HOST / BACKEND_PORT，默认 0.0.0.0:8000）。
# 依赖缺失或端口被占用时明确报错退出，不会静默失败。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

need_cmd python3 "请先安装 Python 3.10+"
check_backend_deps

PORT="$(backend_port)"
ensure_port_free "$PORT" "后端" "修改 backend/.env 的 BACKEND_PORT（同时同步 frontend/.env 的 VITE_BACKEND_ORIGIN）"

info "启动后端  http://localhost:$PORT  （健康检查 /api/health，WebSocket /ws）"
cd "$ROOT/backend"
exec "$ROOT/backend/.venv/bin/python" -m app.main
