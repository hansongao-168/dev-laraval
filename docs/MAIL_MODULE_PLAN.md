# 邮箱管理模块 (gz168/mail) 实施计划

> 本文档为 `gz168/Mail` 模块的实施规划。当前阶段仅生成计划与骨架,代码生成在后续会话按本计划分阶段落地。

## 1. 背景与目标

### 1.1 现状

- `gz168/GmailApi` 已有,提供 Gmail REST API + OAuth2 **发送**能力。
- 仅支持单一发件账户(由 `.env` 配置 `GOOGLE_GMAIL_REFRESH_TOKEN` / `GOOGLE_GMAIL_SENDER`)。
- 无 **接收** (IMAP/POP) 能力,无 **QQ 邮箱** 接入,无 **多账户管理**。

### 1.2 目标

在不破坏现有 `GmailApi` 的前提下,新增独立模块 `gz168/Mail`,提供:

| 能力 | 阶段 | 说明 |
| --- | --- | --- |
| 多邮箱账户统一管理(Gmail + QQ 邮箱) | 阶段 1 | 数据库存储 + Filament 后台 + 管理 API |
| Gmail OAuth2 授权(沿用 GmailApi 的 OAuth 流,但绑到账户 ID) | 阶段 1 | |
| QQ 邮箱授权码接入(密码学方式存储) | 阶段 1 | |
| 接收(IMAP 拉取 + 本地邮件表) | 阶段 2 | Gmail IMAP XOAUTH2 + QQ IMAP 授权码 |
| 计划任务(后台手动触发为主 + 可选 Laravel Scheduler) | 阶段 2 | 同步记录落 `mail_fetch_runs`;全局默认频率 + 每账户覆盖 |
| 发送(替代 GmailApi 单账户限制) | 阶段 3 | 沿用 GmailApi Gmail 发送;新增 QQ SMTP 发送 |

### 1.3 非目标

- 不在阶段 1 中做实际邮件拉取或发送;仅完成"能登记、能授权、能查询"的骨架。
- 不在本期引入 OAuth Provider 第三方登录;`GmailApi` 的 OAuth 流程保持不变,只把 `refresh_token` 关联到账户记录而不是 `.env`。
- 不引入 PHP `imap` 扩展(已在 PHP 8.4+ 弃用),使用纯 PHP 的 `webklex/php-imap` 包。

## 2. 架构决策

### 2.1 模块边界

- 新建独立模块 `gz168/Mail`(目录 `gz168/Mail/`),不复用 `GmailApi` 的代码组织。
- `GmailApi` 模块 **保留不变**,继续提供 `.env` 驱动的"默认 Gmail 发送"能力;`Mail` 模块提供"多账户统一管理"。
- 阶段 3 完成后再评估是否将 `GmailApi` 标记为 deprecated 并委托给 `Mail`。

### 2.2 依赖方向

```text
Mail (功能)
├── common
├── filament
├── filament-admin(隐式,通过 filament 间接)
├── role-permission
├── api-auth
└── webklex/php-imap  (第三方,纯 PHP)
```

不依赖 `GmailApi`,两者平行存在。

### 2.3 协议与认证

| 邮箱 | 收件 | 发件 | 鉴权 |
| --- | --- | --- | --- |
| Gmail | IMAP `imap.gmail.com:993/SSL` XOAUTH2 | Gmail API `gmail/v1/users/me/messages/send` + OAuth2 | 复用 `GmailApi` 的 OAuth 凭据(`client_id` / `client_secret`),`refresh_token` 按账户存储 |
| QQ 邮箱 | IMAP `imap.qq.com:993/SSL` | SMTP `smtp.qq.com:465/SSL` | **授权码**(QQ 强制使用 16 位授权码代替密码) |

Gmail OAuth2 与 IMAP XOAUTH2 共用同一对 client credentials;XOAUTH2 token 通过 `https://oauth2.googleapis.com/token`(同 `GmailApi`)现取现用,不缓存 access_token 到数据库。

QQ 授权码必须经 `Crypt::encryptString` 后入库,显示时脱敏,日志禁止出现明文。

### 2.4 数据模型

阶段 1 创建 3 张表,集中在 `gz168/Mail/database/migrations/`。

#### `mail_accounts`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `name` | varchar(255) | 内部显示名(例 "客服 Gmail") |
| `provider` | enum `gmail`,`qq` | 邮箱服务商 |
| `email_address` | varchar(255) unique with provider | 邮箱地址 |
| `display_name` | varchar(255) nullable | 发件显示名 |
| `status` | enum `active`,`disabled`,`error` | 账户启用状态 |
| `last_synced_at` | timestamp nullable | 最近一次拉信时间 |
| `last_error` | text nullable | 最近一次错误摘要(脱敏) |
| `is_default` | boolean | 默认发件账户(每用户/全局一个) |
| `owner_user_id` | bigint FK → users.id nullable | 创建者;null 表示系统账户 |
| `timestamps` | | |

#### `mail_account_credentials`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `mail_account_id` | FK → mail_accounts.id unique | 一对一 |
| `oauth_refresh_token` | text nullable,加密 | 仅 Gmail |
| `oauth_access_token_expires_at` | timestamp nullable | 仅 Gmail,缓存上次 access token 到期时间 |
| `imap_password_encrypted` | text nullable | QQ 授权码(加密) |
| `smtp_password_encrypted` | text nullable | QQ 授权码(加密,可选;与 imap 可同值) |
| `timestamps` | | |

模型里通过访问器解密;controller/service 调用统一走 service,不直接读 credentials 表。

#### `mail_messages`(阶段 2 才创建)

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `mail_account_id` | FK | 所属账户 |
| `folder` | varchar(64) | INBOX / Sent / ... |
| `remote_uid` | varchar(128) | IMAP UID,unique with (account,folder) |
| `message_id` | varchar(255) nullable | RFC 5322 Message-ID |
| `subject` | text | |
| `from_address` | varchar(255) | |
| `from_name` | varchar(255) nullable | |
| `to_addresses` | json | |
| `cc_addresses` | json nullable | |
| `sent_at` | timestamp nullable | |
| `received_at` | timestamp nullable | |
| `is_read` | boolean | |
| `is_flagged` | boolean | |
| `has_attachments` | boolean | |
| `snippet` | varchar(500) | 纯文本预览 |
| `body_html` | longText nullable | 阶段 2 才使用 |
| `body_text` | longText nullable | 阶段 2 才使用 |
| `raw_headers` | json nullable | |
| `timestamps` | | |

阶段 1 不创建此表,避免在未使用时空跑迁移。

### 2.5 服务层

阶段 1 仅暴露契约与基础服务,阶段 2/3 再补 IMAP / SMTP 实现:

```text
src/Services/
├── MailAccountService.php          # 账户 CRUD + 默认账户切换
├── MailAccountAuthService.php      # OAuth 授权 URL 生成 + code 兑换
├── GmailImapClient.php             # 阶段 2,封装 webklex/php-imap + XOAUTH2
├── QqImapClient.php                # 阶段 2,封装 webklex/php-imap + 授权码
├── GmailSender.php                 # 阶段 3,委托 GmailApi 或直接调用 Gmail REST
└── QqMailer.php                    # 阶段 3,Symfony Mailer + smtp.qq.com
```

接口边界:

```php
interface MailAccountServiceInterface
{
    public function register(array $data): MailAccount;
    public function update(MailAccount $account, array $data): bool;
    public function delete(MailAccount $account): bool;
    public function setDefault(MailAccount $account): void;
    public function markError(MailAccount $account, string $summary): void;
}

interface MailAccountAuthServiceInterface
{
    public function createGmailAuthorizationUrl(MailAccount $account): array;
    public function completeGmailAuthorization(MailAccount $account, string $code, string $state): void;
    public function setQqAuthorizationCode(MailAccount $account, string $code): void;
}
```

阶段 1 只实现这两个接口的两个 service;`GmailImapClient` / `QqImapClient` / `GmailSender` / `QqMailer` 在后续阶段以相同命名空间追加实现,接口可视情况扩展。

### 2.6 API 路由(阶段 1)

参照 `GmailApi` 的 `admin` 前缀模式(`/api/admin/gmail/*`),新模块使用:

```text
GET    /api/admin/mail/accounts                  列表
POST   /api/admin/mail/accounts                  登记账户(QQ 可一步完成,Gmail 进入授权流)
GET    /api/admin/mail/accounts/{id}             详情
PATCH  /api/admin/mail/accounts/{id}             更新
DELETE /api/admin/mail/accounts/{id}             删除
POST   /api/admin/mail/accounts/{id}/default     设为默认发件账户
POST   /api/admin/mail/accounts/{id}/gmail/oauth/url      Gmail 授权 URL
GET    /api/mail/gmail/oauth/callback?account_id=&code=&state=    Gmail 回调(公开,带 state 校验)
POST   /api/admin/mail/accounts/{id}/qq/code     设置 QQ 授权码
GET    /api/admin/mail/accounts/{id}/status      查询配置/连接状态
```

`admin/*` 走 `gz168.jwt.auth` + `gz168.api.scope:admin_user`;`gmail/oauth/callback` 是公开端点,只校验 `state` 缓存 key,允许未授权访问。

### 2.7 Filament 资源(阶段 1)

- `MailAccountResource`(`src/Filament/Resources/MailAccountResource.php`):
  - 列表字段:name、provider、email_address、status、last_synced_at、is_default
  - 表单:provider、name、email_address、display_name、is_default、status;QQ 提交授权码在独立 Action 中弹出;Gmail 提交后跳转到 `authorizationUrl` 返回的外部链接。
  - 操作:edit、delete、set default、refresh status
- 不放自定义 Page;MailAccountResource 已足够。

菜单组归属 `系统工具`(`navigationGroup = '系统工具'`),`navigationSort` 紧跟 `Redis 管理` / `Kafka 管理` 之后。

权限 slug 命名沿用现有惯例:

| slug | name | resource |
| --- | --- | --- |
| `mail.view` | 查看邮箱账户 | MailAccountResource |
| `mail.create` | 登记邮箱账户 | MailAccountResource |
| `mail.edit` | 编辑邮箱账户 | MailAccountResource |
| `mail.delete` | 删除邮箱账户 | MailAccountResource |
| `mail.authorize` | 配置邮箱授权 | MailAccountResource |
| `mail.send` | 发送邮件 | MailAccountResource |

> 阶段 1 **不**修改 `RolePermission/src/Database/Seeders/PermissionSeeder.php`(集中维护,遵循现状)。新权限先在文档列出,等种子重跑或手工插入;待阶段 3 完成后再统一追加到 seeder。

### 2.8 队列与调度(阶段 2)

- 同步作业 `MailSyncCommand` + `MailAccountSyncJob`:
  - 默认每 5 分钟跑一次,可通过配置改频率
  - 每个 active 账户派发一个 Job
  - Job 内按 folder 拉取 IMAP UID,upsert 到 `mail_messages`
- 失败重试 3 次,失败后更新 `mail_accounts.last_error` 并置 `status=error`
- 不在阶段 1 引入 Job 类与调度,仅保留扩展点

## 3. 文件结构

```text
gz168/Mail/
├── composer.json
├── module.json
├── config/mail.php
├── routes/api.php
├── database/
│   ├── migrations/
│   │   ├── 2026_08_xx_000001_create_mail_accounts_table.php
│   │   └── 2026_08_xx_000002_create_mail_account_credentials_table.php
│   └── factories/
│       ├── MailAccountFactory.php
│       └── MailAccountCredentialFactory.php
├── resources/
│   └── views/  (空,阶段 1 不用)
├── src/
│   ├── Providers/MailServiceProvider.php
│   ├── Exceptions/MailException.php
│   ├── Contracts/
│   │   ├── MailAccountServiceInterface.php
│   │   └── MailAccountAuthServiceInterface.php
│   ├── Models/
│   │   ├── MailAccount.php
│   │   └── MailAccountCredential.php
│   ├── Services/
│   │   ├── MailAccountService.php
│   │   └── MailAccountAuthService.php
│   ├── Http/
│   │   ├── Requests/
│   │   │   ├── RegisterMailAccountRequest.php
│   │   │   ├── UpdateMailAccountRequest.php
│   │   │   └── SetQqAuthorizationCodeRequest.php
│   │   └── Controllers/Api/
│   │       ├── MailAccountController.php
│   │       ├── MailAccountOAuthController.php
│   │       └── MailAccountQqCodeController.php
│   ├── Filament/Resources/
│   │   └── MailAccountResource.php
│   └── Console/  (阶段 2 引入)
└── tests/
    └── Feature/
        ├── MailAccountRegistrationTest.php
        ├── GmailOAuthFlowTest.php
        ├── QqAuthorizationCodeTest.php
        ├── MailAccountApiTest.php              # 阶段 1
        ├── SyncMailAccountJobTest.php          # 阶段 2
        ├── MailSyncScheduleResolverTest.php    # 阶段 2
        ├── MailSyncRunResourceTest.php         # 阶段 2
        └── MailPruneSyncRunsCommandTest.php    # 阶段 2
```

## 4. 阶段性交付

### 阶段 1 — 账户管理骨架(本期目标)

完成后:

- `gz168/Mail` 模块可被发现、启用、禁用,Composer 依赖通过验证
- `bin/check-gz168-coupling.php` 仍 0 违规
- 后台 `/admin` 出现 "邮箱账户" 菜单,可见邮箱账户列表
- API:
  - `POST /api/admin/mail/accounts` 创建一个 QQ 账户(直接传授权码)
  - `GET /api/admin/mail/accounts/{id}` 查详情(授权码脱敏)
  - `POST /api/admin/mail/accounts/{id}/default` 切换默认账户
  - `POST /api/admin/mail/accounts/{id}/gmail/oauth/url` 取得 Gmail 授权 URL,跳转授权后回调写入 `oauth_refresh_token`
- 测试:成功路径 + 权限(scope)失败 + 字段校验失败 + QQ 授权码加密存储

### 阶段 2 — 接收 + 计划任务

**目标**:实现 Gmail / QQ IMAP 拉信,并提供"手动同步为主、可选自动调度"的能力,完整落库同步历史。

#### 2.1 新增表

```text
mail_messages      邮件正文与索引(详见 §2.4 mail_messages)
mail_fetch_runs    每次同步的运行记录(新增;原计划名 mail_sync_runs,真实联调时发现与
                   MailInbound 拆分包的同名表冲突,已改名避让,见 §4.8 后续记录)
```

`mail_fetch_runs` 字段:

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `mail_account_id` | FK → mail_accounts.id | |
| `trigger` | enum `manual`,`scheduled`,`command` | 触发来源 |
| `status` | enum `running`,`success`,`failed`,`partial` | |
| `started_at` | timestamp | |
| `finished_at` | timestamp nullable | |
| `duration_ms` | unsignedInteger nullable | |
| `folders_scanned` | json nullable | 如 `["INBOX"]` |
| `messages_fetched` | unsignedInteger default 0 | IMAP 返回条数 |
| `messages_inserted` | unsignedInteger default 0 | 新落库条数 |
| `messages_updated` | unsignedInteger default 0 | 已存在但 flag/seen 变化 |
| `error_summary` | text nullable | 错误摘要(脱敏) |
| `error_context` | json nullable | 异常上下文(脱敏) |
| `created_by` | bigint FK → users.id nullable | 手动触发者;调度触发为 null |
| `timestamps` | | |

索引:`(mail_account_id, started_at)`、`(status, started_at)`。

#### 2.2 配置(config/mail.php)

```php
return [
    // 全局默认:每 5 分钟扫一次所有 active 账户
    'sync' => [
        'auto_enabled' => env('MAIL_SYNC_AUTO_ENABLED', true),
        'default_interval_minutes' => (int) env('MAIL_SYNC_INTERVAL_MINUTES', 5),
        'folders' => explode(',', (string) env('MAIL_SYNC_FOLDERS', 'INBOX')),
        'batch_size' => (int) env('MAIL_SYNC_BATCH_SIZE', 50),
        'connection_timeout' => (int) env('MAIL_SYNC_TIMEOUT', 30),
        'prune_runs_days' => (int) env('MAIL_SYNC_RUNS_RETENTION_DAYS', 30),
    ],
];
```

#### 2.3 账户级覆盖

`mail_accounts` 表新增字段(阶段 2 迁移 `2026_08_xx_000003_add_sync_overrides_to_mail_accounts.php`):

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `sync_enabled` | boolean default true | 关闭后手动仍可触发 |
| `sync_interval_minutes` | unsignedInteger nullable | null = 走全局默认 |
| `sync_folders` | json nullable | null = 走全局默认 |

解析逻辑放在 `MailSyncScheduleResolver`:

```php
final class MailSyncScheduleResolver
{
    public function intervalMinutes(MailAccount $account): int;
    public function folders(MailAccount $account): array;
    public function isEnabled(MailAccount $account): bool;
}
```

#### 2.4 触发方式(优先级)

1. **后台手动触发**(默认/主路径)
   - `MailAccountResource` 列表行 Action `sync`
   - `MailAccountResource` 详情页 Header Action `sync all`
   - `MailAccountPage` 顶部 `立即同步所有账户` Action
2. **可选调度**(次要路径)
   - Laravel Scheduler 注册 `php artisan mail:sync` 命令
   - 在 `MailServiceProvider::boot()` 通过 `$this->app->booted()` 包裹,与 `DatabaseBackup` / `GitManagement` 同样写法
   - **不在** 默认开启;`config('mail.sync.auto_enabled')` 默认为 true(可在 `/admin/system-settings` 关闭)
3. **CLI**
   - `php artisan mail:sync` 全部
   - `php artisan mail:sync --account=<id>` 单账户
   - `php artisan mail:sync --dispatch-jobs` 派发到队列(`mail-sync` connection)

#### 2.5 任务模型

```php
namespace Gz168\Mail\Jobs;

class SyncMailAccountJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $queue = 'mail-sync';
    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public int $mailAccountId,
        public string $trigger,           // manual | scheduled | command
        public ?int $createdByUserId = null,
    ) {}

    public function handle(MailAccountSyncService $service): void
    {
        $service->syncAccount(
            MailAccount::findOrFail($this->mailAccountId),
            MailSyncTrigger::from($this->trigger),
            $this->createdByUserId,
        );
    }
}
```

#### 2.6 Service 编排

```text
src/Services/
├── MailAccountSyncService.php      // 主入口:写 mail_fetch_runs、调 IMAP client、回写账户 last_synced_at / last_error
├── MailSyncScheduleResolver.php    // 全局 vs 账户覆盖
├── GmailImapClient.php             // webklex/php-imap + XOAUTH2
└── QqImapClient.php                // webklex/php-imap + 授权码
```

接口:

```php
interface MailAccountSyncServiceInterface
{
    public function syncAccount(MailAccount $account, MailSyncTrigger $trigger, ?int $userId = null): MailSyncRun;
}

interface MailImapClientInterface
{
    /** @return iterable<array{uid:string, headers:array, body_html:?string, body_text:?string, attachments:array}> */
    public function fetchHeaders(string $folder, ?int $sinceUid = null): iterable;
    public function fetchBody(string $folder, string $uid): RawMessage;
    public function markSeen(string $folder, string $uid): void;
}
```

`MailAccountSyncService::syncAccount` 流程:

1. 创建 `MailSyncRun(status=running, started_at=now)`
2. 解析 effective folders / interval(不阻塞;只校验 interval_minutes ≥ 1)
3. 调用对应 provider 的 `MailImapClient` → 按 UID 增量拉取(记录上次最大 UID 到 `mail_accounts.last_max_uid[folder]` 或单独的 `mail_sync_cursors` 表;阶段 2 用 `mail_accounts` JSON 列简化)
4. 解析 `webklex/php-imap` 结果 → upsert 到 `mail_messages`(按 `(account_id, folder, remote_uid)` 唯一)
5. 关闭 IMAP 连接,更新 `MailSyncRun`(status / duration / counts)
6. 回写 `mail_accounts.last_synced_at`;失败时 `last_error` + `status=error`

#### 2.7 调度注册

在 `MailServiceProvider::boot()` 末尾追加,与现有项目一致:

```php
$this->app->booted(function (): void {
    if (! $this->app->runningInConsole()) {
        return;
    }

    $schedule = $this->app->make(Schedule::class);

    $schedule->command('mail:sync')
        ->everyFiveMinutes()
        ->withoutOverlapping(10)
        ->runInBackground()
        ->when(fn (): bool => (bool) config('mail.sync.auto_enabled', true));
});
```

> 频率写死 `everyFiveMinutes()` 是为了与 `config('mail.sync.default_interval_minutes')` 的常见值对齐;账户级覆盖由 `MailAccountSyncService` 内部 `shouldRunNow()` 判定,不产生多条调度条目。

`MailAccountSyncService::shouldRunNow(MailAccount $account): bool`:

```php
$interval = $this->resolver->intervalMinutes($account);
$last = $account->last_synced_at;

return $last === null || $last->lt(now()->subMinutes($interval));
```

`mail:sync` 命令对每个 `sync_enabled=true` 的账户调用 `shouldRunNow()`,跳过未到期账户,降低 IMAP 连接次数。

#### 2.8 后台 UI

新增 `MailAccountSyncRunResource`(只读):

- 列表字段:mail_account.email_address、trigger、status、started_at、duration_ms、messages_inserted、error_summary 截断
- 筛选:trigger、status、mail_account_id、started_at 区间
- 不允许编辑/删除(只读历史)

`MailAccountResource` 增加 Action:

- `sync` 行级 Action → 派发 `SyncMailAccountJob(trigger=manual)`,Toast 提示"已派发,可在同步历史查看进度"
- `sync` Header Action → 派发所有 active 账户
- 列表 badge 显示 `last_synced_at`(since 格式)

#### 2.9 API

```text
POST /api/admin/mail/accounts/{id}/sync           手动同步(派发 Job,返回 run_id)
POST /api/admin/mail/accounts/sync-all            全部同步
GET  /api/admin/mail/accounts/{id}/sync-runs      同步历史分页
GET  /api/admin/mail/sync-runs/{id}              单次同步详情(含 error_context)

GET  /api/admin/mail/accounts/{id}/messages      邮件列表(按 folder)
GET  /api/admin/mail/messages/{id}               邮件详情
```

`POST .../sync` 同步派发,不等待完成:

```json
{
  "data": {
    "run_id": 123,
    "queued_at": "2026-08-02T10:30:00Z",
    "trigger": "manual"
  },
  "message": "同步任务已派发"
}
```

#### 2.10 测试

- 单元:`MailSyncScheduleResolver` 全局默认 / 账户覆盖 / 账户关闭 / 边界值
- 集成:
  - 单账户同步成功 → 写入 `mail_fetch_runs` 与 `mail_messages`,账户 `last_synced_at` 更新
  - IMAP 抛错 → `MailSyncRun.status=failed`,`last_error` 写入摘要,凭据永不进 error_context
  - Job 重试 3 次后仍失败 → `status=failed`,不再重试
  - 后台手动派发 `sync` Action → 创建 `trigger=manual` + `created_by=actor_id` 的 run
  - 调度触发 → 创建 `trigger=scheduled` 且 `created_by=null` 的 run
  - `withoutOverlapping` 锁:同账户短时间内两次手动派发,第二次直接命中 `shouldRunNow=false` 或被 `withoutOverlapping` 拦截
  - QQ 授权码错误时,error_summary 只含"鉴权失败",不含授权码本身

#### 2.11 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 调度 + 手动并发触发导致同账户双跑 | `withoutOverlapping(10)` + Job 内 `sync_enabled` 与 `shouldRunNow` 双重判定 |
| QQ 邮箱 IMAP 频繁连接触发风控 | 默认 5 分钟、`batch_size=50`、单连接多 folder 复用 |
| Gmail XOAUTH2 access token 过期 | 每次拉取前现取现用,失败时重新走 refresh_token |
| 同步历史表膨胀 | `prune_runs_days` 默认 30 天;`MailPruneSyncRunsCommand` weekly 清理 |
| `webklex/php-imap` 与 PHP 8.5 | 阶段 2 实施前先在分支里 `composer require` 验证 |

#### 2.12 验收

阶段 2 完成后必须跑:

```shell
php bin/check-gz168-coupling.php
php artisan test --compact gz168/Mail/tests
php artisan test --compact
vendor/bin/pint --dirty --format agent
composer validate --no-check-publish
```

并人工验证:

1. 后台"邮箱账户"列表点 `sync` → "同步历史"出现新行,status=success,messages_inserted ≥ 0
2. 关闭 `system-settings` 的 `mail.sync.auto_enabled` → scheduler:list 中 `mail:sync` 标记 `skipped`
3. 临时改坏 QQ 授权码再触发同步 → 账户 `status=error`,`last_error` 不含明文授权码

### 阶段 3 — 发送(已落地)

- `MailSenderInterface::send(MailAccount $from, array $data)` 统一发送契约
- `MailSendService` 按 provider 路由;发送前校验 `isAuthorized()`
- `GmailSender`:Gmail REST API(`gmail/v1/users/me/messages/send`),access token 由 `GmailTokenService`(与 IMAP 共享)按账户 refresh token 换取;**未委托** `GmailApi` 模块(该模块读 `config('gmail-api.*')` 单发件人,与多账户模型不兼容,保持不变)
- `QqMailer`:Symfony Mailer `EsmtpTransport`(smtp.qq.com:465/SSL,可配 `QQ_SMTP_*`),授权码取 `smtp_password`(回退 `imap_password`),解密后仅用于传输层,不落日志
- API:`POST /api/admin/mail/send`(account_id + to/subject/body/html/cc)
- Filament:行级「发送测试邮件」Action(需 `mail.send` 权限)
- `GmailApi` 模块保留不变;是否标记 deprecated 由用户后续决定

验证:模块测试 59/59(224 断言)通过;Mail 模块 0 边界违规;pint / composer validate 通过。

### 懒加载与增量同步(2026-08-29 第二批)

- **正文懒加载**:`MailImapClientInterface` 拆分 header-only 拉取(列表同步不再拉正文,`setFetchBody(false)`)与 `fetchBody(folder, uid)` 按需取正文;重复逻辑收敛到 `AbstractWebklexImapClient` 基类,Gmail/Qq 子类只提供连接配置
- **增量游标**:`mail_accounts.sync_cursors` JSON 列按 folder 记录 `last_uid`,同步时 `sinceUid` 增量拉取(注意:未处理 IMAP UIDVALIDITY 变化,v2 的 `mail_sync_states` 表已覆盖该场景)
- **body 保护**:header 同步 upsert 时不覆盖已懒加载的正文
- **后台阅读界面**:只读 `MailMessageResource`(列表 + 详情);正文 HTML 属不可信内容,详情页用 `sandbox=""` iframe 渲染(无脚本/表单/导航);View 页与 API `GET /mail/messages/{id}` 首次查看时自动懒拉正文(失败降级为已存内容)
- 与 MailAccountResource 现状一致,`MailMessageResource` 不注册导航,入口为账户行级「收件箱」Action

### API Client SDK 同步(2026-08-29 第六批)

- `packages/api-client` 新增 `domain/mail` 子域(`createMailApi(http, { getToken })`),覆盖 v1 全部 admin API:账户 CRUD/默认/状态、Gmail OAuth URL、QQ 授权码、同步触发与历史、消息列表/详情/标记已读、附件下载 URL、JSON 发送与 FormData 附件上传
- 认证与 customer 域不同:mail 走 `admin_user` JWT,`getToken()` 由调用方注入,每请求自动附加 `Authorization: Bearer`
- 手写 `.d.ts` 类型(与 API 响应一一对应),主入口 `createApiClient({ baseUrl, getToken })` 挂载 `client.mail`;`package.json` exports 增加 `@erp/api-client/domain/mail`
- smoke 验证:Bearer 注入、路径拼接、无 token 不加头、主入口挂载;tsc `--noEmit` 通过

### 附件(2026-08-29 第五批)

- **收件附件**:`mail_message_attachments` 表(message 级 cascade,`(message_id, filename)` 唯一);`fetchAttachments(folder, uid)` 按需拉取,`fetchAndStoreAttachments` 幂等下载到 `MAIL_ATTACHMENTS_DISK`(默认 local 的 `mail-attachments/{message_id}/`);打开详情页时随正文一并懒拉
- **下载路由**:API `GET /api/admin/mail/attachments/{id}/download`(JWT admin)+ web `/mail/attachments/{id}/download`(session + 服务端 `mail.view` 权限校验);详情页附件区带下载链接
- **发件附件**:API `attachments[]` 文件上传(≤5 个、单个 ≤10MB);Gmail 走 `multipart/mixed` raw 构造,QQ 走 Symfony `Email::attach()`;发送成功后附件元数据随 Sent 记录归档(`has_attachments` + 附件行;归档行为元数据,不支持再下载)
- 附件正文下载属重操作,仅在打开详情时按需执行,列表同步保持 header-only

### Token 缓存、设置落盘与失败告警(2026-08-29 第四批)

- **access token 缓存**:`GmailTokenService` 以 `mail_gmail_token:{credential_id}` 缓存 access token,TTL = `expires_in - 60s`(安全窗口);IMAP 同步与 Gmail 发送共用,减少 token 端点配额消耗;`forget()` 供授权变更时主动失效
- **#11 调度开关落盘**:`MailSyncSettingsRepository`(参照 DatabaseBackup 模式,模块自治 JSON 文件 `storage/app/mail/settings.json`),Provider boot 时覆盖 `mail.sync.auto_enabled`;后台列表页 Header「自动同步:开/关」Action 可切换
- **#12 连续失败告警**:同一账户连续失败达 `MAIL_SYNC_ALERT_CONSECUTIVE_FAILURES`(默认 3)次时,向持有 `mail.view` 权限的用户发送 database 通知(后台铃铛可见,`via('database')` + queue);仅在达到阈值的**那一次**发送,后续失败不重复;告警判定在 sync run 落库之后执行以保证计数准确;用户模型经 `config('auth.providers.users.model')` 解析,不硬依赖宿主 User

### 发件归档、标记同步与限流(2026-08-29 第三批)

- **发件记录落库(#5)**:发送成功后归档到 `mail_messages`(folder=`Sent`),`message_id` 存 Gmail 返回 ID;QQ 无远端 ID。复用现有邮件表与阅读界面,无新迁移;失败不归档
- **标记已读双向同步(#9)**:`markSeen(folder, uid)` 走 webklex `setFlag('Seen')` 回写 IMAP 服务器,本地 `is_read` 在服务器成功后才更新;API `POST /mail/messages/{id}/seen` + 详情页「标记已读」按钮
- **发送限流(#10)**:命名限流器 `mail-send`(默认 30 次/分钟/IP,`MAIL_SEND_RATE_LIMIT` 可配,0 关闭),`POST /api/admin/mail/send` 已挂 `throttle:mail-send`
- 后台账户行级新增「已发送」入口(按账户 + folder=Sent 过滤)

### 关键修复(2026-08-29)

1. **Gmail IMAP OAuth scope 更正**:授权 scope 由 `gmail.send + gmail.readonly` 改为 `https://mail.google.com/`(Google 仅接受此全量 scope 用于 IMAP XOAUTH2;granular scope 会在 IMAP 认证时报 `AUTHENTICATE failed`)。**已有 Gmail 授权的账户需重新走一次「配置 Gmail 授权」**。
2. **dev 队列监听**:`composer dev` 的 worker 由 `queue:listen` 改为 `queue:listen --queue=mail-sync,default`,否则后台手动同步派发的 Job 永远 pending。
3. **权限落库**:`mail.*` 6 条权限进入 `PermissionSeeder` 并已对 dev 库执行;宿主新增 `tests/Feature/MailPermissionsSeederTest.php`(落库/幂等/admin 角色授予)。

## 4.5 部署与配置清单(阶段 1-3 汇总)

### 迁移与权限

```shell
php artisan migrate                                                  # mail_accounts / credentials / messages / sync_runs / attachments
php artisan db:seed --class="Gz168\\RolePermission\\Database\\Seeders\\PermissionSeeder"  # mail.* 6 条权限(幂等)
```

### 环境变量(全部可选,括号为默认值)

| 变量 | 说明 |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 客户端凭据(收发共用) |
| `GOOGLE_MAIL_REDIRECT_URI` | OAuth 回调(默认 `APP_URL/api/mail/gmail/oauth/callback`) |
| `QQ_SMTP_HOST` / `QQ_SMTP_PORT` / `QQ_SMTP_ENCRYPTION` | QQ 发送(默认 smtp.qq.com:465/ssl) |
| `MAIL_SYNC_AUTO_ENABLED` | 自动同步初始开关(false;后台「自动同步」开关覆盖并持久化) |
| `MAIL_SYNC_INTERVAL_MINUTES` | 全局默认间隔(5 分钟;账户可覆盖) |
| `MAIL_SYNC_FOLDERS` | 同步文件夹(默认 INBOX,逗号分隔) |
| `MAIL_SYNC_BATCH_SIZE` / `MAIL_SYNC_TIMEOUT` | 批量(50)/ 连接超时(30s) |
| `MAIL_SYNC_RUNS_RETENTION_DAYS` | 同步历史保留天数(30) |
| `MAIL_SYNC_ALERT_CONSECUTIVE_FAILURES` | 连续失败告警阈值(3;0 关闭) |
| `MAIL_SEND_RATE_LIMIT` | 发送限流 次/分钟/IP(30;0 关闭) |
| `MAIL_ATTACHMENTS_DISK` / `MAIL_ATTACHMENTS_DIR` | 附件存储盘/目录(local / mail-attachments) |

### 运行要求

- 队列 worker 必须消费 `mail-sync` 队列:`php artisan queue:listen --queue=mail-sync,default`(composer dev 已含)
- 调度器:`php artisan schedule:run`(cron 每分钟);自动同步开关在后台「邮箱账户」页 Header
- Gmail 账户授权 scope 为 `https://mail.google.com/`(IMAP XOAUTH2 唯一可用),已授权账户换 scope 后需重新授权

## 4.8 v1/v2 双轨收敛(2026-08-29)

已确认分工共存:**v2 拆分包(gz168/MailAdmin 等)主管后台 UI 与自动同步;v1(gz168/Mail)主管 API + SDK**。

落地变更:

1. **v1 Filament 资源默认退出**:三个资源(账户/收件/同步历史)挂 `GateFilamentAccess`,`mail.filament_resources_enabled`(env `MAIL_FILAMENT_RESOURCES_ENABLED`)默认 false 时全部拒绝访问;slug 改为 `v1-mail-accounts` / `v1-mail-messages` / `v1-mail-sync-runs`,与 v2 的 `mail-center-accounts` 等入口彻底错开
2. **v1 自动调度默认关闭**:`mail.v1_scheduler_enabled`(env `MAIL_V1_SCHEDULER_ENABLED`,默认 false)总闸;自动同步由 v2 的调度负责
3. **v1 保留**:全部 REST API、`packages/api-client` SDK、附件、手动同步、失败告警、`mail:sync` 命令(手动可用)
4. 事实澄清:v2 账户资源 slug 为 `mail-center-accounts`,与 v1 之间从未发生路由 slug 冲突;收敛主要消除的是"双调度器可能对同一账户重复拉取"与入口歧义

## 4.9 新功能四件套(2026-08-30,已真实联调)

在 QQ 真实账户(150 封邮件)上完成端到端验证后落地:

| 功能 | 端点 | 要点 |
| --- | --- | --- |
| 验证码/OTP 提取 | `GET /mail/accounts/{id}/otp?from=&subject=&ttl=` | **只接受标注验证码**(验证码/code/otp/pin/口令,双语序);真实邮箱联调证明数字兜底必然误报(收件人 ID/URL app ID/营销数字),已全部移除;收件人自身标识永久排除 |
| 邮件搜索 | `GET /mail/messages?q=` | subject/from/snippet/body_text 多字段 LIKE;规模到万级再评估 FULLTEXT |
| 新邮件 Webhook | `mail_webhook_endpoints` CRUD + 自动推送 | HMAC-SHA256 签名覆盖原始 body(`X-Gz168-Mail-Signature`);4xx 不重试,5xx/网络异常队列重试(3 次);**派发在消息事务之外**,投递失败绝不回滚已存储邮件;secret 仅创建时返回明文 |
| 模板化发送 | `POST /mail/send-template` | 内置 `generic-notification`(段落+按钮)/`simple-report`(键值报表)Blade 模板;白名单渲染,禁止渲染模块外视图;复用限流与 Sent 归档 |

SDK(`packages/api-client` domain/mail)已同步全部新端点与类型。

运维提示:Webhook 投递走 `mail-sync` 队列,生产需保证 worker 在跑;delivery 停在 `pending` 即表示队列无消费者。

## 5. 安全要点

- QQ 授权码 / Gmail refresh_token 入库前必须经 `Crypt::encryptString`;数据库只存密文。
- API 响应、日志、`dd()` 全部只返回掩码(`****1234`)或不返回凭据字段。
- 不要把 `GOOGLE_*` / `QQ_*` 写入 commit、文档、测试 fixture(测试用 `config()->set()`)。
- OAuth `state` 仍使用 Redis 缓存(同 `GmailApi` 模式);`state` key 按账户 ID 加命名空间,避免跨账户重放。
- 公开回调端点只校验 state,不暴露账户列表或返回 token 明文,仅把 `refresh_token` 写库后返回"已绑定"。

## 6. 验证清单

完成任一阶段后必须跑:

```shell
# 模块边界
php bin/check-gz168-coupling.php

# 模块单元 + 集成
php artisan test --compact gz168/Mail/tests

# 宿主回归(确保没破坏其他模块)
php artisan test --compact

# 格式化
vendor/bin/pint --dirty --format agent

# Composer
composer validate --no-check-publish
```

新增依赖 `webklex/php-imap` 后必须再跑 `composer install` 与迁移 `php artisan migrate`。

## 7. 风险与依赖

| 风险 | 缓解 |
| --- | --- |
| `webklex/php-imap` 与 PHP 8.5 兼容 | 阶段 2 实施前先在分支里 `composer require` 验证 |
| QQ 邮箱 IMAP 频繁连接触发风控 | 复用同一连接拉多 folder,默认 5 分钟轮询,留配置开关 |
| Gmail OAuth client 被滥用跨账户 | state 按 `account_id` 加前缀,绑定到具体账户 |
| 现有 `GmailApi` 与新模块重复实现 Gmail 发送 | 阶段 3 通过委托去重,不在阶段 1/2 动 `GmailApi` |
| 加密 key 轮换 | 复用 Laravel `app.key`,暂不引入自定义密钥 |
| 调度 + 手动并发触发同账户 | `withoutOverlapping(10)` + `MailSyncScheduleResolver::shouldRunNow` 双重防护 |
| 同步历史表膨胀 | `mail.sync.prune_runs_days` 默认 30 天 + `MailPruneSyncRunsCommand` weekly 清理 |

## 8. 已确认决策

下列项已与用户确认,阶段 1 已按此落地:

1. **模块命名**:`gz168/Mail`(Composer 包 `gz168/mail`,命名空间 `Gz168\Mail`,alias `mail`)。
2. **Gmail OAuth 凭据**:迁移到模块自有 `config/mail.php`(读 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_MAIL_REDIRECT_URI`)。`GmailApi` 模块**不变**,继续读 `config('gmail-api.*')`;两者共用同一对 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` 环境变量,但分别持久化到自己的 config key。
3. **`is_default` 全局唯一**:service 层事务 + 条件 UPDATE,DB 不加特殊索引(`MailAccountService::setDefault`)。
4. **权限 slug**:`mail.view` / `mail.create` / `mail.edit` / `mail.delete` / `mail.authorize` / `mail.send`(共 6 条)。**已加入** `RolePermission` 的 `PermissionSeeder`(`syncAdminRolePermissions` 会同步授予 `admin` 角色),dev 库已执行落库。
5. **凭据加密**:使用 Laravel 内置 `encrypted` cast(`oauth_refresh_token` / `imap_password` / `smtp_password`)。响应统一返回掩码(`********1234`),不返回明文。
6. **Gmail `state` key 命名空间**:`mail_oauth_state:{account_id}:{state}`,按账户隔离,避免跨账户重放。

阶段 1 实施完成,验证通过(模块测试 21/21,宿主测试 18/18,边界 305 文件 23 模块合规,pint dirty 通过)。