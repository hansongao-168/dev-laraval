# gz168/Customer 在 host 项目（dev-laraval）的接入指南

> 本指南面向 **host 项目**（`dev-laraval`）的维护者，说明如何把 `gz168/Customer` 模块接入并跑起来。
> 模块的架构与约束见 [`gz168-customer.md`](./gz168-customer.md)；本文只讲 host 侧的接入步骤。

---

## 0. 当前状态（dev-laraval）

```
gz168/Customer/        # 模块（path repo） — 已完整：C1~A2 全部 ✅
├── composer.json
├── module.json
├── src/{Shared,Front,Admin}/
├── routes/{front.php, admin.php}      # admin 仅在 enabled=true 时加载
├── database/migrations/                # 4 个 migration
├── resources/contracts/                # OpenAPI YAML + nav.yaml
└── tests/Contract/                    # 5 个质量门测试

apps/web/                              # 前端壳工程
├── src/lib/customer.ts                 # NavRegistry
├── src/lib/server-customer.ts          # Server Actions（已实现 7 个）
└── src/app/(auth|desktop|tablet|mobile)/me*/page.tsx   # 三端路由

packages/api-client/                   # 前端 SDK
├── src/core/                           # http/csrf/cookie
└── src/domain/customer/                # 12 个端点 typed
```

---

## 1. 启用模块（PHP 8.3 环境就绪后）

### 1.1 composer require

`gz168/Customer` 已在根 `composer.json` 注册为 **path repo**，但 `require` 暂未启用（PHP 7.3 环境兼容）。PHP 8.3 就绪后执行：

```bash
# 把根 composer.json 的 require 行启用（git checkout 不动，C5 阶段会写）
composer require gz168/customer:dev-master --no-interaction
php artisan vendor:publish --tag=gz168-customer-config    # 可选：发布 config/customer.php
php artisan migrate                                         # 自动跑 4 个 migration
```

### 1.2 env 校验

确认 `.env` 含有以下变量（参考 `.env.example`）：

```dotenv
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

GZ168_CUSTOMER_ROUTE_PREFIX=api/v1
GZ168_CUSTOMER_ADMIN_ENABLED=false            # 默认 false；需要后台再 true
GZ168_CUSTOMER_TOKEN_TTL=43200

# 微信小程序登录（可选）
# GZ168_WX_APP_ID=...
# GZ168_WX_APP_SECRET=...
```

### 1.3 bootstrap/app.php 验证

当前 host 项目 `bootstrap/app.php` 已包含：

```php
$middleware->statefulApi();
```

> 确认 `apps/web` 域名在 `SANCTUM_STATEFUL_DOMAINS` 中即可用 Sanctum SPA Cookie 模式。
> 无需额外配置 EnsureFrontendRequestsAreStateful（statefulApi() 已隐式包含）。

---

## 2. 后台管理启用（可选）

### 2.1 启用开关

```dotenv
GZ168_CUSTOMER_ADMIN_ENABLED=true
```

### 2.2 确认 Filament 可用

依赖检查：

- host 已 require `spatie/filament`（或 Filament v5）
- host 启用 `gz168/filament-admin` 模块（提供后台 layout）
- 存在 `User` 模型并实现 `hasRole('admin')`（来自 `gz168/role-permission`）

### 2.3 Filament 注册确认

`gz168/Customer` 在 ServiceProvider 内自动调用：

```php
if (config('customer.admin.enabled', false)) {
    Filament::registerResources([
        CustomerResource::class,    // 后台 Customer Resource
    ]);
}
```

如 host 使用**自定义** admin 判定（不是 `hasRole('admin')`），在 `config/customer.php` 注入：

```php
'admin' => [
    'enabled' => true,
    'admin_check_callback' => function ($user) {
        return $user !== null
            && method_exists($user, 'isAdmin')
            && $user->isAdmin();
    },
],
```

### 2.4 验证后台

访问 `/admin/customers` 应该看到：
- 列表：id / email / name / phone / 已验证 / 已封禁 / 最后登录 / 注册时间
- 筛选：封禁状态、邮箱验证（TERNARY）
- 操作：View / Edit
- RelationManager：**地址** + **登录日志**
- 后台 API：`GET /api/admin/customers`（按 q/banned/verified 筛选 + 分页）

---

## 3. 前台端点总览（已实现）

### 公开
```
POST   /api/v1/auth/register            注册 + 自动登录
POST   /api/v1/auth/login               Sanctum Cookie 登录
POST   /api/v1/auth/password/forgot     防枚举（200 + toast）
POST   /api/v1/auth/password/reset      邮件 token 重置
POST   /api/v1/auth/wx-login            微信 code → 自动注册/登录 + Token
```

### 已登录
```
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me                  改 name/phone/locale/timezone
POST   /api/v1/auth/me/password         改密 + 自动登出其它设备
POST   /api/v1/auth/me/logout-others    仅保留当前 token
POST   /api/v1/auth/email/...           重发验证邮件
GET    /api/v1/auth/email/verify/...    signed URL
POST   /api/v1/auth/native-login        iOS/Android → Sanctum Token
GET    /api/v1/me/addresses
POST   /api/v1/me/addresses
PATCH  /api/v1/me/addresses/{a}
DELETE /api/v1/me/addresses/{a}
POST   /api/v1/me/avatar                multipart
GET    /api/v1/me/settings
PATCH  /api/v1/me/settings
```

### 后台（admin.enabled=true 时）
```
GET    /api/admin/customers             列表 + 筛选 + 分页
GET    /api/admin/customers/{id}
PATCH  /api/admin/customers/{id}
POST   /api/admin/customers/{id}/ban
POST   /api/admin/customers/{id}/unban
POST   /api/admin/customers/{id}/reset-password
POST   /api/admin/customers/{id}/logout-others
GET    /api/admin/customers/{id}/login-logs
```

---

## 4. 前端集成（apps/web 已落地）

| 文件 | 作用 |
|---|---|
| `apps/web/src/lib/customer.ts` | NavRegistry：login/register/forgot-password/me/me-settings |
| `apps/web/src/lib/server-customer.ts` | Server Actions：login/register/logout/updateMe/changePassword/forgotPassword/getCurrentSession |
| `apps/web/src/app/(auth)/login/page.tsx` | 登录表单 |
| `apps/web/src/app/(auth)/register/page.tsx` | 注册表单 |
| `apps/web/src/app/(auth)/forgot-password/page.tsx` | 找回密码表单 |
| `apps/web/src/app/(desktop|tablet|mobile)/me/page.tsx` | 个人中心（三端 re-export） |
| `apps/web/src/app/(desktop|tablet|mobile)/me/settings/page.tsx` | 设置 |
| `apps/web/src/app/(desktop|tablet|mobile)/me/security/page.tsx` | 修改密码 |

SDK：

| 文件 | 作用 |
|---|---|
| `packages/api-client/src/core/{http,csrf,cookie}.js` | 浏览器 HTTP 客户端 + 自动 CSRF + 错误归一 |
| `packages/api-client/src/domain/customer/{auth,types}.js` | 12 个端点 typed SDK |

---

## 5. 验证步骤（host 项目）

```bash
# 1. 路由列表（应看到 17 个 gz168.customer.* 路由）
php artisan route:list --name=gz168.customer.

# 2. 跑 Contract 测试（在 gz168/Customer 目录）
cd gz168/Customer && composer install
./vendor/bin/phpunit --testsuite=Contract

# 3. 跑前端类型检查
cd packages/api-client && npx tsc --noEmit
cd apps/web && npx tsc --noEmit

# 4. 跑前端 lint
cd apps/web && npm run lint
cd apps/web && npm run typecheck

# 5. E2E（Playwright）
cd apps/web && npm run test:e2e   # 登录 → /me → 改密 → 登出
```

---

## 6. 边界守卫（CI 自动拦截）

`gz168/Customer/tests/Contract/` 的 5 个测试是 **quality gate**：

| 测试 | 守的边界 | 失败时含义 |
|---|---|---|
| `ResourceFieldWhitelistTest` | CustomerResource 不暴露 password/remember_token/wx_openid/wx_unionid/banned_at/last_login_* | 有人改了 Resource 把敏感字段加进来 |
| `SubtreeDependencyDirectionTest` | src/Admin/* 不 import src/Front/*；src/Shared/* 不 import Front/Admin | 有人破坏了模块边界 |
| `AdminEnabledFlagTest` | customer.admin.enabled=false 时 /admin/customers/* 路由完全不可达 | 开关失效 |
| `BoundaryTest` | host 项目的 app/Models/Customer.php、app/Http/Controllers/Api/*Customer*、app/Filament/Resources/*Customer*、database/migrations/*create_customers* 均不存在 | 有人在 host 实现了 Customer 代码 |
| `OpenApiSchemaTest` | CustomerSchema 字段 = CustomerResource 字段；黑名单字段不在 Schema | 前端类型与后端不一致 |

> 在 host CI 中跑 `BoundaryTest` 会**自动**失败如果 host 越界——这是按设计的。

---

## 7. 排错速查

| 现象 | 原因 | 解决 |
|---|---|---|
| `/api/v1/auth/login` 返回 419 | Sanctum stateful cookie 未启用 | 确认 `bootstrap/app.php` 含 `statefulApi()` + `.env` 含 `SANCTUM_STATEFUL_DOMAINS` |
| `/api/admin/customers` 路由不存在 | `customer.admin.enabled=false` | 设置 `GZ168_CUSTOMER_ADMIN_ENABLED=true` |
| Filament 后台看不到 Customer 资源 | Filament 未安装或 ServiceProvider 未 boot | `composer require gz168/filament`，确认 CustomerResource class 存在 |
| 微信 code 登录失败 | 缺少 `GZ168_WX_APP_ID` / `GZ168_WX_APP_SECRET` | 在 `.env` 配置，或禁用 wx-login 端点 |
| Contract 测试失败 | 模块边界被破坏 | 按错误信息修正（最常见：Admin import Front） |
| 登录后 `/me` 401 | 后端 session cookie 未写入 | 浏览器端：检查 CORS_ALLOWED_ORIGINS 与 SANCTUM_STATEFUL_DOMAINS 一致；后端：检查 config/sanctum.php |

---

## 8. 升级路径

`gz168/Customer` 是**独立 Composer 包**，可单独升级：

```bash
# 在 host 项目根目录
composer update gz168/customer --with-dependencies

# 查看本版本变更
cat gz168/Customer/CHANGELOG.md   # （后续版本维护）
```

每次升级前：

1. 跑 `tests/Contract/*`（5 个测试）——必须绿
2. 跑前端 `npm run check:clients` ——类型一致
3. 跑 E2E 关键路径——登录 / 改密 / 登出 / 封禁

---

## 9. 已采纳决策

| 决策 | 选择 |
|---|---|
| 鉴权通道 | Web = Sanctum SPA Cookie；App = Sanctum Token；MP = wx.login code |
| 后台 actor 判定 | 默认 `hasRole('admin')`；可注入 `admin_check_callback` |
| 客户模型扩展 | host 项目设 `'model' => App\Models\Customer::class`；该类必须 `extends Gz168\Customer\Shared\Models\Customer` |
| 数据库表 | 由模块 migration 自带；host 项目**禁止**写 `customers` / `customer_addresses` / `customer_login_logs` 表的 migration |
| 前端 SDK 生成 | 短期手维护；未来用 `openapi-typescript` 从 `gz168/Customer/resources/contracts/customer-openapi.yaml` 自动生成 |