# 三鲜手作 · 后端

零框架 Node 服务（`node:http` + `pg`），给静态站提供订单与客户管理接口。

## 接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/health` | — | 存活 + 数据库连通 |
| GET | `/api/menu` | — | 菜单、配送费、免运费门槛、是否打烊 |
| POST | `/api/orders` | — | 下单。**价格由服务端按 dish id 重算**，客户端传的价格一律忽略 |
| GET | `/api/orders` | `X-Admin-Token` | 订单列表，支持 `?status=`、`?q=`、`?limit=` |
| PATCH | `/api/orders/:id` | `X-Admin-Token` | 改状态：待确认 / 包制中 / 配送中 / 已完成 / 已取消 |
| GET | `/api/customers` | `X-Admin-Token` | 按手机号聚合的客户表 |
| GET | `/api/stats` | `X-Admin-Token` | 今日订单、今日营收、客户数、待处理、累计营收 |
| GET / PATCH | `/api/settings` | `X-Admin-Token` | 配送费、免运费门槛、打烊开关 |

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | Render Postgres 的内部连接串（建库时自动注入） |
| `ADMIN_TOKEN` | ✅ | 管理接口令牌，自己生成一个长随机串 |
| `ALLOWED_ORIGINS` | | 允许的前端来源，逗号分隔，默认 `https://sanxian-shouzuo.onrender.com` |
| `PORT` | | Render 自动注入 |

## 本地跑

```bash
npm install
DATABASE_URL='postgres://...' node migrate.mjs
DATABASE_URL='postgres://...' ADMIN_TOKEN=devtoken node server.mjs
```

## 安全上做了什么

- **价格服务端重算**：客户端只传 `{id, qty}`，价格查库。改前端改不动钱。
- **管理接口**：`X-Admin-Token` 走定长比较（`timingSafeEqual`），避免时序侧信道。
- **下单限流**：每 IP 每分钟 6 单，内存计数。
- **订单号**：数据库函数 `next_order_no()` 原子取号，并发下单不会撞号。
- **状态流转**：`CHECK` 约束限定取值，非法状态在库里就被挡掉。
- **CORS**：只回显白名单里的 Origin。

## 还没做（按需要再加）

- 支付（现在只到下单，没有收款）
- 短信/微信通知厨房
- 库存与估清（卖完了自动下架某款）
- 管理后台的登录页面（现在靠令牌，前端存 localStorage 会有风险）
