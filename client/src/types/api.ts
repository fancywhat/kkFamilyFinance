export type 交易类型 = 'income' | 'expense'

export type 支付方式 = 'cash' | 'bank' | 'credit_card' | 'credit_repayment'

export interface 分类 {
  id: number
  name: string
  type: 交易类型
}

export interface 负债 {
  id: number
  name: string
  lender: string | null
  person: string | null
  type: string
  principal: number | null
  balance: number
  apr: number | null
  startDate: string | null
  dueDay: number | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface 负债流水 {
  id: number
  debtId: number
  type: string
  amount: number
  date: string
  note: string | null
  createdAt: string
}

export interface 资产账户 {
  id: number
  name: string
  type: string
  balance: number
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface 交易记录 {
  id: number
  amount: number
  type: 交易类型
  paymentMethod: 支付方式
  date: string
  note: string | null
  person: string | null
  categoryId: number
  debtId: number | null
  assetId: number | null
  createdAt: string
  updatedAt: string
  category: 分类
  debt?: 负债 | null
  asset?: 资产账户 | null
}
