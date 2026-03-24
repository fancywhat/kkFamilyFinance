<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold m-0">家庭负债</h1>
        <p class="text-gray-500 mt-1">记录信用卡、借款等负债，并维护还款流水</p>
      </div>
      <div class="flex items-center gap-2">
        <a-select v-model:value="personFilter" style="width: 160px" placeholder="按成员筛选">
          <a-select-option value="">全部成员</a-select-option>
          <a-select-option v-for="p in 可选成员" :key="p" :value="p">{{ p }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="openDebtModal">
          <template #icon><plus-outlined /></template>
          新增负债
        </a-button>
      </div>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :md="8">
        <a-card class="shadow-sm" title="当前总负债">
          <a-statistic :value="总负债展示" :precision="2" suffix="元" :value-style="{ color: '#ff4d4f' }" />
        </a-card>
      </a-col>
    </a-row>

    <a-card class="shadow-sm" title="负债列表">
      <a-table :columns="debtColumns" :data-source="过滤后负债" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'balance'">
            <span class="text-red-600 font-bold">{{ Number(record.balance).toFixed(2) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'type'">
            <a-tag color="purple">{{ debtTypeLabel(record.type) }}</a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'updatedAt'">
            {{ formatDateTime(record.updatedAt) }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a class="text-blue-600 mr-3" @click="openRecords(record)">流水</a>
            <a-popconfirm title="确定删除该负债吗？" ok-text="确定" cancel-text="取消" @confirm="removeDebt(record.id)">
              <a class="text-red-600">删除</a>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
      <div v-if="过滤后负债.length === 0" class="text-center text-gray-400 py-8">暂无负债记录</div>
    </a-card>

    <a-drawer v-model:open="recordsOpen" width="720" title="负债流水" placement="right">
      <template v-if="currentDebt">
        <div class="flex items-center justify-between mb-4">
          <div>
            <div class="text-lg font-bold">{{ currentDebt.name }}</div>
            <div class="text-gray-500 text-sm">
              当前余额：<span class="text-red-600 font-bold">{{ Number(currentDebt.balance).toFixed(2) }}</span> 元
            </div>
          </div>
          <a-button type="primary" @click="openRecordModal">
            <template #icon><plus-outlined /></template>
            新增流水
          </a-button>
        </div>

        <a-table :columns="recordColumns" :data-source="records" row-key="id" :pagination="false" size="middle">
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'date'">
              {{ formatDateTime(record.date) }}
            </template>
            <template v-else-if="column.dataIndex === 'amount'">
              <span :class="record.type === 'repay' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'">
                {{ Number(record.amount).toFixed(2) }}
              </span>
            </template>
            <template v-else-if="column.dataIndex === 'type'">
              <a-tag :color="typeColor(record.type)">{{ typeLabel(record.type) }}</a-tag>
            </template>
          </template>
        </a-table>
        <div v-if="records.length === 0" class="text-center text-gray-400 py-8">暂无流水</div>
      </template>
    </a-drawer>

    <a-modal v-model:open="debtModalOpen" title="新增负债" ok-text="保存" cancel-text="取消" @ok="submitDebt">
      <a-form layout="vertical">
        <a-form-item label="名称">
          <a-input v-model:value="debtForm.name" placeholder="例如：招商信用卡 / 房贷 / 朋友借款" />
        </a-form-item>
        <a-form-item label="类型">
          <a-select v-model:value="debtForm.type">
            <a-select-option value="credit_card">信用卡（通用）</a-select-option>
            <a-select-option value="credit_line">消费信贷（花呗/白条/月付）</a-select-option>
            <a-select-option value="loan">借款/贷款</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="债权方（可选）">
          <a-input v-model:value="debtForm.lender" placeholder="例如：招商银行 / XX" />
        </a-form-item>
        <a-form-item label="成员（可选）">
          <a-input v-model:value="debtForm.person" placeholder="例如：kk / y" />
        </a-form-item>
        <a-form-item label="当前余额">
          <a-input-number v-model:value="debtForm.balance" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注（可选）">
          <a-input v-model:value="debtForm.note" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="recordModalOpen" title="新增流水" ok-text="保存" cancel-text="取消" @ok="submitRecord">
      <a-form layout="vertical">
        <a-form-item label="类型">
          <a-select v-model:value="recordForm.type">
            <a-select-option value="borrow">新增负债</a-select-option>
            <a-select-option value="repay">还款</a-select-option>
            <a-select-option value="interest">利息/费用</a-select-option>
            <a-select-option value="adjust">调整余额</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="金额">
          <a-input-number v-model:value="recordForm.amount" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="日期">
          <a-date-picker v-model:value="recordForm.date" style="width: 100%" value-format="YYYY-MM-DD HH:mm:ss" show-time />
        </a-form-item>
        <a-form-item label="备注（可选）">
          <a-input v-model:value="recordForm.note" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useDebtsStore } from '@/stores/debts'
import type { 负债 } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'

const debtsStore = useDebtsStore()
const personFilter = ref('')

const 可选成员 = computed(() => {
  const set = new Set<string>()
  for (const d of debtsStore.debts) {
    if (d.person) set.add(d.person)
  }
  return [...set.values()]
})

const 过滤后负债 = computed(() => {
  const p = personFilter.value
  if (!p) return debtsStore.debts
  return debtsStore.debts.filter((d) => d.person === p || d.person === null)
})

const 总负债展示 = computed(() => 过滤后负债.value.reduce((sum, d) => sum + (Number(d.balance) || 0), 0))

function debtTypeLabel(t: string) {
  if (t === 'credit_card') return '信用卡'
  if (t === 'credit_line') return '消费信贷'
  if (t === 'huabei') return '消费信贷'
  if (t === 'baitiao') return '消费信贷'
  if (t === 'loan') return '借款/贷款'
  if (t === 'other') return '其他'
  return t
}

const debtColumns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '债权方', dataIndex: 'lender', key: 'lender' },
  { title: '成员', dataIndex: 'person', key: 'person' },
  { title: '余额', dataIndex: 'balance', key: 'balance' },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt' },
  { title: '操作', dataIndex: 'action', key: 'action' },
]

const recordColumns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '备注', dataIndex: 'note', key: 'note' },
]

const recordsOpen = ref(false)
const currentDebt = ref<负债 | null>(null)
const records = computed(() => {
  const d = currentDebt.value
  if (!d) return []
  return debtsStore.recordsByDebtId[d.id] ?? []
})

const debtModalOpen = ref(false)
const debtForm = reactive<{ name: string; type: string; lender: string; person: string; balance: number | null; note: string }>({
  name: '',
  type: 'credit_card',
  lender: '',
  person: '',
  balance: null,
  note: '',
})

const recordModalOpen = ref(false)
const recordForm = reactive<{ type: 'borrow' | 'repay' | 'interest' | 'adjust'; amount: number | null; date: string; note: string }>({
  type: 'repay',
  amount: null,
  date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  note: '',
})

function typeLabel(t: string) {
  if (t === 'borrow') return '新增负债'
  if (t === 'repay') return '还款'
  if (t === 'interest') return '利息/费用'
  if (t === 'adjust') return '调整'
  return t
}

function typeColor(t: string) {
  if (t === 'repay') return 'green'
  if (t === 'borrow') return 'red'
  if (t === 'interest') return 'orange'
  if (t === 'adjust') return 'blue'
  return 'default'
}

async function openRecords(debt: 负债) {
  currentDebt.value = debt
  recordsOpen.value = true
  await debtsStore.拉取负债流水(debt.id)
}

function openDebtModal() {
  debtModalOpen.value = true
}

async function submitDebt() {
  if (!debtForm.name.trim()) return message.warning('请输入名称')
  if (debtForm.balance === null || debtForm.balance === undefined) return message.warning('请输入余额')
  await debtsStore.新增负债({
    name: debtForm.name.trim(),
    type: debtForm.type,
    lender: debtForm.lender.trim() || undefined,
    person: debtForm.person.trim() || undefined,
    balance: Number(debtForm.balance),
    note: debtForm.note.trim() || undefined,
  })
  message.success('已保存')
  debtModalOpen.value = false
  debtForm.name = ''
  debtForm.lender = ''
  debtForm.person = ''
  debtForm.balance = null
  debtForm.note = ''
}

async function removeDebt(id: number) {
  await debtsStore.删除负债(id)
  message.success('已删除')
  if (currentDebt.value?.id === id) {
    recordsOpen.value = false
    currentDebt.value = null
  }
}

function openRecordModal() {
  recordModalOpen.value = true
}

async function submitRecord() {
  if (!currentDebt.value) return
  if (!recordForm.date) return message.warning('请选择日期')
  if (recordForm.amount === null || recordForm.amount === undefined) return message.warning('请输入金额')
  await debtsStore.新增流水(currentDebt.value.id, {
    type: recordForm.type,
    amount: Number(recordForm.amount),
    date: recordForm.date,
    note: recordForm.note.trim() || undefined,
  })
  message.success('已保存')
  recordModalOpen.value = false
  recordForm.amount = null
  recordForm.note = ''
}

onMounted(async () => {
  await debtsStore.拉取负债()
})
</script>
