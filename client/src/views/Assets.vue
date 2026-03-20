<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold m-0">资产账户</h1>
        <p class="text-gray-500 mt-1">管理现金、银行卡、微信支付宝等账户余额</p>
      </div>
      <a-button type="primary" @click="打开新增">
        <template #icon><plus-outlined /></template>
        新增账户
      </a-button>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :md="8">
        <a-card class="shadow-sm" title="总资产">
          <a-statistic :value="assetsStore.总资产" :precision="2" suffix="元" />
        </a-card>
      </a-col>
    </a-row>

    <a-card class="shadow-sm">
      <a-table :columns="columns" :data-source="assetsStore.assets" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'balance'">
            <span class="font-bold">{{ Number(record.balance).toFixed(2) }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a class="mr-3 text-blue-600" @click="打开编辑(record)">编辑</a>
            <a-popconfirm
              title="确定要删除这个账户吗？"
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

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑账户' : '新增账户'"
      ok-text="保存"
      cancel-text="取消"
      @ok="提交"
    >
      <a-form layout="vertical">
        <a-form-item label="账户名称">
          <a-input v-model:value="form.name" placeholder="例如：现金 / 招商银行 / 微信" />
        </a-form-item>
        <a-form-item label="账户类型">
          <a-select v-model:value="form.type">
            <a-select-option value="cash">现金</a-select-option>
            <a-select-option value="bank">银行卡</a-select-option>
            <a-select-option value="wechat">微信</a-select-option>
            <a-select-option value="alipay">支付宝</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="当前余额">
          <a-input-number v-model:value="form.balance" style="width: 100%" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="form.note" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useAssetsStore } from '@/stores/assets'
import type { 资产账户 } from '@/types/api'

const assetsStore = useAssetsStore()

const modalOpen = ref(false)
const editingId = ref<number | null>(null)

const form = reactive<{
  name: string
  type: string
  balance: number
  note: string
}>({
  name: '',
  type: 'cash',
  balance: 0,
  note: ''
})

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '余额', dataIndex: 'balance', key: 'balance' },
  { title: '备注', dataIndex: 'note', key: 'note' },
  { title: '操作', dataIndex: 'action', key: 'action' }
]

onMounted(async () => {
  await assetsStore.拉取资产()
})

function 打开新增() {
  editingId.value = null
  modalOpen.value = true
  form.name = ''
  form.type = 'cash'
  form.balance = 0
  form.note = ''
}

function 打开编辑(record: 资产账户) {
  editingId.value = record.id
  modalOpen.value = true
  form.name = record.name
  form.type = record.type || 'cash'
  form.balance = Number(record.balance) || 0
  form.note = record.note || ''
}

async function 提交() {
  const eMsg = (err: unknown) => {
    const e: any = err
    return String(e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '操作失败')
  }

  if (!form.name.trim()) return message.warning('请输入账户名称')
  try {
    if (editingId.value) {
      await assetsStore.更新资产(editingId.value, {
        name: form.name,
        type: form.type,
        balance: form.balance,
        note: form.note
      })
    } else {
      await assetsStore.新增资产({
        name: form.name,
        type: form.type,
        balance: form.balance,
        note: form.note
      })
    }
    message.success('保存成功')
    modalOpen.value = false
  } catch (err) {
    message.error(eMsg(err))
  }
}

async function 删除(id: number) {
  try {
    await assetsStore.删除资产(id)
    message.success('删除成功')
  } catch (err) {
    const e: any = err
    message.error(String(e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? '删除失败'))
  }
}
</script>
