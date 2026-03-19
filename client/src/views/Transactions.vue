<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold m-0">交易记录</h1>
        <p class="text-gray-500 mt-1">全家人共同记账，实时同步</p>
      </div>
      <a-button type="primary" @click="打开弹窗">
        <template #icon><plus-outlined /></template>
        记一笔
      </a-button>
    </div>

    <a-card class="shadow-sm">
      <a-table :columns="columns" :data-source="finance.transactions" row-key="id">
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
            <a-tag v-if="record.person" color="blue">
              {{ record.person }}
            </a-tag>
            <span v-else class="text-gray-400">-</span>
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
          <template v-else-if="column.dataIndex === 'paymentMethod'">
            <a-tag v-if="record.paymentMethod === 'cash'">现金</a-tag>
            <a-tag v-else-if="record.paymentMethod === 'bank'" color="blue">银行卡</a-tag>
            <a-tag v-else-if="record.paymentMethod === 'credit_card'" color="purple"
              >信用卡消费</a-tag
            >
            <a-tag v-else-if="record.paymentMethod === 'credit_repayment'" color="orange"
              >信用卡还款</a-tag
            >
          </template>
          <template v-else-if="column.dataIndex === 'debt'">
            <span class="text-gray-700">{{ record.debt?.name || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-popconfirm
              title="确定要删除这条记录吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="删除(record.id)"
            >
              <a class="text-red-600">删除</a>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="modalOpen" title="新增交易" ok-text="保存" cancel-text="取消" @ok="提交">
      <a-form layout="vertical">
        <a-form-item label="交易类型">
          <a-radio-group v-model:value="form.type" button-style="solid">
            <a-radio-button value="expense">支出</a-radio-button>
            <a-radio-button value="income">收入</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="分类">
          <a-select v-model:value="form.categoryId" placeholder="请选择分类">
            <a-select-option v-for="c in 可选分类" :key="c.id" :value="c.id">
              {{ c.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="支付方式">
          <a-select v-model:value="form.paymentMethod">
            <a-select-option value="cash">现金</a-select-option>
            <a-select-option value="bank">银行卡</a-select-option>
            <a-select-option value="credit_card">信用卡消费</a-select-option>
            <a-select-option value="credit_repayment">信用卡还款</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item v-if="需要选择信用卡" label="信用卡账户">
          <a-select v-model:value="form.debtId" placeholder="请选择信用卡">
            <a-select-option v-for="d in debtsStore.信用卡列表" :key="d.id" :value="d.id">
              {{ d.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="金额">
          <a-input-number v-model:value="form.amount" :min="0" style="width: 100%" />
        </a-form-item>

        <a-form-item label="日期">
          <a-date-picker
            v-model:value="form.date"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
            show-time
          />
        </a-form-item>

        <a-form-item label="备注">
          <a-input v-model:value="form.note" placeholder="写点什么吧..." />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useFinanceStore } from '@/stores/finance'
import { useDebtsStore } from '@/stores/debts'
import type { 交易类型, 支付方式 } from '@/types/api'
import { formatDateTime } from '@/utils/datetime'

const finance = useFinanceStore()
const debtsStore = useDebtsStore()

const modalOpen = ref(false)

const form = reactive<{
  type: 交易类型
  categoryId: number | null
  paymentMethod: 支付方式
  debtId: number | null
  amount: number | null
  date: string
  note: string
}>({
  type: 'expense',
  categoryId: null,
  paymentMethod: 'cash',
  debtId: null,
  amount: null,
  date: new Date().toISOString().slice(0, 19).replace('T', ' '),
  note: ''
})

const 可选分类 = computed(() => finance.categories.filter((c) => c.type === form.type))
const 还款分类Id = computed(() => {
  const c = finance.categories.find((x) => x.type === 'expense' && x.name === '信用卡还款')
  return c?.id ?? null
})
const 需要选择信用卡 = computed(
  () => form.paymentMethod === 'credit_card' || form.paymentMethod === 'credit_repayment'
)

const columns = [
  { title: '日期', dataIndex: 'date', key: 'date' },
  { title: '分类', dataIndex: 'category', key: 'category' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '金额', dataIndex: 'amount', key: 'amount' },
  { title: '支付方式', dataIndex: 'paymentMethod', key: 'paymentMethod' },
  { title: '信用卡', dataIndex: 'debt', key: 'debt' },
  { title: '成员', dataIndex: 'person', key: 'person' },
  { title: '备注', dataIndex: 'note', key: 'note' },
  { title: '操作', dataIndex: 'action', key: 'action' }
]

function 打开弹窗() {
  modalOpen.value = true
}

onMounted(async () => {
  await debtsStore.拉取负债()
})

async function 提交() {
  if (form.paymentMethod === 'credit_repayment' && 还款分类Id.value) {
    form.categoryId = 还款分类Id.value
  }
  if (!form.categoryId) return message.warning('请选择分类')
  if (!form.amount || form.amount <= 0) return message.warning('请输入正确的金额')
  if (需要选择信用卡.value && !form.debtId) return message.warning('请选择信用卡账户')

  await finance.新增交易({
    amount: Number(form.amount),
    type: form.type,
    paymentMethod: form.paymentMethod,
    date: form.date,
    note: form.note,
    categoryId: form.categoryId,
    debtId: 需要选择信用卡.value ? form.debtId : null
  })

  message.success('保存成功')
  modalOpen.value = false
  form.amount = null
  form.note = ''
  form.categoryId = null
  form.debtId = null
  form.paymentMethod = 'cash'
}

async function 删除(id: number) {
  await finance.删除交易(id)
  message.success('删除成功')
}
</script>
