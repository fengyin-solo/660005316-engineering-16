import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FactoryData } from '@/types'

// WebSocket 地址统一来自环境配置：默认走同源 /ws（开发时由 Vite 代理转发到后端），
// 前后端不同源部署时在 frontend/.env 里显式设置 VITE_WS_URL
function resolveWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) return explicit
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${location.host}/ws`
}

export const useFactoryStore = defineStore('factory', () => {
  const data = ref<FactoryData | null>(null)
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect() {
    if (ws.value) return
    const s = new WebSocket(resolveWsUrl())
    s.onopen = () => { connected.value = true; console.log('WS connected') }
    s.onmessage = (e) => {
      try { data.value = JSON.parse(e.data) } catch {}
    }
    s.onclose = () => { connected.value = false; ws.value = null }
    ws.value = s
  }

  function disconnect() {
    ws.value?.close()
    ws.value = null
    connected.value = false
  }

  return { data, connected, connect, disconnect }
})
