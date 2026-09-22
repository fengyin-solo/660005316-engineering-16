#!/usr/bin/env bash
# 打包构建：后端做语法编译检查，前端产出 frontend/dist/（含 vue-tsc 类型检查）。
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

need_cmd python3 "请先安装 Python 3.10+"
need_cmd npm     "npm 未安装，通常随 Node.js 一起提供"
check_backend_deps
check_frontend_deps

info "后端：编译检查 app/"
(cd "$ROOT/backend" && ./.venv/bin/python -m compileall -q app) \
  || die "后端代码编译检查失败"
ok "后端编译检查通过"

info "前端：vue-tsc 类型检查 + vite build"
(cd "$ROOT/frontend" && npm run build) \
  || die "前端构建失败，请根据上方错误信息修复后重试"
ok "构建完成：frontend/dist/"
