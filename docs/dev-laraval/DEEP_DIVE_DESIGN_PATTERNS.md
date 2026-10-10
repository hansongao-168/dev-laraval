# 深入设计模式 — gz168 项目实战解读

> 本章以 GoF《Design Patterns》和 ECCG《深入设计模式》为主线，逐章结合 `gz168/` 现有模块落地代码讲解。
> 每个模式都遵循「意图 → 项目实例 → 角色对照 → 边界与陷阱」四段式结构。

---

## 0. 阅读路径

```
GoF 三大类
├── 创建型（Creational）
│   ├── 1. 工厂方法 Factory Method     → TransportRegistry / ModeStrategyRegistry
│   ├── 2. 抽象工厂 Abstract Factory   → MailContracts 的 TransportRegistry + Data
│   ├── 3. 建造者 Builder             → MailCredentialData / OutboundMessageData（readonly DTO）
│   ├── 4. 原型 Prototype             → firstOrCreate + message_uuid 的幂等草稿
│   └── 5. 单例 Singleton             → TransportRegistry（app()->singleton）
├── 结构型（Structural）
│   ├── 6. 适配器 Adapter              → GmailTransport / QqMailTransport 实现 InboundTransportInterface
│   ├── 7. 桥接 Bridge                → MallCore 策略（ModeStrategyRegistry 桥接多个 MallMode* 包）
│   ├── 8. 组合 Composite              → MallCore Events + Listeners（领域事件树）
│   ├── 9. 装饰器 Decorator            → 详见《装饰模式实战精讲》一章
│   ├── 10. 外观 Facade               → QueueMailAction（封装「持久化 + 派发」两步）
│   ├── 11. 享元 Flyweight            → MailProvider 枚举（共享不变 provider 键）
│   └── 12. 代理 Proxy                → OutboundMessage 状态机代理 + MailAccount 配置查询
└── 行为型（Behavioral）
    ├── 13. 责任链 Chain of Resp.     → SendMailJob.middleware() 的 WithoutOverlapping
    ├── 14. 命令 Command              → QueueMailAction / SendMailJob
    ├── 15. 解释器 Interpreter        → GmailTransport::dateQuery / QqMailTransport::dateCriteria
    ├── 16. 迭代器 Iterator           → Laravel Collection（贯穿所有模块）
    ├── 17. 中介者 Mediator           → TransportRegistry / ModeStrategyRegistry
    ├── 18. 备忘录 Memento            → InboundCursorData / OutboundMessage.status 字段
    ├── 19. 观察者 Observer           → MallCore 领域事件 + Laravel Event 服务提供者
    ├── 20. 状态 State                → MallCore\AbstractStateMachine → OrderStateMachine
    ├── 21. 策略 Strategy             → MallCore\Strategy\*Policy 接口与 B2C/B2B 实现
    ├── 22. 模板方法 Template Method  → AbstractStateMachine + StateMachine::can/apply
    └── 23. 访问者 Visitor            → MallAfterSales / MailAdmin 报表聚合
```

---

## 1. 创建型：对象的诞生

### 1.1 工厂方法 + 抽象工厂：MailContracts + TransportRegistry

**意图**：把「对象创建」从使用方抽离，使用方只通过 key/类型拿到合适实例。

**项目实例**：

```php
// gz168/MailContracts/src/Contracts/OutboundTransportInterface.php
interface OutboundTransportInterface
{
    public function send(MailCredentialData $credential, OutboundMessageData $message): OutboundResult;
}

// gz168/MailContracts/src/TransportRegistry.php
class TransportRegistry
{
    public function registerOutbound(MailProvider $provider, OutboundTransportInterface $transport): void;
    public function outbound(MailProvider $provider): OutboundTransportInterface;
}
```

- **工厂方法**：`MailGmailServiceProvider::boot()` 把 `GmailTransport` 注册到 `TransportRegistry`。
- **抽象工厂**：`TransportRegistry` 同时管理 Inbound 与 Outbound 两族接口（两个产品族），每个产品族都有同样的注册/解析方法。

**角色对照**：

| 角色 | 类 |
|------|----|
| AbstractFactory | `TransportRegistry` |
| AbstractProduct | `InboundTransportInterface` / `OutboundTransportInterface` |
| ConcreteProduct | `GmailTransport`、`QqMailTransport` |
| ConcreteFactory | `MailGmailServiceProvider`、`MailQqServiceProvider` |

**调用方零依赖**：`SendMailJob::handle()` 只依赖 `TransportRegistry`，不知道底层用 Gmail 还是 QQ：

```php
$result = $transports->outbound($credential->provider)->send($credential, $message);
```

**陷阱**：

- 不要让模块直接 `new GmailTransport()` 跨包调用。
- 不要把 `TransportRegistry` 写成全局可变单例到处使用；它是「按 provider key 解析」的注册中心，不是上帝对象。

### 1.2 单例：服务容器绑定

**意图**：整个应用共享一个状态一致的实例。

**项目实例**：

```php
// MailContractsServiceProvider
$this->app->singleton(TransportRegistry::class);
```

**陷阱**：

- Laravel 单例是「容器单例」，跨进程（队列 worker）会重新构造；不要在单例里放跨进程状态。
- 单例里禁止 `app('request')` 等请求级依赖。

### 1.3 建造者 / 原型：DTO + firstOrCreate 幂等

**意图**：用不可变 DTO 表达请求，避免 setter 地狱；用 `firstOrCreate` 实现幂等草稿。

**项目实例**：

- `MailCredentialData`、`OutboundMessageData`、`InboundMessageData` 都是 `readonly` DTO。
- `QueueMailAction::handle()` 用 `firstOrCreate(['message_uuid' => …])` 保证同一 UUID 不会重复入队。

**陷阱**：

- DTO 必须 `readonly`，否则业务代码会偷偷改字段绕过校验。
- `firstOrCreate` 只能依赖唯一键；不要塞时间戳等不可控字段。

---

## 2. 结构型：对象如何组合

### 2.1 适配器：让异构供应商变成同一接口

**意图**：把第三方 API（Gmail REST、QQ IMAP/SMTP）适配到内部统一接口。

**项目实例**：

```php
class GmailTransport implements InboundTransportInterface, OutboundTransportInterface { … }
class QqMailTransport implements InboundTransportInterface, OutboundTransportInterface { … }
```

| 角色 | 类 |
|------|----|
| Target | `InboundTransportInterface` |
| Adaptee | Gmail API / Symfony Mailer + imap_* |
| Adapter | `GmailTransport` / `QqMailTransport` |

**陷阱**：

- 不要把第三方 DTO 直接返回（`\Google_Service_Gmail_Message`），必须转换为自有 `InboundMessageData`。
- 适配器内禁止做业务编排（重试、状态写库），那属于 Job / Action。

### 2.2 桥接：MallCore Strategy 与 MallModeB2C/B2B

**意图**：把「抽象（接口）」与「实现（多种模式）」解耦，两者可独立扩展。

**项目实例**：

```php
// MallCore/src/Strategy/PricingPolicy.php
interface PricingPolicy {
    public function resolve(string $sku, ?PartyContext $buyer, Quantity $qty): Money;
}

// MallCore/src/Strategy/ModeStrategyRegistry.php
class ModeStrategyRegistry {
    public function register(MallMode $mode, string $contract, callable $factory): void;
    public function policy(MallMode $mode, string $contract): object;
}

// MallModeB2C/src/Strategies/B2cPricingPolicy.php
class B2cPricingPolicy implements PricingPolicy { … }
// MallModeB2B/src/Strategies/B2bPricingPolicy.php
class B2bPricingPolicy implements PricingPolicy { … }
```

- 抽象：`PricingPolicy` 接口（由 MallCore 拥有）。
- 实现族：`B2cPricingPolicy` / `B2bPricingPolicy`（由 MallMode* 包各自实现）。
- 桥接：`ModeStrategyRegistry` 把「业务调用方」与「具体策略实现」解耦。

**陷阱**：

- 桥接 ≠ 策略。桥接强调「抽象与实现正交扩展」（再加一种模式不需要改接口）；策略强调「运行时选一个算法」。本项目里两者实际是同一族，命名上叫 Strategy 更准确。

### 2.3 装饰器：详见《装饰模式实战精讲》一章

### 2.4 外观：QueueMailAction

**意图**：把「落库 + 派发 Job」封装成一个调用点。

**项目实例**：

```php
class QueueMailAction {
    public function handle(int $accountId, array $to, string $subject, ?string $textBody, ?string $htmlBody, ?string $messageUuid = null): OutboundMessage
}
```

外观内做了：生成 UUID → 幂等创建 OutboundMessage → 仅首次创建派发 SendMailJob。

**陷阱**：

- 外观类容易膨胀成「上帝类」。一旦 `handle()` 超过 30 行或开始跨模块写库，立即拆 Action。

### 2.5 代理：OutboundMessage 状态机代理

**意图**：用领域模型 + 状态机代理「允许的转移」。

**项目实例**：`AbstractStateMachine::can/apply()` 替 OutboundMessage 把守「`pending → processing → sent`」的合法迁移。

### 2.6 享元：MailProvider 枚举

枚举值 `gmail`、`qq` 在全应用是共享字符串，单实例即可充当 key。

---

## 3. 行为型：对象如何通信

### 3.1 策略：MallCore\Strategy\*

**意图**：定义一族算法（定价、结算、履约），让它们可互换。

**项目实例**：

- 接口：`PricingPolicy` / `SettlementPolicy` / `FulfillmentPolicy` / `ListingPolicy` / `CheckoutApprovalPolicy` / `BuyerEligibilityPolicy`（共 6 个）。
- 注册中心：`ModeStrategyRegistry`。
- 实现：`B2c*Policy`、`B2b*Policy`、`Default*Policy`（兜底）。

调用方只写：

```php
$money = app(ModeStrategyRegistry::class)
    ->policy($mode, PricingPolicy::class)
    ->resolve($sku, $buyer, $qty);
```

**陷阱**：

- 不要在策略里直接 `new` 数据库连接、HTTP 客户端；通过容器解析依赖。
- 默认实现必须能在「未启用任何 MallMode 包」时仍然工作，否则初始化流程会被破坏。

### 3.2 状态：AbstractStateMachine + OrderStateMachine

**意图**：把状态迁移规则集中到一个对象，避免散落在 `if ($status === …)` 到处。

**项目实例**：

```php
abstract class AbstractStateMachine {
    abstract public function entityName(): string;
    abstract public function states(): array;
    abstract public function transitions(): array;
    public function can(Model $entity, string $to): bool;
    public function apply(Model $entity, string $to, string $actor = 'system', string $reason = ''): void;
}
```

**调用约定**：

- Action 层负责读取 entity → 调 `can()` → 调 `apply()`。
- 状态机本身不写日志、不发事件；事件由 Action 在 `apply()` 成功后派发，保持单一职责。

**陷阱**：

- 不要让 Model 自己 `$this->status = …` 直写，必须经状态机。
- `transitions()` 必须显式列出所有合法路径；空白表示终态。

### 3.3 观察者：MallCore 领域事件

**意图**：模块间解耦；事件发布方不知道谁会处理。

**项目实例**：

```
gz168/MallCore/src/Events/
├── AfterSalesRequested.php
├── AfterSalesApproved.php
├── CartConvertedToOrder.php
├── CouponIssued.php
├── CouponRedeemed.php
└── …
```

**项目约束（来自 AGENTS.md / AI_DEVELOPMENT.md）**：

- 模块禁止反向依赖；只能通过事件 + 监听器跨模块通信。
- Filament 资源只在组合层（filament-admin）扫描；事件订阅在各自模块的 Provider 里注册。

**陷阱**：

- 监听器内禁止阻塞（HTTP 调用、长计算），只允许派发 Job 或更新本模块数据。
- 不要让监听器反过来调事件发布模块的内部类；只能通过新事件或新接口回话。

### 3.4 责任链：SendMailJob.middleware()

```php
public function middleware(): array {
    return [(new WithoutOverlapping('mail-send-'.$this->messageId))->releaseAfter(30)->expireAfter(180)];
}
```

队列中间件形成「进入工作器前的责任链」：`WithoutOverlapping` → `RateLimited` → `ThrottlesExceptions` …，每个中间件可中断或延迟。

### 3.5 命令：QueueMailAction + SendMailJob

- Command：`SendMailJob`（队列任务）。
- Invoker：`QueueMailAction`（外观 + 派发）。
- Receiver：`OutboundTransportInterface`。
- Client：业务模块。

### 3.6 备忘录：InboundCursorData / OutboundMessage.status

`InboundCursorData(historyId, uidValidity, lastUid)` 保存上次同步位置；`OutboundMessage.status` + `attempts` 保存发送进度。
两者都是「轻量级状态快照」，无需引入完整 Memento 模式。

### 3.7 解释器：dateQuery / dateCriteria

GmailTransport 把日期范围翻译成 `after:<unix_ts> before:<unix_ts>` 搜索串；QqMailTransport 翻译成 `SINCE "10-Aug-2026" BEFORE "11-Aug-2026"`。
两个小语法解释器各自独立，体现「DSL 分裂但语义一致」。

---

## 4. 模块化与设计模式的协同

gz168 把设计模式从「类级别」提升到「包级别」：

| 模式 | 类级别应用 | 包级别应用（gz168 特有） |
|------|-----------|------------------------|
| Adapter | GmailTransport | MailGmail 包整体适配 MailContracts |
| Strategy | PricingPolicy | MallModeB2B / MallModeB2C 包互换策略实现 |
| Observer | Laravel Event | 跨模块领域事件总线 |
| Bridge | PricingPolicy ↔ B2cPricingPolicy | MallCore ↔ MallMode* |
| Singleton | TransportRegistry | gz168/common 是跨模块共享基座 |

**约束回顾**（来自 `AI_DEVELOPMENT.md`）：

- 模块化、低耦合、高内聚、单向依赖。
- 跨模块只允许通过事件 + 监听器或公共契约通信。
- 禁止反向依赖（`common` 反向引用业务模块就是反模式）。
- bin/check-gz168-coupling.php 自动验证：未声明的跨模块命名空间引用、循环依赖、composer.json 与 module.json 不一致。

---

## 5. 反模式速查（与本项目对照）

| 反模式 | 项目中如何避免 |
|--------|--------------|
| 上帝类 | Action 层 ≤ 30 行，复杂逻辑下沉到 Service / Job |
| 贫血模型 | OutboundMessage 持有 status + attempts，状态变更走状态机 |
| 紧耦合 Service Locator | 强制走构造函数 + 容器解析，禁止 `app()->call()` |
| Singleton 滥用 | 只在注册中心（TransportRegistry）、缓存、配置解析处使用 |
| 直接 `new` 第三方 SDK | 适配器层（MailGmail/MailQq）屏蔽 Symfony Mailer / Http Client |
| 跨模块 Service 调用 | 改为事件 + 监听器；新需求先查接口是否存在 |
| 在控制器里写业务 | Filament / API Controller 只调用 Action；业务进 Application 层 |

---

## 6. 推荐阅读顺序

1. `docs/dev_laraval/GZ168_MODULE_ARCHITECTURE.md` — 模块边界与加载流程。
2. `docs/dev_laraval/DEEP_DIVE_DESIGN_PATTERNS.md`（本文）— 每个模式在 gz168 的对应位置。
3. `docs/dev_laraval/DECORATOR_PATTERN_IN_PRACTICE.md` — 装饰器专题，结合 Mail 适配器与 Mall Pricing 策略。
4. `knowledge/MOC-工程实践.md` — 后续案例与重构故事。