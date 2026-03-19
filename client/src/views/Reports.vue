<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold m-0">财务分析</h1>
      <p class="text-gray-500 mt-1">趋势与占比，帮助你更快做决策</p>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="12">
        <a-card class="shadow-sm" title="本月支出分类占比">
          <div ref="expensePieRef" style="height: 320px"></div>
          <div v-if="本月支出分类数据.length === 0" class="text-center text-gray-400 py-8">暂无支出数据</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card class="shadow-sm" title="本月成员支出对比">
          <div ref="personBarRef" style="height: 320px"></div>
          <div v-if="本月成员支出数据.length === 0" class="text-center text-gray-400 py-8">暂无成员支出数据</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="24">
        <a-card class="shadow-sm" title="近 6 个月收支趋势">
          <div ref="monthlyLineRef" style="height: 360px"></div>
          <div v-if="近六月趋势数据.labels.length === 0" class="text-center text-gray-400 py-8">暂无数据</div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="12">
        <a-card class="shadow-sm" title="支出分类排行（全部）">
          <a-table :columns="columns" :data-source="支出排行" :pagination="false" row-key="name" size="middle" />
          <div v-if="支出排行.length === 0" class="text-center text-gray-400 py-8">暂无数据</div>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card class="shadow-sm" title="收入分类排行（全部）">
          <a-table :columns="columns" :data-source="收入排行" :pagination="false" row-key="name" size="middle" />
          <div v-if="收入排行.length === 0" class="text-center text-gray-400 py-8">暂无数据</div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useFinanceStore } from '@/stores/finance'

const finance = useFinanceStore()

const columns = [
  { title: '分类', dataIndex: 'name', key: 'name' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '占比', dataIndex: 'percent', key: 'percent' },
]

function 取本月范围() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function 汇总(type: 'income' | 'expense') {
  const map = new Map<string, number>()
  finance.transactions
    .filter((t) => t.type === type)
    .filter((t) => (type === 'expense' ? t.paymentMethod !== 'credit_repayment' : true))
    .forEach((t) => {
      const name = t.category?.name || '未分类'
      map.set(name, (map.get(name) ?? 0) + t.amount)
    })

  const items = Array.from(map.entries()).map(([name, amount]) => ({ name, amount }))
  items.sort((a, b) => b.amount - a.amount)
  const total = items.reduce((s, i) => s + i.amount, 0) || 1

  return items.map((i) => ({
    name: i.name,
    amount: i.amount.toFixed(2),
    percent: `${((i.amount / total) * 100).toFixed(1)}%`,
  }))
}

const 支出排行 = computed(() => 汇总('expense'))
const 收入排行 = computed(() => 汇总('income'))

const 本月支出分类数据 = computed(() => {
  const { start, end } = 取本月范围()
  const map = new Map<string, number>()
  finance.transactions
    .filter((t) => t.type === 'expense' && t.paymentMethod !== 'credit_repayment')
    .filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
    .forEach((t) => {
      const name = t.category?.name || '未分类'
      map.set(name, (map.get(name) ?? 0) + t.amount)
    })

  const items = Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  items.sort((a, b) => b.value - a.value)
  return items
})

const 本月成员支出数据 = computed(() => {
  const { start, end } = 取本月范围()
  const map = new Map<string, number>()
  finance.transactions
    .filter((t) => t.type === 'expense' && t.paymentMethod !== 'credit_repayment')
    .filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
    .forEach((t) => {
      const name = t.person || '未标记'
      map.set(name, (map.get(name) ?? 0) + t.amount)
    })

  const items = Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  items.sort((a, b) => b.value - a.value)
  return items
})

const 近六月趋势数据 = computed(() => {
  const now = new Date()
  const labels: string[] = []
  const income: number[] = []
  const expense: number[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const start = new Date(y, m, 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(y, m + 1, 0)
    end.setHours(23, 59, 59, 999)

    labels.push(`${m + 1}月`)

    const inc = finance.transactions
      .filter((t) => t.type === 'income')
      .filter((t) => {
        const td = new Date(t.date)
        return td >= start && td <= end
      })
      .reduce((s, t) => s + t.amount, 0)

    const exp = finance.transactions
      .filter((t) => t.type === 'expense' && t.paymentMethod !== 'credit_repayment')
      .filter((t) => {
        const td = new Date(t.date)
        return td >= start && td <= end
      })
      .reduce((s, t) => s + t.amount, 0)

    income.push(Number(inc.toFixed(2)))
    expense.push(Number(exp.toFixed(2)))
  }

  return { labels, income, expense }
})

const expensePieRef = ref<HTMLElement | null>(null)
const personBarRef = ref<HTMLElement | null>(null)
const monthlyLineRef = ref<HTMLElement | null>(null)

let expensePieChart: echarts.ECharts | null = null
let personBarChart: echarts.ECharts | null = null
let monthlyLineChart: echarts.ECharts | null = null

function renderExpensePie() {
  if (!expensePieRef.value) return
  expensePieChart = expensePieChart ?? echarts.init(expensePieRef.value)
  expensePieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        name: '支出分类',
        type: 'pie',
        radius: ['40%', '70%'],
        label: { show: true, formatter: '{b} {d}%' },
        data: 本月支出分类数据.value,
      },
    ],
  })
}

function renderPersonBar() {
  if (!personBarRef.value) return
  personBarChart = personBarChart ?? echarts.init(personBarRef.value)
  const names = 本月成员支出数据.value.map((i) => i.name)
  const values = 本月成员支出数据.value.map((i) => Number(i.value.toFixed(2)))
  personBarChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: names, axisLabel: { interval: 0 } },
    yAxis: { type: 'value' },
    series: [{ name: '支出', type: 'bar', data: values }],
  })
}

function renderMonthlyLine() {
  if (!monthlyLineRef.value) return
  monthlyLineChart = monthlyLineChart ?? echarts.init(monthlyLineRef.value)
  monthlyLineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    grid: { left: 40, right: 20, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: 近六月趋势数据.value.labels },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: 近六月趋势数据.value.income },
      { name: '支出', type: 'line', smooth: true, data: 近六月趋势数据.value.expense },
    ],
  })
}

function renderAll() {
  renderExpensePie()
  renderPersonBar()
  renderMonthlyLine()
}

onMounted(() => {
  renderAll()
  window.addEventListener('resize', renderAll)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', renderAll)
  expensePieChart?.dispose()
  personBarChart?.dispose()
  monthlyLineChart?.dispose()
  expensePieChart = null
  personBarChart = null
  monthlyLineChart = null
})

watch(
  () => finance.transactions.length,
  () => renderAll(),
)
</script>
