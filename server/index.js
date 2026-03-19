import express from 'express'
import cors from 'cors'
import prismaPkg from '@prisma/client'
import fs from 'node:fs/promises'
import path from 'node:path'

const app = express()
const { PrismaClient } = prismaPkg
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

const WRITE_API_KEY = process.env.KK_FINANCE_API_KEY || ''

function requireWriteApiKey(req, res, next) {
  if (!WRITE_API_KEY) return next()
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next()
  const key = String(req.headers['x-api-key'] || '')
  if (key !== WRITE_API_KEY) return res.status(401).json({ error: 'Unauthorized' })
  return next()
}

app.use('/api', requireWriteApiKey)

const CONFIG_PATH = path.resolve(process.cwd(), 'config', 'quick-add.json')

let quickAddConfig = null

async function loadQuickAddConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8')
    quickAddConfig = JSON.parse(raw)
  } catch {
    quickAddConfig = {
      defaultPerson: null,
      personAliases: { kk: 'kk', y: 'y' },
      autoCreateCategory: true,
      categoryKeywordRules: []
    }
  }
}

async function saveQuickAddConfig(nextConfig) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true })
  await fs.writeFile(CONFIG_PATH, JSON.stringify(nextConfig, null, 2), 'utf-8')
  quickAddConfig = nextConfig
}

const DEFAULT_CATEGORIES = [
  { name: '餐饮', type: 'expense' },
  { name: '交通', type: 'expense' },
  { name: '购物', type: 'expense' },
  { name: '娱乐', type: 'expense' },
  { name: '居住', type: 'expense' },
  { name: '医疗', type: 'expense' },
  { name: '信用卡还款', type: 'expense' },
  { name: '工资', type: 'income' },
  { name: '奖金', type: 'income' },
  { name: '理财收益', type: 'income' },
  { name: '兼职', type: 'income' }
]

async function ensureDefaultCategories() {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: { name: c.name, type: c.type }
    })
  }
}

function toUtcDate(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
}

function parseDateFromText(text) {
  const original = text
  const trimmed = text.trim()

  const explicitYMD = trimmed.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (explicitYMD) {
    const y = Number(explicitYMD[1])
    const m = Number(explicitYMD[2])
    const d = Number(explicitYMD[3])
    const date = toUtcDate(y, m, d)
    const rest = trimmed.replace(explicitYMD[0], ' ')
    return { date, rest }
  }

  const explicitMD = trimmed.match(/(\d{1,2})月(\d{1,2})日/)
  if (explicitMD) {
    const now = new Date()
    const y = now.getFullYear()
    const m = Number(explicitMD[1])
    const d = Number(explicitMD[2])
    const date = toUtcDate(y, m, d)
    const rest = trimmed.replace(explicitMD[0], ' ')
    return { date, rest }
  }

  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const keywordMap = [
    { key: '今天', delta: 0 },
    { key: '昨日', delta: -1 },
    { key: '昨天', delta: -1 },
    { key: '前天', delta: -2 },
    { key: '明天', delta: 1 },
    { key: '后天', delta: 2 }
  ]

  for (const item of keywordMap) {
    if (trimmed.includes(item.key)) {
      const d0 = new Date(base)
      d0.setDate(d0.getDate() + item.delta)
      const date = toUtcDate(d0.getFullYear(), d0.getMonth() + 1, d0.getDate())
      const rest = trimmed.replace(item.key, ' ')
      return { date, rest }
    }
  }

  const now = new Date()
  const date = toUtcDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  return { date, rest: original }
}

function parseAmountFromText(text) {
  const cleaned = text
    .replace(/￥/g, ' ')
    .replace(/人民币/g, ' ')
    .replace(/rmb/gi, ' ')
    .replace(/元|块/g, ' ')
  const match = cleaned.match(/([+-]?\d+(?:\.\d+)?)/)
  if (!match) return { amount: null, rest: text }
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return { amount: null, rest: text }
  const rest = text.replace(match[1], ' ')
  return { amount, rest }
}

function detectType(text) {
  const t = text.trim()
  if (t.startsWith('+')) return 'income'
  if (t.startsWith('-')) return 'expense'

  const incomeWords = [
    '收入',
    '进账',
    '入账',
    '工资',
    '奖金',
    '理财',
    '分红',
    '兼职',
    '报销',
    '退款'
  ]
  const expenseWords = [
    '支出',
    '花',
    '买',
    '餐',
    '饭',
    '午饭',
    '早餐',
    '晚饭',
    '夜宵',
    '打车',
    '地铁',
    '公交',
    '房租',
    '水电',
    '物业',
    '药',
    '医院',
    '购物',
    '娱乐'
  ]

  if (incomeWords.some((w) => t.includes(w))) return 'income'
  if (expenseWords.some((w) => t.includes(w))) return 'expense'
  return 'expense'
}

function extractCategoryCandidate(text) {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null
  const last = parts[parts.length - 1]
  if (/[0-9]/.test(last)) return null
  if (last.length > 8) return null
  if (['今天', '昨天', '前天', '明天', '后天'].includes(last)) return null
  return last
}

function normalizePersonToken(token) {
  const t = token.trim()
  if (!t) return null
  if (/^[a-zA-Z]{1,6}$/.test(t)) return t.toLowerCase()
  return t
}

function extractPerson(text) {
  const trimmed = text.trim()
  const m = trimmed.match(/^(\S+)[\s，,、]+(.+)?$/)
  if (!m) return { person: quickAddConfig?.defaultPerson ?? null, rest: text }

  const token = normalizePersonToken(m[1])
  const aliasMap = quickAddConfig?.personAliases ?? {}
  const person =
    token && Object.prototype.hasOwnProperty.call(aliasMap, token) ? aliasMap[token] : null
  if (!person) return { person: quickAddConfig?.defaultPerson ?? null, rest: text }

  const rest = (m[2] ?? '').trim()
  return { person, rest: rest || '' }
}

function parseCanonicalDateTime(value) {
  const v = String(value || '').trim()
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const hh = m[4] ? Number(m[4]) : 0
  const mm = m[5] ? Number(m[5]) : 0
  const ss = m[6] ? Number(m[6]) : 0
  if (![y, mo, d, hh, mm, ss].every(Number.isFinite)) return null
  return new Date(Date.UTC(y, mo - 1, d, hh, mm, ss))
}

function parseCanonicalText(text) {
  const t = String(text || '').trim()
  if (!t) return null

  const pipe = t.split('|').map((s) => s.trim())
  if (pipe.length >= 5) {
    const [person, type, categoryName, amountStr, dateStr, noteStr] = pipe
    const amount = Number(amountStr)
    const date = parseCanonicalDateTime(dateStr)
    if (!Number.isFinite(amount) || !date) return null
    if (type !== 'income' && type !== 'expense') return null
    if (!categoryName) return null
    return {
      person: person || null,
      type,
      categoryName,
      amount,
      date,
      note: noteStr ? noteStr.trim() : null
    }
  }

  const kv = Object.create(null)
  const parts = t.split(/\s+/).filter(Boolean)
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx <= 0) continue
    const k = p.slice(0, idx).trim()
    const v = p.slice(idx + 1).trim()
    if (k && v) kv[k] = v
  }
  if (kv['金额'] || kv['amount']) {
    const type = (kv['类型'] || kv['type'] || '').trim()
    const categoryName = (kv['分类'] || kv['category'] || '').trim()
    const amount = Number(kv['金额'] || kv['amount'])
    const date = parseCanonicalDateTime(kv['日期'] || kv['date'])
    if (!Number.isFinite(amount) || !date) return null
    if (type !== 'income' && type !== 'expense') return null
    if (!categoryName) return null
    return {
      person: (kv['成员'] || kv['人'] || kv['person'] || '').trim() || null,
      type,
      categoryName,
      amount,
      date,
      note: (kv['备注'] || kv['note'] || '').trim() || null
    }
  }

  return null
}

function extractTextFromRequestBody(body) {
  if (!body) return ''
  if (typeof body === 'string') return body
  if (typeof body !== 'object') return ''
  if (typeof body.text === 'string') return body.text
  if (typeof body.canonicalText === 'string') return body.canonicalText
  if (typeof body.message === 'string') return body.message
  if (body.data && typeof body.data === 'object') {
    if (typeof body.data.text === 'string') return body.data.text
    if (typeof body.data.canonicalText === 'string') return body.data.canonicalText
    if (typeof body.data.message === 'string') return body.data.message
  }
  return ''
}

async function resolveCategoryByName({ name, type }) {
  const categoryName = String(name || '').trim()
  if (!categoryName) return null
  const existing = await prisma.category.findFirst({ where: { name: categoryName, type } })
  if (existing) return existing
  if (!quickAddConfig?.autoCreateCategory) return null
  try {
    return await prisma.category.create({ data: { name: categoryName, type } })
  } catch {
    return await prisma.category.findFirst({ where: { name: categoryName, type } })
  }
}

async function resolveCategoryId({ text, type }) {
  const categories = await prisma.category.findMany({
    where: { type },
    select: { id: true, name: true, type: true }
  })

  const rules = Array.isArray(quickAddConfig?.categoryKeywordRules)
    ? quickAddConfig.categoryKeywordRules
    : []

  for (const rule of rules) {
    if (!rule || rule.type !== type) continue
    const keywords = Array.isArray(rule.keywords) ? rule.keywords : []
    if (!rule.category || typeof rule.category !== 'string') continue
    if (keywords.some((k) => typeof k === 'string' && k && text.includes(k))) {
      const target = categories.find((c) => c.name === rule.category)
      if (target) return { categoryId: target.id, categoryName: target.name, created: false }
    }
  }

  const sorted = [...categories].sort((a, b) => b.name.length - a.name.length)
  const hit = sorted.find((c) => text.includes(c.name))
  if (hit) return { categoryId: hit.id, categoryName: hit.name, created: false }

  const candidate = extractCategoryCandidate(text)
  if (!candidate) return { categoryId: null, categoryName: null, created: false }

  const existing = categories.find((c) => c.name === candidate)
  if (existing) return { categoryId: existing.id, categoryName: existing.name, created: false }

  if (!quickAddConfig?.autoCreateCategory)
    return { categoryId: null, categoryName: null, created: false }

  try {
    const created = await prisma.category.create({ data: { name: candidate, type } })
    return { categoryId: created.id, categoryName: created.name, created: true }
  } catch {
    const fallback = await prisma.category.findFirst({
      where: { name: candidate, type },
      select: { id: true, name: true }
    })
    if (!fallback) return { categoryId: null, categoryName: null, created: false }
    return { categoryId: fallback.id, categoryName: fallback.name, created: false }
  }
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/quick-add/config', async (_req, res) => {
  if (!quickAddConfig) await loadQuickAddConfig()
  res.json(quickAddConfig)
})

app.put('/api/quick-add/config', async (req, res) => {
  const nextConfig = req.body
  if (!nextConfig || typeof nextConfig !== 'object')
    return res.status(400).json({ error: '配置格式不正确' })
  const personAliases = nextConfig.personAliases
  if (personAliases && typeof personAliases !== 'object')
    return res.status(400).json({ error: '成员别名格式不正确' })
  if (
    nextConfig.defaultPerson !== null &&
    nextConfig.defaultPerson !== undefined &&
    typeof nextConfig.defaultPerson !== 'string'
  ) {
    return res.status(400).json({ error: '默认成员格式不正确' })
  }
  if (
    nextConfig.autoCreateCategory !== undefined &&
    typeof nextConfig.autoCreateCategory !== 'boolean'
  ) {
    return res.status(400).json({ error: 'autoCreateCategory 格式不正确' })
  }
  if (
    nextConfig.categoryKeywordRules !== undefined &&
    !Array.isArray(nextConfig.categoryKeywordRules)
  ) {
    return res.status(400).json({ error: '关键词规则格式不正确' })
  }
  const normalized = {
    defaultPerson: nextConfig.defaultPerson ?? null,
    personAliases: personAliases ?? quickAddConfig?.personAliases ?? {},
    autoCreateCategory: nextConfig.autoCreateCategory ?? quickAddConfig?.autoCreateCategory ?? true,
    categoryKeywordRules:
      nextConfig.categoryKeywordRules ?? quickAddConfig?.categoryKeywordRules ?? []
  }
  await saveQuickAddConfig(normalized)
  res.json(normalized)
})

app.get('/api/categories', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }]
  })
  res.json(categories)
})

app.post('/api/categories', async (req, res) => {
  const { name, type } = req.body
  if (!name || !type) return res.status(400).json({ error: '分类名称和类型为必填项' })
  if (type !== 'income' && type !== 'expense')
    return res.status(400).json({ error: '分类类型不合法' })
  try {
    const category = await prisma.category.create({ data: { name, type } })
    res.status(201).json(category)
  } catch {
    res.status(400).json({ error: '该分类已存在' })
  }
})

app.delete('/api/categories/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '参数不合法' })

  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) return res.status(404).json({ error: '分类不存在' })

  const txCount = await prisma.transaction.count({ where: { categoryId: id } })
  if (txCount > 0) return res.status(400).json({ error: '该分类下存在交易记录，无法删除' })

  await prisma.category.delete({ where: { id } })
  res.json({ ok: true })
})

app.get('/api/transactions', async (req, res) => {
  const { from, to } = req.query
  const where = {}

  if (from || to) {
    where.date = {}
    if (from) where.date.gte = new Date(String(from))
    if (to) where.date.lte = new Date(String(to))
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { category: true, debt: true }
  })
  res.json(transactions)
})

app.post('/api/transactions', async (req, res) => {
  const { amount, type, date, note, categoryId, person, paymentMethod, debtId } = req.body
  if (amount === undefined || !type || !date || !categoryId) {
    return res.status(400).json({ error: '金额、类型、日期、分类为必填项' })
  }
  if (type !== 'income' && type !== 'expense')
    return res.status(400).json({ error: '交易类型不合法' })

  const method = paymentMethod ? String(paymentMethod) : 'cash'
  const allowedMethods = ['cash', 'bank', 'credit_card', 'credit_repayment']
  if (!allowedMethods.includes(method)) return res.status(400).json({ error: '支付方式不合法' })

  const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } })
  if (!category) return res.status(404).json({ error: '分类不存在' })
  if (category.type !== type) return res.status(400).json({ error: '分类类型与交易类型不匹配' })

  const txAmount = Number(amount)
  const txDate = new Date(date)
  const txDebtId = debtId === undefined || debtId === null ? null : Number(debtId)

  try {
    const created = await prisma.$transaction(async (tx) => {
      let debt = null
      if ((method === 'credit_card' || method === 'credit_repayment') && txDebtId) {
        debt = await tx.debt.findUnique({ where: { id: txDebtId } })
        if (!debt) throw new Error('DEBT_NOT_FOUND')
        if (debt.type !== 'credit_card') throw new Error('DEBT_TYPE_INVALID')
      }

      const createdTx = await tx.transaction.create({
        data: {
          amount: txAmount,
          type,
          paymentMethod: method,
          date: txDate,
          note: note || null,
          person: person || null,
          categoryId: Number(categoryId),
          debtId: debt ? debt.id : null
        },
        include: { category: true, debt: true }
      })

      if (debt) {
        const recordType = method === 'credit_card' ? 'borrow' : 'repay'
        const nextBalance =
          recordType === 'borrow' ? debt.balance + txAmount : debt.balance - txAmount

        await tx.debtRecord.create({
          data: {
            debtId: debt.id,
            type: recordType,
            amount: txAmount,
            date: txDate,
            note: note || null
          }
        })
        await tx.debt.update({ where: { id: debt.id }, data: { balance: nextBalance } })
      }

      return createdTx
    })

    res.status(201).json(created)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'DEBT_NOT_FOUND') return res.status(404).json({ error: '信用卡账户不存在' })
    if (msg === 'DEBT_TYPE_INVALID')
      return res.status(400).json({ error: '所选负债不是信用卡类型' })
    return res.status(500).json({ error: '服务器错误' })
  }
})

app.get('/api/debts', async (_req, res) => {
  const debts = await prisma.debt.findMany({
    orderBy: { updatedAt: 'desc' }
  })
  res.json(debts)
})

app.post('/api/debts', async (req, res) => {
  const { name, lender, person, type, principal, balance, apr, startDate, dueDay, note } = req.body
  if (!name || !type) return res.status(400).json({ error: '名称和类型为必填项' })
  if (balance === undefined || balance === null)
    return res.status(400).json({ error: '余额为必填项' })

  const created = await prisma.debt.create({
    data: {
      name: String(name),
      lender: lender ? String(lender) : null,
      person: person ? String(person) : null,
      type: String(type),
      principal: principal === undefined || principal === null ? null : Number(principal),
      balance: Number(balance),
      apr: apr === undefined || apr === null ? null : Number(apr),
      startDate: startDate ? new Date(startDate) : null,
      dueDay: dueDay === undefined || dueDay === null ? null : Number(dueDay),
      note: note ? String(note) : null
    }
  })
  res.status(201).json(created)
})

app.put('/api/debts/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '参数不合法' })

  const { name, lender, person, type, principal, balance, apr, startDate, dueDay, note } = req.body
  const updated = await prisma.debt.update({
    where: { id },
    data: {
      name: name === undefined ? undefined : String(name),
      lender: lender === undefined ? undefined : lender ? String(lender) : null,
      person: person === undefined ? undefined : person ? String(person) : null,
      type: type === undefined ? undefined : String(type),
      principal:
        principal === undefined ? undefined : principal === null ? null : Number(principal),
      balance: balance === undefined ? undefined : Number(balance),
      apr: apr === undefined ? undefined : apr === null ? null : Number(apr),
      startDate: startDate === undefined ? undefined : startDate ? new Date(startDate) : null,
      dueDay: dueDay === undefined ? undefined : dueDay === null ? null : Number(dueDay),
      note: note === undefined ? undefined : note ? String(note) : null
    }
  })
  res.json(updated)
})

app.delete('/api/debts/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '参数不合法' })
  await prisma.debt.delete({ where: { id } })
  res.json({ ok: true })
})

app.get('/api/debts/:id/records', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '参数不合法' })
  const records = await prisma.debtRecord.findMany({
    where: { debtId: id },
    orderBy: { date: 'desc' }
  })
  res.json(records)
})

app.post('/api/debts/:id/records', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '参数不合法' })

  const { type, amount, date, note } = req.body
  if (!type || amount === undefined || amount === null || !date) {
    return res.status(400).json({ error: '类型、金额、日期为必填项' })
  }

  const recordType = String(type)
  const recordAmount = Number(amount)
  const recordDate = new Date(date)
  if (!Number.isFinite(recordAmount)) return res.status(400).json({ error: '金额不合法' })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.findUnique({ where: { id } })
      if (!debt) throw new Error('NOT_FOUND')

      let nextBalance = debt.balance
      if (recordType === 'borrow') nextBalance = debt.balance + recordAmount
      else if (recordType === 'repay') nextBalance = debt.balance - recordAmount
      else if (recordType === 'interest') nextBalance = debt.balance + recordAmount
      else if (recordType === 'adjust') nextBalance = recordAmount
      else throw new Error('TYPE_INVALID')

      const created = await tx.debtRecord.create({
        data: {
          debtId: id,
          type: recordType,
          amount: recordAmount,
          date: recordDate,
          note: note ? String(note) : null
        }
      })
      const updatedDebt = await tx.debt.update({ where: { id }, data: { balance: nextBalance } })
      return { created, updatedDebt }
    })

    res.status(201).json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'NOT_FOUND') return res.status(404).json({ error: '负债不存在' })
    if (msg === 'TYPE_INVALID') return res.status(400).json({ error: '流水类型不合法' })
    return res.status(500).json({ error: '服务器错误' })
  }
})

app.post('/api/ingest', async (req, res) => {
  if (!quickAddConfig) await loadQuickAddConfig()
  await ensureDefaultCategories()

  const text = extractTextFromRequestBody(req.body)
  const parsed = parseCanonicalText(text)
  if (!parsed) {
    return res.status(400).json({
      error: '固定文本格式不正确。推荐：kk|expense|餐饮|15|2026-03-18 08:00:00|早餐'
    })
  }

  const category = await resolveCategoryByName({ name: parsed.categoryName, type: parsed.type })
  if (!category) return res.status(400).json({ error: '分类不存在，且已关闭自动创建新分类' })

  const created = await prisma.transaction.create({
    data: {
      amount: Number(parsed.amount),
      type: parsed.type,
      paymentMethod: 'cash',
      date: parsed.date,
      note: parsed.note || null,
      person: parsed.person || null,
      categoryId: category.id,
      debtId: null
    },
    include: { category: true, debt: true }
  })

  res.status(201).json({
    parsed: {
      person: created.person,
      type: created.type,
      categoryName: created.category.name,
      amount: created.amount,
      date: created.date.toISOString().slice(0, 19).replace('T', ' '),
      note: created.note
    },
    transaction: created
  })
})

app.post('/api/quick-add', async (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== 'string')
    return res.status(400).json({ error: '请输入一段中文描述' })

  if (!quickAddConfig) await loadQuickAddConfig()
  await ensureDefaultCategories()

  const original = text.trim()
  const { person, rest: afterPerson } = extractPerson(original)
  const { date, rest: afterDate } = parseDateFromText(afterPerson || original)

  const type = detectType(afterDate)
  const { amount, rest: afterAmount } = parseAmountFromText(afterDate)
  if (amount === null)
    return res.status(400).json({ error: '未识别到金额，请包含类似“25元”这样的金额' })

  const { categoryId, categoryName } = await resolveCategoryId({ text: afterAmount, type })
  if (!categoryId)
    return res.status(400).json({ error: '未识别到分类，请在句子中包含分类名称，例如“餐饮”' })

  const cleanedNote = afterAmount
    .replace(categoryName, ' ')
    .replace(/￥/g, ' ')
    .replace(/元|块/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const note = cleanedNote || null

  const created = await prisma.transaction.create({
    data: {
      amount: Number(amount),
      type,
      paymentMethod: 'cash',
      date,
      note,
      person: person || null,
      categoryId,
      debtId: null
    },
    include: { category: true, debt: true }
  })

  res.status(201).json({
    parsed: {
      amount: created.amount,
      type: created.type,
      date: created.date.toISOString().slice(0, 10),
      note: created.note,
      person: created.person,
      categoryId: created.categoryId,
      categoryName: created.category.name
    },
    transaction: created
  })
})

app.delete('/api/transactions/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: '参数不合法' })

  const tx = await prisma.transaction.findUnique({ where: { id } })
  if (!tx) return res.status(404).json({ error: '交易记录不存在' })
  await prisma.transaction.delete({ where: { id } })
  res.json({ ok: true })
})

app.get('/', (req, res) => {
  res.send('格格一家财务系统 API 服务已启动')
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

ensureDefaultCategories().catch(() => {})
