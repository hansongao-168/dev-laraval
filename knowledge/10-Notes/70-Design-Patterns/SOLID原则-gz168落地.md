---
type: atomic
topic: design-patterns
subtopic: solid
tags: [design-patterns, oop, solid, laravel, php]
difficulty: 3
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-28
source:
  - book: 深入设计模式（Dive Into Design Patterns, Refactoring.Guru）SOLID 章节 p.51–67
  - code: gz168 多个 Contracts/、Services/ 真实落地
created: 2026-08-14
updated: 2026-08-14
---

# SOLID 五原则：gz168 模块化项目中的真实落点

## 一句话

> SOLID 是模式的**上游原则**——模式是原则的落地工具。gz168 的契约层（15 个 Contracts）+ 服务拆分 + 容器注入天然体现五个原则；理解 SOLID 才能看懂 23 模式为何这样组织。

## 是什么

### 五原则一句话版

```
S - Single Responsibility   一个类只一个变化理由
O - Open/Closed             对扩展开放，对修改关闭
L - Liskov Substitution     子类可替换父类而不破行为
I - Interface Segregation   接口按客户端拆分，避免"胖接口"
D - Dependency Inversion     依赖抽象（接口），不依赖实现
```

五原则是**层层递进**的：SRP 让类小，OCP 让扩展不破旧，LSP 让子类可替换，ISP 让接口精，DIP 让依赖反转——最后 DIP 是模式协同的根。

## 为什么重要

- 没有 SOLID → 模式无从谈起：`Strategy` 依赖 ISP、`Bridge` 依赖 DIP、`Decorator` 依赖 OCP。
- 识别 SOLID 在代码里的体现 → 看懂架构为何这样分。
- 反向检测：发现"上帝类"= SRP 破、"加需求要改老代码"= OCP 破、"新平台得改调度器"= DIP 破。

## gz168 真实落点

### ① SRP（单一职责）：服务按变化理由拆分

| 服务 | 单一职责 | 不做什么 |
|---|---|---|
| `InventoryAvailabilityService` | 算有效可售量 | 不推送给平台、不记日志 |
| `InventoryPushRetryService` | 失败重试 + 断路 | 不算库存、不调平台 |
| `InventoryReconcileService` | 对账找差异 | 不推送、不告警 |
| `InventoryChannelPushThrottler` | 节流限速 | 不推送、不重试 |
| `LabelElementBinder` | 元素渲染 | 不读模板、不取数据 |
| `LabelDataBinder` | 按实体类型取数据 | 不渲染、不做模板 |
| `LabelTemplateRendererOrchestrator` | 编排"实体×输出"两维 | 不算数据、不渲染 |

**判断标准**："这个类的变化原因有几个？" `InventoryAvailabilityService` 的变化原因 = 业务规则（哪几个仓库算国内、是否扣安全库存），不是推送细节——SRP ✓。

### ② OCP（开闭）：新增平台不改调度器

`ChannelPushDispatcher` 对"加新平台"完全关闭修改：

```php
public function push(ChannelListing $listing, int $targetQty, ...): InventoryPushResult
{
    foreach ($this->adapters as $adapter) {
        if (! $adapter->supports($listing)) continue;
        $result = $adapter->pushAvailable($listing, $targetQty);
        return $this->logPush(...);
    }
    // ...
}
```

新增"京东"平台 = 加一个 `implements ChannelInventoryAdapter` 类 + 容器注册 → **零修改 dispatcher**。
新增"退货"业务 = 加一个 `InventoryReturnService` → **零修改 push 调度链**。
这就是 OCP：**对扩展（新增类）开放、对修改（旧类）关闭**。

Laravel 容器 `singleton()` 绑定新实现也是 OCP 的延伸——容器发现新绑定，自动注入，旧代码不动。

### ③ LSP（里氏替换）：4 个平台适配器可互相替换

```php
// 4 个实现，都是 ChannelInventoryAdapter 接口的不同子类型
AmazonFbaInventoryAdapter    (只读 FBA)          ┐
AmazonMfnInventoryAdapter    (自发货推送)         ├── 都能替换
ShopifyInventoryAdapter      (GraphQL)             │
TikTokInventoryAdapter       (TikTok API)        ┘
```

调用方 `ChannelPushDispatcher::push()` 不知道、不关心是哪个实现——任何实现都满足 `supports()/pushAvailable()/fetchPlatformQuantity()` 契约。

**判断标准**：所有实现都能在 `foreach ($this->adapters as $adapter)` 中无差别处理 → LSP ✓。

### ④ ISP（接口隔离）：Mail 模块两个独立接口

`Mail` 模块把"账号管理"和"账号授权"拆成两个独立接口：

```php
// 1. 账号 CRUD/分页（运营侧用）
interface MailAccountServiceInterface
{
    public function register(array $data): MailAccount;
    public function update(MailAccount $account, array $data): bool;
    public function delete(MailAccount $account): bool;
    public function setDefault(MailAccount $account): void;
    public function paginate(int $perPage = 20): LengthAwarePaginator;
}

// 2. OAuth 授权流（用户授权时用）
interface MailAccountAuthServiceInterface
{
    public function createGmailAuthorizationUrl(MailAccount $account): array;
    public function completeGmailAuthorization(...): array;
    public function setQqAuthorizationCode(...): void;
    public function status(MailAccount $account): array;
}
```

- 后台列表页只需注入 `MailAccountServiceInterface`（不关心 OAuth 流程）。
- 客户端授权回调只注入 `MailAccountAuthServiceInterface`（不暴露 CRUD 方法）。

**这就是 ISP**：客户端不被强迫依赖它不用 的方法。如果合并成一个胖接口 `MailAccountServiceInterface` 含所有方法，任何客户端都得实现/看到用不上的方法。

其他 ISP 例子：`FrontNav` 的 `NavRegistry` / `NavRegistrar` / `VisibilityChecker` / `Authorizable` 各自独立——`Customer` 业务模块只依赖 `NavRegistrar`（pull 模式），不必知道 `VisibilityChecker`。

### ⑤ DIP（依赖倒置）：15 个 Contracts 接口

核心表现：**模块只依赖 Contracts，不依赖其他模块的实现**。

```php
// FrontNav 定义接口
namespace Gz168\FrontNav\Contracts;
interface NavRegistry { /* ... */ }

// 其他模块反向依赖（"反过来倒"——下游定义接口，上游依赖）
// DemoConsumer 的 ServiceProvider
use Gz168\FrontNav\Contracts\NavRegistry;
$registry = $app->make(NavRegistry::class);

// RolePermission 提供实现，前端导航消费接口
// FrontNav 不 import RolePermission 的任何代码，只依赖
// Authorizable 契约（自己定义的接口，RolePermission 实现）
interface Authorizable {
    public function hasPermission(string $slug): bool;
}
```

**判断标准**：模块 import 路径里**只出现 Contracts**，不出现其他模块的 `Services/` / `Models/`。

具体证据：
- `Customer` 模块依赖 `Gz168\FrontNav\Contracts\*`（**只 Contracts**）
- `FrontNav` 依赖自己定义、让其他模块实现的 `Authorizable`
- `Inventory` 依赖 `Gz168\LabelPrinting\Contracts\`（如果将来需要打印标签）——**接口反转**
- `LabelPrinting` 不依赖 `Inventory`（**反向**：库存去适配标签，而不是标签依赖库存）

**容器是 DIP 的实现机制**：所有 `$this->app->singleton(NavRegistry::class, fn() => ...)` 都是"绑定接口到实现"的容器能力，业务代码始终面向接口。

## 怎么用 / 怎么实现（判断套路）

| 原则 | 问自己 | 破例表现 |
|---|---|---|
| SRP | 这类有几条变化理由？多于 1 = 拆 | "上帝类"/"万能服务" |
| OCP | 加新需求要改老代码吗？要 = 改 | if-else 堆叠、硬编码类型 |
| LSP | 子类能替换父类吗？不能 = 设计错 | 子类抛"unsupported"、覆盖父类语义 |
| ISP | 接口方法都用吗？不用 = 拆 | 胖接口（10+ 方法不分职责） |
| DIP | 模块 import 的是 Contracts 还是实现？后者 = 反 | 直接 `new ConcreteService()` |

## 易错 / 注意

- **SOLID 不是教条**：每个原则都可能过度——SRP 过细会变成贫血；OCP 过严会变成过度抽象。
- **DIP ≠ "一切都要接口"**：稳定不变的具体类（如 DTO、enum）无需接口。
- **接口隔离要按"客户端"切，不是按"方法名"切**：按"用哪些方法"分，不是按"语义近"分。
- **本仓库 LSP 较弱**：因为 PHP 单继承 + 大量组合/接口，反而不容易破 LSP；如果出现子类抛 `parent` 异常，要警惕。

## 关联

- 上位概念：[[10-Notes/70-Design-Patterns/MOC]]、[[00-Home/学习地图]]
- 平行概念：[[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]（23 模式如何协同）、[[10-Notes/70-Design-Patterns/框架内建vs显式模式]]
- 下位例子：`gz168/Mail/src/Contracts/*Interface.php`（ISP）、`gz168/Inventory/src/Services/Inventory/Contracts/ChannelInventoryAdapter.php`（OCP/DIP）、`gz168/Inventory/src/Services/Inventory/*.php`（SRP 拆分）
- 关联笔记：[[30-Resources/books/深入设计模式/书评]]（SOLID p.51–67）

## 复盘

- 信心：2（首次写）
- 自测题：`Mail` 模块拆两个接口是 ISP 还是 SRP？`ChannelPushDispatcher` 遍历 `$adapters` 同时体现 OCP 和 DIP，为什么？LSP 在 gz168 哪里最弱？为什么 PHP 项目比 Java 更容易满足 LSP？