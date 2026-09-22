"""后端运行配置：统一从环境变量 / backend/.env 读取，不再散落写死。

优先级：进程环境变量 > backend/.env > 默认值。
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# backend/.env（本文件位于 backend/app/ 下，向上一级即 backend/）
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
PORT = int(os.getenv("BACKEND_PORT", "8000"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
