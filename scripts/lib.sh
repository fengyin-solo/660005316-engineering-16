#!/usr/bin/env bash
# 公共函数库：由 scripts/ 下其它脚本 source，不要直接执行。
# 约定：所有脚本无论从哪个目录调用，行为一致（路径都基于仓库根目录）。

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

info() { echo "👉 $*"; }
ok()   { echo "✅ $*"; }
die()  { echo "❌ $*" >&2; exit 1; }

# need_cmd <命令> <安装提示>：缺命令时明确报错退出，而不是静默失败
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "未找到命令 '$1'。$2"
}

# port_in_use <端口>：有进程在监听则返回 0。
# 同时探测 IPv4 与 IPv6 回环（Vite 默认可能只绑 ::1，单查 127.0.0.1 会漏判）
port_in_use() {
  python3 - "$1" <<'PY'
import socket, sys
port = int(sys.argv[1])
in_use = False
for fam, typ, proto, _, addr in socket.getaddrinfo("localhost", port, socket.AF_UNSPEC, socket.SOCK_STREAM):
    s = socket.socket(fam, typ, proto)
    try:
        if s.connect_ex(addr) == 0:
            in_use = True
            break
    finally:
        s.close()
sys.exit(0 if in_use else 1)
PY
}

# ensure_port_free <端口> <服务名> <改端口提示>
ensure_port_free() {
  if port_in_use "$1"; then
    die "端口 $1 已被占用，$2 无法启动。
  排查占用进程：lsof -nP -i :$1   （或 fuser $1/tcp）
  处理方式：结束占用进程后重试，或$3"
  fi
}

# http_ok <url>：单次探测，HTTP 200 返回 0
http_ok() {
  python3 - "$1" <<'PY'
import sys, urllib.request
try:
    with urllib.request.urlopen(sys.argv[1], timeout=2) as r:
        sys.exit(0 if r.status == 200 else 1)
except Exception:
    sys.exit(1)
PY
}

# wait_ready <服务名> <url> <pid> <超时秒数>：进程存活且 HTTP 200 才算就绪
wait_ready() {
  local name="$1" url="$2" pid="$3" timeout="$4" i
  for ((i = 0; i < timeout * 2; i++)); do
    kill -0 "$pid" 2>/dev/null || die "$name 进程已退出，请查看上方日志定位原因"
    http_ok "$url" && { ok "$name 已就绪：$url"; return 0; }
    sleep 0.5
  done
  die "$name 在 ${timeout}s 内未就绪（$url），请查看上方日志"
}

# backend_port：与 app/config.py 同一套口径（环境变量 > backend/.env > 默认 8000）
backend_port() {
  (cd "$ROOT/backend" && "$ROOT/backend/.venv/bin/python" -c 'from app.config import PORT; print(PORT)')
}

# frontend_port：环境变量 > frontend/.env 的 VITE_DEV_PORT > 默认 3000
frontend_port() {
  local p="${VITE_DEV_PORT:-}"
  if [ -z "$p" ] && [ -f "$ROOT/frontend/.env" ]; then
    p="$(grep -E '^[[:space:]]*VITE_DEV_PORT[[:space:]]*=' "$ROOT/frontend/.env" | tail -1 \
         | sed -E 's/^[^=]*=[[:space:]]*//; s/[[:space:]]*$//; s/^["'"'"']//; s/["'"'"']$//')"
  fi
  echo "${p:-3000}"
}

# check_backend_deps：虚拟环境与依赖缺失时给出明确提示
check_backend_deps() {
  [ -x "$ROOT/backend/.venv/bin/python" ] \
    || die "未找到 backend/.venv，请先执行 scripts/setup.sh 安装依赖"
  "$ROOT/backend/.venv/bin/python" -c 'import fastapi, uvicorn, numpy, websockets, dotenv' 2>/dev/null \
    || die "后端依赖不完整，请先执行 scripts/setup.sh 安装依赖"
}

# check_frontend_deps：node_modules 缺失时给出明确提示
check_frontend_deps() {
  [ -d "$ROOT/frontend/node_modules" ] \
    || die "未找到 frontend/node_modules，请先执行 scripts/setup.sh 安装依赖"
}
