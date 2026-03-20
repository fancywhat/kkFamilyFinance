import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: '仪表盘',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: 'transactions',
        name: '交易记录',
        component: () => import('@/views/Transactions.vue')
      },
      {
        path: 'reports',
        name: '分类报表',
        component: () => import('@/views/Reports.vue')
      },
      {
        path: 'assets',
        name: '资产账户',
        component: () => import('@/views/Assets.vue')
      },
      {
        path: 'debts',
        name: '家庭负债',
        component: () => import('@/views/Debts.vue')
      },
      {
        path: 'settings',
        name: '设置',
        component: () => import('@/views/Settings.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
