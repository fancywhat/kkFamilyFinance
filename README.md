# kkFamilyFinance

家庭记账系统（前端 + 后端 + SQLite），支持 OpenClaw 固定格式入账与快速解析入账。

## 访问入口

默认情况下推荐用 Nginx 将本项目跑在 8080（与旧项目 80 端口共存）：

- 前端：`http://<服务器IP>:8080/dashboard`
- API 健康检查：`http://<服务器IP>:8080/api/health`

## OpenClaw 入账（推荐）

OpenClaw 先完成归类，然后把固定格式文本提交给后端：

- 接口：`POST /api/ingest`
- Content-Type：`application/json`
- Body：

```json
{
  "text": "kk|expense|餐饮|15|2026-03-19 10:30:00|早餐"
}
```

固定格式（推荐）：

`成员|类型|分类|金额|YYYY-MM-DD HH:mm:ss|备注`

类型只能是：
- `expense`
- `income`

## API Key（强烈建议开启）

后端支持通过环境变量开启写接口鉴权：

- 变量名：`KK_FINANCE_API_KEY`
- 传参方式：请求 Header `X-API-KEY: <你的密钥>`

开启后，所有 `/api` 下的写操作（POST/PUT/DELETE）都需要携带该 Header。

### 后端环境变量示例

参考 [server/.env.example](file:///Users/jiangyu/Documents/trae_projects/kkFamilyFinance/server/.env.example)：

```
PORT=3001
KK_FINANCE_API_KEY=请替换为一段足够长的随机字符串
```

### 前端（可选）

如果你也希望在网页端进行“新增/删除”操作，需要前端携带同一个 API Key：

- 新建 `client/.env.local`
- 写入：

```
VITE_KK_FINANCE_API_KEY=同上面的 KK_FINANCE_API_KEY
```

注意：把 Key 放进前端意味着访问网页的人都能看到这个 Key。更安全的做法是用防火墙或 Nginx Basic Auth 保护网页端访问。

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

