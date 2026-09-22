import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// 地址与端口统一来自 frontend/.env（见 .env.example），不再写死
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.')
  const port = Number(env.VITE_DEV_PORT || 3000)
  const backend = env.VITE_BACKEND_ORIGIN || 'http://localhost:8000'
  return {
    plugins: [vue()],
    server: {
      port,
      // 端口被占用时直接报错退出，而不是悄悄换成其它端口
      strictPort: true,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/ws': { target: backend.replace(/^http/, 'ws'), ws: true },
      },
    },
  }
})
