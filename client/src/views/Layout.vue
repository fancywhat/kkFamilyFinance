<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo flex flex-col items-center justify-center">
        <div v-if="!collapsed" class="flex gap-3 items-center">
          <img :src="logoUrl" alt="logo" class="w-8 h-8 rounded-xl" />
          <div class="logo-text text-white">格格家</div>
        </div>
        <div class="logo-text text-white" v-else>
          <img :src="logoUrl" alt="logo" class="w-8 h-8 rounded-xl" />
        </div>
      </div>
      <a-menu theme="dark" mode="inline" :selected-keys="selectedKeys" @click="onMenuClick">
        <a-menu-item key="/dashboard">
          <pie-chart-outlined />
          <span>仪表盘</span>
        </a-menu-item>
        <a-menu-item key="/transactions">
          <unordered-list-outlined />
          <span>交易记录</span>
        </a-menu-item>
        <a-menu-item key="/reports">
          <line-chart-outlined />
          <span>分类报表</span>
        </a-menu-item>
        <a-menu-item key="/debts">
          <credit-card-outlined />
          <span>家庭负债</span>
        </a-menu-item>
        <a-menu-item key="/settings">
          <setting-outlined />
          <span>设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="bg-white px-4 flex items-center justify-between">
        <div class="font-medium">轻量级家庭财务管理系统</div>
        <div class="flex items-center gap-3">
          <a-tag color="blue">记账入口：OpenClaw</a-tag>
        </div>
      </a-layout-header>
      <a-layout-content style="margin: 16px">
        <div :style="{ padding: '24px', background: '#fff', minHeight: '360px' }">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CreditCardOutlined,
  LineChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'
import { useFinanceStore } from '@/stores/finance'
import logoUrl from '@/assets/logo.png'

const route = useRoute()
const router = useRouter()
const finance = useFinanceStore()

const collapsed = ref(false)

const selectedKeys = computed(() => {
  const path = route.path
  if (path.startsWith('/transactions')) return ['/transactions']
  if (path.startsWith('/reports')) return ['/reports']
  if (path.startsWith('/debts')) return ['/debts']
  if (path.startsWith('/settings')) return ['/settings']
  return ['/dashboard']
})

const onMenuClick = ({ key }: { key: string }) => {
  router.push(key)
}

onMounted(async () => {
  await Promise.all([finance.拉取分类(), finance.拉取交易()])
})
</script>

<style scoped>
.logo {
  height: 72px;
}
.logo-text {
  font-family: 'Rampart One', cursive;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
</style>
