#!/usr/bin/env bash
# 安装前后端依赖（幂等，可重复执行）：
#   1. 检查 python3 / node / npm 是否存在
#   2. 创建/复用 backend/.venv 并安装 requirements.txt（无 pip 时自动用 get-pip.py 引导）
#   3. 安装 frontend/node_modules
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

need_cmd python3 "请先安装 Python 3.10+（https://www.python.org/downloads/）"
need_cmd node    "请先安装 Node.js 18+（https://nodejs.org/）"
need_cmd npm     "npm 未安装，通常随 Node.js 一起提供，请检查 Node.js 安装"

# ---------- 后端 ----------
VENV="$ROOT/backend/.venv"
if [ ! -x "$VENV/bin/python" ]; then
  info "创建 Python 虚拟环境 backend/.venv"
  rm -rf "$VENV"  # 清理可能损坏的旧环境（如 Python 版本升级后）
  # 部分发行版缺 ensurepip，标准 venv 会失败，退化为 --without-pip 再手动引导
  python3 -m venv "$VENV" >/dev/null 2>&1 || python3 -m venv --without-pip "$VENV"
  [ -x "$VENV/bin/python" ] || die "创建虚拟环境失败，请检查 python3 安装（需 3.10+）"
else
  info "复用已有虚拟环境 backend/.venv"
fi
PY="$VENV/bin/python"

if ! "$PY" -m pip --version >/dev/null 2>&1; then
  info "虚拟环境缺少 pip，使用 get-pip.py 引导安装"
  need_cmd curl "引导 pip 需要 curl 下载 get-pip.py"
  GET_PIP="$(mktemp)"
  trap 'rm -f "$GET_PIP"' EXIT
  curl -fsSL https://bootstrap.pypa.io/get-pip.py -o "$GET_PIP" \
    || die "下载 get-pip.py 失败，请检查网络后重试"
  "$PY" "$GET_PIP" -q || die "引导安装 pip 失败"
fi

info "安装后端依赖 backend/requirements.txt"
"$PY" -m pip install -q -r "$ROOT/backend/requirements.txt" \
  || die "后端依赖安装失败，请检查网络/PyPI 源后重试"
ok "后端依赖就绪"

# ---------- 前端 ----------
info "安装前端依赖 frontend（npm install）"
(cd "$ROOT/frontend" && npm install --no-audit --no-fund) \
  || die "前端依赖安装失败，请检查网络/npm registry 后重试"
ok "前端依赖就绪"

ok "依赖安装完成。下一步：scripts/dev.sh 启动前后端联调"
