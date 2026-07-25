---
type: api
status: approved
created: 2026-07-25
updated: 2026-07-25
tags:
  - api
---

# API 规范

## 基础约定

- 前缀：`/api/v1`
- 客户端发送：`Accept: application/json`
- 时间：UTC ISO 8601
- 金额：最小货币单位 + ISO 4217 币种
- 分页、过滤、排序参数必须保持跨端一致

## 当前端点

| 方法 | 路径 | 认证 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | 否 | 健康检查 |
| GET | `/api/v1/user` | Sanctum | 当前用户 |

## 错误格式

业务错误必须提供稳定错误代码，客户端不得依赖可翻译的错误文本判断逻辑。
