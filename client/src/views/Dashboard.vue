<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold m-0">仪表盘</h1>
      <p class="text-gray-500 mt-1">查看家庭账本的最新概览</p>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :md="8">
        <a-card class="shadow-sm" title="本月收入">
          <a-statistic
            :value="本月收入"
            :precision="2"
            suffix="元"
            :value-style="{ color: '#52c41a' }"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8">
        <a-card class="shadow-sm" title="本月支出">
          <a-statistic
            :value="本月支出"
            :precision="2"
            suffix="元"
            :value-style="{ color: '#ff4d4f' }"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :md="8">
        <a-card class="shadow-sm" title="当前结余">
          <a-statistic
            :value="当前结余"
            :precision="2"
            suffix="元"
            :value-style="{ color: '#1677ff' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <a-card class="shadow-sm" title="最近交易">
      <a-table
        :columns="columns"
        :data-source="最近交易"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'date'">
            {{ formatDateTime(record.date) }}
          </template>
          <template v-if="column.dataIndex === 'type'">
            <a-tag :color="record.type === 'income' ? 'green' : 'red'">
              {{ record.type === 'income' ? '收入' : '支出' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'person'">
            <a-tag v-if="record.person" color="blue">{{ record.person }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'amount'">
            <span
              :class="
                record.type === 'income' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'
              "
            >
              {{ record.type === 'income' ? '+' : '-' }} {{ record.amount.toFixed(2) }}
            </span>
          </template>
          <template v-else-if="column.dataIndex === 'category'">
            {{ record.category?.name || '未分类' }}
          </template>
        </template>
      </a-table>
      <div v-if="最近交易.length === 0" class="text-center text-gray-400 py-8">
        暂无交易记录，先去记一笔吧
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { formatDateTime } from '@/utils/datetime'

const finance = useFinanceStore()

const 本月范围 = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start, end }
}

const 本月收入 = computed(() => {
  const { start, end } = 本月范围()
  return finance.transactions
    .filter((t) => t.type === 'income')
    .filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
    .reduce((sum, t) => sum + t.amount, 0)
})

const 本月支出 = computed(() => {
  const { start, end } = 本月范围()
  return finance.transactions
    .filter((t) => t.type === 'expense' && t.paymentMethod !== 'credit_repayment')
    .filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
    .reduce((sum, t) => sum + t.amount, 0)
})

const 当前结余 = computed(() => 本月收入.value - 本月支出.value)

const 最近交易 = computed(() => finance.transactions.slice(0, 8))

const columns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '成员', dataIndex: 'person', key: 'person' },
  { title: '备注', dataIndex: 'note', key: 'note' }
]
</script>
