import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type { 资产账户 } from '@/types/api'

type 新增资产参数 = {
  name: string
  type?: string
  balance?: number
  note?: string
}

export const useAssetsStore = defineStore('assets', {
  state: () => ({
    assets: [] as 资产账户[],
    loading: false
  }),
  getters: {
    总资产: (s) => s.assets.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
  },
  actions: {
    async 拉取资产() {
      const res = await api.get('/api/assets')
      this.assets = res.data ?? []
    },
    async 新增资产(payload: 新增资产参数) {
      await api.post('/api/assets', payload)
      await this.拉取资产()
    },
    async 更新资产(assetId: number, payload: Partial<新增资产参数>) {
      await api.put(`/api/assets/${assetId}`, payload)
      await this.拉取资产()
    },
    async 删除资产(assetId: number) {
      await api.delete(`/api/assets/${assetId}`)
      this.assets = this.assets.filter((a) => a.id !== assetId)
    }
  }
})
