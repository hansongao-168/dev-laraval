# 适配器 / 端口（Adapter & Port）实战精讲
## —— `SpiOrder\Contracts\*Port` ↔ `Carrier*\V2\Adapter\*Adapter` 的真正六边形边界

> **核心结论**：本仓库的接口归属是**反向的**——业务层定义 Port（`SpiOrder\Contracts\*`），adapter 在承运商包内实现 Port。**这是 Robert C. Martin "Stable Abstractions Principle" 的字面实现**。

---

## 1. 名词澄清

- **Adapter（对象适配器）**：把一个已有的类的接口转成客户期望的另一个接口。
- **Port（在六边形架构中）**：业务域定义的"我能与外部世界发生什么关系"的接口。
- **Adapter（端口实现）**：某个外部系统的具体适配者，实现 Port。

> 名词重叠不可避免。我们约定：**`SpiOrder\Contracts\*Port` 是"端口"**，**`Carrier*\V2\Adapter\*` 是"适配器"**。

---

## 2. 仓库里的端口清单

`express/spi-order/src/Contracts/`：

| 端口 | 职责 | 典型方法签名 |
|---|---|---|
| `OrderToShipmentPort` | 把上游 Order 转成承运商 Shipment | `toShipment(OrderSource $src): Shipment` |
| `LabelPersistencePort` | 标签数据的持久化 | `persist(PersistSpec $spec): void` |
| `OrderDocumentRulePort` | "这条订单是否需要发票/关单等文档" | `matches(ShipmentSource $src): bool` |
| `DocumentUploaderPort` | 上传文档到承运商 | `upload(UploadJob $job): UploadResult` |
| `LoggerPort` | 日志（框架无关） | `info(string $code, string $msg, array $ctx = []): void` |
| `TokenResolverPort` | 拿 OAuth2 token | `resolve(string $code, string $acct, bool $refresh): string` |

> **关键观察**：所有端口都定义在 SPI 包里，**不依赖 Laravel**、**不依赖 Eloquent**、**不依赖具体承运商**。`SpiOrder\Dto\ShipmentSource` 甚至是 `final readonly` + 构造期校验的不可变值对象。

`express/spi-order/etc/architecture.md` 还规定了：

> *V2 只能依赖 `Express\SpiOrder\*` + `Express\Carrier\*` + Laravel 框架。*
> *禁止 `use Express\LogisticsOrder\*` 与 `Express\CarrierUps\Label\*` 等上层模型。*

这是经典"**反向依赖：细节依赖抽象**"。

---

## 3. 端口与适配器的对照（以 `OrderDocumentRulePort` 为例）

### 3.1 端口

```php
interface OrderDocumentRulePort
{
    public function matches(ShipmentSource $source): bool;
}
```

### 3.2 规则策略（仍然是接口，但跟外部系统的差异点解耦）

```php
final class OutreMerDestinationRule
{
    public function matches(ShipmentSource $source): bool
    {
        // 海外目的地规则：纯领域逻辑，不依赖任何外部服务
    }
}
```

### 3.3 适配器（位于 `carrier-colissimo/src/V2/Adapter/`）

```php
final class LaravelOrderDocumentRuleAdapter implements OrderDocumentRulePort
{
    public function __construct(
        private readonly OutreMerDestinationRule $rule = new OutreMerDestinationRule(),
    ) {}

    public function matches(ShipmentSource $source): bool
    {
        return $this->rule->matches($source);
    }
}
```

### 3.4 适配器在装配点被绑到接口

`carrier-colissimo/src/V2/ServiceProvider.php`：

```php
$this->app->bind(
    OrderDocumentRulePort::class,
    LaravelOrderDocumentRuleAdapter::class,
);
```

> **绑定只发生在承运商包自己的 `ServiceProvider`**——其他模块对这条绑定一无所知。这是 Repository 模式的"插件式安装"。

---

## 4. UPS V2 的多 Adapter 全景

`express/carrier-ups/src/V2/`：

```
src/V2/
├── Adapter/
│   ├── CachedTokenResolver.php         # 装饰器，包裹任意 TokenResolverPort
│   ├── EloquentOrderRepository.php     # 实现 OrderToShipmentPort
│   ├── HttpUpsShippingClient.php       # 实现 ShippingClientPort
│   └── ...                             # 其他 Adapter 都 here
├── Http/
│   ├── UpsShippingApiClient.php        # 真正 HTTP 调用方
│   └── PendingRequestFactory.php
├── Dto/{Shipment, TrackingEvent, ...}  # final readonly VO
└── ServiceProvider.php                 # 装配所有 Port -> Adapter
```

依赖方向：

```
Domain Use Case   ──依赖于──>   SpiOrder\Contracts\* (Port)
                                       ▲
                                       │ 实现
                                       │
Adapter (carrier-ups/src/V2/Adapter)   ──依赖于──>   Laravel/Eloquent/UPS API
```

业务层在编译期只能看见接口，**运行期通过容器解析出哪个适配器**——这是六边形能"换实现但不换业务"的根本原因。

---

## 5. 端口 vs 适配器 的契约方向

| 谁拥有接口 | 谁实现接口 | 谁持有"谁" | 含义 |
|---|---|---|---|
| 业务层（SPI） | Adapter（基础设施层） | **业务层不知道 Adapter** | Stable Abstractions Principle |
| Adapter 自己 | Adapter | — | 退化为 Adapter 自己玩，无 Port |
| 业务层（SPI） | 业务层 | — | **错误**：业务层依赖自己 |

> **本仓库属于第一行**，这是为啥 SPI 包**完全空 Service Provider** 也"没事"：它不需要知道谁实现了自己。

---

## 6. 适配器 vs 装饰器 vs 策略：易混点

| 模式 | 持有谁 | 多态机制 | 增强是否叠加 |
|---|---|---|---|
| Adapter | 外部系统 SDK（无极） | 接口多态 | 否（同一接口多实现） |
| Decorator | 同一接口对象 | 接口多态 | 是（洋葱皮叠加） |
| Strategy | 同一接口对象 | 接口多态 + Registry | 否（按 code 选一） |

> Adapter 跟 Decorator 都"实现同一接口"，差别在 **Adapter 持有 SDK**，**Decorator 持有同接口**。本仓库有清楚的边界：**`Adapter/` 目录只放 Adapter，`CachedTokenResolver` 这种放在 Adapter 目录里是因为它"恰好也是"既实现 Port 又装饰 Port 的复合体**（其外部行为是装饰器，目录命名遵循历史惯例）。

---

## 7. 反模式（仓库外的常见踩坑）

1. **适配器把外部系统的常量泄漏进 DTO**。比如 `UpsStatusCode::SHIPPED -> 42` 写进 `TrackingInfo`。本仓库的 `TrackingInfo` 是领域 VO，绝不透传 UPS 私码（参见 [`02-strategy.md`](./02-strategy.md)）。
2. **Adapter 直接 `new` 上游 SDK**。正确写法：把 SDK 客户端藏在 DI 容器里，单例化，**不让 Adapter 决定连哪个 base url、拿哪个 token**。
3. **Port 引入太多"易变"的方法签名**。每一次 Port 加签名，下游所有 Adapter 都要改 —— 仓库的 `OrderToShipmentPort::matches(ShipmentSource)` 这种 1-方法 + 不可变 VO 的设计，就是抗这种动摇的。
4. **接口归属错位**。把接口写在承运商包里，业务层去 `use` 它的接口，等于把业务层硬编码到该承运商。仓库通过 SPI 包强制接口位置。

---

## 8. 30 秒最小复刻

```php
// 1) 端口（业务层定义）
namespace Billing\Contracts;
interface PaymentPort {
    public function charge(Money $amount): string; // tx id
}

// 2) 不可变 DTO
final readonly class Money {
    public function __construct(public int $cents, public string $currency) {}
}

// 3) 适配器（在具体支付包内）
namespace Payment\Stripe\Adapter;
final class StripePaymentAdapter implements PaymentPort {
    public function __construct(private \Stripe\StripeClient $stripe) {}
    public function charge(Money $amount): string {
        return $this->stripe->charges->create([...])->id;
    }
}

// 4) 装配（Payment\Stripe\ServiceProvider）
$this->app->bind(PaymentPort::class, StripePaymentAdapter::class);

// 5) 业务
final class CheckoutService {
    public function __construct(private PaymentPort $payments) {}
    public function pay(Money $m): string { return $this->payments->charge($m); }
}
```

> 这就是仓库六边形架构的同款心法：**业务层只见 Port、装配在 Adapter 侧、谁换谁新**。

---

## 9. 小结

- 端口（`SpiOrder\Contracts\*`）= 业务用接口，**不依赖 Laravel**。
- 适配器（`Carrier*\V2\Adapter\*`）= 业务无关，**实现 Port**。
- 业务层不知道 Adapter 存在；Adapter 不"反向依赖"业务层。
- 这就是为什么装饰器链被"压制" —— **能力扩展靠换 Adapter，而不是叠 Decorator**。

> 上一篇：[`03-factory-registry.md`](./03-factory-registry.md)｜下一篇：[`05-template-method.md`](./05-template-method.md)
