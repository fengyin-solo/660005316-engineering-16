import axios from 'axios'
import { config } from '@/config'
import type { Anomaly, Device, OEEItem } from '@/types'

// 唯一的 axios 实例：baseURL 取自环境配置，dev 下由 Vite 代理转发
const http = axios.create({
  baseURL: config.apiBase,
  timeout: 5000,
})

export interface DevicesResponse {
  devices: Device[]
  anomalies: Anomaly[]
}

export function fetchDevices(): Promise<DevicesResponse> {
  return http.get('/devices').then((r) => r.data)
}

export function fetchOee(): Promise<{ oee: OEEItem[] }> {
  return http.get('/oee').then((r) => r.data)
}
