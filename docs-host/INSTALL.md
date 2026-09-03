# 项目初始化

## 环境要求

- Apache（站点根目录必须指向项目的 `public` 目录）
- PHP 8.5，启用 `curl`、`intl`、`mbstring`、`openssl`、`pdo_mysql`、`redis`、`xml`
- MySQL 8
- Redis 8
- Composer 2
- Node.js 与 npm

## 新项目安装

1. 复制 `.env.example` 为 `.env`。
2. 配置 MySQL、Redis、`APP_URL`、`SUPER_ADMIN_EMAIL` 和 `SUPER_ADMIN_PASSWORD`。
3. 执行 `composer setup`。该命令会安装 Laravel、Next.js、Expo、Taro 的全部依赖并构建 Web 与微信小程序。
4. 执行 `bin/configure-apache` 生成机器专属 VirtualHost，并将 Apache 站点根目录指向项目的 `public` 目录。
5. 访问 `/admin`。

## 多端开发

```shell
npm run dev:web
npm run dev:mobile
npm run dev:miniapp
```

首次运行前分别复制：

- `apps/web/.env.example` 为 `apps/web/.env.local`
- `apps/mobile/.env.example` 为 `apps/mobile/.env.local`
- 根据环境修改 `apps/miniapp/.env.development`

微信开发者工具导入目录为 `apps/miniapp/dist`。

`composer setup` 会安装依赖、生成应用密钥、执行迁移、创建受保护的超级管理员，并构建前端资源。

## 已安装项目重新初始化

执行 `composer initialize`。该操作可以安全重复执行。已有受保护超级管理员不会被覆盖，也不会重置其密码。

## 超级管理员保护

超级管理员由 `users.is_super_admin` 标识。模型层会阻止对该账号的更新和删除，因此保护对后台、业务代码及命令行操作同时生效。

生产环境请使用高强度随机密码，并确保 `.env` 不进入版本控制。
