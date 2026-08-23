---
type: atomic
topic: tools
subtopic: cheatsheet
status: active
created: 2026-08-02
updated: 2026-08-02
confidence: 3
difficulty: 2
tags:
  - laravel
  - database
  - schema
  - dev-laraval
  - mysql
---

# dev-laraval 核心表速查

> 仓库 `D:\www2\dev-laraval`（Laravel 13 + Filament 5 + Livewire 4）默认 MySQL 连接 `dev_laravel` 的核心表结构速查。仅含字段语义与索引，**不含任何数据样例**，符合 [[07-Operations/知识库安全规范]]。

## 适用范围

- 默认数据库：`mysql`（`config/database.php` → `database.default`）
- 库名：`dev_laravel`
- 数据来源：Laravel 13 自带骨架 + `database/migrations/*` + `gz168/*` 模块迁移
- 速查表生成工具：`php artisan db:show` / `php artisan db:table <name>`

## 核心表清单

| 表 | 来源 | 关键字段 | 用途 |
| --- | --- | --- | --- |
| `users` | Laravel 骨架 + gz168 | `is_protected` / `is_super_admin` / `is_admin` / `user_source` | 受保护管理员与三端用户 |
| `password_reset_tokens` | Laravel 骨架 | `email` (PK) / `token` | 密码重置令牌 |
| `sessions` | Laravel 骨架 | `id` (PK) / `user_id` (FK?) | 数据库 Session |
| `cache` | Laravel 骨架 | `key` (PK) / `expiration` | 应用缓存 |
| `cache_locks` | Laravel 骨架 | `key` (PK) / `owner` | 原子锁 |
| `personal_access_tokens` | Sanctum | `tokenable_id` + `tokenable_type` (morphs) / `token` (UK) | API Token |
| `jobs` | Laravel 队列 | `queue` (idx) | 待执行队列任务 |
| `job_batches` | Laravel 队列 | `id` (PK) | 批次任务汇总 |
| `failed_jobs` | Laravel 队列 | `uuid` (UK) / `(connection, queue, failed_at)` (idx) | 失败任务 |

## 1. `users` —— 受保护管理员与三端用户

```text
id                bigint unsigned, PK, auto_increment
name              varchar(255)
email             varchar(255), UNIQUE
email_verified_at timestamp, nullable
password          varchar(255)
remember_token    varchar(100), nullable
api_client_id     varchar(255), nullable
created_at        timestamp, nullable
updated_at        timestamp, nullable
user_source       enum('front','admin','api'), default 'front'
is_super_admin    tinyint(1), default 0
is_protected      tinyint(1), default 0
is_admin          tinyint(1), default 0
```

索引：

- `PRIMARY (id)`
- `UNIQUE users_email_unique (email)`
- `INDEX users_is_super_admin_index (is_super_admin)`
- `INDEX users_is_protected_index (is_protected)`
- `INDEX users_is_admin_index (is_admin)`

业务不变量（来自 `docs/AI_DEVELOPMENT.md`）：

1. 受保护管理员由 `php artisan app:initialize` 创建。
2. `is_protected = 1` 的用户**不得删除**，**不得改其他资料**，只允许修改邮箱、密码、状态及管理员权限（含降权或停用）。
3. 初始化必须**幂等**；重复执行不得覆盖、不得提权、不得重置密码。
4. `user_source` 决定所属端：`front` / `admin` / `api`，由 `gz168/UserManagement` 控制器与 `gz168/ApiAuth` Token 服务使用。

## 2. `password_reset_tokens` —— 密码重置令牌

```text
email        varchar(255), PK
token        varchar(255)
created_at   timestamp, nullable
```

无额外索引；主键即 `email`，与 `users.email` 一一对应。

## 3. `sessions` —— 数据库 Session

```text
id             varchar(255), PK
user_id        bigint unsigned, nullable, idx
ip_address     varchar(45), nullable
user_agent     text, nullable
payload        longtext
last_activity  int, idx
```

注意：这是 `database` Session 驱动的表。`SESSION_DRIVER=database` 时启用；如改 Redis / file，本表不会被读写。

## 4. `cache` / `cache_locks` —— 应用缓存与原子锁

`cache`：

```text
key          varchar(255), PK
value        mediumtext
expiration   bigint, idx
```

`cache_locks`：

```text
key          varchar(255), PK
owner        varchar(255)
expiration   bigint, idx
```

实际运行时缓存走 Redis（`CACHE_STORE=redis`），本表为骨架默认表，通常空闲。

## 5. `personal_access_tokens` —— Sanctum API Token

```text
id                bigint unsigned, PK, auto_increment
tokenable_id      bigint unsigned (morphs)
tokenable_type    varchar(255)    (morphs)
name              text
token             varchar(64), UNIQUE
abilities         text, nullable
last_used_at      timestamp, nullable
expires_at        timestamp, nullable, idx
created_at        timestamp, nullable
updated_at        timestamp, nullable
```

索引：

- `PRIMARY (id)`
- `UNIQUE personal_access_tokens_token_unique (token)`
- `INDEX personal_access_tokens_tokenable_index (tokenable_type, tokenable_id)`
- `INDEX personal_access_tokens_expires_at_index (expires_at)`

> 凭据相关：不要在笔记、截图、提交内容里出现真实 `token` 值。`token` 列虽然存的是哈希，但仍按敏感字段处理。

## 6. `jobs` / `job_batches` / `failed_jobs` —— 队列与失败任务

`jobs`：

```text
id            bigint unsigned, PK
queue         varchar(255), idx
payload       longtext
attempts      unsigned smallint
reserved_at   unsigned int, nullable
available_at  unsigned int
created_at    unsigned int
```

`job_batches`：

```text
id              varchar(255), PK
name            varchar(255)
total_jobs      int
pending_jobs    int
failed_jobs     int
failed_job_ids  longtext
options         mediumtext, nullable
cancelled_at    int, nullable
created_at      int
finished_at     int, nullable
```

`failed_jobs`：

```text
id          bigint unsigned, PK
uuid        varchar(255), UNIQUE
connection  varchar(255)
queue       varchar(255)
payload     longtext
exception   longtext
failed_at   timestamp, default CURRENT_TIMESTAMP
```

复合索引：

- `failed_jobs (connection, queue, failed_at)`

## 模块扩展表（仅提示，不展开）

`gz168/*` 子模块在 `dev_laravel` 库内会按需创建自己的表。例如：

- `gz168/UserManagement`、`gz168/RolePermission`：权限相关表
- `gz168/ApiAuth`、`gz168/Customer`：业务相关表
- `gz168/Filament`、`gz168/FilamentAdmin`：Filament 后台相关表
- `gz168/SystemSettings`、`gz168/ModuleSettings`、`gz168/CustomConfig`：配置相关表

> 模块表的具体结构请按需用 `php artisan db:table <name>` 现拉，不要在速查里复制大量细节。

## 常用查询（只读）

```sql
-- 受保护管理员
SELECT id, name, email, user_source, is_protected, is_super_admin, is_admin
FROM users
WHERE is_protected = 1;

-- 字段是否存在
SHOW COLUMNS FROM users LIKE 'is_protected';

-- 表索引
SHOW INDEX FROM users;

-- 当前默认连接
SELECT DATABASE() AS db, VERSION() AS version;
```

## 反查与维护

```shell
# 列出所有表
php artisan db:show --counts --database=mysql

# 看单表结构 + 索引
php artisan db:table users

# 比较迁移与实际库差异
php artisan migrate:status

# 校验结构（不连生产）
php artisan db:show --counts
```

## 与项目规则的关系

- [[../MOC]]：本目录的入口与索引约定
- [[../../../00-Home/MOC-工程实践]]：把数据库速查定位到工程实践主题
- [[../../../07-Operations/知识库安全规范]]：凭据与隐私的红线，速查只存结构不存数据
- `docs/AI_DEVELOPMENT.md`：受保护管理员与初始化幂等性的源头说明

## 复盘 / 复习

- 复习节奏：上线新模块或改字段后回到本笔记，对照源码迁移文件手动更新一次
- 失效信号：迁移文件改了但本笔记没跟上；速查字段与 `db:table <name>` 输出对不上
