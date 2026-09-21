import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// 地址/端口/代理统一来自 frontend/.env（示例见 .env.example），
// 不再在此写死后端地址；与 backend/.env 的 BACKEND_HOST/BACKEND_PORT 对齐。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const backendHost = env.VITE_BACKEND_HOST || '127.0.0.1'
  const backendPort = env.VITE_BACKEND_PORT || '8000'
  const devPort = Number(env.DEV_SERVER_PORT || '3000')
  const apiBase = env.VITE_API_BASE || '/api'
  const wsPath = env.VITE_WS_PATH || '/ws'
  const backendOrigin = `http://${backendHost}:${backendPort}`

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: devPort,
      // 端口被占用时直接失败，由 scripts/precheck.mjs 提前给出明确提示，不静默换端口
      strictPort: true,
      proxy: {
        [apiBase]: backendOrigin,
        [wsPath]: { target: `ws://${backendHost}:${backendPort}`, ws: true },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: devPort,
      strictPort: true,
      proxy: {
        [apiBase]: backendOrigin,
        [wsPath]: { target: `ws://${backendHost}:${backendPort}`, ws: true },
      },
    },
  }
})
