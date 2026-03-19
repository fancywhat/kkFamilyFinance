import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type { 分类, 交易记录, 交易类型, 支付方式 } from '@/types/api'

type 新增交易参数 = {
  amount: number
  type: 交易类型
  paymentMethod?: 支付方式
  date: string
  note?: string
  person?: string
  categoryId: number
  debtId?: number | null
}

type 更新交易参数 = Partial<新增交易参数>

export const useFinanceStore = defineStore('finance', {
  state: () => ({
    categories: [] as 分类[],
    transactions: [] as 交易记录[],
    loading: false
  }),
  getters: {
    支出分类: (s) => s.categories.filter((c) => c.type === 'expense'),
    收入分类: (s) => s.categories.filter((c) => c.type === 'income')
  },
  actions: {
    async 拉取分类() {
      const res = await api.get('/api/categories')
      this.categories = res.data ?? []
    },
    async 拉取交易() {
      const res = await api.get('/api/transactions')
      this.transactions = res.data ?? []
    },
    async 新增交易(payload: 新增交易参数) {
      await api.post('/api/transactions', payload)
      await this.拉取交易()
    },
    async 更新交易(id: number, payload: 更新交易参数) {
      await api.put(`/api/transactions/${id}`, payload)
      await this.拉取交易()
    },
    async 删除交易(id: number) {
      await api.delete(`/api/transactions/${id}`)
      this.transactions = this.transactions.filter((t) => t.id !== id)
    },
    async 新增分类(name: string, type: 交易类型) {
      await api.post('/api/categories', { name, type })
      await this.拉取分类()
    },
    async 删除分类(id: number) {
      await api.delete(`/api/categories/${id}`)
      this.categories = this.categories.filter((c) => c.id !== id)
    }
  }
})
