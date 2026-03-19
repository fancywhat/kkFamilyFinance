import axios from 'axios'

export const api = axios.create({
  baseURL: '',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const key = (import.meta as any).env?.VITE_KK_FINANCE_API_KEY
  if (key) {
    config.headers = config.headers ?? {}
    config.headers['X-API-KEY'] = key
  }
  return config
})
