# 多端系统架构

## 总体结构

```text
Laravel 13 API
├── Filament 5                 内部 ERP 管理后台
├── apps/web                   Next.js 全球网站与客户门户
├── apps/mobile                Expo iOS / Android APP
└── apps/miniapp               Taro React 微信小程序
```

Laravel 是用户、权限、订单、库存、财务和集成数据的唯一事实来源。客户端不得各自复制核心业务规则。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `app/` | Laravel 领域、API 与后台业务 |
| `app/Filament/` | 内部管理后台 |
| `routes/api.php` | 版本化客户端 API |
| `apps/web/` | Next.js 16、React 19、Tailwind CSS 4 |
| `apps/mobile/` | Expo SDK 57、React Native |
| `apps/miniapp/` | Taro 4、React、微信小程序 |
| `packages/api-client/` | 三端共享的无平台依赖 API SDK 与类型 |
| `docs/` | 安装、架构与 AI 开发规范 |

## API 约定

- 当前前缀：`/api/v1`
- 健康检查：`GET /api/v1/health`
- Web 第一方会话：Laravel Sanctum Cookie
- APP 与小程序：Laravel Sanctum API Token
- 客户端始终发送 `Accept: application/json`
- 所有时间由 API 使用 ISO 8601 与 UTC 表达
- 金额使用最小货币单位并携带 ISO 4217 币种

## 多端共享边界

应该共享：

- API 字段和错误代码
- 权限名称
- 状态枚举
- 金额、时区和区域规则
- OpenAPI 生成的 TypeScript 类型

不强制共享：

- 页面组件
- 导航结构
- 平台登录与支付 UI
- 地图、推送和文件选择器

## 国内外服务适配

支付、地图、推送、登录、对象存储、邮件和短信必须通过 Laravel 服务接口抽象供应商。业务代码不直接依赖 Stripe、微信支付、Google Maps 或高德地图等具体 SDK。

## 本地端口建议

| 服务 | 地址 |
| --- | --- |
| Laravel API | `http://localhost` 或 `http://127.0.0.1:8000` |
| Filament | `/admin` |
| Next.js | `http://localhost:3000` |
| 微信开发者工具 | 导入 `apps/miniapp/dist` |

Android 模拟器访问宿主机 Laravel 时，通常需要将 Expo 的 API 地址配置为 `http://10.0.2.2:8000/api/v1`；真机需要使用电脑的局域网地址和 HTTPS 开发代理。
