# 工厂 / 注册表（Factory & Registry）实战精讲
## —— `CarrierManager` 把"按 code 解析实现"做成配置驱动的可插拔系统

> **核心结论**：本仓库把 GoF Factory Method 与"Registry + Service Locator"嫁接起来：用 YAML 注册类名 + 用容器实例化。**业务层永远只见接口、不见字符串**。

---

## 1. 经典定义与边界

- **Factory Method**（GoF）：定义一个"创建对象的接口"，让子类决定实例化哪个类。
- **Abstract Factory**（GoF）：创建"产品族"的工厂接口。
- **Registry / Service Locator**（POSA、 Fowler "Patterns of Enterprise Application Architecture"）：通过某种索引（字符串、枚举、对象）查对象实现。

仓库实际上用的是 **Factory + Registry + Lazy Service Locator** 的杂交体：

- **Factory**：每个承运商包写一个"工厂方法"藏在 `app($cls)` 后面（容器就是那个万能工厂）。
- **Registry**：YAML 把 code → 类名注册表化。
- **Service Locator**：`CarrierManager::getInstance()` 通过缓存避免重复解析。

> 没有继承层级的 Factory 子类，因为 PHP/Laravel 的容器已经"替你决定实例化哪个类"。

---

## 2. 仓库里的三段式 Registry

### 2.1 第一层：YAML 配置

`express/carrier-bpost/etc/carrier.yaml`：

```yaml
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

> "点号路径" `labels.creator` 是 `CarrierManager::getCarrierConfig()` 的标准查询写法。

### 2.2 第二层：模块注册

每个承运商包根目录 `registration.php`：

```php
use XiFu\ModuleManager\ModuleManager;
ModuleManager::register('carrier-bpost', __DIR__, 'Express\\CarrierBpost');
```

### 2.3 第三层：Manager 解析

`express/carrier/src/CarrierManager.php`（简化）：

```php
final class CarrierManager
{
    public function __construct(private ConfigRepository $configs) {}

    /** 点号路径：'labels.creator'、'tracks.tracker' */
    public function getCarrierConfig(string $code, ?string $key = null): mixed
    {
        $tree = $this->configs->get("carriers.$code");
        if (null === $key) return $tree;
        return data_get($tree, $key);   // Laravel 的 data_get 同样支持点号
    }

    public function getCredentialsBuilder(string $code): ?CredentialsBuilder { /* ... */ }
    public function getCarrierBuilder(string $code): ?CarrierBuilder { /* ... */ }
    public function getProfilesBuilder(string $code): ?ProfilesBuilder { /* ... */ }
}
```

加上二级缓存 `AbstractCarrierManager::getInstance()`：同一 code 在同一请求里只解析一次。

---

## 3. 与"工厂 + 容器"组合

承运商包内通常有一个 `CarrierXxxServiceProvider`：

```php
public function register(): void
{
    $this->app->singleton(\Express\CarrierBpost\Panel\CredentialsBuilder::class);
    $this->app->singleton(\Express\CarrierBpost\Label\Creator::class);
}
```

业务层只需要：

```php
final class LabelManager
{
    public function getCreator(string $code): ?CreateLabel
    {
        $cls = $this->carrierManager->getCarrierConfig($code, 'labels.creator');
        return $cls ? app($cls) : null;        // <-- 工厂方法在这里
    }
}
```

> **`app($cls)` 就是"参数化工厂"**：你给我类名，我负责构造；我（容器）还允许你在构造前注入装饰器、mock 替身、配置。这是 Laravel 体系对 GoF Factory Method 的最大改造。

---

## 4. 实战：在 `LogisticsTracker` 上的端到端链路

```
请求 GET /api/track/{code}/{number}
  │
  ▼
TrackingController::__invoke($code, $number)
  │
  ▼
TrackingManager::getTracker($code): ?LogisticsTracker
  │
  │ 解析过程:
  │  1) CarrierManager::getCarrierConfig($code, 'tracks.tracker') => 'Express\CarrierBpost\Track\Tracker'
  │  2) app('Express\CarrierBpost\Track\Tracker') => Tracker 实例
  │  3) 返回类型 ?LogisticsTracker （接口）
  │
  ▼
LogisticsTracker::getTrackingInfo($number, $account)   // 业务只见接口
  │
  ▼
Express\CarrierBpost\Track\Tracker::getTrackingInfo(...)  // 真去做 HTTP 调用
```

> **业务代码不知道代码是哪个具体类**，只跟 `LogisticsTracker` 接口打交道。这保证了：承运商实现既可以"运行时换"（`MockTracker` 单元测试），又可以"编译期换"（真的接 UPS）。

---

## 5. 注册表（Registry） vs 服务定位器（Service Locator）的取舍

| 维度 | 纯 Registry | 纯 Service Locator | 本仓库 |
|---|---|---|---|
| 解析时机 | 配置加载时 | 调用时 | 调用时 + 二级缓存 |
| 容器依赖 | 无 | 强 | 强 |
| 字符串路径 | 需要 | 不需要 | 需要（`labels.creator`） |
| 调试可读性 | 高（搜 YAML 即得） | 低 | **高**（YAML + 缓存键） |
| 单元测试替身 | 替换 YAML | binding 替身 | **两种都行** |
| 误用风险 | 反序列化复杂对象 | 全局调用难追 | 同样存在，被接口契约收口 |

> 仓库的可读性主要来自 **"字符串索引 = 类名 + 路径"在 YAML 里就能看到**：你可以只在编辑器里打开 `carrier-dhl/etc/carrier.yaml`，不必读 PHP 代码就大致知道这个承运商有多少 Strategy 类。

### 5.1 Registry 的另一种演进形态

`gz168/Carrier/src/Infrastructure/Adapters/InMemoryCarrierRegistry.php`：

```php
final class InMemoryCarrierRegistry implements CarrierRegistry
{
    public function __construct(private array $drivers) {}  // ['ups' => fn($env) => [...]]

    public function driver(string $code): callable
    {
        if (!isset($this->drivers[$code])) {
            throw new InvalidArgumentException("Unknown carrier code: {$code}");
        }
        return $this->drivers[$code];
    }
}
```

这里 `drivers` 是**闭包数组**而不是类名 —— 闭包当 Strategy 对象，用数组当 Registry。零依赖、零反序列化，**特别适合单进程、纯函数、可测试的承运商实现**。两者本质上等价于"代码即配置"，区别只是数据来源。

---

## 6. 反模式（仓库外的常见踩坑）

1. **跨业务分散 if/else**。`if ($code === 'bpost') { $x = new BpostCreator(); } elseif ($code === 'ups') { ... }` 是经典反模式，本仓库从不出现。
2. **每个调用点自己 `app(类名)`**。一旦在 `Controller`、`Service` 顶头写 `app('Express\\CarrierBpost\\Label\\Creator')`，新承运商上线就得全局搜索替换。本仓库把 `app($cls)` 集中在 `LabelManager::getCreator()`。
3. **YAML 中放逻辑**。YAML 只放类名字符串，**不放闭包、不放参数**，否则会演化成"配置即脚本"。
4. **让 Registry 直接 `return $instance`**。应该返回"如何拿实例"的句柄（类名或 callable），由调用方在合适的生命周期内决定是否实例化，依赖容器替我们管理单例。

---

## 7. 30 秒最小复刻

```php
// 1) 配置（也可以是 JSON、PHP 数组）
$registry = [
    'alipay' => PaymentAlipay::class,
    'wechat' => PaymentWechat::class,
];

// 2) 注册表
class PaymentRegistry {
    public function __construct(private array $map) {}
    public function driver(string $code): ?PaymentStrategy {
        return isset($this->map[$code]) ? app($this->map[$code]) : null;
    }
}

// 3) 工厂方法（容器就是）
// app(PaymentAlipay::class)  ← 容器替你处理单例/依赖注入

// 4) 调用方
class Checkout {
    public function __construct(private PaymentRegistry $r) {}
    public function pay(string $code, int $cents): string {
        return $this->r->driver($code)?->charge($cents)
               ?? throw new \DomainException("Unknown: $code");
    }
}
```

> 这就是 `CarrierManager + Manager + 容器` 的同款心法。

---

## 8. 小结

- **Factory**：容器担任，所有 `app($cls)` 就是"参数化工厂"。
- **Registry**：YAML 提供索引，Manager 负责解析。
- **Service Locator**：被接口收口到 Manager / Registry 这几处，业务层根本不接触。
- 新增承运商 = "写一个类 + 改一行 YAML"，**完全零侵入**。

> 上一篇：[`02-strategy.md`](./02-strategy.md)｜下一篇：[`04-adapter-port.md`](./04-adapter-port.md)
