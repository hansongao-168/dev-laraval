# 策略模式（Strategy）实战精讲
## —— 承运商"打单 / 重试 / 轨迹"的三组接口 + 配置驱动注册表

> **核心结论**：策略模式在本仓库里不是"if/else 大长串"，而是**配置驱动的接口族** + `Manager` 解析：业务层只见接口，不见承运商类名。新接入承运商只需要"写一个类 + 改一行 YAML"。

---

## 1. 经典定义（GoF）

> Define a family of algorithms, encapsulate each one, and make them interchangeable.
> 定义一族算法，把每个算法封装起来，让它们可以互相替换。

策略模式三件套：

- **Strategy** —— 抽象算法（本仓库里是 3 个 SPI 接口）
- **ConcreteStrategy** —— 具体算法（每个承运商的实现）
- **Context** —— 持有 Strategy、可运行时替换（本仓库里是 `LabelManager` / `TrackingManager`）

教科书差异点和本仓库一一对应：

| GoF 教科书 | 本仓库做法 |
|---|---|
| 静态 `Context` 构造期 new 一个 Strategy | **容器 + 字符串 code 解析**（YAML 配置驱动） |
| 三五个 Strategy 容易 | **十几个承运商 × 三个能力** = 4-50 个实现 |
| `if ($code == 'a') ...else if ...` | 完全消灭 —— `Manager::getCreator($code)` 找不到就 null，绝不在策略里塞分发 |

---

## 2. 本仓库的三组策略接口

### 2.1 `CreateLabel` —— "打单"

位置：`express/logistics-order/src/Contracts/CreateLabel.php`

```php
interface CreateLabel
{
    public function create(Shipment $shipment): void;
    public function canInsurance(Shipment $shipment): bool;
}
```

### 2.2 `RetryLabel` —— "重打某种产物"

位置：`express/logistics-order/src/Contracts/RetryLabel.php`

```php
interface RetryLabel
{
    public function retry(Shipment $shipment, ?array $retryTypes = null): void;
}
```

`$retryTypes` 用 `LabelRetryType` 枚举约束：`Label | Attachment | UploadInvoice | DeliveryCertificate`，让"重打发票""重打回执"在同一接口里有不同分支。

### 2.3 `LogisticsTracker` —— "轨迹"

位置：`express/logistics-tracking/src/Contracts/LogisticsTracker.php`

```php
interface LogisticsTracker
{
    public function getTrackingInfo(string $trackingNumber, Account $account): TrackingInfo;
}
```

### 2.4 设计上的小细节

- **三个接口各管一件事**：`CreateLabel` 不管重试，`RetryLabel` 不管轨迹。这是 GoF 强调的"family of algorithms" —— **能力维度而非承运商维度**。同一个承运商 + 同一个 Shipment，会被组合调用三次（Create / Retry / Track），而不是塞进一个 `CarrierStrategy` 大接口。
- **返回类型一律 `void` 或 `TrackingInfo`**，避免把"承运商特定的产物"泄漏到上层。`TrackingInfo` 是 `LogisticsTracking\Domain\*` 自己的值对象（DDD 风格 VO），**不出现 UpsStatusCode / FedexStatusCode 这种私有常量**。

---

## 3. 同构的承运商骨架

每个承运商的代码几乎同构：

```
express/carrier-X/
├── src/
│   ├── CarrierXServiceProvider.php      # 注册 Logger / 加载 routes
│   ├── Label/
│   │   ├── Creator.php                  # implements CreateLabel + RetryLabel
│   │   └── Api/{Request,Response,Ipn,...}.php
│   └── Track/
│       └── Tracker.php                  # implements LogisticsTracker
└── etc/
    └── carrier.yaml                     # Registry 注册
```

以 `carrier-bpost` 为例，`src/Label/Creator.php` 的最小签名：

```php
final class Creator implements CreateLabel, RetryLabel
{
    public function create(Shipment $shipment): void { /* ... */ }
    public function canInsurance(Shipment $shipment): bool { /* ... */ }
    public function retry(Shipment $shipment, ?array $retryTypes = null): void { /* ... */ }
}
```

`bpost` / `colissimo` / `fedex` / `ups` / `dpd` …… 全部沿用上述同构。差异点被收敛到 3 个文件中。

> **同构是有意的**：上层 `LabelGenerator::create()` 写死流程，`$creator` 必须能 `create / canInsurance / retry` —— 不实现就启动失败。这是用接口契约倒逼实现同构，省掉一堆 `instanceof`。

---

## 4. 配置驱动的注册表 —— Strategy 的真正"Context"

`express/carrier/src/CarrierManager.php` 是 Repository + Registry + Service Locator 的合体：

```php
final class CarrierManager
{
    public function getCarrierConfig(string $code, ?string $key = null): mixed;
    public function getCredentialsBuilder(string $code): ?CredentialsBuilder;
    public function getCarrierBuilder(string $code): ?CarrierBuilder;
    public function getProfilesBuilder(string $code): ?ProfilesBuilder;
}
```

承运商的"代码实现"用 YAML 注册：

```yaml
# express/carrier-bpost/etc/carrier.yaml
carriers:
  bpost:
    labels:
      creator: Express\CarrierBpost\Label\Creator
      request: Express\CarrierBpost\Label\Api\Request
      response: Express\CarrierBpost\Label\Api\Response
      ipn: Express\CarrierBpost\Label\Api\Ipn
    tracks:
      tracker: Express\CarrierBpost\Track\Tracker
```

外加 `registration.php` 把包挂上：

```php
use XiFu\ModuleManager\ModuleManager;
ModuleManager::register('carrier-bpost', __DIR__, 'Express\\CarrierBpost');
```

### 4.1 解析时发生了什么

`LogisticsOrder\Label\LabelManager::getCreator(string $code): ?CreateLabel`（伪代码）：

```php
public function getCreator(string $code): ?CreateLabel
{
    $cls = $this->carrierManager->getCarrierConfig($code, 'labels.creator');
    return $cls ? app($cls) : null;
}
```

注意：

1. **返回的是接口类型 `?CreateLabel`，不是 `?Creator`**。Manager 不暴露具体类。
2. **找不到时返回 `null`**——业务层用 `if (null === $creator) abort(404)` 接管，而不是抛一个"Unknown carrier"的异常掩盖语义。
3. **`getInstance()` 二级缓存**在 `AbstractCarrierManager` 中，避免同一 code 重复解析。

### 4.2 把流程图摆出来

```
                +-----------------------+
打单请求 ──►   | LabelGenerator::create|   <-- Template Method，负责编排
                +----------+------------+
                           │ 需要 $creator
                           ▼
                +-----------------------+
                | LabelManager::getCreator|
                +----------+------------+
                           │ 要 'bpost.labels.creator'
                           ▼
                +-----------------------+
                | CarrierManager        |  <-- Registry，按 code 查 YAML
                +----------+------------+
                           │ 返回 类名字符串
                           ▼
                +-----------------------+
                | app(类名)             |  <-- 容器解析（Strategy 实例化）
                +----------+------------+
                           ▼
                Express\CarrierBpost\Label\Creator
                （implements CreateLabel）
```

整条链路里**没有一个 `if ($code === 'bpost')`**。新增 `carrier-dhl`：

1. 新建包 `express/carrier-dhl`
2. 写 `Label/Creator`、`Track/Tracker`、`Label/Api/{Request,Response,Ipn}`
3. 写一行 `carriers.dhl.labels.creator: Express\CarrierDhl\Label\Creator`
4. 业务代码一行不改。

这就是 Strategy 的"开闭原则"——**对扩展开放，对修改关闭**。

---

## 5. 枚举 + match：策略内分支的现代写法

承运商差异经常落到**枚举 → 分支表**上。`LogisticsTracking\Enums\DeliveryStatus` 把上游返回的字符串收敛到枚举：

```php
$status = DeliveryStatus::from($carrierRawStatus);

// 上层只 match 自己的枚举
$bucket = match ($status) {
    DeliveryStatus::Delivered                  => 'done',
    DeliveryStatus::OutForDelivery             => 'active',
    DeliveryStatus::Exception, DeliveryStatus::Returned => 'failed',
    default                                    => 'unknown',
};
```

这一手也是 GoF Strategy 的"算法内部多态"——**枚举分支让同一个 Strategy 内部不再用 if/else**。

---

## 6. DPD 例外：Trait 组合替代多继承

`express/carrier-dpd/src/Label/Creator.php` 不写 `Label/Api/{Request,Response,Ipn}.php`，而是把"SOAP 调用能力"压成 Trait：

```php
class Creator implements CreateLabelContract
{
    use HasDpdApi, HasDpdLabel, HasOrder;
}
class Tracker implements LogisticsTracker
{
    use HasDpdApi, HasTrackingNumber {
        HasDpdApi::getRequestData as private baseRequestData;
    }
}
```

| Trait | 职责 |
|---|---|
| `HasDpdApi` | SOAP 客户端、Header、retry 代理 |
| `HasDpdLabel` | SOAP payload 拼装 |
| `HasOrder` / `HasTrackingNumber` | Order/Profile 访问器 |

Trait 冲突时用 `as private` 改名隔离。**这是 PHP 8.x 替代多继承的常见手法**，详情见 [`07-trait-mixin.md`](./07-trait-mixin.md)。

> 在 Strategy 视角下：DPD 没有走经典的"Creator 调用 Request/Response/Ipn 三个辅助对象"那套同构骨架，而是用 **trait 把能力压扁成单一类**。两种风格都符合 Strategy 接口契约。

---

## 7. 反模式（仓库外的常见踩坑）

1. **单个 Strategy 接口塞太多方法**。`CarrierStrategy::createTrackRetryInvoice()` 这种"超级接口"一旦出现，就是 SO L 大泥球前兆。本仓库把创建/重试/跟踪三件事拆成三个接口，正是为了避免这个。
2. **用 `if/else` 调度而不是 Registry**。即使每个策略实现得再干净，业务层一个大 if/else 就能让整套 Strategy 退化。
3. **直接 `new ConcreteStrategy`**。每多一个 new，未来想"换实现 + 加切面"就得翻天。本仓库所有 Strategy 都走 `app($cls)`，DI 替你注入装饰器、配置、缓存。
4. **让 Strategy 内部出现"上游特有常量"**。本仓库的 `TrackingInfo` 是值对象，不让外部看到 `BPOST_STATUS_42` 这种私有编码。

---

## 8. 30 秒最小复刻

```php
// 1) Strategy 接口
interface PaymentStrategy {
    public function charge(int $cents): string; // 返回 transaction id
}

// 2) 多个 ConcreteStrategy
final class StripePay  implements PaymentStrategy { /* ... */ }
final class AlipayPay  implements PaymentStrategy { /* ... */ }
final class WechatPay  implements PaymentStrategy { /* ... */ }

// 3) 注册表
final class PaymentRegistry {
    public function __construct(private array $map) {} // ['stripe' => StripePay::class, ...]
    public function get(string $code): ?PaymentStrategy {
        return isset($this->map[$code]) ? app($this->map[$code]) : null;
    }
}

// 4) Context：调用方只见接口
final class CheckoutService {
    public function __construct(private PaymentRegistry $registry) {}
    public function pay(string $code, int $cents): string {
        $strategy = $this->registry->get($code)
                  ?? throw new \DomainException("Unknown payment: $code");
        return $strategy->charge($cents);
    }
}
```

> 这就是 `LabelManager::getCreator($code)` 的同款心法：**接口、注册表、容器装配、零 if/else**。

---

## 9. 小结

- 本仓库的 Strategy **不靠 if/else**，靠 **接口 + 注册表 + 容器**。
- 每一个承运商实现都"很薄"，让差异收敛在 3 个接口里，业务层完全没有承运商条件分支。
- 想给 Strategy 加横切能力（日志 / 重试 / 配额）：**默认走端口，必要处上一把装饰器**（参见 [`01-decorator.md`](./decorator.md)）。
- 接下来 [`03-factory-registry.md`](./03-factory-registry.md) 会展开 Registry 与 Service Locator 的取舍。

> 上一篇：[`01-decorator.md`](./decorator.md)｜下一篇：[`03-factory-registry.md`](./03-factory-registry.md)
