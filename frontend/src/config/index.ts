/**
 * 前后端联调口径的唯一来源：全部来自 Vite 环境变量（见 .env.example）。
 * 本地开发时这些路径由 Vite dev server 代理到后端（见 vite.config.ts），
 * 生产构建时则与页面同源，代码里不出现任何写死的主机/端口。
 */

function withDefault(value: string | undefined, fallback: string): string {
  return value && value.trim() ? value.trim() : fallback
}

export const config = {
  /** REST 接口基础路径，默认 /api */
  apiBase: withDefault(import.meta.env.VITE_API_BASE, '/api'),
  /** WebSocket 数据通道路径，默认 /ws */
  wsPath: withDefault(import.meta.env.VITE_WS_PATH, '/ws'),
}

/** 构造与页面同源的 WebSocket 地址；dev 下经 Vite 代理转发到后端。 */
export function buildWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${config.wsPath}`
}

/** REST 完整地址，如 /api/devices */
export function apiUrl(path: string): string {
  return `${config.apiBase}${path.startsWith('/') ? path : `/${path}`}`
}
