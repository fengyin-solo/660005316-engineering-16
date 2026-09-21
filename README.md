# 数字孪生工厂产线实时监控系统

基于Vue 3 + FastAPI的工厂数字孪生平台，MQTT设备模拟、Three.js 3D产线可视化、WebSocket实时推送、异常检测规则引擎。

## 目标用户
智能制造工程师、工厂运营管理者、工业4.0解决方案顾问

## 技术栈
- 前端: Vue 3 + TypeScript + Vite + Pinia + Element Plus + ECharts + Three.js
- 后端: Python FastAPI + NumPy + SQLite + WebSocket

## 核心功能
1. MQTT设备模拟器：6类工业设备(CNC/机械臂/传送带/AGV/注塑机/质检站)状态与传感器数据模拟
2. Three.js 3D工厂数字孪生场景：设备模型、产线布局、实时状态颜色映射(绿运行/黄待机/红故障/灰离线)
3. WebSocket实时推送设备状态与传感器数据流
4. 异常检测规则引擎：温度/振动/压力多维阈值+滑动窗口趋势检测
5. OEE(设备综合效率)计算：可用性×性能×质量三维指标
6. ECharts实时趋势面板：产量统计、故障分布饼图、设备OEE柱状图

---

## 本地联调开发流程（可重复执行）

### 1. 环境要求

| 组件 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | >= 16（建议 18/20 LTS） | 前端依赖安装、dev/build |
| Python | >= 3.9（实测 3.11） | 后端运行；需能创建 venv |
| 浏览器 | 任意现代浏览器 | 访问 Vite dev server |

### 2. 联调口径（地址 / 端口 / 代理 / 数据通道）

**所有地址、端口、路径都来自环境配置，代码中不写死。** 前后端各有一份 `.env`（已被 git 忽略），以 `.env.example` 为准复制：

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| 配置项 | 位置 | 默认值 | 作用 |
| --- | --- | --- | --- |
| `BACKEND_HOST` / `BACKEND_PORT` | `backend/.env` | `127.0.0.1` / `8000` | uvicorn 监听地址 |
| `BACKEND_CORS_ORIGINS` | `backend/.env` | `http://localhost:3000,...` | 允许跨域的前端来源 |
| `API_PREFIX` / `WS_PATH` | `backend/.env` | `/api` / `/ws` | REST 与 WebSocket 通道路径 |
| `VITE_API_BASE` / `VITE_WS_PATH` | `frontend/.env` | `/api` / `/ws` | 浏览器侧通道（相对路径，走代理/同源） |
| `VITE_BACKEND_HOST` / `VITE_BACKEND_PORT` | `frontend/.env` | `127.0.0.1` / `8000` | Vite 代理目标，须与后端一致 |
| `DEV_SERVER_PORT` | `frontend/.env` | `3000` | Vite dev/preview 监听端口 |

数据通道走向（dev 与 `vite preview` 相同）：

```
浏览器 ──► Vite (127.0.0.1:3000)
             ├── /api/*  ──HTTP代理──►  FastAPI (127.0.0.1:8000/api/*)
             └── /ws     ──WS代理────►  FastAPI (127.0.0.1:8000/ws)
```

修改端口时**前后端两份 `.env` 必须同步**（如后端改 8010，前端 `VITE_BACKEND_PORT` 也要改）。

### 3. 安装依赖

```bash
# 后端：创建虚拟环境并安装（首次执行 dev 脚本会自动完成，也可手动）
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt   # Windows: .venv\Scripts\python -m pip install ...
cd ..

# 前端
cd frontend
npm install
cd ..
```

> Linux 精简镜像若提示 `ensurepip is not available`：`apt-get install python3-venv` 后重试；
> 无法安装系统包时，`backend/scripts/precheck.py` 会自动用 `--without-pip` + get-pip.py 引导。

### 4. 启动（两个终端）

```bash
# 终端 1：后端
cd backend
sh scripts/dev.sh

# 终端 2：前端
cd frontend
npm run dev
```

两个脚本启动前都会做前置检查并给出明确结果：
- 缺 `.venv` / 依赖 → 自动创建虚拟环境、安装依赖；失败时打印具体修复命令；
- 缺 `.env` → 前端自动从 `.env.example` 复制并提示；
- 端口被占用 → **直接报错退出（exit 3）**，打印占用信息与修改建议，不静默换端口；
- 前端还会探测后端 `VITE_BACKEND_HOST:VITE_BACKEND_PORT` 是否可达，不可达时给出启动后端的提示。

就绪后访问 <http://localhost:3000>：页面顶部显示「实时连接中」即代表 WebSocket 数据通道已连通。
后端接口可直接验证：`curl http://127.0.0.1:8000/api/devices`、`/api/oee`、`/api/production`。

### 5. 打包与本地预览

```bash
cd frontend
npm run build      # 前置检查 + vue-tsc 类型检查 + vite build，产物在 dist/
npm run preview    # 按同一套 .env 代理口径预览 dist/ 产物
```

### 6. 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| `端口 8000 已被占用` | 结束占用进程，或修改 `backend/.env` 的 `BACKEND_PORT` 并同步前端 `VITE_BACKEND_PORT` |
| `端口 3000 已被占用` | 同上，修改 `frontend/.env` 的 `DEV_SERVER_PORT` |
| 页面显示「连接断开（重连中…）」 | 后端未启动，或两端 `.env` 端口不一致；前端每 2s 自动重连 |
| REST 接口报错 / 初始数据为空 | 查看顶部错误条；确认后端在运行、`/api` 代理目标正确 |
| 跨平台拷贝后依赖异常（如 `@rollup/rollup-*` 找不到） | 删除 `frontend/node_modules` 后在本机重新 `npm install`；删除 `backend/.venv` 后重跑 `sh scripts/dev.sh` |
| 仅本机访问正常，其他机器访问不到 | `BACKEND_HOST` 改为 `0.0.0.0`，前端 Vite 如需对外可在 `vite.config.ts` 调整 `server.host` |

### 7. 其他环境

生产部署时沿用同一套环境变量口径：后端由进程环境注入 `BACKEND_HOST/PORT/CORS` 等；
前端构建时（`npm run build`）Vite 会把 `VITE_*` 变量编译进产物，生产环境建议让前端与后端同源部署，
`VITE_API_BASE=/api`、`VITE_WS_PATH=/ws` 保持相对路径，由网关/Nginx 转发到后端，无需改代码。
