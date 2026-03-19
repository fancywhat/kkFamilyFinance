<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-bold m-0">设置</h1>
      <p class="text-gray-500 mt-1">管理分类与快速记账解析规则</p>
    </div>

    <a-card class="shadow-sm" title="分类管理">
      <a-tabs v-model:activeKey="tabKey">
        <a-tab-pane key="expense" tab="支出分类">
          <div class="flex items-center gap-2 mb-3">
            <a-input v-model:value="newExpense" placeholder="输入分类名称" style="max-width: 240px" />
            <a-button type="primary" @click="添加('expense')">添加</a-button>
          </div>
          <a-table :columns="categoryColumns" :data-source="finance.支出分类" row-key="id" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'action'">
                <a-popconfirm
                  title="确定要删除该分类吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  @confirm="删除(record.id)"
                >
                  <a class="text-red-600">删除</a>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="income" tab="收入分类">
          <div class="flex items-center gap-2 mb-3">
            <a-input v-model:value="newIncome" placeholder="输入分类名称" style="max-width: 240px" />
            <a-button type="primary" @click="添加('income')">添加</a-button>
          </div>
          <a-table :columns="categoryColumns" :data-source="finance.收入分类" row-key="id" :pagination="false">
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'action'">
                <a-popconfirm
                  title="确定要删除该分类吗？"
                  ok-text="确定"
                  cancel-text="取消"
                  @confirm="删除(record.id)"
                >
                  <a class="text-red-600">删除</a>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-card class="shadow-sm" title="快速记账设置">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :xs="24" :md="8">
            <a-form-item label="默认成员（可选）">
              <a-input v-model:value="configForm.defaultPerson" placeholder="例如：kk（不填则为空）" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8">
            <a-form-item label="自动创建新分类">
              <a-switch v-model:checked="configForm.autoCreateCategory" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="8" class="flex items-end">
            <a-button type="primary" :loading="configLoading" @click="保存配置">保存设置</a-button>
          </a-col>
        </a-row>
      </a-form>

      <a-divider>成员别名</a-divider>
      <div class="flex items-center gap-2 mb-3">
        <a-input v-model:value="newAlias" placeholder="别名，例如 kk / y / 可可" style="max-width: 240px" />
        <a-input v-model:value="newPerson" placeholder="成员标记，例如 kk / y" style="max-width: 240px" />
        <a-button type="primary" @click="添加别名">添加</a-button>
      </div>
      <a-table :columns="aliasColumns" :data-source="aliasRows" row-key="alias" :pagination="false" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'action'">
            <a-popconfirm
              title="确定要删除该别名吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="删除别名(record.alias)"
            >
              <a class="text-red-600">删除</a>
            </a-popconfirm>
          </template>
        </template>
      </a-table>

      <a-divider>关键词归类规则</a-divider>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <a-select v-model:value="newRule.type" style="width: 120px">
          <a-select-option value="expense">支出</a-select-option>
          <a-select-option value="income">收入</a-select-option>
        </a-select>
        <a-input v-model:value="newRule.keywords" placeholder="关键词，多个用空格分隔，例如 早餐 午饭 手抓饼" style="min-width: 320px; max-width: 520px" />
        <a-input v-model:value="newRule.category" placeholder="归类到的分类名称，例如 餐饮" style="width: 200px" />
        <a-button type="primary" @click="添加规则">添加</a-button>
      </div>

      <a-table :columns="ruleColumns" :data-source="ruleRows" row-key="id" :pagination="false" size="middle">
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'type'">
            <a-tag :color="record.type === 'income' ? 'green' : 'red'">
              {{ record.type === 'income' ? '收入' : '支出' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'keywords'">
            {{ record.keywords.join('、') }}
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <a-popconfirm
              title="确定要删除该规则吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="删除规则(record.id)"
            >
              <a class="text-red-600">删除</a>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useFinanceStore } from '@/stores/finance'
import type { 交易类型 } from '@/types/api'
import { api } from '@/lib/api'

const finance = useFinanceStore()

const tabKey = ref<'expense' | 'income'>('expense')
const newExpense = ref('')
const newIncome = ref('')

const categoryColumns = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '操作', dataIndex: 'action', key: 'action' },
]

type 快速记账规则 = {
  type: 'income' | 'expense'
  keywords: string[]
  category: string
}

type 快速记账配置 = {
  defaultPerson: string | null
  personAliases: Record<string, string>
  autoCreateCategory: boolean
  categoryKeywordRules: 快速记账规则[]
}

const configLoading = ref(false)
const configForm = reactive<快速记账配置>({
  defaultPerson: null,
  personAliases: {},
  autoCreateCategory: true,
  categoryKeywordRules: [],
})

const aliasRows = ref<{ alias: string; person: string }[]>([])
const newAlias = ref('')
const newPerson = ref('')

const aliasColumns = [
  { title: '别名', dataIndex: 'alias', key: 'alias' },
  { title: '成员', dataIndex: 'person', key: 'person' },
  { title: '操作', dataIndex: 'action', key: 'action' },
]

const ruleRows = ref<(快速记账规则 & { id: string })[]>([])
const newRule = reactive<{ type: 'income' | 'expense'; keywords: string; category: string }>({
  type: 'expense',
  keywords: '',
  category: '餐饮',
})

const ruleColumns = [
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '关键词', dataIndex: 'keywords', key: 'keywords' },
  { title: '归类到', dataIndex: 'category', key: 'category' },
  { title: '操作', dataIndex: 'action', key: 'action' },
]

async function 拉取配置() {
  configLoading.value = true
  try {
    const res = await api.get('/api/quick-add/config')
    const cfg: 快速记账配置 = res.data
    configForm.defaultPerson = cfg.defaultPerson ?? null
    configForm.autoCreateCategory = cfg.autoCreateCategory ?? true
    configForm.personAliases = cfg.personAliases ?? {}
    configForm.categoryKeywordRules = Array.isArray(cfg.categoryKeywordRules) ? cfg.categoryKeywordRules : []

    aliasRows.value = Object.entries(configForm.personAliases).map(([alias, person]) => ({ alias, person }))
    ruleRows.value = configForm.categoryKeywordRules.map((r, idx) => ({
      id: `${idx}-${r.type}-${r.category}`,
      type: r.type,
      keywords: Array.isArray(r.keywords) ? r.keywords : [],
      category: r.category,
    }))
  } finally {
    configLoading.value = false
  }
}

async function 保存配置() {
  const personAliases: Record<string, string> = {}
  for (const row of aliasRows.value) {
    const alias = row.alias.trim()
    const person = row.person.trim()
    if (!alias || !person) continue
    const key = /^[a-zA-Z]{1,6}$/.test(alias) ? alias.toLowerCase() : alias
    personAliases[key] = person
  }

  const categoryKeywordRules: 快速记账规则[] = ruleRows.value.map((r) => ({
    type: r.type,
    keywords: r.keywords,
    category: r.category,
  }))

  configLoading.value = true
  try {
    await api.put('/api/quick-add/config', {
      defaultPerson: configForm.defaultPerson ? configForm.defaultPerson.trim() : null,
      autoCreateCategory: configForm.autoCreateCategory,
      personAliases,
      categoryKeywordRules,
    })
    message.success('已保存')
    await 拉取配置()
  } catch (e: any) {
    message.error(e?.response?.data?.error || '保存失败')
  } finally {
    configLoading.value = false
  }
}

function 添加别名() {
  const alias = newAlias.value.trim()
  const person = newPerson.value.trim()
  if (!alias || !person) return message.warning('请输入别名和成员')
  const key = /^[a-zA-Z]{1,6}$/.test(alias) ? alias.toLowerCase() : alias
  if (aliasRows.value.some((r) => r.alias === key)) return message.warning('该别名已存在')
  aliasRows.value.unshift({ alias: key, person })
  newAlias.value = ''
  newPerson.value = ''
}

function 删除别名(alias: string) {
  aliasRows.value = aliasRows.value.filter((r) => r.alias !== alias)
}

function 添加规则() {
  const keywords = newRule.keywords
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const category = newRule.category.trim()
  if (!category) return message.warning('请输入归类到的分类名称')
  if (keywords.length === 0) return message.warning('请输入至少一个关键词')
  const id = `${Date.now()}`
  ruleRows.value.unshift({ id, type: newRule.type, keywords, category })
  newRule.keywords = ''
}

function 删除规则(id: string) {
  ruleRows.value = ruleRows.value.filter((r) => r.id !== id)
}

async function 添加(type: 交易类型) {
  const name = (type === 'expense' ? newExpense.value : newIncome.value).trim()
  if (!name) return message.warning('请输入分类名称')
  try {
    await finance.新增分类(name, type)
    if (type === 'expense') newExpense.value = ''
    else newIncome.value = ''
    message.success('添加成功')
  } catch (e: any) {
    message.error(e?.response?.data?.error || '添加失败')
  }
}

async function 删除(id: number) {
  try {
    await finance.删除分类(id)
    message.success('删除成功')
  } catch (e: any) {
    message.error(e?.response?.data?.error || '删除失败')
  }
}

onMounted(async () => {
  await 拉取配置()
})
</script>
