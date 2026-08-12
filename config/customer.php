<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| gz168/Customer 模块配置
|--------------------------------------------------------------------------
|
| 详细架构与约束见 docs/architecture/gz168-customer.md。
| 本文件覆盖 gz168/Customer/config/customer.php 的默认值，host 项目可
| 在 config/customer.php 中修改任一项，无需修改模块内部代码。
|
*/

return [
    'route_prefix'     => env('GZ168_CUSTOMER_ROUTE_PREFIX', 'api/v1'),
    'route_middleware' => ['api'],

    /*
    |--------------------------------------------------------------------------
    | 后台管理（Admin 子树）开关
    |--------------------------------------------------------------------------
    | enabled=false 时本模块**完全不暴露**任何后台入口（路由 + Filament）。
    | 启用后必须确认 host 项目存在 admin 用户角色（hasRole('admin')），
    | 或注入 admin_check_callback 自定义判定。
    */
    'admin' => [
        'enabled'  => env('GZ168_CUSTOMER_ADMIN_ENABLED', false),
        'guard'    => env('GZ168_CUSTOMER_ADMIN_GUARD', 'web'),
        'route_path' => env('GZ168_CUSTOMER_ADMIN_ROUTE_PATH', 'admin/customers'),

        // 默认判定：hasRole('admin')；若 host 项目 admin 实现不同，覆盖此回调
        // 'admin_check_callback' => function ($user) {
        //     return $user !== null && method_exists($user, 'isAdmin') && $user->isAdmin();
        // },
    ],

    'auth' => [
        'cookie'           => env('GZ168_CUSTOMER_COOKIE', 'gz168_customer_session'),
        'token_ttl'        => (int) env('GZ168_CUSTOMER_TOKEN_TTL', 60 * 24 * 30),
        'password_min'     => 8,
        'default_locale'   => 'zh-CN',
        'default_timezone' => 'Asia/Shanghai',
        'passwords' => [
            'broker' => env('GZ168_CUSTOMER_PASSWORD_BROKER', 'customers'),
        ],
    ],

    'avatar' => [
        'disk'          => env('GZ168_CUSTOMER_AVATAR_DISK', 'public'),
        'max_kb'        => (int) env('GZ168_CUSTOMER_AVATAR_MAX_KB', 2048),
        'allowed_mimes' => ['jpg', 'jpeg', 'png', 'webp'],
    ],

    'mail' => [
        'from_address' => env('GZ168_CUSTOMER_MAIL_FROM', env('MAIL_FROM_ADDRESS', 'hello@example.com')),
        'from_name'    => env('GZ168_CUSTOMER_MAIL_NAME', env('MAIL_FROM_NAME', 'Customer Service')),
    ],

    'wx' => [
        'app_id'     => env('GZ168_WX_APP_ID'),
        'app_secret' => env('GZ168_WX_APP_SECRET'),
        'mode'       => env('GZ168_WX_MODE', 'mp'),
    ],

    // 若 host 注入自定义 Customer 模型（含扩展字段），在此声明：
    // 'model' => App\Models\Customer::class,
    // 'address_model' => App\Models\CustomerAddress::class,
];