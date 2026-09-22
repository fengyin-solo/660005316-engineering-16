/// <reference types="vite/client" />
declare module "*.vue" { import type { DefineComponent } from "vue"; const c: DefineComponent<{}, {}, any>; export default c }

// 项目自定义环境变量（见 frontend/.env.example）
interface ImportMetaEnv {
  readonly VITE_DEV_PORT?: string
  readonly VITE_BACKEND_ORIGIN?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_URL?: string
}
