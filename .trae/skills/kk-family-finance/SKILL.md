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
