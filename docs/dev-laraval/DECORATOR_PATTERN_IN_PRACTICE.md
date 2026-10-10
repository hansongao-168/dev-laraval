# 装饰模式实战精讲 — gz168 项目版

> 装饰模式（Decorator Pattern）是结构型模式中最容易「用错」的一个：
> 它和适配器长得像、和策略混着用容易上头、和继承的边界一旦模糊就会失控。
> 本章用 `gz168/` 现有模块作为演练场，把装饰模式讲清楚、讲落地、讲边界。

---

## 1. 装饰模式的本质

**意图**：动态地给对象添加职责；既不改变原类，也不靠继承爆栈。

**四个角色**（GoF）：

| 角色 | 职责 |
|------|------|
| Component | 抽象构件，定义可被装饰的操作 |
| ConcreteComponent | 原始实现 |
| Decorator | 持有 Component 引用，同时实现 Component 接口 |
| ConcreteDecorator | 真正添加的附加职责 |

**类结构（教科书）**：

```
interface Component { operation(); }
class ConcreteComponent implements Component { operation() { … } }
abstract class Decorator implements Component {
    protected Component $inner;
    public function __construct(Component $inner) { $this->inner = $inner; }
    public function operation() { $this->inner->operation(); }
}
class ConcreteDecoratorA extends Decorator {
    public function operation() {
        $this->before();
        $this->inner->operation();
        $this->after();
    }
}
```

**两条铁律**：

1. 装饰器必须实现和被装饰对象**同一个接口**（或继承同一个抽象类）。
2. 装饰器**包裹**另一个同类对象，并**透传 + 增强**调用。

违反任何一条，就退化成适配器或策略。

---

## 2. 装饰 vs 适配器 vs 策略（最容易混淆的三兄弟）

| 维度 | Decorator | Adapter | Strategy |
|------|-----------|---------|----------|
| 目的 | 增强已有行为 | 转换接口 | 切换算法 |
| 接口 | 与被装饰对象**相同** | 与目标接口**相同** | 由上下文决定 |
| 数量 | 可叠加多层 | 通常一对一 | 一族可选一 |
| 关系 | 「is-a」+ 「has-a」同一 Component | 「is-a」Target + 「has-a」Adaptee | 「has-a」Strategy（成员） |
| 触发条件 | 想给原有行为**加东西** | 想让**不兼容的类**协同工作 | 想在运行时**换算法** |

记忆口诀：

- **加东西** → Decorator
- **换协议** → Adapter
- **换算法** → Strategy

---

## 3. 项目里的「真装饰」候选

把 gz168 现有模块逐个过一遍，看哪些场景天然适合装饰器：

| 候选场景 | 当前实现 | 是否真装饰 | 备注 |
|---------|---------|-----------|------|
| `GmailTransport` / `QqMailTransport` 注入日志/重试 | 直接写 Http 客户端 | **否**（属于适配器） | 第三方 SDK 接口与内部接口一致 |
| `MailOutbound\SendMailJob` 加重试/限速 | `tries` + `backoff` + `WithoutOverlapping` | 部分（基础设施已支持） | Laravel 队列中间件就是装饰链 |
| `ModeStrategyRegistry` 套缓存/装饰 | 直接 `new` 策略 | **是** | 策略外面套一层缓存装饰器 |
| `OutboundTransportInterface::send` 套审计/限流 | Job 内直发 | **是** | 在 Action 层套一层审计装饰 |
| `OrderStateMachine` 套事件/审计 | Action 内手动派发事件 | 部分 | 装饰器可承担事件派发 |

下面挑两个最值得落地的：策略缓存装饰、传输审计装饰。

---

## 4. 实战一：策略缓存装饰器（CachingPricingPolicy）

### 4.1 动机

`PricingPolicy::resolve()` 在结账路径上可能被反复调用。直接打底层 `PricingResolverContract` 会反复查数据库/外部定价服务。
我们想：**不修改 `B2cPricingPolicy` 也不修改接口**，就给所有策略加一层缓存。

### 4.2 设计

```text
Component      : PricingPolicy
Concrete       : B2cPricingPolicy / B2bPricingPolicy / DefaultPricingPolicy
Decorator      : abstract CachingPricingPolicy
ConcreteDecorator : DatabaseCachingPricingPolicy
```

### 4.3 代码实现（建议在 `gz168/MallCore/src/Strategy/Decorator/` 新建）

```php
// gz168/MallCore/src/Strategy/Decorator/CachingPricingPolicy.php
namespace Gz168\MallCore\Strategy\Decorator;

use Gz168\MallCore\Strategy\PricingPolicy;
use Gz168\MallCore\ValueObjects\Money;
use Gz168\MallCore\ValueObjects\PartyContext;
use Gz168\MallCore\ValueObjects\Quantity;

abstract class CachingPricingPolicy implements PricingPolicy
{
    public function __construct(
        protected PricingPolicy $inner,
        protected int $ttlSeconds = 60,
    ) {}

    public function resolve(string $sku, ?PartyContext $buyer, Quantity $qty): Money
    {
        $key = $this->cacheKey($sku, $buyer, $qty);

        $cached = $this->cache()->get($key);
        if ($cached instanceof Money) {
            return $cached;
        }

        $money = $this->inner->resolve($sku, $buyer, $qty);
        $this->cache()->put($key, $money, $this->ttlSeconds);

        return $money;
    }

    abstract protected function cache(): \Illuminate\Contracts\Cache\Repository;

    private function cacheKey(string $sku, ?PartyContext $buyer, Quantity $qty): string
    {
        return sprintf(
            'pricing:%s:%s:%d:%s',
            $sku,
            $buyer?->id ?? 'guest',
            $qty->value,
            $qty->unit->value,
        );
    }
}
```

```php
// gz168/MallCore/src/Strategy/Decorator/DatabaseCachingPricingPolicy.php
namespace Gz168\MallCore\Strategy\Decorator;

use Illuminate\Contracts\Cache\Repository;

class DatabaseCachingPricingPolicy extends CachingPricingPolicy
{
    public function __construct(PricingPolicy $inner, private readonly Repository $cache)
    {
        parent::__construct($inner);
    }

    protected function cache(): Repository
    {
        return $this->cache;
    }
}
```

### 4.4 在 ModeStrategyRegistry 中应用

让 `ModeStrategyRegistry::policy()` 返回的就是装饰过的策略：

```php
public function policy(MallMode $mode, string $contract): object
{
    $base = $this->resolveBase($mode, $contract);

    if ($contract === PricingPolicy::class) {
        return new DatabaseCachingPricingPolicy(
            $base,
            $this->app->make('cache.store'),
            (int) config('mall.pricing_cache_ttl', 60),
        );
    }

    return $base;
}
```

### 4.5 验证清单

- 单测：传入 fake `PricingPolicy`，验证第二次 resolve 不会再次调用内层。
- 集成测：开启 cache，命中后断言 cache key 存在；TTL 到期后断言内层被再次调用。
- 注意：`Money` 是值对象，必须可序列化（或在缓存层显式 serialize/deserialize）。

### 4.6 这为什么是装饰而不是策略？

- 我们没有切换「另一种定价算法」，而是在同一算法外**加了缓存**。
- 装饰器与被装饰对象实现**同一个接口**（`PricingPolicy`）。
- 可以继续叠加：`LoggingPricingPolicy(CachingPricingPolicy(B2cPricingPolicy))`。

---

## 5. 实战二：传输审计装饰器（AuditingOutboundTransport）

### 5.1 动机

所有出站邮件都要审计：调用方、耗时、结果、消息 ID。
我们不想在 `SendMailJob` 里写一坨审计代码，也不想改 `GmailTransport` / `QqMailTransport`。

### 5.2 设计

```text
Component      : OutboundTransportInterface
Concrete       : GmailTransport / QqMailTransport
Decorator      : AuditingOutboundTransport
```

### 5.3 代码（建议放在 `gz168/MailCommon/src/Decorators/`，MailOutbound 复用）

```php
// gz168/MailCommon/src/Decorators/AuditingOutboundTransport.php
namespace Gz168\MailCommon\Decorators;

use Gz168\MailContracts\Contracts\OutboundTransportInterface;
use Gz168\MailContracts\Data\MailCredentialData;
use Gz168\MailContracts\Data\OutboundMessageData;
use Gz168\MailContracts\Data\OutboundResult;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditingOutboundTransport implements OutboundTransportInterface
{
    public function __construct(
        private readonly OutboundTransportInterface $inner,
        private readonly string $channel = 'mail-outbound',
    ) {}

    public function send(MailCredentialData $credential, OutboundMessageData $message): OutboundResult
    {
        $startedAt = microtime(true);

        try {
            $result = $this->inner->send($credential, $message);
            $this->logSuccess($credential, $message, $result, $startedAt);
            return $result;
        } catch (Throwable $e) {
            $this->logFailure($credential, $message, $e, $startedAt);
            throw $e;
        }
    }

    private function logSuccess(MailCredentialData $credential, OutboundMessageData $message, OutboundResult $result, float $startedAt): void
    {
        Log::channel($this->channel)->info('mail.outbound.sent', [
            'provider'   => $credential->provider->value,
            'account'    => $credential->emailAddress,
            'message_id' => $result->providerMessageId,
            'to'         => $message->to,
            'subject'    => $message->subject,
            'duration_ms' => $this->durationMs($startedAt),
        ]);
    }

    private function logFailure(MailCredentialData $credential, OutboundMessageData $message, Throwable $e, float $startedAt): void
    {
        Log::channel($this->channel)->error('mail.outbound.failed', [
            'provider'    => $credential->provider->value,
            'account'     => $credential->emailAddress,
            'to'          => $message->to,
            'subject'     => $message->subject,
            'duration_ms' => $this->durationMs($startedAt),
            'exception'   => $e::class,
            'message'     => $e->getMessage(),
        ]);
    }

    private function durationMs(float $startedAt): int
    {
        return (int) ((microtime(true) - $startedAt) * 1000);
    }
}
```

### 5.4 注册：让 SendMailJob 拿到装饰过的 transport

在 `TransportRegistry::outbound()` 返回前自动套装饰器：

```php
public function outbound(MailProvider $provider): OutboundTransportInterface
{
    $base = $this->outbound[$provider->value]
        ?? throw new RuntimeException("Outbound transport [{$provider->value}] is unavailable.");

    if ($this->app->bound(AuditingOutboundTransport::class)) {
        return new AuditingOutboundTransport($base);
    }

    return $base;
}
```

更优雅的做法：让 MailCommon 在自己的 Provider 里 `bind(AuditingOutboundTransport::class, …)`，
再让 `TransportRegistry` 检查容器是否存在；MailCommon 不被任何模块强制依赖，需要审计的模块才启用。

### 5.5 验证清单

- fake transport 内层抛异常时，装饰器记 error 日志并重新抛出。
- 单测断言成功路径写 info 日志、失败路径写 error 日志。
- 集成测：跑通 Gmail/QQ 真实发送，确认日志条目包含 `provider_message_id`。

### 5.6 这为什么是装饰而不是适配器？

- `AuditingOutboundTransport` 与 `GmailTransport` 实现**同一个接口**。
- 没有改 Gmail 的协议，只是「包裹了一层审计」。

---

## 6. 实战三：传输限流装饰器（RateLimitingOutboundTransport）

### 6.1 动机

Gmail API 限额是 250 单位/秒/用户；QQ SMTP 也有连接上限。我们要在不污染具体 transport 的情况下加限流。

### 6.2 代码

```php
namespace Gz168\MailCommon\Decorators;

use Gz168\MailContracts\Contracts\OutboundTransportInterface;
use Gz168\MailContracts\Data\MailCredentialData;
use Gz168\MailContracts\Data\OutboundMessageData;
use Gz168\MailContracts\Data\OutboundResult;
use Illuminate\Cache\RateLimiter;

class RateLimitingOutboundTransport implements OutboundTransportInterface
{
    public function __construct(
        private readonly OutboundTransportInterface $inner,
        private readonly RateLimiter $limiter,
    ) {}

    public function send(MailCredentialData $credential, OutboundMessageData $message): OutboundResult
    {
        $key = 'mail-outbound:'.$credential->provider->value.':'.$credential->emailAddress;

        return $this->limiter->attempt(
            $key,
            $this->maxAttempts($credential->provider),
            fn (): OutboundResult => $this->inner->send($credential, $message),
            $this->decaySeconds(),
        );
    }

    private function maxAttempts(MailProvider $provider): int
    {
        return match ($provider) {
            MailProvider::Gmail => 200,
            MailProvider::QQ    => 30,
            default             => 60,
        };
    }

    private function decaySeconds(): int
    {
        return 60;
    }
}
```

### 6.3 与其它装饰器组合

```php
$transport = new AuditingOutboundTransport(
    new RateLimitingOutboundTransport(
        $base,
        $this->app->make(RateLimiter::class),
    )
);
```

**这是装饰器最爽的地方**：审计、限流、缓存、签名、压缩……每一项都是独立装饰器，按需叠加，不污染业务 transport。

---

## 7. 实战四：OutboundMessage 状态守卫装饰（SendGuard）

### 7.1 动机

`SendMailJob::handle()` 里直接写了：

```php
if ($message->status === 'sent') {
    return;
}
$message->update(['status' => 'processing', 'attempts' => $message->attempts + 1]);
```

逻辑越加越多（重试上限、过期订单、账号禁用……）就会变成大泥球。
我们想把「状态守卫」抽成装饰器。

### 7.2 设计

不是装饰 `OutboundTransportInterface`，而是装饰「发送动作」：

```text
Component      : MailSenderInterface { send(OutboundMessage $m): void }
Concrete       : TransportBasedMailSender
Decorator      : GuardedMailSender
```

### 7.3 代码

```php
namespace Gz168\MailOutbound\Senders;

use Gz168\MailOutbound\Models\OutboundMessage;

interface MailSenderInterface
{
    public function send(OutboundMessage $message): void;
}
```

```php
namespace Gz168\MailOutbound\Senders;

use Gz168\MailContracts\Contracts\MailCredentialRepositoryInterface;
use Gz168\MailContracts\Data\OutboundMessageData;
use Gz168\MailContracts\TransportRegistry;
use Gz168\MailOutbound\Models\OutboundMessage;

class TransportBasedMailSender implements MailSenderInterface
{
    public function __construct(
        private readonly TransportRegistry $transports,
        private readonly MailCredentialRepositoryInterface $credentials,
    ) {}

    public function send(OutboundMessage $message): void
    {
        $credential = $this->credentials->findActive($message->mail_account_id);
        $result = $this->transports->outbound($credential->provider)->send(
            $credential,
            new OutboundMessageData(
                $message->message_uuid,
                $message->to_addresses,
                $message->subject,
                $message->text_body,
                $message->html_body,
            ),
        );

        $message->update([
            'status' => 'sent',
            'provider_message_id' => $result->providerMessageId,
            'sent_at' => now(),
            'last_error' => null,
        ]);
    }
}
```

```php
namespace Gz168\MailOutbound\Senders;

use Gz168\MailOutbound\Models\OutboundMessage;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GuardedMailSender implements MailSenderInterface
{
    public function __construct(
        private readonly MailSenderInterface $inner,
        private readonly int $maxAttempts = 4,
    ) {}

    public function send(OutboundMessage $message): void
    {
        $this->assertNotSent($message);
        $this->assertAttemptsAvailable($message);

        $message->update([
            'status' => 'processing',
            'attempts' => $message->attempts + 1,
        ]);

        try {
            $this->inner->send($message);
        } catch (\Throwable $e) {
            $message->update(['status' => 'pending', 'last_error' => $e->getMessage()]);
            Log::warning('mail.outbound.retry', ['message_id' => $message->id, 'attempts' => $message->attempts]);
            throw $e;
        }
    }

    private function assertNotSent(OutboundMessage $message): void
    {
        if ($message->status === 'sent') {
            throw new RuntimeException("Message {$message->id} already sent.");
        }
    }

    private function assertAttemptsAvailable(OutboundMessage $message): void
    {
        if ($message->attempts >= $this->maxAttempts) {
            $message->update(['status' => 'failed']);
            throw new RuntimeException("Message {$message->id} exceeded max attempts.");
        }
    }
}
```

### 7.4 改造后的 `SendMailJob`

```php
public function handle(MailSenderInterface $sender): void
{
    $message = OutboundMessage::query()->findOrFail($this->messageId);
    $sender->send($message);
}
```

**好处**：

- Job 不再关心「状态怎么改、什么时候算发过」，只负责找消息 + 调 sender。
- 新增「暂停发送」「黑名单校验」只需再叠一个装饰器。
- 测试 Job 不再需要伪造 transport，只要 fake `MailSenderInterface`。

### 7.5 这为什么是装饰而不是状态机？

- 状态机判定「能否转移」是**纯规则**（合法路径白名单）。
- 装饰器判定「要不要发」是**带副作用的拦截**（更新 DB、写日志）。
- 两者正交：状态机管 transition 合法性，装饰器管 transition 时的副作用。

---

## 8. 装饰器叠加顺序与「洋葱模型」

装饰器像洋葱：`A(B(C(base)))`，调用顺序从外到内、回溯从内到外。

```php
$sender = new AuditingSender(
    new GuardedSender(
        new RateLimitedSender(
            new TransportBasedSender($transports, $credentials),
            $limiter,
        ),
        $maxAttempts = 4,
    ),
    $channel = 'mail-outbound',
);
```

执行流程：

```
AuditingSender::send (start timer)
  GuardedSender::send (status guards)
    RateLimitedSender::send (token bucket)
      TransportBasedSender::send (real SMTP / Gmail)
    ← token consumed
  ← status updated
← audit logged
```

**叠放约定**（约定优于配置）：

1. **最外层永远是「审计 / 监控」**，因为它要捕获整条链的成功与失败。
2. **紧贴业务的是「状态守卫」**，它要决定业务是否进入执行。
3. **最内层是「真正干活的 transport」**。
4. **限流 / 缓存**放哪都行；放在守卫内、transport 外最安全（不会浪费守卫的 DB 更新）。

---

## 9. 装饰模式的边界（什么时候不要用）

| 场景 | 原因 |
|------|------|
| 对象没有稳定接口 | 装饰前提是同接口 |
| 想换算法 | 用策略 |
| 想换协议 | 用适配器 |
| 只想换一种实现 | 用工厂 |
| 装饰链超过 4 层 | 调试困难，应当重构 |
| 装饰器自己又写业务编排 | 装饰器只该「加东西」，不该改业务语义 |
| 装饰器引入循环依赖 | 违反项目「单向依赖」硬约束 |

---

## 10. 项目落地清单（装饰器专题）

新建 / 修改文件清单（按章节落地）：

```
gz168/MallCore/src/Strategy/Decorator/
├── CachingPricingPolicy.php            # 抽象装饰
└── DatabaseCachingPricingPolicy.php    # 具体装饰

gz168/MailCommon/src/Decorators/        # 新建模块 MailCommon（共享装饰器）
├── AuditingOutboundTransport.php
├── RateLimitingOutboundTransport.php
└── MailCommonServiceProvider.php       # 容器绑定 + TransportRegistry 钩子

gz168/MailOutbound/src/Senders/
├── MailSenderInterface.php
├── TransportBasedMailSender.php
└── GuardedMailSender.php

gz168/MailOutbound/src/Jobs/SendMailJob.php   # 改用 MailSenderInterface
gz168/MailContracts/src/TransportRegistry.php # 增加装饰器应用点
```

依赖方向检查（必须满足 AGENTS.md / AI_DEVELOPMENT.md）：

- `MallCore` 不反向依赖任何 `MallMode*`。
- `MailCommon` 只依赖 `MailContracts`、`common`，不依赖具体 `MailGmail/MailQq`。
- `MailOutbound` 依赖 `MailContracts` + `MailCommon`，不直接 `new GmailTransport`。

---

## 11. 单元测试模板（每个装饰器都该有的）

```php
namespace Gz168\MailCommon\Tests\Decorators;

use Gz168\MailCommon\Decorators\AuditingOutboundTransport;
use Gz168\MailContracts\Contracts\OutboundTransportInterface;
use Gz168\MailContracts\Data\MailCredentialData;
use Gz168\MailContracts\Data\OutboundMessageData;
use Gz168\MailContracts\Data\OutboundResult;
use Gz168\MailContracts\Enums\MailProvider;
use Gz168\MailContracts\Data\MailAddress;
use Gz168\MailContracts\Data\MailContent;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Tests\TestCase;

class AuditingOutboundTransportTest extends TestCase
{
    public function test_logs_and_returns_result_on_success(): void
    {
        Log::shouldReceive('channel->info')->once()
            ->withArgs(fn (string $message, array $ctx): bool =>
                $message === 'mail.outbound.sent'
                && $ctx['provider'] === MailProvider::Gmail->value
                && $ctx['message_id'] === 'abc-123');

        $inner = new class implements OutboundTransportInterface {
            public function send(MailCredentialData $c, OutboundMessageData $m): OutboundResult
            {
                return new OutboundResult('abc-123');
            }
        };

        $transport = new AuditingOutboundTransport($inner);
        $result = $transport->send(
            new MailCredentialData(MailProvider::Gmail, 'a@example.com', null, null),
            new OutboundMessageData('uuid-1', ['b@example.com'], 'subj', 'hi', null),
        );

        $this->assertSame('abc-123', $result->providerMessageId);
    }

    public function test_logs_failure_and_rethrows(): void
    {
        Log::shouldReceive('channel->error')->once();
        $inner = new class implements OutboundTransportInterface {
            public function send(MailCredentialData $c, OutboundMessageData $m): OutboundResult
            {
                throw new RuntimeException('boom');
            }
        };

        $transport = new AuditingOutboundTransport($inner);

        $this->expectException(RuntimeException::class);
        $transport->send(
            new MailCredentialData(MailProvider::Gmail, 'a@example.com', null, null),
            new OutboundMessageData('uuid-1', ['b@example.com'], 'subj', 'hi', null),
        );
    }
}
```

---

## 12. 总结口诀

- **加东西用装饰，换算法用策略，换接口用适配器。**
- **装饰器是同一接口的「洋葱」，按需叠加，不污染内核。**
- **审计在外、守卫在内、限流居中、transport 在底。**
- **每个装饰器都该有 fake 后的单测；多层叠加时每层都要测。**

后续可以把这套装饰器落地到 `gz168/MailCommon`（新建模块），并在 `MailOutbound` 与 `MailInbound` 中替换现有重复代码。