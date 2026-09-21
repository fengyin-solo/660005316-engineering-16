#!/usr/bin/env python3
"""后端本地开发前置检查（仅依赖标准库，可重复执行）。

职责：
1. 解析 backend/.env（不存在则提示从 .env.example 复制，用内置默认值继续）；
2. 确认 .venv 可用，缺失时自动创建并安装 requirements.txt；
3. 校验关键依赖是否装齐，缺依赖给出明确安装命令而不是让 uvicorn 静默报错；
4. 校验 BACKEND_PORT 是否被占用，被占用时打印占用进程并退出（exit 3）。

退出码：0 就绪；1 环境错误；2 依赖缺失/安装失败；3 端口被占用。
"""
from __future__ import annotations

import importlib.metadata
import os
import shutil
import socket
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
VENV_DIR = BACKEND_DIR / ".venv"
REQ_FILE = BACKEND_DIR / "requirements.txt"
ENV_FILE = BACKEND_DIR / ".env"
ENV_EXAMPLE = BACKEND_DIR / ".env.example"

RED, GREEN, YELLOW, CYAN = "\033[31m", "\033[32m", "\033[33m", "\033[36m"
RESET = "\033[0m"


def info(msg: str) -> None:
    print(f"{CYAN}[backend]{RESET} {msg}", file=sys.stderr)


def ok(msg: str) -> None:
    print(f"{GREEN}[backend] ✓{RESET} {msg}", file=sys.stderr)


def warn(msg: str) -> None:
    print(f"{YELLOW}[backend] !{RESET} {msg}", file=sys.stderr)


def fail(msg: str, code: int = 1, hint: str | None = None) -> None:
    print(f"{RED}[backend] ✗ {msg}{RESET}", file=sys.stderr)
    if hint:
        print(f"          提示: {hint}", file=sys.stderr)
    sys.exit(code)


def load_env() -> dict[str, str]:
    """极简 .env 解析（KEY=VALUE，# 注释，不覆盖已存在的真实环境变量）。"""
    env: dict[str, str] = {}
    if not ENV_FILE.exists():
        warn(f"未找到 {ENV_FILE}，将使用内置默认值")
        if ENV_EXAMPLE.exists():
            warn(f"建议先复制示例配置: cp {ENV_EXAMPLE.name} .env")
        return env
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def venv_python() -> Path:
    exe = "python.exe" if os.name == "nt" else "python"
    return VENV_DIR / ("Scripts" if os.name == "nt" else "bin") / exe


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    print(f"          $ {' '.join(cmd)}", file=sys.stderr)
    # 子进程输出也导向 stderr，保持 stdout 只有解释器路径
    kw.setdefault("stdout", sys.stderr)
    kw.setdefault("stderr", subprocess.STDOUT)
    return subprocess.run(cmd, cwd=BACKEND_DIR, **kw)


def ensure_venv() -> Path:
    py = venv_python()
    if py.exists():
        # 损坏的解释器（如跨平台拷贝的 venv、符号链接失效）会在执行时报错
        probe = subprocess.run(
            [str(py), "-c", "import sys; print(sys.version)"],
            capture_output=True,
        )
        if probe.returncode == 0:
            return py
        warn(f"发现已存在但不可用的虚拟环境: {VENV_DIR}（解释器无法执行）")
        fail(
            "请删除后重试: rm -rf .venv",
            2,
            "通常是拷贝了其他机器上创建的 .venv 导致",
        )

    if shutil.which("uv"):
        info("使用 uv 创建虚拟环境并安装依赖 ...")
        run(["uv", "venv", str(VENV_DIR)], check=True)
        run(["uv", "pip", "install", "-r", str(REQ_FILE)], check=True)
        return py

    info(f"创建虚拟环境: {VENV_DIR}")
    # 部分系统（Debian 精简镜像）venv 缺 ensurepip，先常规创建，
    # 失败再用 --without-pip + get-pip.py 引导
    created = subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)])
    if created.returncode != 0 or not py.exists():
        created = subprocess.run([sys.executable, "-m", "venv", "--without-pip", str(VENV_DIR)])
        if created.returncode != 0:
            fail(
                "创建虚拟环境失败，缺少 python3-venv",
                1,
                "Debian/Ubuntu: sudo apt-get install python3-venv",
            )
        info("venv 未自带 pip，使用 get-pip.py 引导安装 ...")
        import urllib.request

        get_pip = BACKEND_DIR / ".get-pip.py"
        try:
            urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", get_pip)
        except Exception as exc:  # noqa: BLE001
            fail(f"下载 get-pip.py 失败: {exc}", 1, "检查网络或手动安装 pip 后重试")
        if run([str(py), str(get_pip)]).returncode != 0:
            fail("pip 引导安装失败", 2)
        get_pip.unlink(missing_ok=True)

    info("安装依赖 requirements.txt ...")
    if run([str(py), "-m", "pip", "install", "-r", str(REQ_FILE)]).returncode != 0:
        fail(
            "依赖安装失败",
            2,
            f"可手动重试: {py} -m pip install -r requirements.txt",
        )
    return py


REQUIRED_IMPORTS = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn",
    "numpy": "numpy",
    "dotenv": "python-dotenv",
}


def verify_imports(py: Path) -> None:
    probe = (
        "import importlib\n"
        + "\n".join(f"importlib.import_module({name!r})" for name in REQUIRED_IMPORTS)
    )
    result = subprocess.run([str(py), "-c", probe], capture_output=True, text=True)
    if result.returncode != 0:
        missing = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "未知"
        fail(
            f"依赖不完整: {missing}",
            2,
            f"执行: {py} -m pip install -r requirements.txt",
        )
    ok("依赖检查通过 (fastapi / uvicorn / numpy / python-dotenv)")


def check_port(host: str, port: int) -> None:
    if not (1 <= port <= 65535):
        fail(f"BACKEND_PORT 非法: {port}（应为 1-65535）", 1)
    bind_host = "0.0.0.0" if host in ("0.0.0.0", "::") else "127.0.0.1"
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if s.connect_ex(("127.0.0.1", port)) == 0:
            owner = ""
            if shutil.which("lsof"):
                p = subprocess.run(
                    ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN"],
                    capture_output=True,
                    text=True,
                )
                owner = "\n          " + p.stdout.strip().replace("\n", "\n          ")
            fail(
                f"端口 {port} 已被占用，无法绑定 BACKEND_HOST={host}{owner}",
                3,
                f"结束占用进程，或修改 backend/.env 中的 BACKEND_PORT（同时同步 frontend/.env 的 VITE_BACKEND_PORT）",
            )
    ok(f"端口 {port} 可用 (BACKEND_HOST={host})")


def main() -> None:
    env_file_cfg = load_env()
    host = os.getenv("BACKEND_HOST", env_file_cfg.get("BACKEND_HOST", "127.0.0.1"))
    port = int(os.getenv("BACKEND_PORT", env_file_cfg.get("BACKEND_PORT", "8000")))

    py = ensure_venv()
    version = subprocess.run(
        [str(py), "-c", "import sys;print('%d.%d.%d' % sys.version_info[:3])"],
        capture_output=True,
        text=True,
    ).stdout.strip()
    ok(f"虚拟环境就绪: {py} (Python {version})")
    verify_imports(py)
    check_port(host, port)
    print(str(py))  # stdout 仅输出解释器路径，供 dev.sh 捕获；诊断信息在 stderr


if __name__ == "__main__":
    main()
