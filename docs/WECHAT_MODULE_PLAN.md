# 微信功能模块 (gz168/Wechat) 全量设计文档

> 本文档为 `gz168/Wechat` 模块家族的全量设计，覆盖微信生态全部本期目标能力，替代早期只含"账户 + 登录 + 支付骨架"的范围稿。代码在后续会话按本设计分阶段落地。

## 1. 背景与目标

### 1.1 现状

微信能力目前分散在多处，没有统一模块：

| 位置 | 现状 | 问题 |
| --- | --- | --- |
| `gz168/Customer` | `WxAuthService` 硬编码单 appid 调 `jscode2session`（`config('customer.wx.*')`），客户表已有 `wx_openid` / `wx_unionid` | 只支持单个小程序；微信 API 调用逻辑困在 Customer 模块内，无法复用 |
| `gz168/MallCore` + `gz168/MallPayment` | `PaymentGatewayContract`（createIntent / capture / cancel / refund / query），只有 `MockPaymentGateway`；Mock 注释明确预告 "real adapters (stripe/wechat/alipay)" | 无真实微信支付网关 |
| `gz168/Crm` | `FollowUpType::Wechat` 枚举（跟进渠道） | 仅记录用，无实际集成 |
| `apps/miniapp` | Taro 微信小程序前端 | 后端仅登录可用，支付 / 消息推送均缺失 |

全仓没有任何 access_token 管理、多应用（多 appid）管理、微信支付回调处理、消息推送、公众号能力。

### 1.2 能力全景矩阵

本期目标：**微信生态全部目标能力都要实现**。按下表逐项交付（阶段定义见 §4）：

| # | 微信能力 | 承载模块 | 阶段 |
| --- | --- | --- | --- |
| 1 | 小程序登录 code2session | WechatMiniProgram | 1 |
| 2 | 小程序手机号解析 getPhoneNumber | WechatMiniProgram | 1 |
| 3 | access_token 稳定令牌（stable_token + Redis） | WechatApp | 1 |
| 4 | 多应用（多 appid / 多类型）统一管理与凭据加密 | WechatApp | 1 |
| 5 | 支付下单 JSAPI / Native / H5 / APP、查询、关闭 | WechatPay | 2 |
| 6 | 支付回调（平台证书验签 + resource 解密 + 幂等） | WechatPay | 2 |
| 7 | 退款申请 + 退款回调 | WechatPay | 2 |
| 8 | 交易账单 / 资金账单下载 + 对账 | WechatPay | 2 |
| 9 | Mall 支付网关桥接（`PaymentGatewayContract`） | WechatMallPay | 2 |
| 10 | 小程序订阅消息（授权记录 + 发送） | WechatMiniProgram + WechatNotify | 3 |
| 11 | 小程序客服消息 | WechatMiniProgram | 3 |
| 12 | 跨渠道通知编排、发送日志、失败重试 | WechatNotify | 3 |
| 13 | 公众号网页授权 OAuth2（snsapi_base / userinfo） | WechatOfficialAccount | 4 |
| 14 | 公众号用户信息 / 标签 / 黑名单 | WechatOfficialAccount | 4 |
| 15 | 公众号自定义菜单（创建 / 删除 / 查询当前） | WechatOfficialAccount | 4 |
| 16 | 公众号模板消息 | WechatOfficialAccount + WechatNotify | 4 |
| 17 | 公众号客服消息 | WechatOfficialAccount | 4 |
| 18 | 公众号消息 / 事件回调（明文 / AES 加解密、MsgId 去重、事件分发） | WechatOfficialAccount | 4 |
| 19 | 公众号素材管理（临时 / 永久媒体上传下载） | WechatOfficialAccount | 4 |
| 20 | 公众号带参二维码（临时 / 永久） | WechatOfficialAccount | 4 |
| 21 | 公众号群发（按标签 / openid 列表，含内容安全前置） | WechatOfficialAccount | 4 |
| 22 | JS-SDK 签名（jsapi_ticket + config 包） | WechatOfficialAccount | 4 |
| 23 | 内容安全 msgSecCheck / mediaCheck | WechatMiniProgram | 5 |
| 24 | 小程序码 getUnlimited / URL Link / URL Scheme | WechatMiniProgram | 5 |
| 25 | 小程序数据统计（日活 / 访问页 / 留存） | WechatMiniProgram | 5 |
| 26 | 开放平台网站扫码登录 qrconnect / App 登录（unionid） | WechatOpenPlatform | 5 |
| 27 | 商家转账到零钱（转账批次发起 / 查询 / 回单） | WechatPay | 5 |

**本期明确不做**（如需再立扩展设计）：

- 企业微信（WeCom）——独立产品线，账号体系与 API 均不同。
- 服务商 / 特约商户（partner transactions）模式、分账（profit sharing）、红包。
- 视频号 / 微信小店 / 视频号橱窗带货 API。
- 小程序第三方平台（代开发 / 托管第三方）。
- 公众号粉丝列表定期全量同步入库（按需实时调用 API，见 §2.6 决策）。

### 1.3 约束

- 不改变客户表 `wx_openid` / `wx_unionid` 的存储位置（仍属 Customer 模块领域模型）。
- Mall 支付域：`mall_payments` 仍是订单侧流水；微信侧交易明细由微信家族自己的表记录（§2.5）。
- 遵循 `docs/AI_DEVELOPMENT.md` 模块化强约束与 `docs/GZ168_MODULE_ARCHITECTURE.md` 的模块规范。

## 2. 架构决策

### 2.1 模块边界与家族拆分

参照 `Mail` 家族（MailContracts / MailAccount / MailGmail / ...）的拆分先例，按"契约 — 基础 — 渠道 — 编排 — 桥接"拆分：

| 模块 | Composer 包名 | alias | 职责 |
| --- | --- | --- | --- |
| `WechatContracts` | `gz168/wechat-contracts` | `wechat-contracts` | 全部接口契约、Enum、DTO、跨模块事件；只依赖 `gz168/common` |
| `WechatApp` | `gz168/wechat-app` | `wechat-app` | 应用账户 CRUD、凭据加密、access_token / jsapi_ticket 管理、Admin API、Filament 资源、模块配置 |
| `WechatMiniProgram` | `gz168/wechat-mini-program` | `wechat-mini-program` | 小程序服务端全量 API：登录、手机号、订阅消息、客服消息、内容安全、小程序码 / 短链、数据统计 |
| `WechatOfficialAccount` | `gz168/wechat-official-account` | `wechat-official-account` | 公众号全量 API：OAuth、用户 / 标签、菜单、模板 / 客服 / 群发消息、素材、二维码、JS-SDK 签名、消息事件回调 |
| `WechatPay` | `gz168/wechat-pay` | `wechat-pay` | 微信支付 v3 全量：下单 / 查询 / 关闭 / 退款 / 商家转账 / 账单对账、回调验签、商户配置、交易明细表 |
| `WechatMallPay` | `gz168/wechat-mall-pay` | `wechat-mall-pay` | Mall 桥接：实现 `MallCore\PaymentGatewayContract`，委托 `WechatPay` |
| `WechatNotify` | `gz168/wechat-notify` | `wechat-notify` | 跨渠道通知编排（路由到订阅消息 / 模板消息）、订阅授权记录表、发送日志表、队列重试、清理 |
| `WechatOpenPlatform` | `gz168/wechat-open-platform` | `wechat-open-platform` | 开放平台网站扫码登录 / App 登录，产出 openid + unionid 并派发事件，由宿主决定绑定关系 |

**关键点**：

- `WechatMallPay` 是唯一知道 Mall 存在的微信模块；`MallPayment` / `MallCore` 完全不感知微信。
- `WechatNotify` 只依赖契约与渠道接口（容器 tag 解析），不直接依赖 `WechatMiniProgram` / `WechatOfficialAccount`（§2.7）。
- 只用微信登录的部署不需要安装 `wechat-pay` / `wechat-mall-pay` / `wechat-notify`；只用支付不需要公众号模块。模块粒度即部署粒度。

### 2.2 依赖方向

```text
WechatMallPay (Mall 桥接)
├── gz168/wechat-pay
└── gz168/mall-core

WechatNotify (编排)
├── gz168/wechat-contracts
└── gz168/wechat-app

WechatOpenPlatform
├── gz168/wechat-contracts
└── gz168/wechat-app

WechatPay
├── gz168/wechat-contracts
└── gz168/wechat-app

WechatMiniProgram
├── gz168/wechat-contracts
└── gz168/wechat-app

WechatOfficialAccount
├── gz168/wechat-contracts
└── gz168/wechat-app

WechatApp
├── gz168/wechat-contracts
├── gz168/common
├── gz168/filament
├── gz168/role-permission
└── gz168/api-auth

WechatContracts
└── gz168/common

Customer (已有模块，追加依赖)
└── gz168/wechat-mini-program
```

全部单向、无环。`bin/check-gz168-coupling.php` 必须保持 0 违规；新增模块的 `composer.json` 与 `module.json` 的 `requires` 必须一致。

### 2.3 第三方 SDK 与核心协议

| 事项 | 决策 |
| --- | --- |
| SDK | 推荐 `w7corp/easywechat` 6.x 统一覆盖小程序 / 公众号 / 支付 v3，作为 Infrastructure 适配器；**实施前先在分支 `composer require` 验证 PHP 8.5 + Laravel 13 兼容**（同 Mail 模块对 `webklex/php-imap` 的先例）。不兼容则降级：支付用官方 `wechatpay/wechatpay-php`、公众号 / 小程序用 `Illuminate\Support\Facades\Http` 自研（接口契约不变，替换仅限 Infrastructure 层） |
| access_token | 小程序 / 公众号统一走 `getStableAccessToken`（官方稳定接口，免自行刷新调度）；Redis 缓存 key `wechat:access_token:{app_id}`，TTL = `expires_in` − 300s；取值用 `Cache::lock` 原子锁防并发重复请求；连续失败写 `wechat_apps.last_error` 并熔断（10 分钟内不重试） |
| jsapi_ticket | key `wechat:jsapi_ticket:{app_id}`，与 access_token 同策略；签名算法 `sha1(jsapi_ticket=...&noncestr=...&timestamp=...&url=...)` |
| 支付签名 | APIv3：商户私钥（RSASSA-PKCS1-v1_5）签名请求；微信平台证书 / 公钥验签回调；平台证书自动下载，Redis 缓存 key `wechat:platform_certs:{mch_id}`，定期轮换 |
| 支付回调 | 公开端点（§2.8），只验签不鉴权（同 Mail 的 `gmail/oauth/callback` 公开端点先例）；以 `out_trade_no` / `out_refund_no` 幂等；成功返回 `{"code":"SUCCESS"}`，验签失败 401 且不回显原因细节 |
| 公众号回调 | 支持 明文 / 兼容 / 安全 三种加密模式（配置选择）；`echostr` 首次校验按微信规则解密比对；消息推送 `MsgId` 去重（事件消息用 `FromUserName + CreateTime + Event` 组合去重），重复推送直接返回成功 |
| 凭据加密 | Laravel `encrypted` cast（同 Mail 已确认决策）；`app_secret` / `api_v3_key` / 商户私钥 PEM / 公众号 `aes_key` 只存密文；API 响应返回掩码 `****` 尾 4 位；日志、异常、`dd()` 禁止明文 |
| OpenID 与 UnionID | 小程序 openid、公众号 openid、开放平台 openid 三者不同，unionid 是跨端主键。客户表存的是小程序 openid；公众号 openid / 开放平台 openid 不落客户表，只出现在微信家族自有表（授权记录、回调消息、发送日志）中，业务侧需要打通时监听 `WechatUserAuthorized` 事件自行绑定 |

### 2.4 契约清单（`gz168/WechatContracts/src/Contracts/`）

按能力域拆小接口，便于测试与替换：

```php
// 基础
interface WechatAppManagerInterface
{
    public function resolveByAppId(string $appId): WechatAppData;
    public function resolveDefault(WechatAppType $type): WechatAppData;
}

interface AccessTokenProviderInterface
{
    public function token(WechatAppData $app): string;
    public function jsapiTicket(WechatAppData $app): string;
}

// 小程序
interface MiniProgramAuthInterface
{
    /** @return array{openid: string, unionid: ?string, session_key: ?string}|null */
    public function codeToSession(string $appId, string $code): ?array;

    public function phoneNumber(string $appId, string $code): ?string;
}

interface MiniProgramToolInterface
{
    public function unlimitedCode(WechatAppData $app, array $params): string;   // 返回存储后的 URL
    public function urlLink(WechatAppData $app, array $params): ?string;
    public function urlScheme(WechatAppData $app, array $params): ?string;
    public function dailyStats(WechatAppData $app, string $date): ?array;       // 日活/访问页/留存
}

interface ContentSecurityInterface
{
    public function checkMessage(WechatAppData $app, string $openid, string $content, int $scene = 2): ContentSecurityResult;
    public function checkMedia(WechatAppData $app, string $mediaUrl, int $scene = 2): ContentSecurityResult; // 异步，轮询结论
}

// 公众号（按域合并为 4 个契约）
interface OaAuthInterface
{
    public function redirectUrl(WechatAppData $app, string $callbackUrl, string $scope, ?string $state = null): string;
    /** @return OaUserSession{openid, unionid, nickname, headimgurl, ...}|null */
    public function userByCode(WechatAppData $app, string $code): ?array;
}

interface OaUserInterface
{
    public function userInfo(WechatAppData $app, string $openid): ?array;
    public function tags(WechatAppData $app): array;
    public function tagUsers(WechatAppData $app, int $tagId, ?string $nextOpenid = null): array;
    public function blacklist(WechatAppData $app, ?string $nextOpenid = null): array;
}

interface OaContentInterface
{
    public function createMenu(WechatAppData $app, array $menu): bool;
    public function deleteMenu(WechatAppData $app): bool;
    public function currentMenu(WechatAppData $app): ?array;
    public function uploadMedia(WechatAppData $app, string $path, string $type, bool $permanent): array; // media_id 等
    public function downloadMedia(WechatAppData $app, string $mediaId): string;  // 返回存储后的 URL
    public function qrcode(WechatAppData $app, array $params): array;            // ticket / url / expire
}

interface OaMessageInterface
{
    public function template(WechatAppData $app, string $openid, string $templateId, array $data, ?string $page = null): WechatSendResult;
    public function customerService(WechatAppData $app, string $openid, array $message): WechatSendResult;
    public function massByTag(WechatAppData $app, int $tagId, array $message): WechatSendResult;
    public function massByOpenIds(WechatAppData $app, array $openids, array $message): WechatSendResult;
}

// 通知渠道（WechatNotify 编排的目标）
interface NotificationChannelInterface
{
    public function channel(): WechatChannel;                                    // mini_program_subscribe / oa_template / oa_customer_service / mp_customer_service
    public function supports(WechatNotification $notification): bool;
    public function send(WechatNotification $notification): WechatSendResult;
}

// 支付
interface PayTransactionInterface
{
    public function order(WechatMchData $mch, PayOrderRequest $request): PayOrderResult;   // jsapi/native/h5/app
    public function query(WechatMchData $mch, string $outTradeNo): PayQueryResult;
    public function close(WechatMchData $mch, string $outTradeNo): bool;
}

interface PayRefundInterface
{
    public function refund(WechatMchData $mch, PayRefundRequest $request): PayRefundResult;
}

interface PayTransferInterface
{
    public function transfer(WechatMchData $mch, PayTransferRequest $request): PayTransferResult; // 商家转账批次
    public function transferQuery(WechatMchData $mch, string $outBatchNo): PayTransferResult;
}

interface PayBillInterface
{
    public function tradeBill(WechatMchData $mch, string $date): string;         // 返回存储后的文件路径
    public function fundFlowBill(WechatMchData $mch, string $date): string;
}

interface PayNotifyVerifierInterface
{
    public function verifyTransaction(WechatMchData $mch, string $body, string $signature, string $serial, string $nonce, string $timestamp): ?PayNotifyResult;
    public function verifyRefund(WechatMchData $mch, string $body, string $signature, string $serial, string $nonce, string $timestamp): ?PayNotifyResult;
}
```

配套 DTO / Enum：`WechatAppData`、`WechatMchData`、`WechatAppType`、`WechatChannel`、`WechatNotification`、`WechatSendResult`、`ContentSecurityResult`、`PayOrderRequest/Result`、`PayNotifyResult` 等；跨模块事件：`WechatUserAuthorized`（OA OAuth / 开放平台登录成功）、`WechatOaMessageReceived`、`WechatOaEventReceived`、`WechatSubscribeGrantRecorded`。

业务模块只见契约与 DTO，不见 Eloquent 模型 —— 与 Mail 家族"service 统一入口、不直读 credentials 表"的边界一致。

### 2.5 数据模型（全量 8 张表）

集中在各所属模块 `database/migrations/`，按阶段创建，避免空跑迁移。

#### `wechat_apps`（阶段 1，WechatApp）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `name` | varchar(255) | 显示名（例 "商城小程序"） |
| `type` | enum `mini_program`,`official_account`,`mobile_app`,`open_platform` | 应用类型 |
| `app_id` | varchar(64) unique | 微信 AppID |
| `app_secret` | text nullable, encrypted | AppSecret |
| `token` | text nullable, encrypted | 公众号服务器验证 Token |
| `aes_key` | text nullable, encrypted | 公众号消息 EncodingAESKey |
| `is_default` | boolean | 同 type 内默认应用 |
| `status` | enum `active`,`disabled`,`error` | |
| `last_error` | text nullable | 最近错误摘要（脱敏） |
| `last_error_at` | timestamp nullable | 熔断窗口起点 |
| `remarks` | varchar(255) nullable | |
| `timestamps` | | |

#### `wechat_mch_accounts`（阶段 2，WechatPay）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `name` | varchar(255) | 显示名 |
| `mch_id` | varchar(32) unique | 商户号 |
| `api_v3_key` | text encrypted | APIv3 密钥 |
| `mch_serial_no` | varchar(64) | 商户 API 证书序列号 |
| `private_key` | text encrypted | 商户 API 私钥（PEM 文本入库，免证书文件部署） |
| `notify_url_override` | varchar(255) nullable | 覆盖默认回调地址 |
| `currency` | char(3) default `CNY` | |
| `status` | enum `active`,`disabled` | |
| `timestamps` | | |

`wechat_apps` 加列 `mch_account_id`（FK nullable）—— 该 appid 支付时使用的商户号。

#### `wechat_pay_transactions`（阶段 2，WechatPay）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `wechat_app_id` | FK → wechat_apps | 发起 appid |
| `mch_account_id` | FK → wechat_mch_accounts | 商户 |
| `trade_type` | enum `jsapi`,`native`,`h5`,`app` | 支付方式 |
| `out_trade_no` | varchar(64) unique | 商户单号（Mall 场景 = order_number） |
| `transaction_id` | varchar(64) nullable unique | 微信支付单号（回调后写入） |
| `amount` | unsignedInteger | 金额（分） |
| `currency` | char(3) | |
| `trade_state` | varchar(32) default `NOTPAY` | 微信侧状态原文（NOTPAY/SUCCESS/CLOSED/REFUND/...） |
| `payer_openid` | varchar(64) nullable | 支付者 openid |
| `paid_at` | timestamp nullable | |
| `closed_at` | timestamp nullable | |
| `idempotency_key` | varchar(128) nullable index | 调用方幂等键 |
| `order_source` | varchar(32) default `mall` | 来源系统标识 |
| `bill_state` | varchar(32) nullable | 对账结论 matched / missing_local / missing_remote / amount_mismatch |
| `reconciled_at` | timestamp nullable | |
| `raw_notify` | json nullable | 最近一次回调解密报文（脱敏后） |
| `timestamps` | | |

索引：`(mch_account_id, paid_at)`、`(trade_state)`、`(bill_state)`。

#### `wechat_refunds`（阶段 2，WechatPay）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `wechat_pay_transaction_id` | FK → wechat_pay_transactions | 原交易 |
| `out_refund_no` | varchar(64) unique | 商户退款单号 |
| `refund_id` | varchar(64) nullable unique | 微信退款单号 |
| `amount` | unsignedInteger | 退款金额（分） |
| `reason` | varchar(255) nullable | |
| `status` | enum `pending`,`processing`,`success`,`abnormal`,`closed` | |
| `refunded_at` | timestamp nullable | |
| `notify_payload` | json nullable | 退款回调解密报文（脱敏后） |
| `timestamps` | | |

#### `wechat_subscribe_grants`（阶段 3，WechatNotify）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `wechat_app_id` | FK → wechat_apps | |
| `openid` | varchar(64) | 用户小程序 openid |
| `template_id` | varchar(64) | 订阅模板 ID |
| `remaining_count` | unsignedInteger default 1 | 一次性订阅剩 1；长期订阅为大数 |
| `last_granted_at` | timestamp | |
| `expires_at` | timestamp nullable | |
| `timestamps` | | |

unique(`wechat_app_id`, `openid`, `template_id`)；发送成功扣减 `remaining_count`，为 0 时跳过并记 `skipped`。

#### `wechat_notify_logs`（阶段 3，WechatNotify）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `channel` | enum `mini_program_subscribe`,`oa_template`,`oa_customer_service`,`mp_customer_service`,`oa_mass` | 渠道 |
| `wechat_app_id` | FK → wechat_apps | |
| `to_openid` | varchar(64) | 接收者 |
| `template_id` | varchar(64) nullable | |
| `scene` | varchar(64) nullable | 业务场景标识（order_shipped 等） |
| `payload` | json | 发送内容（脱敏后） |
| `status` | enum `pending`,`sent`,`failed`,`skipped` | |
| `attempts` | unsignedInteger default 0 | |
| `error` | text nullable | 失败摘要（脱敏） |
| `sent_at` | timestamp nullable | |
| `notifiable_type` / `notifiable_id` | morph nullable | 关联业务对象 |
| `timestamps` | | |

索引：`(status, created_at)`、`(channel)`、`(wechat_app_id, to_openid)`。

#### `wechat_inbound_messages`（阶段 4，WechatOfficialAccount）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `wechat_app_id` | FK → wechat_apps | |
| `msg_type` | varchar(32) | text / image / event / ... |
| `from_openid` | varchar(64) | |
| `msg_id` | varchar(64) nullable | 消息去重（事件消息为 null，用组合键） |
| `event` | varchar(64) nullable | subscribe / CLICK / ... |
| `event_key` | varchar(255) nullable | |
| `content` | text nullable | 文本内容 |
| `received_at` | timestamp | |
| `dedupe_key` | varchar(128) nullable unique | MsgId 或事件组合键 |
| `created_at` | | 只写不改（无 updated_at） |

索引：`(wechat_app_id, received_at)`；按 `wechat.message.inbound_retention_days` 定期清理。

#### `wechat_transfer_records`（阶段 5，WechatPay）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `mch_account_id` | FK → wechat_mch_accounts | |
| `out_batch_no` | varchar(64) unique | 商户批次单号 |
| `batch_id` | varchar(64) nullable unique | 微信批次单号 |
| `appid` | varchar(64) | 发起 appid |
| `openid` | varchar(64) | 收款用户 openid |
| `user_name_encrypted` | text nullable | 收款用户实名（加密，强校验时必填） |
| `amount` | unsignedInteger | 金额（分） |
| `remark` | varchar(255) | 转账备注（用户可见） |
| `status` | enum `pending`,`processing`,`success`,`failed` | |
| `fail_reason` | varchar(255) nullable | |
| `finished_at` | timestamp nullable | |
| `timestamps` | | |

### 2.6 服务层分布

```text
gz168/WechatApp/src/Services/
├── WechatAppService.php            # 账户 CRUD + 默认应用切换（事务内条件 UPDATE）
├── WechatAppManager.php            # WechatAppManagerInterface 实现
└── StableAccessTokenProvider.php   # AccessTokenProviderInterface（stable_token + Redis + 锁 + 熔断）

gz168/WechatMiniProgram/src/Services/
├── MiniProgramAuthService.php      # MiniProgramAuthInterface
├── MiniProgramToolService.php      # MiniProgramToolInterface（小程序码落 Storage，返回 URL）
├── MiniProgramContentSecurityService.php
└── MiniProgramMessageService.php   # 订阅消息发送 + 客服消息（NotificationChannelInterface 实现 + 独立调用）

gz168/WechatOfficialAccount/src/Services/
├── OaAuthService.php               # 网页授权（state 存 Redis，key wechat:oa_state:{app_id}:{state}，TTL 300s）
├── OaUserService.php
├── OaContentService.php            # 菜单/素材/二维码（媒体落 Storage）
├── OaMessageService.php            # 模板/客服/群发（群发前置 ContentSecurityInterface 校验）
├── OaCallbackCrypto.php            # 回调加解密 + echostr 校验 + 去重
├── OaJsSdkService.php              # jsapi_ticket + config 签名包
└── OaTemplateChannel.php           # NotificationChannelInterface 实现

gz168/WechatPay/src/Services/
├── WechatPayTransactionService.php # 下单/查询/关闭 + wechat_pay_transactions 落库
├── WechatPayRefundService.php
├── WechatPayTransferService.php    # 阶段 5
├── WechatPayBillService.php        # 账单下载（Storage 磁盘）+ 对账比对
├── WechatPayNotifyService.php     # 验签 + 解密 + 幂等状态机 + 事件
└── PlatformCertificateStore.php    # 平台证书下载缓存

gz168/WechatMallPay/src/Services/
└── WechatPayGateway.php            # implements MallCore\PaymentGatewayContract

gz168/WechatNotify/src/Services/
├── WechatNotifyRouter.php          # 按 NotificationChannelInterface tag 解析渠道实现
├── SubscribeGrantRecorder.php      # 授权记录 + 扣减
└── NotifyLogService.php            # wechat_notify_logs 写入与查询

gz168/WechatOpenPlatform/src/Services/
└── OpenPlatformAuthService.php     # qrconnect / App 登录 code 换 token+userinfo
```

#### Customer 模块接入（阶段 1）

- `Customer\WxAuthService::exchangeCode()` 的 HTTP 直调逻辑**整体迁出**为 `MiniProgramAuthService`；`WxAuthService` 改为构造注入 `MiniProgramAuthInterface`。
- 凭据来源不变：仍读 `config('customer.wx.app_id' / 'app_secret')`，appId 由调用方传入；多应用场景（读 `wechat_apps` 表）是后续增强，不改接口。
- Customer 的 `composer.json` / `module.json` 追加 `gz168/wechat-mini-program`；既有测试（含 `wx_code_exchange_failed` 日志路径）全部保持通过为准入条件。

#### Mall 支付桥接（阶段 2）

`WechatPayGateway` 与 `MockPaymentGateway` 同构，五方法映射：

| 契约方法 | 微信支付 v3 对应 | 落库 |
| --- | --- | --- |
| `createIntent` | `/v3/pay/transactions/jsapi` 或 `/native`（按配置/场景选择；H5、APP 同理）；`out_trade_no = order_number`；`idempotencyKey` 命中已存在交易直接返回（同 Mock 语义）；`checkoutPayload` 携带 `prepay_id` 拼装的 `wx.requestPayment` 参数或 `code_url` | 写 `wechat_pay_transactions`（`order_source=mall`） |
| `capture` | JSAPI / Native 为用户主动支付：`query` 确认 `SUCCESS` 后返回 `Captured` | 同步 `trade_state` / `paid_at` |
| `cancel` | `POST /v3/pay/transactions/out-trade-no/{no}/close` | `closed_at` |
| `refund` | `POST /v3/refund/domestic/refunds`，`out_refund_no` 由 `idempotencyKey` 派生 | 写 `wechat_refunds` |
| `query` | `GET /v3/pay/transactions/out-trade-no/{no}` | 同步状态 |

回调状态机（`WechatPayNotifyService`）：验签解密 → 按 `out_trade_no` 定位 `wechat_pay_transactions` → `SUCCESS` 时置 `Captured` + `paid_at` + `transaction_id`，并让 Mall 侧 `mall_payments` 走与 Mock `capture` 相同的落库语义（订单 saga 零改动）；`refund` 回调驱动 `wechat_refunds.status` 并通知 Mall 退款事件链路。

容器绑定（`WechatMallPayServiceProvider`）：当 `wechat-pay` active 且存在 active 商户配置时，把 `PaymentGatewayContract` 的 `wechat` 实现注册进 Mall 网关注册表；注册方式以 `MallPaymentServiceProvider` 现状为准（Mock 的注册即是模板）。

#### 通知编排（阶段 3，WechatNotify）

- 渠道实现（`MiniProgramMessageService` 的订阅消息、`OaTemplateChannel`）由各自 ServiceProvider 以容器 tag `wechat.notification_channels` 注册；`WechatNotifyRouter` 按 tag 解析，**因此 WechatNotify 不依赖渠道模块**。
- `WechatNotification` DTO：目标 appid、接收 openid、场景标识、模板/数据、备选渠道（无订阅授权时是否降级公众号模板）、notifiable morph。
- 发送统一走队列 Job（§2.9），写 `wechat_notify_logs`（pending → sent/failed/skipped），失败重试 3 次后 `failed`。
- 订阅授权入口：小程序端 `wx.requestSubscribeMessage` 成功后回调 `POST /api/v1/wechat/subscribe-grants`（前台端点，宿主路由前缀，鉴权用 Customer 既有 Sanctum token），写入 `wechat_subscribe_grants` 并派发 `WechatSubscribeGrantRecorded`。
- Mall 业务事件（订单发货、售后完成等）→ 发送通知的接线**不在本期改 Mall 代码**：由宿主或后续桥接模块监听 Mall 事件并调用 `WechatNotifyRouter`；本模块提供 API 与契约即可（非目标：Mall 内嵌监听器）。

### 2.7 API 路由（全量）

阶段 1 — WechatApp（admin 走 `gz168.jwt.auth` + `gz168.api.scope:admin_user`，同 Mail）：

```text
GET/POST   /api/admin/wechat/apps                      列表 / 登记应用
GET/PATCH/DELETE /api/admin/wechat/apps/{id}           详情（secret 脱敏）/ 更新 / 删除
POST       /api/admin/wechat/apps/{id}/default         设为同类型默认
POST       /api/admin/wechat/apps/{id}/token-check     现取 access_token 校验连通性
```

阶段 2 — WechatPay + WechatMallPay：

```text
POST /api/wechat/pay/notify/{app_id}                       支付回调（公开，验签）
POST /api/wechat/pay/refund-notify/{app_id}                退款回调（公开，验签）
GET/POST /api/admin/wechat/mch-accounts                    商户配置 CRUD（同上中间件）
GET  /api/admin/wechat/pay/transactions                    交易明细列表（筛选 mch/状态/日期）
GET  /api/admin/wechat/pay/transactions/{id}               详情（含 raw_notify）
POST /api/admin/wechat/pay/transactions/{id}/refresh       主动 query 刷新状态
GET  /api/admin/wechat/pay/refunds                         退款列表
POST /api/admin/wechat/pay/bills/download                  下载指定日期账单（trade/fundflow）
GET  /api/admin/wechat/pay/bills                           账单文件列表
POST /api/admin/wechat/pay/reconcile                       触发对账（返回结论摘要）
```

阶段 3 — WechatNotify + 小程序消息：

```text
POST /api/v1/wechat/subscribe-grants                       前台上报订阅授权（Customer token 鉴权）
GET  /api/admin/wechat/subscribe-grants                    授权记录列表
DELETE /api/admin/wechat/subscribe-grants/{id}             删除本地授权记录
POST /api/admin/wechat/notify/send                         手动发送（测试 / 运营，需 wechat.message.send）
GET  /api/admin/wechat/notify/logs                         发送日志列表
GET  /api/admin/wechat/notify/logs/{id}                    日志详情
```

阶段 4 — WechatOfficialAccount：

```text
GET  /api/wechat/oa/callback/{app_id}                      服务器验证（echostr，公开）
POST /api/wechat/oa/callback/{app_id}                      消息/事件推送（公开，验签+去重）
GET  /api/wechat/oa/oauth/url                              网页授权跳转 URL（公开，带 state）
GET  /api/wechat/oa/oauth/callback                         授权回调（公开，state 校验）→ 派发 WechatUserAuthorized
GET/POST/DELETE /api/admin/wechat/oa/menu                  查询当前 / 发布 / 删除自定义菜单
GET  /api/admin/wechat/oa/users/{openid}                   用户信息（实时调 API）
GET  /api/admin/wechat/oa/tags  |  POST/DELETE .../tags    标签管理
GET  /api/admin/wechat/oa/blacklist                        黑名单
POST /api/admin/wechat/oa/media                            上传素材（multipart）
GET  /api/admin/wechat/oa/media/{mediaId}                  下载素材（落 Storage 返回 URL）
POST /api/admin/wechat/oa/qrcode                           生成带参二维码（ticket/url）
POST /api/admin/wechat/oa/template/send                    发送模板消息（wechat.message.send）
POST /api/admin/wechat/oa/customer-service/send            发送客服消息
POST /api/admin/wechat/oa/mass/send                        群发（按标签/openids，前置内容安全，wechat.oa.manage）
GET  /api/admin/wechat/oa/jssdk-config?url=                JS-SDK 签名包
GET  /api/admin/wechat/oa/inbound-messages                 回调消息/事件列表
```

阶段 5 — 工具与开放平台：

```text
POST /api/admin/wechat/mp/security/text-check              文本内容安全
POST /api/admin/wechat/mp/security/media-check             媒体内容安全（异步）
POST /api/admin/wechat/mp/wxacode                          生成小程序码（落 Storage 返回 URL）
POST /api/admin/wechat/mp/url-link | url-scheme            短链 / Scheme
GET  /api/admin/wechat/mp/stats/daily?date=                数据统计
POST /api/admin/wechat/pay/transfers                       发起商家转账（wechat.pay.transfer）
GET  /api/admin/wechat/pay/transfers | /{id}/refresh       转账记录 / 刷新状态
GET  /api/admin/wechat/open-platform/oauth/url             开放平台扫码登录 URL（公开）
GET  /api/admin/wechat/open-platform/oauth/callback        登录回调（公开，state 校验）→ 派发 WechatUserAuthorized
```

### 2.8 Filament 资源、Pages 与权限

Filament 资产遵循 gz168 命名规范（`src/Filament/{Resources,Pages,Widgets}`；Resource 主文件平铺单文件，子资产入同名子目录）：

| 资产 | 模块 | 阶段 | 说明 |
| --- | --- | --- | --- |
| `WechatAppResource` | WechatApp | 1 | 列表 name/type/app_id/status/is_default；表单 secret 用 password 型，编辑留空不改；行级 Action：设默认、token 校验、启停 |
| `WechatMchAccountResource` | WechatPay | 2 | 商户配置；api_v3_key / private_key password / textarea 展示 |
| `WechatPayTransactionResource` | WechatPay | 2 | 只读交易明细；筛选状态/日期；行级 Action `refresh`（query）、`refund`（需 wechat.pay.transfer 之外的 wechat.pay.manage） |
| `WechatRefundResource` | WechatPay | 2 | 只读退款记录 |
| `WechatNotifyLogResource` | WechatNotify | 3 | 只读发送日志；筛选渠道/状态/日期 |
| `WechatSubscribeGrantResource` | WechatNotify | 3 | 只读授权记录 |
| `WechatInboundMessageResource` | WechatOfficialAccount | 4 | 只读回调消息/事件 |
| `WechatOaMenuPage` | WechatOfficialAccount | 4 | 自定义菜单编辑器（JSON 表单 + 预览 + 发布/删除） |
| `WechatTransferResource` | WechatPay | 5 | 只读转账记录；行级 `refresh` Action |

菜单组归属 `系统工具`，`navigationSort` 紧跟邮箱账户之后。

权限 slug（12 条，**直接进入** `RolePermission` 的 `PermissionSeeder`，`syncAdminRolePermissions` 同步授予 admin 角色 —— 吸取 Mail 关键修复 #3 的教训）：

| slug | name | 挂载 |
| --- | --- | --- |
| `wechat.view` | 查看微信应用 | WechatAppResource |
| `wechat.create` | 登记微信应用 | WechatAppResource |
| `wechat.edit` | 编辑微信应用 | WechatAppResource |
| `wechat.delete` | 删除微信应用 | WechatAppResource |
| `wechat.authorize` | 校验微信凭据 | WechatAppResource |
| `wechat.pay.manage` | 管理微信支付 | MchAccount/Transaction/Refund 资源 |
| `wechat.pay.view` | 查看支付流水 | Transaction/Refund 资源 |
| `wechat.pay.transfer` | 发起商家转账 | WechatTransferResource |
| `wechat.message.send` | 发送微信消息 | notify/send、template/send、customer-service/send |
| `wechat.message.view` | 查看消息记录 | NotifyLog / SubscribeGrant / InboundMessage 资源 |
| `wechat.oa.manage` | 管理公众号 | OaMenuPage、菜单/素材/群发接口 |
| `wechat.oa.view` | 查看公众号数据 | Oa 用户/标签/黑名单/统计接口 |

宿主新增 `tests/Feature/WechatPermissionsSeederTest.php`（对照 `MailPermissionsSeederTest.php`：落库 / 幂等 / admin 角色授予）。

### 2.9 队列与调度

- 队列名 `wechat`（Redis）。`composer dev` 的 worker 命令需追加：`queue:listen --queue=...,wechat`（Mail 曾因 worker 未含 `mail-sync` 导致 Job 永远 pending，前车之鉴）。
- `SendWechatNotifyJob`（queue `wechat`，tries 3，backoff 60s）：调用 `WechatNotifyRouter` → 渠道 `send` → 写日志；`WechatOaMessageReceived` 等事件监听器默认同步（轻量），重的（媒体下载、群发）入队。
- 调度（`WechatAppServiceProvider::boot()` 内 `$this->app->booted()` 注册，与 Mail / DatabaseBackup 同写法）：

| 命令 | 频率 | 说明 |
| --- | --- | --- |
| `wechat:pay:download-bill --date=` | daily 02:00 | 下载前一日交易 + 资金账单，`when(config('wechat.pay.bill_auto_download'))` |
| `wechat:pay:reconcile --date=` | daily 02:30 | 比对账单 vs `wechat_pay_transactions`，写 `bill_state`；差异输出摘要日志 |
| `wechat:prune` | daily 03:00 | 清理过期 `wechat_inbound_messages` / `wechat_notify_logs` / 过期订阅授权，保留天数走配置 |

### 2.10 配置（config/wechat.php，WechatApp 模块）

```php
return [
    'http' => [
        'timeout' => (int) env('WECHAT_HTTP_TIMEOUT', 15),
        'retry' => (int) env('WECHAT_HTTP_RETRY', 2),
    ],
    'token' => [
        'cache_prefix' => 'wechat:access_token:',
        'ticket_cache_prefix' => 'wechat:jsapi_ticket:',
        'expires_margin' => 300,
        'lock_seconds' => 10,
        'circuit_seconds' => 600,        // 连续失败熔断窗口
    ],
    'pay' => [
        'notify_path' => 'api/wechat/pay/notify',
        'refund_notify_path' => 'api/wechat/pay/refund-notify',
        'sandbox' => env('WECHAT_PAY_SANDBOX', false),
        'bill_disk' => env('WECHAT_PAY_BILL_DISK', 'local'),
        'bill_auto_download' => env('WECHAT_PAY_BILL_AUTO', true),
    ],
    'message' => [
        'queue' => 'wechat',
        'tries' => 3,
        'notify_log_retention_days' => (int) env('WECHAT_NOTIFY_LOG_RETENTION_DAYS', 90),
        'inbound_retention_days' => (int) env('WECHAT_INBOUND_RETENTION_DAYS', 30),
        'grant_retention_days' => (int) env('WECHAT_GRANT_RETENTION_DAYS', 180),
    ],
    'oa' => [
        'callback_path' => 'api/wechat/oa/callback',
        'encryption' => env('WECHAT_OA_ENCRYPTION', 'safe'),   // plain|compatible|safe
        'oauth_state_ttl' => 300,
    ],
    'storage' => [
        'disk' => env('WECHAT_STORAGE_DISK', 'public'),        // 小程序码/素材落地盘
    ],
    'content_security' => [
        'enabled' => env('WECHAT_SEC_CHECK_ENABLED', true),
        'scene' => 2,
    ],
];
```

`customer.wx.*` 配置保留（Customer 登录凭据来源），不迁移。

## 3. 文件结构

```text
gz168/WechatContracts/
├── composer.json / module.json
└── src/
    ├── Contracts/  (§2.4 全部接口)
    ├── Data/       (WechatAppData, WechatMchData, WechatNotification, Pay* DTO, ...)
    ├── Enums/      (WechatAppType, WechatChannel, WechatTradeType, ...)
    ├── Events/     (WechatUserAuthorized, WechatOaMessageReceived, WechatOaEventReceived, WechatSubscribeGrantRecorded)
    └── Providers/WechatContractsServiceProvider.php

gz168/WechatApp/
├── composer.json / module.json / config/wechat.php / routes/api.php
├── database/
│   ├── migrations/2026_09_xx_000001_create_wechat_apps_table.php
│   └── factories/WechatAppFactory.php
├── src/
│   ├── Providers/WechatAppServiceProvider.php
│   ├── Exceptions/WechatException.php
│   ├── Models/WechatApp.php
│   ├── Services/  (§2.6)
│   ├── Http/
│   │   ├── Requests/{StoreWechatAppRequest, UpdateWechatAppRequest}.php
│   │   ├── Controllers/Api/{WechatAppController, WechatAppTokenCheckController}.php
│   │   └── Resources/WechatAppApiResource.php
│   └── Filament/Resources/WechatAppResource.php
└── tests/Feature/{WechatAppRegistrationTest, WechatAppSecretEncryptionTest, WechatAppApiTest, AccessTokenCacheTest, AccessTokenCircuitBreakerTest}.php

gz168/WechatMiniProgram/
├── composer.json / module.json
└── src/
    ├── Providers/WechatMiniProgramServiceProvider.php      # 注册 NotificationChannel tag（订阅消息/客服消息）
    └── Services/  (§2.6 四个 Service)
└── tests/Feature/{CodeToSessionTest, PhoneNumberTest, SubscribeMessageSendTest, MpCustomerServiceTest, WxacodeTest, ContentSecurityTest}.php

gz168/WechatOfficialAccount/
├── composer.json / module.json / routes/api.php
├── database/migrations/2026_09_xx_000006_create_wechat_inbound_messages_table.php
└── src/
    ├── Providers/WechatOfficialAccountServiceProvider.php
    ├── Models/WechatInboundMessage.php
    ├── Http/Controllers/Api/{OaCallbackController, OaOAuthController, OaAdminController}.php
    ├── Filament/Resources/WechatInboundMessageResource.php
    ├── Filament/Pages/WechatOaMenuPage.php
    └── Services/  (§2.6)
└── tests/Feature/{OaCallbackEchoTest, OaCallbackCryptoTest, OaCallbackDedupeTest, OaOAuthFlowTest, OaMenuTest, OaTemplateChannelTest, OaJsSdkSignatureTest, OaMediaTest, OaQrcodeTest, OaMassSendTest}.php

gz168/WechatPay/
├── composer.json / module.json / routes/api.php
├── database/
│   ├── migrations/2026_09_xx_000002_create_wechat_mch_accounts_table.php
│   ├── migrations/2026_09_xx_000003_create_wechat_pay_transactions_table.php
│   ├── migrations/2026_09_xx_000004_create_wechat_refunds_table.php
│   ├── migrations/2026_09_xx_000007_add_mch_account_id_to_wechat_apps_table.php
│   └── migrations/2026_09_xx_000008_create_wechat_transfer_records_table.php   # 阶段 5
├── src/
│   ├── Providers/WechatPayServiceProvider.php
│   ├── Models/{WechatMchAccount, WechatPayTransaction, WechatRefund, WechatTransferRecord}.php
│   ├── Http/Controllers/Api/{WechatPayNotifyController, WechatPayAdminController}.php
│   ├── Filament/Resources/{WechatMchAccountResource, WechatPayTransactionResource, WechatRefundResource, WechatTransferResource}.php
│   ├── Console/{DownloadPayBillCommand, ReconcilePayBillCommand}.php
│   └── Services/  (§2.6)
└── tests/Feature/{WechatMchAccountTest, WechatPayOrderTest, WechatPayNotifySignatureTest, WechatPayNotifyIdempotencyTest, WechatRefundTest, WechatPayBillReconcileTest, WechatTransferTest}.php

gz168/WechatMallPay/
├── composer.json / module.json
└── src/
    ├── Providers/WechatMallPayServiceProvider.php
    └── Services/WechatPayGateway.php
└── tests/Feature/MallGatewayAdapterTest.php               # 与 Mock 同语义对拍

gz168/WechatNotify/
├── composer.json / module.json
├── database/
│   ├── migrations/2026_09_xx_000005_create_wechat_subscribe_grants_table.php
│   ├── migrations/2026_09_xx_000005b_create_wechat_notify_logs_table.php
│   └── factories/
├── src/
│   ├── Providers/WechatNotifyServiceProvider.php
│   ├── Models/{WechatSubscribeGrant, WechatNotifyLog}.php
│   ├── Jobs/SendWechatNotifyJob.php
│   ├── Http/Controllers/Api/{SubscribeGrantController, NotifyAdminController}.php
│   ├── Filament/Resources/{WechatNotifyLogResource, WechatSubscribeGrantResource}.php
│   ├── Console/WechatPruneCommand.php
│   └── Services/  (§2.6)
└── tests/Feature/{SubscribeGrantReportTest, NotifyRouterTest, NotifyRetryTest, NotifyLogMaskingTest, WechatPruneTest}.php

gz168/WechatOpenPlatform/
├── composer.json / module.json / routes/api.php
└── src/
    ├── Providers/WechatOpenPlatformServiceProvider.php
    └── Services/OpenPlatformAuthService.php
└── tests/Feature/{OpenPlatformQrconnectTest, OpenPlatformAppLoginTest}.php
```

宿主侧改动：`tests/Feature/WechatPermissionsSeederTest.php`；`composer.json` scripts 的 dev worker 追加 `wechat` 队列。

## 4. 阶段性交付

### 阶段 1 — 基础设施与登录

- `WechatContracts` / `WechatApp` / `WechatMiniProgram`（仅 Auth 部分）落地；`wechat_apps` 表 + 12 条权限进 seeder；`WechatAppResource` 后台可用。
- `StableAccessTokenProvider` 缓存 / 锁 / 熔断行为有测试；`token-check` 用 `Http::fake` 覆盖成功与微信侧错误透传。
- `WxAuthService` 委托 `MiniProgramAuthInterface`，Customer 全部既有测试通过（行为不变）。
- 验收：`bin/check-gz168-coupling.php` 0 违规；后台"微信应用"菜单可登记小程序并完成 token 校验；secret 加密入库、响应脱敏断言通过。

### 阶段 2 — 支付全量 + Mall 桥接（已落地，2026-08-29）

- `gz168/WechatPay`：`wechat_mch_accounts` / `wechat_pay_transactions` / `wechat_refunds` 表 + `wechat_apps.mch_account_id` 关联；纯 `Http` 自研 v3 客户端（未引入第三方 SDK，规避依赖审批与 PHP 8.5 兼容风险；契约不变，后续可整体替换为 EasyWeChat Infrastructure）。
- APIv3 实现：商户私钥 SHA256withRSA 请求签名（签名串与传输字节严格一致）、平台证书下载 + AES-256-GCM 解密缓存、回调**强制**平台证书验签 + resource 解密 + `out_trade_no`/`out_refund_no` 幂等状态机、未知单据确认不重试。业务请求响应的验签暂未启用（回调是资金状态唯一信任来源，已记录为已知限制）。
- 交易/退款/账单服务 + Admin API（商户 CRUD、交易明细/refresh、退款列表、账单下载/对账）+ Filament（`WechatMchAccountResource`、只读 `WechatPayTransactionResource`（含刷新 Action）、`WechatRefundResource`）+ `wechat:pay:download-bill` / `wechat:pay:reconcile` 命令与 daily 调度（`bill_auto_download` 开关）。
- `gz168/WechatMallPay`：`WechatPayGateway` 实现 `PaymentGatewayContract` 五方法（intentId = 商户单号；`gateway_trade_type` 默认 native，jsapi 需 openid 留待 Mall 侧扩展）；`WechatPayTransactionUpdated/RefundUpdated` 事件 → `SyncMallPaymentFromWechat` 监听器同步 `mall_payments`（与 Mock `capture` 落库语义一致）。
- **依赖调整**：`wechat-mall-pay` 实际 `requires` 含 `gz168/mall-payment`（拓扑排序保证 Mock 绑定先加载、微信网关确定性覆盖），比 §2.1 表多一项。
- 测试：真实 RSA 密钥对 + 自签平台证书驱动验签/防篡改/重放幂等测试；账单对账 matched/missing/amount_mismatch；网关五方法与 Mock 语义对拍。两套件 32 用例全绿。
- 验收人工项（待办）：微信支付真实商户完成一笔 0.01 元 JSAPI 支付 + 退款闭环，回调重放无副作用。

### 阶段 3 — 消息触达（已落地，2026-08-29）

- `gz168/WechatNotify`：`wechat_subscribe_grants` / `wechat_notify_logs` 两表。**结构微调**：两表均以 `app_id` 字符串列（非 FK）关联应用——支持仅用 `customer.wx.*` 配置、未在 `wechat_apps` 登记应用的轻量部署；`wechat_notify_logs` 带 notifiable morph 关联业务对象。
- `WechatNotifyRouter`（容器 tag `wechat.notification_channels` 解析渠道实现，与渠道模块唯一耦合点是 `WechatContracts\NotificationChannelInterface`）：`queue()`（pending 日志 + `SendWechatNotifyJob` 入 `wechat` 队列，tries=3 backoff=60）/ `sendNow()`（同步）/ `execute()`（Job 入口）。
- 路由语义（设计验收项全覆盖）：订阅消息无授权额度 → `skipped`（不重试）；微信侧 43101（用户拒收）→ `skipped` 且不扣减额度；其他微信错误 / 网络异常 → `failed` 计数并抛出由队列重试，3 次后置 `failed` 不再重试；成功 → `sent` 并扣减授权额度（剩余次数下限 0）。
- 渠道实现（`WechatMiniProgram`）：`MiniProgramSubscribeChannel`（subscribe/send，data 字段映射 `{key:{value}}`）与 `MpCustomerServiceChannel`（custom/send，text 默认），ServiceProvider 以 tag 注册；无授权额度检查（Router 职责）。
- 端点：前台 `POST /api/v1/wechat/subscribe-grants`（Sanctum 客户令牌；openid 优先取用户模型 `wx_openid`，缺失时可显式传入；app_id 回退 `customer.wx.app_id` → 默认小程序）+ Admin 手动发送/日志/授权记录 API；Filament 两个只读资源（`wechat.message.view`）。
- `wechat:prune` 命令 + daily 03:00 调度（notify 日志 90 天 / 授权记录 180 天，可配置可覆盖）；`composer dev` worker 队列已追加 `wechat`（前车之鉴）。
- 测试 17 用例：授权上报累计/幂等、额度扣减、43101 skipped、未知渠道可诊断错误、队列投递到 `wechat` 队列、Job 执行、Admin 同步/异步发送、清理边界；渠道 payload 映射与错误码透传。
- 待人工验收：真实小程序端完成一次 `wx.requestSubscribeMessage` 授权上报与真实订阅消息送达。

### 阶段 4 — 公众号全量（已落地，2026-08-29）

- `gz168/WechatOfficialAccount`：`wechat_inbound_messages` 表（dedupe_key 唯一索引；app_id 字符串列，同阶段 3 微调）。
- **回调链路**：`OaCrypto`（官方 WXBizMsgCrypt 算法：sha1 排序签名 + AES-256-CBC 43 位 EncodingAESKey，支持明文/兼容/安全三模式自动识别）+ `WxXml` 解析；GET echostr 验证回显、POST 验签解密；`MsgId` 去重、事件消息用 `FromUserName:CreateTime:Event` 组合键去重（重复推送只落一行、只派发一次）；消息/事件分别派发 `WechatOaMessageReceived` / `WechatOaEventReceived`。验签失败 GET 403 / POST 静默 401。
- **网页授权**：`/api/wechat/oa/oauth/url`（state 写缓存 `wechat:oa_state:{app_id}:{state}`，TTL 300s 一次性消费）+ `/callback`（snsapi_base/userinfo，成功派发 `WechatUserAuthorized`，state 失效 403）。
- **管理域**：自定义菜单（发布/读取/删除 + `WechatOaMenuPage` Filament 页，`wechat.oa.manage`）、用户信息/标签 CRUD/标签粉丝/黑名单（按需实时调 API，无粉丝同步表）、素材上传下载（落 Storage）、带参二维码、模板消息/客服消息发送、**群发（前置内容安全校验：`ContentSecurityInterface` 已绑定则强制校验未通过 422 拒绝，未绑定降级跳过并告警）**、JS-SDK 签名包、入站消息查询。
- **通知渠道**：`OaTemplateChannel`（oa_template）与 `OaCustomerServiceChannel`（oa_customer_service）注册进 `WechatNotifyRouter` tag——通知编排覆盖小程序订阅/客服 + 公众号模板/客服四个渠道；仅 `oa_mass` 按语义保留为 Admin 直调（多接收者不适合单 openid 渠道接口），Router 对未实现渠道给出可诊断错误。
- 测试 16 用例：加解密往返与 GET 验证、篡改签名 401、加密/明文推送落库与事件、MsgId 与组合键去重幂等、OAuth 一次性 state、菜单/JSSDK/模板/二维码、群发内容安全拒绝与放行、模板渠道经 Router 全链路。
- 待人工验收：公众号后台配置服务器 URL（Token/AESKey 与 `wechat_apps` 一致）通过"启用"验证，真机关注/取关事件入库。

### 阶段 5 — 开放平台 + 内容安全 + 小程序工具 + 商家转账（已落地，2026-08-29）

- **`gz168/WechatOpenPlatform`**：PC 扫码（qrconnect，`snsapi_login`）与 App 登录共用 `sns/oauth2/access_token` 换取 openid + unionid + userinfo，state 一次性（`wechat:openplat_state:{app_id}:{state}`），成功派发 `WechatUserAuthorized`（scene = `open_platform_qrconnect` / `open_platform_app`），宿主自行绑定账号。公开端点：`/api/admin/wechat/open-platform/oauth/url` + `/callback`。
- **内容安全**（WechatMiniProgram）：`MiniProgramContentSecurityService` 实现契约 `ContentSecurityInterface`（msgSecCheck v2 同步、mediaCheckAsync v2 异步受理），容器绑定后公众号群发前置校验自动生效（阶段 4 机制）；Admin API：`POST /api/admin/wechat/mp/security/text-check|media-check`。
- **小程序工具**（WechatMiniProgram）：`getwxacodeunlimit` 小程序码（落 `wechat.storage.disk`，返回路径 + URL，微信侧错误转 422）、URL Link、URL Scheme、日访问趋势统计；Admin API 挂 `/api/admin/wechat/mp/*`。
- **商家转账**（WechatPay）：`wechat_transfer_records` 表 + `WechatPayTransferService`（v3 `/v3/transfer/batches` 下单 + 批次查询；**收款实名按 v3 规范用平台证书公钥 RSAES-OAEP 加密提交，本地 Laravel encrypted cast 存储、展示一律掩码**）；Admin API：`POST/GET /api/admin/wechat/pay/transfers` + `/{id}/refresh`（`wechat.pay.transfer` 权限）；只读 Filament 资源 `WechatTransferResource`（含刷新 Action）。
- **调度验收**：`schedule:list` 可见 `wechat:pay:download-bill`（02:00）/ `wechat:pay:reconcile`（02:30）/ `wechat:prune`（03:00），前两者受 `wechat.pay.bill_auto_download` 开关控制。
- 测试 11 用例：qrconnect URL/state 一次性/App 登录场景、内容安全通过与违规、小程序码落盘与错误透传、URL Link、统计、转账批次创建、**实名加密双端断言（提交为平台证书 RSA-OAEP 密文、本地 DB 为 Laravel 密文、原文不出现在表与响应）**、状态刷新、批次单号唯一。
- 待人工验收：开放平台应用绑定后真实扫码登录；商家转账需商户号开通权限后真实转账一笔并核对回单。

### 每阶段通用验收

```shell
php bin/check-gz168-coupling.php
php artisan test --compact gz168/Wechat*/tests
php artisan test --compact gz168/Customer/tests        # 阶段 1 起
php artisan test --compact gz168/MallPayment/tests gz168/WechatMallPay/tests   # 阶段 2 起
php artisan test --compact
vendor/bin/pint --dirty --format agent
composer validate --no-check-publish
```

## 5. 安全要点

- 所有密钥（`app_secret` / `api_v3_key` / 商户私钥 / 公众号 `aes_key` / 转账实名）一律 `encrypted` cast 入库；API 响应、日志、异常消息只出现掩码。
- `WECHAT_*` 环境变量不写入 commit、文档、测试 fixture；测试用 `config()->set()` 或 Factory。
- 回调端点只做验签，不泄露应用 / 商户信息；验签失败静默 401；以微信侧 `trade_state` 为准，不信任客户端上报状态。
- 公众号回调强制消息去重（MsgId / 事件组合键）防重放；`echostr` 校验失败返回非法请求，不回显原因。
- `session_key` 不落库、不出服务端；登录响应只含业务 token（维持 Customer 现状）。
- 群发 / 模板 / 客服内容出站前过内容安全校验（可配置关闭，默认开启）。
- 支付 / 转账金额一律以分（unsignedInteger）存储与传输，杜绝浮点。
- 公众号 openid、unionid 属个人信息：`wechat_inbound_messages.content`、`notify_logs.payload` 均视为敏感，日志脱敏 + 保留期清理。
- 平台证书轮换：缓存带商户号命名空间 + TTL，下载失败降级用旧证书并告警。

## 6. 验证清单

```shell
# 模块边界
php bin/check-gz168-coupling.php

# 模块测试（全家族）
php artisan test --compact gz168/Wechat*/tests
php artisan test --compact gz168/Customer/tests
php artisan test --compact gz168/MallPayment/tests

# 宿主回归
php artisan test --compact

# 格式化
vendor/bin/pint --dirty --format agent

# Composer
composer validate --no-check-publish
```

新增依赖（EasyWeChat 等）后必须先在分支 `composer require` 验证 PHP 8.5 兼容，再跑 `php artisan migrate`；每个阶段结束确认 `schedule:list` 中新命令按预期注册。

## 7. 风险与依赖

| 风险 | 缓解 |
| --- | --- |
| `w7corp/easywechat` 6.x 与 PHP 8.5 / Laravel 13 兼容性 | 实施前分支验证；不兼容降级官方 `wechatpay-php` + 自研 HTTP 客户端（契约不变，仅换 Infrastructure） |
| 支付回调需公网 HTTPS 直达 | 部署核对反代放行 `/api/wechat/pay/*`、`/api/wechat/oa/callback/*`；`notify_url_override` 兜底内网穿透联调 |
| access_token 并发失效风暴 | stable_token + Redis 缓存 + 原子锁 + 熔断窗口 |
| 回调重复推送 / 乱序 | `out_trade_no` / `out_refund_no` 状态机幂等；公众号 MsgId 去重；`SUCCESS` 幂等短路 |
| 订阅消息配额（一次性授权）与模板消息配额限制 | `remaining_count` 扣减 + `skipped` 状态；群发前置频控错误透传 |
| 群发内容合规 | 出站前强制内容安全（可配置），异常拒绝并留痕 |
| Customer 委托改造引入回归 | 行为零变化（同逻辑搬家）；Customer 既有测试全量通过为准入 |
| 商家转账需商户平台单独开通 + 实名校验 | 模块内做成独立能力（阶段 5），未开通不影响支付主链路 |
| `wechat_apps` 与 `customer.wx.*` 双凭据来源混淆 | 登录凭据只读 `customer.wx.*`；`wechat_apps` 面向多应用管理与公众号 / 支付场景，文档与字段注释写明 |
| dev 环境队列 worker 缺 `wechat` 队列 | `composer.json` scripts 同步修改（Mail 前车之鉴） |

## 8. 决策状态（2026-08-29 全量落地后更新）

已拍板：

1. **SDK 选型**：✅ 全家族以 `Illuminate\Support\Facades\Http` 自研实现（规避依赖审批与 PHP 8.5 兼容风险）；接口契约稳定，后续可整体替换为 EasyWeChat 6.x Infrastructure，不影响业务代码。
2. **权限落地**：✅ 12 条 `wechat.*` 权限已直接进 `PermissionSeeder`（`tests/Feature/WechatPermissionsSeederTest.php` 覆盖落库/幂等/admin 授予）。
3. **公众号粉丝同步**：✅ 维持按需实时调 API、不落粉丝表；运营侧需要离线筛选时再增加 `wechat_oa_users` 同步表（独立迁移，不影响现设计）。
4. **Mall 事件 → 通知接线**：✅ 维持不改 Mall 代码；宿主或后续桥接模块监听 Mall 事件并调用 `WechatNotifyRouter` 即可。
5. **回调路由**：✅ 代码已就绪（支付/退款/公众号三类公开回调）；部署侧需确认公网 HTTPS 反代放行 `/api/wechat/*`，属人工验收项。

仍开放：

6. **商家转账开通状态**：商户号是否已开通商家转账权限，决定真实转账验收何时可做。
7. **已知限制**：支付 API 响应验签未启用（回调强制验签是资金状态唯一信任来源）；`oa_mass` 群发走 Admin 直调 API 而非通知编排渠道（多接收者不适合单 openid 渠道接口）——均为有意取舍，如需统一再演进。
