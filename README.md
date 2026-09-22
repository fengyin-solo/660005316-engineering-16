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

## 本地开发

### 前置要求
- Python 3.10+（自带 `venv`；缺 `pip` 时脚本会自动引导安装）
- Node.js 18+ 与 npm

### 快速开始（从干净环境到联调就绪）

```bash
# 1. 准备配置：前后端各一份 .env，从示例复制即可，默认值可直接跑通
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. 安装依赖（幂等，可重复执行；缺 python3/node/npm 会明确提示）
scripts/setup.sh

# 3. 一键启动前后端（自动做端口预检并等待双方就绪，Ctrl-C 同时停止）
scripts/dev.sh

# 4. 打包构建（后端编译检查 + 前端类型检查与产物输出到 frontend/dist/）
scripts/build.sh
```

`scripts/dev.sh` 就绪后：
- 前端页面：http://localhost:3000
- 后端接口：http://localhost:8000/api/devices （健康检查 `/api/health`）
- 实时通道：浏览器连接同源 `ws://localhost:3000/ws`，由 Vite 代理转发到后端

也可以分开启动：`scripts/dev-backend.sh`、`scripts/dev-frontend.sh`。

### 环境配置说明

接口地址、端口与代理统一由环境配置提供，代码内不写死。优先级均为：**进程环境变量 > `.env` > 默认值**。

后端 `backend/.env`（示例见 `backend/.env.example`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `BACKEND_HOST` | `0.0.0.0` | 监听地址，仅本机调试可改 `127.0.0.1` |
| `BACKEND_PORT` | `8000` | 监听端口，需与前端 `VITE_BACKEND_ORIGIN` 对应 |
| `CORS_ORIGINS` | `*` | 允许的跨域来源，多个用逗号分隔 |

前端 `frontend/.env`（示例见 `frontend/.env.example`，须以 `VITE_` 开头，改后重启生效）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_DEV_PORT` | `3000` | Vite 开发服务器端口 |
| `VITE_BACKEND_ORIGIN` | `http://localhost:8000` | 开发代理目标：`/api`、`/ws` 转发到该地址 |
| `VITE_API_BASE_URL` | 空 | 浏览器直连后端的 API 地址；留空 = 走同源/代理 |
| `VITE_WS_URL` | 空 | 浏览器直连后端的 WS 地址；留空 = 同源 `/ws`，经代理转发 |

改后端端口时两处要同步：`backend/.env` 的 `BACKEND_PORT` 与 `frontend/.env` 的 `VITE_BACKEND_ORIGIN`。

### 故障排查

- **缺命令/缺依赖**：脚本会明确报出缺什么、怎么补（如 `未找到命令 'node'`、`未找到 backend/.venv，请先执行 scripts/setup.sh`），不会静默跳过。
- **端口被占用**：启动前预检会直接报错并给出排查命令（`lsof -nP -i :<端口>`）与改端口的位置；前端 Vite 也开了 `strictPort`，不会悄悄换端口。
- **依赖未就绪**：`scripts/dev.sh` 会等待后端 `/api/health` 与前端首页返回 200 才提示就绪；进程异常退出会打印日志并退出非零。
- **虚拟环境损坏**（如系统 Python 升级后）：`scripts/setup.sh` 会自动重建 `backend/.venv`。
