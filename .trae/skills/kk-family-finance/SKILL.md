---
name: 'kk-family-finance'
description: '把文本记账到 kkFamilyFinance 后端（/api/ingest 或 /api/quick-add）。当用户说“记一笔/入账/xx花了多少钱”或需要 OpenClaw 转发记账时调用。'
---

# kkFamilyFinance 记账

## 你能做什么

- 把一段文本作为记账指令，POST 到家庭财务系统后端
- 两种模式：
  - 固定格式（推荐给自动化）：`POST /api/ingest`
  - 自然语言解析：`POST /api/quick-add`

## 前置变量（建议用环境变量注入）

- FINANCE_BASE_URL：例如 `http://110.42.188.80:8080`
- FINANCE_API_KEY：可选。如果后端开启写入鉴权，需要在请求头携带 `X-API-KEY`

## 固定格式入账（/api/ingest）

### 文本格式

`成员|类型|分类|金额|YYYY-MM-DD HH:mm:ss|备注`

- 成员：`kk` / `y`（可空）
- 类型：`income` 或 `expense`
- 分类：例如 `餐饮`
- 金额：数字，例如 `15` 或 `15.5`
- 时间：例如 `2026-03-19 08:00:00`
- 备注：可空

### 示例（curl）

```bash
headers=(-H "Content-Type: application/json")
if [ -n "${FINANCE_API_KEY:-}" ]; then
  headers+=(-H "X-API-KEY: $FINANCE_API_KEY")
fi
curl -sS "$FINANCE_BASE_URL/api/ingest" \
  "${headers[@]}" \
  -d '{"text":"kk|expense|餐饮|15|2026-03-19 08:00:00|早餐"}'
```

如果没有设置 API Key，会自动不带 `X-API-KEY` 请求头。

## 自然语言入账（/api/quick-add）

### 推荐输入

- `kk 早餐 15`
- `y 手抓饼 7`
- `今天午饭25元 餐饮`

说明：`/api/quick-add` 目前只负责解析成员/日期/金额/分类，默认按现金入账，不包含“花呗/信用卡/微信/支付宝”等支付账户识别。

如果用户输入里包含支付方式或信用卡账户（例如“花呗/白条/招行信用卡/还款”），优先走下面的“带账户/信用卡入账（/api/transactions）”。

### 示例（curl）

```bash
headers=(-H "Content-Type: application/json")
if [ -n "${FINANCE_API_KEY:-}" ]; then
  headers+=(-H "X-API-KEY: $FINANCE_API_KEY")
fi
curl -sS "$FINANCE_BASE_URL/api/quick-add" \
  "${headers[@]}" \
  -d '{"text":"kk 早餐 15"}'
```

## 失败时怎么处理

- 返回 401：缺少或错误的 `X-API-KEY`
- 返回 400：
  - /api/ingest：固定格式解析失败（检查分隔符、类型、日期格式）
  - /api/quick-add：没识别到金额或分类（尝试把金额写成 “25元/25块/25”）

## 输出期望

- 成功时返回 201，响应体里包含 `parsed` 和 `transaction`

## 带账户/信用卡入账（/api/transactions）

当用户输入类似：

- `kk 早餐包子 15 花呗`
- `kk 还花呗 500`
- `y 打车 38 微信`

按以下规则把文本转换为一次 `POST /api/transactions`：

1) 先识别基础字段：成员、日期（默认今天）、金额、分类（沿用 quick-add 的分类识别思路）
2) 再识别支付相关字段：
   - 命中 “信用卡”：视作信用卡消费 `paymentMethod=credit_card`，并选择对应信用卡账户 `debtId`（例如“招商信用卡/浦发信用卡”）
   - 命中 “花呗/白条/抖音月付/美团月付”：视作消费信贷消费 `paymentMethod=credit_card`，并选择对应消费信贷账户 `debtId`
   - 命中 “还/还款”：视作信用额度还款 `paymentMethod=credit_repayment`，并选择对应账户 `debtId`
   - 命中 “微信/支付宝/银行卡/现金”：选择对应资产账户 `assetId`

### 获取可用信用卡账户（debtId）

```bash
curl -sS "$FINANCE_BASE_URL/api/debts"
```

从返回 JSON 里选择最匹配的一条，把它的 `id` 作为 `debtId`：

- 如果命中“花呗/白条/抖音月付/美团月付”：优先 `type="credit_line"`，并按 name 进一步匹配“花呗/白条/抖音/月付/美团”等
- 如果命中“信用卡”：优先 `type="credit_card"`，并按 name 进一步匹配“招商/浦发/中信”等
 - 如果识别到了成员（person=kk/y）：优先匹配同成员的账户（debt.person=kk/y）；匹配不到再考虑 person 为空的“共享账户”

### 获取可用资产账户（assetId，可选）

```bash
curl -sS "$FINANCE_BASE_URL/api/assets"
```

从返回 JSON 里选择 `name` 最匹配（微信/支付宝/银行卡/现金）的那条，把它的 `id` 作为 `assetId`。

### 新增交易（示例）

```bash
headers=(-H "Content-Type: application/json")
if [ -n "${FINANCE_API_KEY:-}" ]; then
  headers+=(-H "X-API-KEY: $FINANCE_API_KEY")
fi

curl -sS "$FINANCE_BASE_URL/api/transactions" \
  "${headers[@]}" \
  -d '{
    "amount": 15,
    "type": "expense",
    "paymentMethod": "credit_card",
    "date": "2026-03-20 08:00:00",
    "note": "早餐包子",
    "person": "kk",
    "categoryId": 1,
    "debtId": 2,
    "assetId": null
  }'
```

## 查询（OpenClaw 复盘）

查询接口都是 GET，不需要 `X-API-KEY`。

### 交易列表（可筛选日期）

```bash
curl -sS "$FINANCE_BASE_URL/api/transactions?from=2026-03-01&to=2026-03-31"
```

### 统计概览（适合让 OpenClaw 总结/复盘）

接口：`GET /api/query/overview`

```bash
curl -sS "$FINANCE_BASE_URL/api/query/overview?from=2026-03-01&to=2026-03-31"
```

默认会把 `credit_repayment` 从支出统计里排除，避免“信用卡消费+还款”重复计入支出。
