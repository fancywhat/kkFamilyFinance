import { defineStore } from 'pinia'
import { api } from '@/lib/api'
import type { 负债, 负债流水 } from '@/types/api'

type 新增负债参数 = {
  name: string
  type: string
  lender?: string
  person?: string
  principal?: number | null
  balance: number
  apr?: number | null
  startDate?: string | null
  dueDay?: number | null
  note?: string
}

type 新增负债流水参数 = {
  type: 'borrow' | 'repay' | 'interest' | 'adjust'
  amount: number
  date: string
  note?: string
}

export const useDebtsStore = defineStore('debts', {
  state: () => ({
    debts: [] as 负债[],
    recordsByDebtId: {} as Record<number, 负债流水[]>,
    loading: false,
  }),
  getters: {
    信用卡列表: (s) => s.debts.filter((d) => d.type === 'credit_card'),
    总负债: (s) => s.debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0),
  },
  actions: {
    async 拉取负债() {
      const res = await api.get('/api/debts')
      this.debts = res.data ?? []
    },
    async 拉取负债流水(debtId: number) {
      const res = await api.get(`/api/debts/${debtId}/records`)
      this.recordsByDebtId[debtId] = res.data ?? []
    },
    async 新增负债(payload: 新增负债参数) {
      await api.post('/api/debts', payload)
      await this.拉取负债()
    },
    async 更新负债(debtId: number, payload: Partial<新增负债参数>) {
      await api.put(`/api/debts/${debtId}`, payload)
      await this.拉取负债()
    },
    async 删除负债(debtId: number) {
      await api.delete(`/api/debts/${debtId}`)
      this.debts = this.debts.filter((d) => d.id !== debtId)
      delete this.recordsByDebtId[debtId]
    },
    async 新增流水(debtId: number, payload: 新增负债流水参数) {
      await api.post(`/api/debts/${debtId}/records`, payload)
      await Promise.all([this.拉取负债(), this.拉取负债流水(debtId)])
    },
  },
})

