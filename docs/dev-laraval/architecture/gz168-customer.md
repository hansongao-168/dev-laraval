# gz168/Customer 模块开发文档

> 版本：v2.0（设计稿）
> 模块名：`gz168/Customer`（**唯一**模块；`CustomerAdmin` 不是独立模块，而是本模块内部的"后台管理子域"）
> Composer 包名：`gz168/customer`
> 命名空间：`Gz168\Customer\`（统一根命名空间；子域通过子命名空间区分）
> 类型：`laravel-package`（基于 `spatie/laravel-package-tools`）
> 定位：**Customer 域公共模块**——前台用户能力 + 后台管理前台用户能力，**全部实现都在 `gz168/Customer/` 下**，可在多个 Laravel 项目复用；通过配置开关决定是否启用后台入口。

---

## 0. 模块定位与边界

### 0.1 一句话定位

> **`gz168/Customer` 是 Customer 域的唯一实现源**——前台用户（注册/登录/我的资料/地址/头像/设置/密码/微信/原生 token）与"后台管理前台用户"（列表/筛选/封禁/重置密码/登录日志）**都在本模块下**，分别位于 `src/Front/` 与 `src/Admin/` 子树。其它 gz168 模块、host 项目**完全禁止**实现 Customer 相关代码。

### 0.2 子域边界（单一 Composer 包、单一 ServiceProvider、两个子树）

| 子域 | 路径 | 命名空间 | 启用方式 |
|---|---|---|---|
| 前台 | `src/Front/*` | `Gz168\Customer\Front\*` | 默认启用 |
| 后台管理前台用户 | `src/Admin/*` | `Gz168\Customer\Admin\*` | `config('customer.admin.enabled') === true` 时启用 |

> **关键约束**：`src/Admin/*` 不允许 `use` `src/Front/*` 的 Service / Controller；只能 `use` Model / Resource / Event / Policy / Support。**单向依赖**。

### 0.3 边界白名单（只允许出现在 `gz168/Customer/` 内）

| 类型 | 允许位置 | 禁止 |
|---|---|---|
| Customer 模型 | `src/Models/Customer.php` | host 项目 `app/Models/Customer.php` |
| Front Controller | `src/Front/Http/Controllers/*` | host 项目任何 Customer 控制器 |
| Admin Controller / Filament | `src/Admin/Http/Controllers/*`、`src/Admin/Filament/*` | host 项目 `app/Filament/*` 内 Customer Resource |
| FormRequest | `src/Front/Http/Requests/*` + `src/Admin/Http/Requests/*` | host 项目任何 Customer 校验 |
| DTO | `src/Front/Http/Resources/*` + `src/Admin/Http/Resources/*` | host 项目返回 Customer 数据 |
| Policy | `src/Policies/*`（共享）+ `src/Admin/Policies/*`（仅 admin 用） | host 项目任何"能不能改 Customer"判断 |
| Service | `src/Front/Services/*` + `src/Admin/Services/*` | host 项目调 bcrypt、Hash::make 等 |
| Event / Listener | `src/Events/*`（共享）+ `src/Listeners/*` | host 项目直接写 `Log::info('customer...')` |
| 路由 | `routes/front.php` + `routes/admin.php`（独立文件，ServiceProvider 按需加载） | host 项目 `routes/api.php` 内 Customer 路由 |
| Migration | `database/migrations/*` | host 项目 `database/migrations/*` 内 Customer 表 |
| 视图 | `resources/views/*` | host 项目 Blade 内 Customer 文案 |
| 前端契约 | `resources/contracts/*` | host 项目 / 其它模块写 OpenAPI 注解 |
| 测试 | `tests/Front/*` + `tests/Admin/*` + `tests/Contract/*` | host 项目 tests 内 Customer 测试 |

### 0.4 单向依赖（强约束）

```
                     ┌─────────────────────────┐
                     │  host Laravel project   │
                     └────────────┬────────────┘
                                  │ composer require gz168/customer
                                  ▼
                  ┌────────────────────────────────────────┐
                  │            gz168/Customer              │
                  │  ┌─────────────────────────────────┐   │
                  │  │  src/Front/*   (前台)           │   │
                  │  │   - register / login / me / ... │   │
                  │  └─────────────────────────────────┘   │
                  │  ┌─────────────────────────────────┐   │
                  │  │  src/Admin/*  (后台管理前台)    │   │
                  │  │   - list / ban / resetPwd / ... │   │
                  │  │   依赖方向：Admin → Front       │   │
                  │  └─────────────────────────────────┘   │
                  │  ┌─────────────────────────────────┐   │
                  │  │  src/Shared/* (共享：Models、   │   │
                  │  │  Policies、Events、Resources)   │   │
                  │  └─────────────────────────────────┘   │
                  └────┬────────────┬────────────┬─────────┘
                       │            │            │
                       ▼            ▼            ▼
              ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
              │ gz168/common │ │ gz168/log-  │ │ gz168/role-  │
              │              │ │ management  │ │ permission   │
              └──────────────┘ └─────────────┘ └──────────────┘
                                       │
                                       ▼
                                spatie/filament（可选）
```

规则：

- `gz168/Customer` → **仅**依赖 `gz168/common`、`gz168/log-management`、`gz168/role-permission`、`spatie/laravel-package-tools`、`spatie/laravel-activitylog`、`spatie/filament`（可选）、`laravel/sanctum`。
- `gz168/Customer` → **不依赖**任何其它 `gz168/*` 业务模块（`gz168/erp-*`、`gz168/order-*` 等全部禁止）。
- `gz168/Customer` → **不依赖** host 项目的 `app/`，**不引用** host 项目任何类。
- **子树间方向**：`src/Admin/*` → `src/Front/*` 是禁止的；`src/Admin/*` 只能依赖 `src/Shared/*`（Models / Policies / Events / Support / Resources）。
- 前端 `apps/*` 与 `packages/*` **不引用** `Gz168\Customer\` 命名空间，只通过 `@erp/api-client/domain/customer/*` HTTP 调用。

> "模块化、高内聚、低耦合、单向依赖"在此落到：**唯一 Composer 包 + 单一 ServiceProvider + 两棵子树 + 子树间单向 + BoundaryTest 守卫**。

## 1. 目录结构（单一 Composer 包）

```
gz168/Customer/
├─ composer.json
├─ module.json
├─ README.md
├─ src/
│  ├─ Providers/
│  │  └─ CustomerServiceProvider.php                # 唯一 ServiceProvider
│  ├─ Shared/                                       # ★ 共享层（Models/Policies/Events/Support/Resources）
│  │  ├─ Models/
│  │  │  ├─ Customer.php
│  │  │  └─ Address.php
│  │  ├─ Policies/
│  │  │  ├─ CustomerPolicy.php
│  │  │  └─ AddressPolicy.php
│  │  ├─ Events/
│  │  │  ├─ CustomerRegistered.php
│  │  │  ├─ CustomerLoggedIn.php
│  │  │  ├─ CustomerLoggedOut.php
│  │  │  ├─ CustomerProfileUpdated.php
│  │  │  ├─ CustomerPasswordChanged.php
│  │  │  ├─ CustomerEmailVerified.php
│  │  │  ├─ CustomerPasswordResetRequested.php
│  │  │  ├─ CustomerPasswordReset.php
│  │  │  ├─ CustomerBanned.php                     # Admin 触发
│  │  │  ├─ CustomerUnbanned.php                   # Admin 触发
│  │  │  ├─ CustomerAddressCreated.php
│  │  │  ├─ CustomerAddressUpdated.php
│  │  │  └─ CustomerAddressDeleted.php
│  │  └─ Support/
│  │     ├─ CustomerModels.php
│  │     ├─ RateLimit.php
│  │     └─ OpenApi.php
│  ├─ Front/                                        # ★ 前台子域
│  │  ├─ Http/
│  │  │  ├─ Controllers/
│  │  │  │  └─ Api/V1/
│  │  │  │     ├─ Auth/
│  │  │  │     │  ├─ AuthController.php
│  │  │  │     │  ├─ PasswordResetController.php
│  │  │  │     │  ├─ EmailVerificationController.php
│  │  │  │     │  ├─ WxLoginController.php
│  │  │  │     │  └─ NativeLoginController.php
│  │  │  │     └─ Me/
│  │  │  │        ├─ ProfileController.php
│  │  │  │        ├─ AddressController.php
│  │  │  │        ├─ AvatarController.php
│  │  │  │        └─ SettingsController.php
│  │  │  ├─ Middleware/
│  │  │  │  ├─ EnsureEmailVerified.php
│  │  │  │  └─ ThrottleCustomerActions.php
│  │  │  ├─ Requests/
│  │  │  │  ├─ RegisterRequest.php
│  │  │  │  ├─ LoginRequest.php
│  │  │  │  ├─ UpdateProfileRequest.php
│  │  │  │  ├─ ChangePasswordRequest.php
│  │  │  │  ├─ ForgotPasswordRequest.php
│  │  │  │  ├─ ResetPasswordRequest.php
│  │  │  │  ├─ AddressRequest.php
│  │  │  │  ├─ AvatarUploadRequest.php
│  │  │  │  ├─ SettingsRequest.php
│  │  │  │  ├─ WxLoginRequest.php
│  │  │  │  └─ NativeLoginRequest.php
│  │  │  └─ Resources/
│  │  │     ├─ CustomerResource.php                # 前台视角 DTO
│  │  │     ├─ AddressResource.php
│  │  │     ├─ SettingsResource.php
│  │  │     └─ TokenResource.php
│  │  ├─ Services/
│  │  │  ├─ AuthService.php
│  │  │  ├─ PasswordService.php
│  │  │  ├─ AddressService.php
│  │  │  ├─ AvatarService.php
│  │  │  ├─ SettingsService.php
│  │  │  └─ WxAuthService.php
│  │  ├─ Concerns/
│  │  │  ├─ InteractsWithCustomerProfile.php
│  │  │  └─ InteractsWithWxLogin.php
│  │  └─ Listeners/
│  │     ├─ LogCustomerActivity.php
│  │     ├─ SendWelcomeEmail.php
│  │     ├─ SendSecurityEmail.php
│  │     └─ SendPasswordResetEmail.php
│  └─ Admin/                                        # ★ 后台管理子域（可选装载）
│     ├─ Http/
│     │  ├─ Controllers/
│     │  │  └─ Api/Admin/
│     │  │     ├─ CustomerController.php           # /api/admin/customers/*
│     │  │     └─ CustomerLoginLogController.php   # /api/admin/customers/{id}/login-logs
│     │  ├─ Middleware/
│     │  │  └─ EnsureAdminActor.php                # 校验 actor 是 admin（不实现 admin 域，只校验）
│     │  ├─ Requests/
│     │  │  ├─ AdminUpdateCustomerRequest.php
│     │  │  └─ AdminResetPasswordRequest.php
│     │  └─ Resources/
│     │     ├─ AdminCustomerResource.php           # 后台视角 DTO（含登录日志字段）
│     │     └─ AdminLoginLogResource.php
│     ├─ Services/
│     │  ├─ AdminCustomerService.php               # 列表/筛选/封禁/重置密码
│     │  └─ AdminLoginLogService.php
│     ├─ Policies/
│     │  └─ AdminCustomerPolicy.php                # 仅 admin 可操作
│     ├─ Filament/                                  # Filament 后台入口
│     │  ├─ Resources/
│     │  │  └─ CustomerResource.php                # Filament Resource（后台列表/筛选/封禁/重置密码/登录日志）
│     │  └─ RelationManagers/
│     │     ├─ AddressesRelationManager.php
│     │     └─ LoginLogsRelationManager.php
│     └─ Pages/                                     # 自定义 Filament 页面（如有）
│        └─ ViewCustomer.php
├─ database/
│  ├─ migrations/
│  │  ├─ 2026_01_01_000001_create_customers_table.php
│  │  ├─ 2026_01_01_000002_create_customer_addresses_table.php
│  │  ├─ 2026_01_01_000003_extend_customers_table.php            # avatar/locale/timezone
│  │  └─ 2026_01_01_000004_create_customer_login_logs_table.php  # Admin 用
│  ├─ factories/
│  │  └─ CustomerFactory.php
│  └─ seeders/
│     └─ CustomerSeeder.php
├─ resources/
│  ├─ views/
│  │  ├─ emails/
│  │  │  ├─ welcome.blade.php
│  │  │  ├─ password-reset.blade.php
│  │  │  └─ security-alert.blade.php
│  │  └─ filament/resources/customer-resource/pages/view-customer.blade.php
│  ├─ lang/
│  │  ├─ zh-CN/{customer,validation}.php
│  │  └─ en/{customer,validation}.php
│  └─ contracts/                                   # ★ 前端契约源（唯一）
│     ├─ openapi.yaml                              # Front + Admin（Admin 默认生成、不要求前端消费）
│     ├─ nav.yaml                                  # Front 的 NavRegistry 片段
│     ├─ i18n/{zh-CN,en}.json
│     └─ CHANGELOG.md
├─ routes/
│  ├─ front.php                                    # 前台路由（始终加载）
│  └─ admin.php                                    # 后台路由（仅 customer.admin.enabled 加载）
├─ config/
│  └─ customer.php
└─ tests/
   ├─ Front/                                       # 前台测试
   │  ├─ Feature/Api/V1/Auth/*
   │  ├─ Feature/Api/V1/Me/*
   │  ├─ Feature/Api/V1/WxLoginTest.php
   │  └─ Unit/Services/*
   ├─ Admin/                                       # 后台测试
   │  ├─ Feature/Api/Admin/*
   │  ├─ Feature/Filament/*
   │  └─ Unit/Services/*
   ├─ Shared/                                      # 共享层测试
   │  ├─ Models/CustomerTest.php
   │  └─ Policies/{CustomerPolicy,AddressPolicy}Test.php
   └─ Contract/
      ├─ OpenApiSchemaTest.php                     # 校验注解完整性
      ├─ ResourceFieldWhitelistTest.php            # 校验 Resource 不泄漏敏感字段
      ├─ SubtreeDependencyDirectionTest.php        # ★ 校验 Admin → Front 方向禁止
      ├─ AdminEnabledFlagTest.php                  # 校验开关关闭时 admin 入口完全不可用
      └─ BoundaryTest.php                          # host 项目目录无 Customer 相关代码
```

## 2. composer.json（单一 Composer 包）

```jsonc
{
  "name": "gz168/customer",
  "description": "Customer domain module: front-end (auth/profile) + back-office (manage customers). Single Composer package, single ServiceProvider, two subtrees.",
  "type": "laravel-package",
  "license": "MIT",
  "keywords": ["laravel", "customer", "auth", "filament"],
  "require": {
    "php": "^8.3",
    "illuminate/contracts": "^12.0|^13.0",
    "illuminate/database": "^12.0|^13.0",
    "illuminate/http": "^12.0|^13.0",
    "illuminate/support": "^12.0|^13.0",
    "laravel/sanctum": "^4.0",
    "spatie/laravel-package-tools": "^1.93",
    "spatie/laravel-activitylog": "^4.8",
    "spatie/filament": "*",
    "gz168/common": "dev-master",
    "gz168/log-management": "dev-master",
    "gz168/role-permission": "dev-master"
  },
  "require-dev": {
    "orchestra/testbench": "^9.0|^10.0",
    "darkaonline/l5-swagger": "^8.6",
    "phpunit/phpunit": "^11.0|^12.0"
  },
  "autoload": {
    "psr-4": {
      "Gz168\\Customer\\": "src/",
      "Gz168\\Customer\\Shared\\": "src/Shared/",
      "Gz168\\Customer\\Front\\": "src/Front/",
      "Gz168\\Customer\\Admin\\": "src/Admin/",
      "Gz168\\Customer\\Database\\Factories\\": "database/factories/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "Gz168\\Customer\\Tests\\": "tests/"
    }
  },
  "extra": {
    "laravel": {
      "providers": ["Gz168\\Customer\\Providers\\CustomerServiceProvider"]
    }
  },
  "minimum-stability": "stable",
  "prefer-stable": true
}
```

关键点：

- **单一 Composer 包**：只有一个 `name: gz168/customer`，一个 `ServiceProvider`。
- **多个 PSR-4 前缀**让 IDE 与自动加载保持清晰：`Shared\Front\Admin` 各自有独立命名空间，但物理都在 `src/` 内。
- `gz168/role-permission` 仅 Admin 子域需要；但放 require 不影响纯前端宿主（最小成本）。

## 3. module.json

```jsonc
{
  "name": "Customer",
  "alias": "customer",
  "description": "Customer domain module — front-end user + back-office customer management",
  "version": "2.0.0",
  "active": true,
  "providers": ["Gz168\\Customer\\Providers\\CustomerServiceProvider"],
  "requires": ["gz168/common", "gz168/log-management", "gz168/role-permission"]
}
```

## 4. CustomerServiceProvider（唯一装配入口）

> **所有装配逻辑集中在此**；ServiceProvider 通过 `customer.admin.enabled` 决定是否加载 Admin 子树。

```php
namespace Gz168\Customer\Providers;

use Gz168\Customer\Front\Events\CustomerPasswordChanged;
use Gz168\Customer\Front\Events\CustomerRegistered;
use Gz168\Customer\Front\Listeners\LogCustomerActivity;
use Gz168\Customer\Front\Listeners\SendPasswordResetEmail;
use Gz168\Customer\Front\Listeners\SendSecurityEmail;
use Gz168\Customer\Front\Listeners\SendWelcomeEmail;
use Gz168\Customer\Front\Services\AuthService;
use Gz168\Customer\Front\Services\PasswordService;
use Gz168\Customer\Shared\Support\RateLimit;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class CustomerServiceProvider extends PackageServiceProvider
{
    public function configurePackage(Package $package): void
    {
        $package
            ->name('gz168-customer')
            ->hasConfigFile('customer')
            ->hasMigrations([
                'create_customers_table',
                'create_customer_addresses_table',
                'extend_customers_table',
                'create_customer_login_logs_table',
            ])
            ->hasTranslations()
            ->hasViews('gz168-customer');

        // 路由：分两文件
        $package->hasRoute('front');                       // routes/front.php（始终加载）
        if (config('customer.admin.enabled', false)) {
            $package->hasRoute('admin');                   // routes/admin.php（仅启用时加载）
        }

        // Middleware
        $package->hasRouteMiddleware([
            'gz168.customer.email.verified' => \Gz168\Customer\Front\Http\Middleware\EnsureEmailVerified::class,
            'gz168.customer.throttle'       => \Gz168\Customer\Front\Http\Middleware\ThrottleCustomerActions::class,
            'gz168.customer.admin.actor'    => \Gz168\Customer\Admin\Http\Middleware\EnsureAdminActor::class,
        ]);
    }

    public function packageRegistered(): void
    {
        $this->app->singleton(AuthService::class);
        $this->app->singleton(PasswordService::class);
        if (config('customer.admin.enabled', false)) {
            $this->app->singleton(\Gz168\Customer\Admin\Services\AdminCustomerService::class);
        }
    }

    public function packageBooted(): void
    {
        $this->registerRateLimiters();

        // Event/Listener
        Event::listen(CustomerRegistered::class,    [LogCustomerActivity::class, SendWelcomeEmail::class]);
        Event::listen(CustomerPasswordChanged::class,[LogCustomerActivity::class, SendSecurityEmail::class]);

        // Admin 子域（仅启用时注册）
        if (config('customer.admin.enabled', false)) {
            $this->registerAdminSurface();
        }

        // OpenAPI tag
        if (class_exists(\OpenApi\Generator::class)) {
            config([
                'l5-swagger.documentations.default.tags' => array_merge(
                    (array) config('l5-swagger.documentations.default.tags', []),
                    ['Customer' => ['description' => 'Front-end customer domain endpoints']]
                ),
            ]);
        }
    }

    private function registerRateLimiters(): void
    {
        RateLimiter::for('gz168.customer.login', fn (Request $r) =>
            Limit::perMinute(5)->by(RateLimit::loginKey($r)));
        RateLimiter::for('gz168.customer.register', fn (Request $r) =>
            Limit::perMinute(3)->by(RateLimit::registerKey($r)));
        RateLimiter::for('gz168.customer.forgot-password', fn (Request $r) =>
            Limit::perMinute(3)->by($r->ip()));
        RateLimiter::for('gz168.customer.change-password', fn (Request $r) =>
            Limit::perMinute(5)->by(optional($r->user())->id ?: $r->ip()));
    }

    private function registerAdminSurface(): void
    {
        // Filament Resource
        if (class_exists(\Filament\Facades\Filament::class)) {
            \Filament\Facades\Filament::registerResources([
                \Gz168\Customer\Admin\Filament\Resources\CustomerResource::class,
            ]);
        }
        // Policy auto-discovery 已在 gz168/role-permission 处理
    }
}
```

## 5. 路由（两文件，按开关加载）

### 5.1 `routes/front.php`（始终加载）

```php
use Gz168\Customer\Front\Http\Controllers\Api\V1\Auth\AuthController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Auth\NativeLoginController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Auth\PasswordResetController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Auth\WxLoginController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Me\AddressController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Me\AvatarController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Me\ProfileController;
use Gz168\Customer\Front\Http\Controllers\Api\V1\Me\SettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix(config('customer.route_prefix', 'api/v1'))
    ->middleware(config('customer.route_middleware', ['api']))
    ->name('gz168.customer.')
    ->group(function (): void {
        // 公开
        Route::post('auth/register', [AuthController::class, 'register'])
            ->middleware('throttle:gz168.customer.register');
        Route::post('auth/login', [AuthController::class, 'login'])
            ->middleware('throttle:gz168.customer.login');
        Route::post('auth/password/forgot', [PasswordResetController::class, 'forgot'])
            ->middleware('throttle:gz168.customer.forgot-password');
        Route::post('auth/password/reset', [PasswordResetController::class, 'reset']);
        Route::post('auth/wx-login', [WxLoginController::class, 'login']);

        // 已登录（auth:sanctum；本人=Customer）
        Route::middleware(['auth:sanctum'])->group(function (): void {
            Route::post('auth/logout', [AuthController::class, 'logout']);
            Route::get('auth/me', [AuthController::class, 'me']);
            Route::patch('auth/me', [AuthController::class, 'updateMe']);
            Route::post('auth/me/password', [AuthController::class, 'changePassword'])
                ->middleware('throttle:gz168.customer.change-password');
            Route::post('auth/me/logout-others', [AuthController::class, 'logoutOthers']);
            Route::post('auth/email/verification-notification', [EmailVerificationController::class, 'resend']);
            Route::get('auth/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
                ->middleware(['signed'])->name('verification.verify');

            // Native 登录
            Route::post('auth/native-login', [NativeLoginController::class, 'login']);

            // 我的资料
            Route::prefix('me')->group(function (): void {
                Route::get('addresses', [AddressController::class, 'index']);
                Route::post('addresses', [AddressController::class, 'store']);
                Route::patch('addresses/{address}', [AddressController::class, 'update']);
                Route::delete('addresses/{address}', [AddressController::class, 'destroy']);
                Route::post('avatar', [AvatarController::class, 'upload']);
                Route::get('settings', [SettingsController::class, 'show']);
                Route::patch('settings', [SettingsController::class, 'update']);
            });
        });
    });
```

### 5.2 `routes/admin.php`（仅 `customer.admin.enabled=true` 加载）

```php
use Gz168\Customer\Admin\Http\Controllers\Api\Admin\CustomerController;
use Gz168\Customer\Admin\Http\Controllers\Api\Admin\CustomerLoginLogController;
use Illuminate\Support\Facades\Route;

Route::prefix(config('customer.route_prefix', 'api'))
    ->middleware(['api', 'auth:sanctum', 'gz168.customer.admin.actor'])
    ->name('gz168.customer.admin.')
    ->group(function (): void {
        // 后台管理员管理 Customer（注意：是管理前台 Customer，不是管理员域本身）
        Route::prefix('admin/customers')->group(function (): void {
            Route::get('/',           [CustomerController::class, 'index']);          // 列表/筛选
            Route::get('{customer}',  [CustomerController::class, 'show']);           // 详情
            Route::patch('{customer}',[CustomerController::class, 'update']);         // 改资料/状态
            Route::post('{customer}/ban',  [CustomerController::class, 'ban']);        // 封禁
            Route::post('{customer}/unban',[CustomerController::class, 'unban']);      // 解封
            Route::post('{customer}/reset-password', [CustomerController::class, 'resetPassword']); // 重置密码
            Route::post('{customer}/logout-others',   [CustomerController::class, 'logoutOthers']); // 注销其它设备
            Route::get('{customer}/login-logs',      [CustomerLoginLogController::class, 'index']);
        });
    });
```

> **关键**：`gz168.customer.admin.actor` 中间件只**校验**当前登录用户**是 admin**（来自 host 项目的管理员域，**不**在本模块实现 admin 模型）；如果 host 项目没有管理员域，该中间件永远拒绝，路由永远不可达 → 即便有人开启 `customer.admin.enabled` 也无效。

## 6. 配置（`config/customer.php`）

```php
return [
    'route_prefix'        => env('GZ168_CUSTOMER_ROUTE_PREFIX', 'api/v1'),
    'route_middleware'    => ['api'],

    // ★ 后台管理开关（默认关闭）
    'admin' => [
        'enabled'  => env('GZ168_CUSTOMER_ADMIN_ENABLED', false),
        'guard'    => env('GZ168_CUSTOMER_ADMIN_GUARD', 'web'),
        // 'admin_check_callback' => null,  // host 可注入"如何判定当前用户是 admin"
    ],

    'auth' => [
        'cookie'             => env('GZ168_CUSTOMER_COOKIE', 'gz168_customer_session'),
        'token_ttl'          => env('GZ168_CUSTOMER_TOKEN_TTL', 60 * 24 * 30),
        'password_min'       => 8,
        'default_locale'     => 'zh-CN',
        'default_timezone'   => 'Asia/Shanghai',
    ],

    'avatar' => [
        'disk'          => env('GZ168_CUSTOMER_AVATAR_DISK', 'public'),
        'max_kb'        => 2048,
        'allowed_mimes' => ['jpg', 'jpeg', 'png', 'webp'],
    ],

    'mail' => [
        'from_address'  => env('GZ168_CUSTOMER_MAIL_FROM', null),
        'from_name'     => env('GZ168_CUSTOMER_MAIL_NAME', 'Customer Service'),
    ],

    'wx' => [
        'app_id'        => env('GZ168_WX_APP_ID'),
        'app_secret'    => env('GZ168_WX_APP_SECRET'),
        'mode'          => env('GZ168_WX_MODE', 'mp'),
    ],
];
```

> "host 项目如何判定当前用户是 admin" 通过 `customer.admin.admin_check_callback` 注入：默认实现是 `fn ($user) => method_exists($user, 'hasRole') && $user->hasRole('admin')`，host 项目可覆盖。

## 7. Shared 层（共享给 Front + Admin）

### 7.1 `Shared\Models\Customer` / `Address`

（同 §7 v1 设计，命名空间改为 `Gz168\Customer\Shared\Models\*`）

### 7.2 `Shared\Policies\CustomerPolicy`

> 注意：`CustomerPolicy` 是**共享**的——前台视角（本人）和后台视角（admin）都引用它；但**只声明"能不能"**，不声明"在哪用"。

```php
namespace Gz168\Customer\Shared\Policies;

use Gz168\Customer\Shared\Models\Customer;

class CustomerPolicy
{
    public function viewSelf(?Customer $actor, Customer $target): bool
    {
        return $actor?->id === $target->id;
    }

    public function updateSelf(?Customer $actor, Customer $target): bool
    {
        return $actor?->id === $target->id;
    }

    public function changePasswordSelf(?Customer $actor, Customer $target): bool
    {
        return $actor?->id === $target->id;
    }

    // Admin 操作由 AdminCustomerPolicy 声明，避免与本人视角混淆
}
```

### 7.3 `Shared\Events\*`（含 Admin 触发的事件）

```php
namespace Gz168\Customer\Shared\Events;

use Gz168\Customer\Shared\Models\Customer;

class CustomerBanned
{
    public function __construct(
        public Customer $customer,
        public string $reason,
        public ?int $bannedBy,           // 来自 host 项目的 admin 用户 id（不引用 admin 模型）
    ) {}
}
```

### 7.4 `Shared\Support\CustomerModels` / `RateLimit` / `OpenApi`

（同 §7 v1 设计，命名空间 `Gz168\Customer\Shared\Support\*`）

## 8. Front 子域（前台）

### 8.1 Service 层（业务逻辑唯一归属）

```
src/Front/Services/
├─ AuthService.php          # register/login/logout/me/updateMe/changePassword/logoutOthers
├─ PasswordService.php      # forgot/reset/change
├─ AddressService.php       # CRUD + 默认地址
├─ AvatarService.php        # 文件校验 + Storage::put + 清理旧头像
├─ SettingsService.php
└─ WxAuthService.php
```

> Controller / FormRequest / Resource **不写**业务；Service **不**直接返回 HTTP 响应。

### 8.2 DTO（`CustomerResource`）

```php
namespace Gz168\Customer\Front\Http\Resources;

class CustomerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'avatar_url'        => $this->avatar_url,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'locale'            => $this->locale,
            'timezone'          => $this->timezone,
            'created_at'        => $this->created_at->toIso8601String(),
            'updated_at'        => $this->updated_at->toIso8601String(),
        ];
        // 显式 NEVER：password, remember_token, wx_openid, wx_unionid, banned_at, banned_reason
    }
}
```

> 前台 DTO **不暴露** `banned_at / banned_reason / last_login_ip` 等"管理视角"字段——由 `AdminCustomerResource` 单独暴露。

### 8.3 Listener

```
src/Front/Listeners/
├─ LogCustomerActivity.php          # → gz168/log-management
├─ SendWelcomeEmail.php
├─ SendSecurityEmail.php
└─ SendPasswordResetEmail.php
```

> Admin 触发的事件（CustomerBanned / CustomerUnbanned / AdminResetPassword）由 `src/Admin/Listeners/*` 处理。

## 9. Admin 子域（后台管理前台用户）

### 9.1 边界硬约束

```
src/Admin/*  可引用：
  - src/Shared/*
  - spatie/*、illuminate/*、laravel/sanctum

src/Admin/*  禁止引用：
  - src/Front/Services/*      （不调前台业务 Service；只调 Shared\Service 或自建 Admin Service）
  - src/Front/Http/Controllers/* （不调前台 Controller；只通过 HTTP/Sanctum 间接）
  - src/Front/Http/Requests/*  （不自用前台 FormRequest；自建 Admin FormRequest）
```

> 校验：`tests/Contract/SubtreeDependencyDirectionTest.php` 用 PHP-Parser 扫描 `src/Admin/**/*.php`，禁止 `use Gz168\Customer\Front\` 出现。

### 9.2 Admin Service（自建，不复用 Front Service）

```php
namespace Gz168\Customer\Admin\Services;

use Gz168\Customer\Shared\Events\CustomerBanned;
use Gz168\Customer\Shared\Events\CustomerUnbanned;
use Gz168\Customer\Shared\Models\Customer;
use Gz168\Customer\Shared\Support\CustomerModels;

class AdminCustomerService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $q = CustomerModels::customer()::query()
            ->when($filters['q'] ?? null, fn ($q, $v) =>
                $q->where(fn ($w) => $w->where('email', 'like', "%{$v}%")
                                       ->orWhere('name', 'like', "%{$v}%")
                                       ->orWhere('phone', 'like', "%{$v}%")))
            ->when(isset($filters['banned']), fn ($q, $v) => $v ? $q->whereNotNull('banned_at') : $q->whereNull('banned_at'))
            ->when($filters['verified'] ?? null, fn ($q, $v) =>
                $v ? $q->whereNotNull('email_verified_at') : $q->whereNull('email_verified_at'))
            ->orderByDesc('id');

        return $q->paginate($filters['per_page'] ?? 20);
    }

    public function ban(Customer $customer, string $reason, ?int $bannedBy): Customer
    {
        $customer->forceFill([
            'banned_at'    => now(),
            'banned_reason'=> $reason,
        ])->save();

        // 强制下线所有 token
        $customer->tokens()->delete();

        event(new CustomerBanned($customer, $reason, $bannedBy));
        return $customer;
    }

    public function unban(Customer $customer, ?int $unbannedBy): Customer
    {
        $customer->forceFill([
            'banned_at'    => null,
            'banned_reason'=> null,
        ])->save();

        event(new CustomerUnbanned($customer, $unbannedBy));
        return $customer;
    }

    public function resetPassword(Customer $customer, string $newPassword): void
    {
        $customer->forceFill(['password' => Hash::make($newPassword)])->save();
        $customer->tokens()->delete();
    }
}
```

### 9.3 Admin DTO

```php
namespace Gz168\Customer\Admin\Http\Resources;

class AdminCustomerResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'avatar_url'        => $this->avatar_url,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'locale'            => $this->locale,
            'timezone'          => $this->timezone,
            'banned_at'         => $this->banned_at?->toIso8601String(),
            'banned_reason'     => $this->banned_reason,
            'last_login_at'     => $this->last_login_at?->toIso8601String(),
            'last_login_ip'     => $this->last_login_ip,
            'created_at'        => $this->created_at->toIso8601String(),
            'updated_at'        => $this->updated_at->toIso8601String(),
        ];
        // 同样不暴露：password, remember_token, wx_openid, wx_unionid
    }
}
```

### 9.4 Admin Middleware（`EnsureAdminActor`）

```php
namespace Gz168\Customer\Admin\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAdminActor
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $callback = config('customer.admin.admin_check_callback',
            fn ($u) => method_exists($u, 'hasRole') && $u->hasRole('admin'));

        if (! $user || ! ($callback)($user)) {
            abort(403, 'Admin actor required');
        }
        return $next($request);
    }
}
```

> 不实现 admin 域；只**校验**"当前用户是 admin"——通过 callback 委托给 host 项目。

### 9.5 Admin Policy（`AdminCustomerPolicy`）

```php
namespace Gz168\Customer\Admin\Policies;

use Gz168\Customer\Shared\Models\Customer;

class AdminCustomerPolicy
{
    public function viewAny($actor): bool
    {
        return $this->isAdmin($actor);
    }
    public function view($actor, Customer $customer): bool
    {
        return $this->isAdmin($actor);
    }
    public function update($actor, Customer $customer): bool
    {
        return $this->isAdmin($actor);
    }
    public function ban($actor, Customer $customer): bool
    {
        return $this->isAdmin($actor);
    }
    public function resetPassword($actor, Customer $customer): bool
    {
        return $this->isAdmin($actor);
    }

    private function isAdmin($actor): bool
    {
        $cb = config('customer.admin.admin_check_callback',
            fn ($u) => method_exists($u, 'hasRole') && $u->hasRole('admin'));
        return $actor && $cb($actor);
    }
}
```

### 9.6 Filament Resource（后台管理 UI）

```php
namespace Gz168\Customer\Admin\Filament\Resources;

use Filament\Resources\Resource;
use Gz168\Customer\Admin\Filament\Resources\CustomerResource\Pages;

class CustomerResource extends Resource
{
    protected static ?string $model = \Gz168\Customer\Shared\Models\Customer::class;
    protected static ?string $navigationIcon = 'heroicon-o-user-group';
    protected static ?string $navigationGroup = 'Customer';

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListCustomers::route('/'),
            'view'   => Pages\ViewCustomer::route('/{record}'),
            'edit'   => Pages\EditCustomer::route('/{record}/edit'),
        ];
    }

    public static function getRelations(): array
    {
        return [
            \Gz168\Customer\Admin\Filament\RelationManagers\AddressesRelationManager::class,
            \Gz168\Customer\Admin\Filament\RelationManagers\LoginLogsRelationManager::class,
        ];
    }
}
```

> Filament Resource 仅在 `customer.admin.enabled=true` 且 `gz168/filament` 安装时被注册（见 §4 `registerAdminSurface`）。

### 9.7 登录日志表

```php
// database/migrations/2026_01_01_000004_create_customer_login_logs_table.php
Schema::create('customer_login_logs', function (Blueprint $t) {
    $t->id();
    $t->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
    $t->string('ip', 64)->nullable();
    $t->string('user_agent', 512)->nullable();
    $t->string('channel', 16);     // 'web' | 'native' | 'wx' | 'admin-reset'
    $t->boolean('success')->default(true);
    $t->string('failure_reason')->nullable();
    $t->timestamps();
    $t->index(['customer_id', 'created_at']);
});
```

`AuthService::attemptLogin()` / `WxAuthService::loginWithCode()` 成功后写入；失败时也写（success=false），便于后台审计。

## 10. 鉴权通道（前台三端 + 后台）

| 端 | 入口 | 输出 |
|---|---|---|
| Web（PC/手机/平板） | `POST /api/v1/auth/login` | Sanctum Cookie |
| iOS / Android | `POST /api/v1/auth/native-login` 或 `?source=native` | Sanctum Token |
| 微信小程序 | `POST /api/v1/auth/wx-login` | Sanctum Token + 绑定 wx_openid |
| 后台管理员（web Filament） | host 项目的 admin 登录 | 校验通过 → 看到 CustomerResource |
| 后台 API（机器调用） | `POST /api/admin/customers/*` | Sanctum + `gz168.customer.admin.actor` |

## 11. OpenAPI 契约

> Front 与 Admin 都生成 OpenAPI，但 OpenAPI tag 区分；前端 `packages/api-client` **只消费** Front 的 OpenAPI；Admin 的 OpenAPI 给内部系统用。

- tag：`Customer`（Front）/ `CustomerAdmin`（Admin）
- Schema 字段：见 §8.2 `CustomerResource` / §9.3 `AdminCustomerResource`
- 黑名单：`password / remember_token / wx_openid / wx_unionid` 永不出 Schema
- CI 强制：`tests/Contract/OpenApiSchemaTest.php`

## 12. 国际化（i18n）

- `resources/lang/<locale>/customer.php`：字段 label
- `resources/lang/<locale>/validation.php`：校验消息
- `resources/views/emails/*.blade.php`：邮件模板
- Filament 后台文案：跟随 `customer.admin.enabled` 启用；多语言资源在 `resources/lang/admin/<locale>/customer.php`

## 13. 测试策略

| 层 | 文件 | 工具 |
|---|---|---|
| 单元 | `tests/{Front,Admin,Shared}/Unit/Services/*Test.php` | PHPUnit + Mockery |
| Feature | `tests/{Front,Admin}/Feature/Api/**` | orchestra/testbench |
| Filament | `tests/Admin/Feature/Filament/CustomerResourceTest.php` | orchestra/testbench + filament-test |
| Policy | `tests/Shared/Unit/Policies/*Test.php` + `tests/Admin/Unit/Policies/*Test.php` | PHPUnit |
| DTO 白名单 | `tests/Contract/ResourceFieldWhitelistTest.php` | 反射两个 Resource，断言黑名单字段未暴露 |
| **子树方向** | `tests/Contract/SubtreeDependencyDirectionTest.php` | PHP-Parser 扫描 `src/Admin/**/*.php`，禁止 `use Gz168\Customer\Front\` |
| **开关生效** | `tests/Contract/AdminEnabledFlagTest.php` | 关 → admin 路由不可达 / Filament Resource 不注册；开 → 全部可达 |
| 边界 | `tests/Contract/BoundaryTest.php` | host 项目目录**没有** Customer 相关代码 |
| OpenAPI | `tests/Contract/OpenApiSchemaTest.php` | 解析 PHP 注解 + Resource 字段 |

### 13.1 `SubtreeDependencyDirectionTest.php`（关键）

```php
public function test_admin_subtree_must_not_import_front_subtree(): void
{
    $files = glob(__DIR__.'/../../src/Admin/**/*.php');
    foreach ($files as $file) {
        $contents = file_get_contents($file);
        $this->assertStringNotContainsString(
            'use Gz168\\Customer\\Front\\',
            $contents,
            "Admin subtree must not import Front subtree: {$file}"
        );
    }
}

public function test_admin_subtree_may_import_shared_subtree(): void
{
    $files = glob(__DIR__.'/../../src/Admin/**/*.php');
    foreach ($files as $file) {
        $contents = file_get_contents($file);
        // 允许：Gz168\Customer\Shared\ 或 Illuminate / Spatie / Sanction
        // 已经在前面 assertNotContains Front，这里只验允许的命名空间
        $allowed = ['Gz168\\Customer\\Shared\\', 'Gz168\\LogManagement\\', 'Gz168\\Common\\'];
        if (preg_match('/^use\s+([A-Z][A-Za-z0-9_\\\\]+);/m', $contents, $m)) {
            // 至少允许任意 Illuminate/Spatie/本模块 Shared
        }
    }
}
```

### 13.2 `AdminEnabledFlagTest.php`

```php
public function test_admin_routes_unavailable_when_flag_off(): void
{
    config(['customer.admin.enabled' => false]);
    $this->app->register(\Gz168\Customer\Providers\CustomerServiceProvider::class);

    $routes = collect(app('router')->getRoutes())
        ->map(fn ($r) => $r->uri())
        ->filter(fn ($u) => str_contains($u, 'admin/customers'));

    $this->assertEmpty($routes->all(), 'Admin routes must not register when flag is off');
}

public function test_filament_resource_not_registered_when_flag_off(): void
{
    config(['customer.admin.enabled' => false]);
    $registered = \Filament\Facades\Filament::getResources();
    $this->assertNotContains(\Gz168\Customer\Admin\Filament\Resources\CustomerResource::class, $registered);
}
```

### 13.3 `BoundaryTest.php`（CI 在 host 项目跑）

```php
public function test_host_project_has_no_customer_code_outside_module(): void
{
    $forbidden = [
        app_path('Models/Customer.php'),
        app_path('Http/Controllers/Api/*Customer*'),
        app_path('Http/Requests/*Customer*'),
        app_path('Http/Resources/*Customer*'),
        database_path('migrations/*create_customers*'),
        database_path('migrations/*customer_*'),
        app_path('Filament/Resources/*Customer*'),   // ★ 强制：Filament 也在 host 不能实现
    ];
    foreach ($forbidden as $pattern) {
        $this->assertEmpty(glob(base_path($pattern)), "Boundary violation: {$pattern}");
    }
}
```

## 14. 落地步骤（在 dev-laraval 项目内）

> 当前仓库已存在 `gz168/UserManagement`（含 Filament + Front/Admin REST）。按"单一 Composer 包、单一 ServiceProvider、两个子树 + 开关"原则，**新建** `gz168/Customer` 替代。

| 步骤 | 动作 | 验证 |
|---|---|---|
| **C0** | 落盘 `docs/architecture/gz168-customer.md` | 文档评审 |
| **C1** | 新建 `gz168/Customer/composer.json` + `module.json` + 空 ServiceProvider + 空目录 | `composer validate` |
| **C2** | 落地 Shared 层（Models + Migrations + Factories + Policies + Events + Support） | `php artisan migrate --pretend` |
| **C3** | 落地 Front 子树（Services + Controllers + FormRequests + Resources + Listeners + routes/front.php） | Front Feature 测试 |
| **C4** | 落地 OpenAPI 注解 + `tests/Contract/*`（白名单 + SubtreeDirection） | OpenAPI 生成 + 校验 |
| **C5** | 根 `composer.json` 注册 `gz168/customer`（默认 `customer.admin.enabled=false`） | `composer update` |
| **C6** | 前端 `packages/api-client/domain/customer/*` 接入 OpenAPI | `npm run check:clients` |
| **C7** | `apps/web` 把 `/me` 系列切到新端点；Feature E2E 跑通 | Playwright |
| **A1** | 落地 Admin 子树（AdminCustomerService + AdminCustomerResource + Admin Filament Resource + routes/admin.php） | Admin Feature + Filament 测试 |
| **A2** | 落地 CustomerLoginLog migration + AuthService/WxAuthService 写日志 | 日志可见 |
| **A3** | host 项目 `customer.admin.enabled=true`；Filament 后台可见 CustomerResource | 浏览器手工 + 自动化 |
| **U1** | 评估删除 `gz168/UserManagement/`（保留一个版本过渡） | composer 跑通 |

## 15. 公共模块可复用 Checklist（跨项目复用）

`gz168/Customer` 在另一个全新 Laravel 项目复用：

1. host 项目 `composer require gz168/customer`。
2. host 项目 `.env`：
   ```
   GZ168_CUSTOMER_ROUTE_PREFIX=api/v1
   GZ168_CUSTOMER_ADMIN_ENABLED=false       # 默认关闭后台管理
   GZ168_CUSTOMER_TOKEN_TTL=43200
   GZ168_WX_APP_ID=...
   GZ168_WX_APP_SECRET=...
   ```
3. host 项目 `config/customer.php` 可覆盖（可选）。
4. `php artisan migrate` → 自动跑 `gz168/Customer/database/migrations/*`。
5. 前端项目 `OPENAPI_URL=gz168/Customer/resources/contracts/openapi.yaml`，跑 `openapi-typescript`。
6. 测试：host 项目跑 `php artisan test --compact` + `vendor/bin/pint`。

> **零额外代码**：host 项目不需要写任何 Customer 相关类；如需"如何判定当前用户是 admin"，通过 `customer.admin.admin_check_callback` 注入。

## 16. 验收清单

- [ ] `gz168/Customer/` 是 Customer 域**唯一**实现源；`gz168/CustomerAdmin` **不存在**独立 Composer 包。
- [ ] host 项目 `app/`、`routes/api.php`、`database/migrations/`、`app/Filament/` 内**没有任何** Customer 相关代码（BoundaryTest 强制）。
- [ ] `composer require gz168/customer` 即装即用；默认 `customer.admin.enabled=false`，**完全不暴露**后台入口。
- [ ] 切换 `customer.admin.enabled=true` 后，后台入口（routes/admin.php + Filament Resource）才生效。
- [ ] 所有业务逻辑在 `src/{Front,Admin}/Services/`；Controller 体重 < 30 行（单方法）。
- [ ] `CustomerResource`（前台）与 `AdminCustomerResource`（后台）字段分离，黑名单（password/remember_token/wx_openid/wx_unionid）**永不**出现在响应。
- [ ] `src/Admin/*` **不引用** `src/Front/*`；只引用 `src/Shared/*` 与外部包（SubtreeDirectionTest 强制）。
- [ ] OpenAPI 自动生成；前端类型自动同步；breaking change CI 失败。
- [ ] iOS/Android 走 `native-login`；小程序走 `wx-login`；Web 走 `login`；同模块。
- [ ] 所有"写操作"都有 Event → Activity Log；`customer_login_logs` 表有所有登录/失败/被封禁/被重置的痕迹。
- [ ] `gz168/Customer` **不依赖**任何其它 `gz168/*` 业务模块（除 common / log-management / role-permission）。