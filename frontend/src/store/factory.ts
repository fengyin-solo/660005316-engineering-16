import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FactoryData } from '@/types'
import { buildWsUrl } from '@/config'
import { fetchDevices, fetchOee } from '@/api'

const RECONNECT_DELAY_MS = 2000

export const useFactoryStore = defineStore('factory', () => {
  const data = ref<FactoryData | null>(null)
  const connected = ref(false)
  const lastError = ref<string>('')

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let manualClose = false

  /** 先通过 REST 拉一屏快照（同时验证 /api 代理链路），再由 /ws 持续推送 */
  async function loadSnapshot() {
    try {
      const [{ devices, anomalies }, { oee }] = await Promise.all([fetchDevices(), fetchOee()])
      data.value = {
        devices,
        anomalies,
        oee,
        production: devices.reduce((sum, d) => sum + d.production_count, 0),
      }
      lastError.value = ''
    } catch (e: any) {
      lastError.value = `REST 接口不可用（${e?.message || e}），请确认后端已启动且代理指向正确`
      console.error('[factory] 初始数据加载失败:', e)
    }
  }

  function scheduleReconnect() {
    if (manualClose || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, RECONNECT_DELAY_MS)
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    manualClose = false
    const url = buildWsUrl()
    const s = new WebSocket(url)
    s.onopen = () => {
      connected.value = true
      lastError.value = ''
      console.log(`[factory] WS connected: ${url}`)
    }
    s.onmessage = (e) => {
      try {
        data.value = JSON.parse(e.data)
      } catch (err) {
        console.warn('[factory] 无法解析 WS 数据:', err)
      }
    }
    s.onerror = () => {
      // onclose 会紧随其后触发，统一在那里处理重连与提示
      lastError.value = 'WebSocket 连接错误，请确认后端已启动且 /ws 代理可用'
    }
    s.onclose = () => {
      connected.value = false
      ws = null
      if (!manualClose) {
        console.warn(`[factory] WS 断开，${RECONNECT_DELAY_MS / 1000}s 后重连: ${url}`)
        scheduleReconnect()
      }
    }
    ws = s
  }

  function disconnect() {
    manualClose = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    ws?.close()
    ws = null
    connected.value = false
  }

  return { data, connected, lastError, connect, disconnect, loadSnapshot }
})
