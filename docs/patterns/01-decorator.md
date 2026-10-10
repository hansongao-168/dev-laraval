# 装饰器模式（Decorator）实战精讲
## —— UPS V2 的 `CachedTokenResolver`，以及为什么装饰链在这里被"压制"

> **核心结论放最前**：本仓库的真实 GoF 装饰器实现只有一处 `CachedTokenResolver`；其他能力增强（重试、日志、ACL、指标…）全部通过 **六边形接口 + DI 容器**完成，而不是层层包裹。本章既讲装饰器本身，也讲为什么这种"克制"是值得的。

---

## 1. 经典定义（GoF）

装饰器模式：在**不改变原有对象接口**的前提下，**动态**给对象附加职责。装饰器与被装饰对象实现**相同接口**，并**持有**一个同接口的对象，所有"额外行为"在外层装饰器里完成，内层对象对此**完全无感知**。

四个角色：

| 角色 | 含义 |
|---|---|
| **Component** | 抽象接口，声明所有可被装饰的方法 |
| **ConcreteComponent** | 默认实现，也是被装饰的"最里层"对象 |
| **Decorator** | 也实现 Component；内部持有 Component；通常把请求转发给它，再加"前/后/异常包装" |
| **ConcreteDecorator** | 真正干活的装饰（缓存、重试、日志…） |

教科书心智图：把 `ConcreteComponent` 想象成一个洋葱芯，`Decorator` 是洋葱皮，可以多层任意嵌套，调用方拿到的是最外层皮。

---

## 2. 仓库里那一处真实装饰器：`CachedTokenResolver`

### 2.1 组件抽象（Component）

`express/spi-order/src/Contracts/TokenResolverPort.php`：

```php
namespace Express\SpiOrder\Contracts;

interface TokenResolverPort
{
    public function resolve(string $carrierCode, string $accountKey, bool $refresh = false): string;
}
```

接口只有**一个**方法 `resolve()`。这是非常关键的细节：装饰器只在"小而稳定的接口"上才有红利。接口越大、字段越多，装饰器得一行一行透传，复杂度陡升。

### 2.2 默认实现（ConcreteComponent）

`express/carrier-ups/src/V2/Http/UpsShippingApiClient.php` 里依赖的是抽象：

```php
final class UpsShippingApiClient
{
    public function __construct(
        private readonly TokenResolverPort $tokenResolver,
        private readonly string $baseUrl = 'https://api.ups.com',
    ) {}

    public function ship(string $accountKey, string $requestBody, array $options): array
    {
        try {
            $token = $this->tokenResolver->resolve('ups', $accountKey, false);
        } catch (\Throwable $e) {
            throw new V2TokenException('Token acquire failed', ['carrierCode' => 'ups'], $e);
        }
        return $this->client($baseUrl, $token)
                   ->post('api/shipments/v2403/ship', $requestBody)
                   ->decode();
    }
}
```

> 注意 **`UpsShippingApiClient` 只依赖 `TokenResolverPort`，不知道外面有没有人装饰它**。这是装饰器能"透明生效"的前提——也称 **OCP**：调用方对增强完全关闭，对扩展开放。

### 2.3 装饰器（ConcreteDecorator）

`express/carrier-ups/src/V2/Adapter/CachedTokenResolver.php`（**全文 30 行**）：

```php
final class CachedTokenResolver implements TokenResolverPort
{
    /** @var array<string,string> */
    private array $cache = [];

    public function __construct(private readonly TokenResolverPort $resolver) {}

    public function resolve(string $carrierCode, string $accountKey, bool $refresh = false): string
    {
        $key = $carrierCode . ':' . $accountKey;

        if ($refresh) { unset($this->cache[$key]); }

        if (isset($this->cache[$key])) {
            return $this->cache[$key];                  // <-- 装饰：返回缓存
        }

        try {
            $token = $this->resolver->resolve($carrierCode, $accountKey, $refresh);
        } catch (\Throwable $e) {
            throw new V2TokenException('Token resolution failed: ' . $e->getMessage(), [], $e);
        }

        if ($token === '') {
            throw new V2TokenException('Token resolver returned empty string.');
        }

        return $this->cache[$key] = $token;             // <-- 委托 + 缓存增强
    }

    public function forget(string $carrierCode, string $accountKey): void
    {
        unset($this->cache[$this->key($carrierCode, $accountKey)]);
    }
}
```

逐行对照 GoF 四角色：

| 角色 | 在 `CachedTokenResolver` |
|---|---|
| **Component** | `TokenResolverPort` (接口) |
| **ConcreteComponent** | 真去拿 Token 的实现（容器里另一个 `TokenResolverPort` 绑定） |
| **Decorator** | 类本身（`implements TokenResolverPort` + 构造注入 `TokenResolverPort`） |
| **ConcreteDecorator** | 装饰的具体增强：**进程内缓存 + 异常重包 + 空值校验** |

### 2.4 装饰器的"装配点"（不是装饰器本身的代码）

`express/carrier-ups/src/V2/ServiceProvider.php`：

```php
public function register(): void
{
    // ... 其他绑定
    $this->app->singleton(CachedTokenResolver::class);
    $this->app->singleton(UpsShippingApiClient::class);
}
```

> 这就是装饰器之所以"成立"的关键：**依赖容器替我们完成"把 ConcreteComponent 包进 Decorator，再注入到调用方"的工作**。如果用 new 手写，团队很快会变成：

```php
$real  = new HttpTokenResolver($http);
$cache = new CachedTokenResolver($real);
// 还想加重试？
$retry = new RetryableTokenResolver($cache);
// 还想加日志？
$logged = new LoggingTokenResolver($retry);
$client = new UpsShippingApiClient($logged);   // <-- 洋葱皮堆叠
```

而采用装饰器 + 容器：

```php
// 容器里：TokenResolverPort -> CachedTokenResolver( wrapping HttpTokenResolver(...) )
$this->app->singleton(TokenResolverPort::class, function () {
    return new CachedTokenResolver(new HttpTokenResolver(...));
});
$this->app->singleton(UpsShippingApiClient::class); // 自动注入上面对应的 TokenResolverPort
```

调用方从此不关心"外面有多少层皮"。

### 2.5 测试：怎么证明装饰器真的"透明"

`express/carrier-ups/tests/V2/CachedTokenResolverTest.php`（摘选）：

```php
public function testCachesTokenPerKey(): void
{
    $ports = new FakePorts(token: 'tk-1');            // FakePorts 也 implements TokenResolverPort
    $cached = new CachedTokenResolver($ports);        // 用 FakePort 替换真组件，无需网络

    self::assertSame('tk-1', $cached->resolve('ups', 'acc-1'));
    self::assertSame('tk-1', $cached->resolve('ups', 'acc-1'));
}

public function testForgetsOnRefresh(): void
{
    $ports = new FakePorts(token: 'tk-1');
    $cached = new CachedTokenResolver($ports);
    $cached->resolve('ups', 'acc-1');
    $cached->resolve('ups', 'acc-1', refresh: true);  // 这次不该命中缓存
    self::assertSame(2, $ports->calls);               // Fake 端真的被第二次调到
}

public function testWrapsExceptions(): void
{
    $ports = new FakePorts(throws: new \RuntimeException('upstream 500'));
    $cached = new CachedTokenResolver($ports);
    $this->expectException(V2TokenException::class);
    $cached->resolve('ups', 'acc-1');
}
```

> 测试里看不到任何 "我装饰了你" 的痕迹：换成 **任何** `TokenResolverPort` 实现，装饰器都能工作 —— 这就是 **Liskov + 装饰器** 的并发红利。

### 2.6 一张工厂图：原对象的请求路径

```
HTTP 请求
   │
   ▼
UpsShippingApiClient::ship()
   │  need TokenResolverPort::resolve()
   ▼
[Container 解析：TokenResolverPort => CachedTokenResolver( HttpTokenResolver )]
   │
   ▼                       ┌──────────────────┐
Cache 命中？ ── 是 ───────►│ 直接返回         │
   │                       └──────────────────┘
   │ 否
   ▼
CachedTokenResolver::resolve()
   │
   ▼
HttpTokenResolver::resolve()  ◄── 真正的 OAuth2 客户端
   │
   ▼
   [缓存，写回 CachedTokenResolver 的私有数组]
```

调用方从头到尾都看不到外层那一圈。完美贴合 GoF 原句："Attach additional responsibilities to an object dynamically."

---

## 3. 仓库为什么"克制"装饰链？

回答这个问题，等于一次反向教学：能写 ≠ 该写。下表是本仓库的**取舍账**：

| 想要的能力 | 用装饰器？ | 用六边形 + DI？ | 本仓库选择 | 理由 |
|---|---|---|---|---|
| 进程内缓存 | ✅ 干净 | ✅ 直接换实现 | **DI 直接换**（`CachedTokenResolver` 是唯一例外） | 仅一处需要，避免装饰层蔓延 |
| 异常包装 | ✅ 干净 | ✅ 直接在 Port 实现里加 | **Port 实现里加** | 装饰器会让"在哪一层抛"成谜 |
| 日志 | ✅ 干净 | ✅ 用专门的 `LoggerPort` | **`LoggerPort` + Adapter** | 沿用 `LaravelColissimoLogger` 这类命名更易读 |
| 重试 | ✅ 干净 | ✅ `while + maxAttempts` | **`ColissimoDocumentPipeline::run()` 内置** | 重试语义跟业务流程强绑定，离开上下文就没意义 |
| 节流 / 配额 | ✅ 干净 | ✅ 单独一个 Port | **由 `TrackingManager::getTrackRateLimit()` 注入** | 配额是策略，多承运商差异大，装饰器只能"通用化平均" |
| ACL / 信封隔离 | — | ✅ **必须六边形** | **必六边形**（`PrintLabel::supplement`） | 跨包语义做不到"在原对象外绕一圈" |

> 仓库里你能搜到的所有 `Pipeline` 关键字都是 **Laravel `\Illuminate\Pipeline`** —— 0 命中。`ColissimoDocumentPipeline` 名字里有 "Pipeline"，但本质是**手写串联 4 个 Service**，没有 `$next($payload)` 调用链，**不属于**装饰器管道。

**结论**：本仓库的"能力增强"被你拆成"是不是能装在原对象外面"两类。

- **原对象外能装（缓存、签名、轻度切面）** → 装饰器。
- **跨业务流、跨包、跨承运商差异大的（ACL / 重试 / 配额 / 日志）** → 端口抽象，让容器替你决定"戴哪张面具"。

---

## 4. 装饰器 vs. 端口的决策小抄

| 维度 | 装饰器 | 端口 + DI |
|---|---|---|
| 抽象粒度 | 单方法 / 小接口 | 一个能力域（解析 Token、发请求、上传文档…） |
| 增强叠加方式 | 嵌套包装（洋葱皮） | 容器里换实现 / 用另一 Port 注入 |
| 配置可读性 | 必须翻代码才知道有几层 | 一眼看出谁注入谁 |
| 调试栈 | 洋葱皮难追 | 容器 + 显式 trace 名 |
| 适用规模 | 小切面（缓存、计时、单点装饰） | **能力域级**增强或替换 |
| 测试便利 | 同接口替身可直接套 | 端口有 mock、容器有 binding 替身 |

> 一句话：**装饰器是"接口多态的局部放大版"，端口是"接口多态的体系版"**。两者并不互斥，本仓库的实际选择是"默认走端口，必要的地方用一把装饰器"。

---

## 5. 装饰器反模式（仓库外的常见踩坑）

1. **接口超大时硬上装饰器**。例如给一个有 20 个方法的接口做装饰：你得为每个方法"是否要增强"做决策，结果装饰器比原对象还长。仓库 `TokenResolverPort` 只有 1 个方法，**这是装饰器存在的必要条件**。
2. **装饰器里塞重试 + 超时 + 限流 + 日志 + 指标**。每加一层，"层"自身的状态（重试次数、是否熔断）需要驱动下一层，最后成一团糟。本仓库把这些拆成独立端口。
3. **依赖硬编码 `new ConcreteComponent()`**。一旦在装饰器构造里 `new` 一个具体组件，装饰器就再也装饰不了别人。这是为什么 `CachedTokenResolver::__construct(TokenResolverPort $resolver)` **只接接口**。
4. **用抽象基类代替接口**。GoF 装饰器明确用接口/抽象类分离"装饰/被装饰"，PHP 习惯用接口 + `final class` 是更克制的写法。

---

## 6. 30 秒最小复刻（可直接抄到任何 Laravel 项目）

```php
// 1) 抽象
interface RateLimiterPort {
    public function attempt(string $key): bool;
}

// 2) 真正实现
final class RedisRateLimiter implements RateLimiterPort {
    public function attempt(string $key): bool { /* Lua 限流 */ }
}

// 3) 装饰器：失败时不抛，而是退避重试
final class RetryingRateLimiter implements RateLimiterPort {
    public function __construct(
        private RateLimiterPort $inner,
        private int $maxAttempts = 3,
    ) {}
    public function attempt(string $key): bool {
        for ($i = 1; $i <= $this->maxAttempts; $i++) {
            if ($this->inner->attempt($key)) return true;
            usleep(50_000 * $i);
        }
        return false;
    }
}

// 4) 装配
$this->app->singleton(RateLimiterPort::class, function () {
    return new RetryingRateLimiter(new RedisRateLimiter(...), 3);
});

// 5) 调用方：只认接口，零修改
class CheckoutController {
    public function __construct(private RateLimiterPort $limiter) {}
    public function placeOrder(Request $r) {
        if (! $this->limiter->attempt('order:' . $r->user()->id)) abort(429);
    }
}
```

> 上面这段就是 `CachedTokenResolver` 的同款心法：**接口 + 构造函数持接口 + 调用方零感知 + 容器装配**。

---

## 7. 小结

- 本仓库装饰器的存在意义：**作为"小切面增强"的一处活教材**，不是"全用装饰器构造业务"的范本。
- 配合 `hexagonal.md` 阅读，你会明白：本仓库的设计哲学是"装饰器只在它真合适的地方出现，其余交给端口与 DI"。
- 当你想在自己的项目里决定"该不该写装饰器"时，回到第 4 节那张决策小抄 —— **先看增强是"原对象外能装"还是"跨业务流"**，再下笔。

> 下一篇：[`02-strategy.md`](./02-strategy.md)（承运商"打单/打单重试/轨迹"三套接口 + Registry 分发）。
