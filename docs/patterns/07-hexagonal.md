# 端口与适配器 / 反腐层（Ports & Adapters / Anti-Corruption Layer）实战精讲
## —— `gz168/Carrier` 的整套新抽象层：信封 + JSON Schema + ModuleIsolationTest

> **核心结论**：`gz168/Carrier` 是一份"零外部依赖、纯 PHP"的承运商抽象包。它用 **JSON 信封** 当跨边界语言，用 **JSON Schema 校验** 当 ACL，用 **`ModuleIsolationTest`** 当架构守护。教六边形架构，这份仓库比任何教科书都更克制可读。

---

## 1. 六边形架构之父

Alistair Cockburn 2005：Hexagonal Architecture（又名 Ports & Adapters）。

核心断言：

- 应用层只对外暴露 **端口**（application ports），由"驱动方（drivers）"调用。
- 应用层通过 **端口** 调用外部能力，由"被驱动方（driven）"实现。
- **业务层不出现任何外部系统的类型**。

Eric Evans（DDD）把这种做法加了一个名字：**Anti-Corruption Layer（ACL）**——业务层在边界做翻译，让对方 API 的脏东西不污染自己。

---

## 2. 仓库模块边界

```
gz168/Carrier/
├── composer.json             # 零 require，完全没有 Laravel
├── contracts/                # JSON + YAML 双发的契约
├── src/
│   ├── Application/          # 用例 + 端口
│   │   ├── Ports/            # 端口接口
│   │   ├── BatchPrintLabels.php
│   │   ├── CancelShipment.php
│   │   ├── PrintLabel.php
│   │   └── TrackShipment.php
│   ├── Domain/               # 空目录（详见 5.2）
│   └── Infrastructure/
│       ├── Adapters/         # InMemory 实现 + 闭包 carrier 注册表
│       └── Validation/       # 自研 JSON Schema 校验器
└── tests/                    # 含 ModuleIsolationTest 守护
```

> 注意 `composer.json` 里 **零 require**——它**不依赖 Laravel**、**不依赖任何上游包**。这正是六边形"内核稳定"的好处。

---

## 3. 端口（Ports）

`src/Application/Ports/`：

| 端口 | 职责 | 方法 |
|---|---|---|
| `CarrierRegistry` | 用 code 取出"打单闭包" | `driver(string $code): callable`, `has(string $code): bool` |
| `CancellationProvider` | 单个承运商的作废能力 | `cancel(string $code, string $tracking): array{data, result}` |
| `CancellationRegistry` | 作废 provider 注册表 | `provider(string $code): CancellationProvider`, `has(...)` |
| `TrackingProvider` | 单承运商的轨迹查询 | `track(string $code, string $tracking): array{status, events}` |
| `TrackingRegistry` | 轨迹 provider 注册表 | `provider(string $code): TrackingProvider`, `has(...)` |

> 接口返回类型用了 PHP 8 的 **array shape 注解**：`array{data: array, result: array}`。这既是契约又是文档，编译器/IDE 都能基于它提示。

---

## 4. 适配器（Adapters）

`src/Infrastructure/Adapters/` 仅放 **In-Memory 实现**，**没有任何 HTTP 适配器**：

```php
final class InMemoryCarrierRegistry implements CarrierRegistry
{
    public function __construct(private array $drivers) {}

    public function driver(string $code): callable
    {
        return $this->drivers[$code]
            ?? throw new InvalidArgumentException("Unknown carrier code: {$code}");
    }

    public function has(string $code): bool
    {
        return isset($this->drivers[$code]);
    }
}
```

> **闭包当 Strategy 对象**是这份仓库的特色：承运商适配器**不在本包内**——它们归属于 `Ups\`、`Fedex\`、`Dpd\` 等独立命名空间，由这些包实现 `CarrierRegistry` 并注入到 `Carrier` 包。这一步看似"轻量"，实际把"承运商实现不属于 Carrier"这条边界用**类型**固化下来。

---

## 5. 反腐层：信封（Envelope）模式

### 5.1 跨边界用最小数据结构

承运商来回调用的请求/响应被收敛成"信封"：

- `contracts/shipping-label-envelope.v1.json`
- `contracts/shipping-label-result.v1.json`
- `contracts/shipping-cancellation-request.v1.json`
- `contracts/shipping-cancellation-result.v1.json`

`.json` + `.yaml` 双发布 —— 一份做机器校验、一份做文档阅读。

### 5.2 用例层做"ACL"

`src/Application/PrintLabel.php`（节选）：

```php
final class PrintLabel
{
    public function __construct(
        private CarrierRegistry $registry,
        private SchemaValidator $validator,
    ) {}

    public function execute(array $envelope): array
    {
        $this->validator->assert(EnvelopeSchema::PRINT_LABEL, $envelope);   // 入参校验
        $envelope = $this->supplement($envelope);                           // ACL：补默认值
        $code = $envelope['carrier']['code'];

        if (! $this->registry->has($code)) {
            throw new InvalidEnvelopeException('Unknown carrier code: ' . $code);
        }

        $response = ($this->registry->driver($code))($envelope);             // 调到外部
        $response = $this->normalize($response);                            // ACL：盖时间戳
        $this->validator->assert(EnvelopeSchema::PRINT_LABEL_RESULT, $response);  // 出参校验
        return $response;
    }

    private function supplement(array $data): array
    {
        $code = $data['carrier']['code'] ?? '';
        $defaults = match ($code) {
            'ups' => [
                'account'      => ['number' => 'UPS-ACCT', 'country' => $data['order']['currency'] === 'EUR' ? 'NL' : 'US'],
                'service_code' => '07',
                'label_format' => 'PDF',
            ],
            default => [],
        };

        return array_replace_recursive($data, $defaults, [
            'context' => [
                'pipeline'    => 'shipping.label.print',
                'received_at' => gmdate('c'),
            ],
        ]);
    }

    private function normalize(array $r): array
    {
        $r['result']['processed_at'] = gmdate('c');
        $r['result']['carrier_code']  = $r['carrier']['code'] ?? '';
        return $r;
    }
}
```

> **ACL 在哪里？**
>
> 1. **入口**：`SchemaValidator::assert()` 拒绝破坏契约的入参。
> 2. **过桥**：`supplement()` 把 UPS 的 service_code 加进信封 —— **让上游 Order 不直接 `use` UPS 的 SDK**，上游只知道"我有 service_code 字段"。
> 3. **出口**：`SchemaValidator::assert()` 让响应必须再次通过契约 —— 不允许承运商私有字段泄漏出去。

> **Envelope 模式 = ACL 的字面实现**。上游调用方传一个 dict，业务层把它"过桥编译"，下游拿到的是带 context.pipeline 的"标准化信封"。这就是 Evans 的核心思想：**不要让外部系统污染你的领域**。

### 5.3 Domain 何时该引入？

仓库 `src/Domain/` **当前是空目录**。这不是疏忽，是设计信号：

- 当前所有"领域"概念都用 array envelope 表达：足够小、不污染。
- 演进到 N 个承运商后，**真正稳定不变的部分**（`TrackingNumber` / `CarrierCode` / `Money`）会从 envelope 抽离成 VO / Entity，进入 `src/Domain/`。
- 这是个**渐进式 DDD** 路径：先用 envelope 隔离污染，**够用即停**；等到真有跨 envelope 共享的领域逻辑再升级。

> 你可以照这个路径教：什么时候"够用"？—— 出现重复校验 / 跨用例共享计算 / 类型混淆风险，三者之一就升级。

---

## 6. 架构守护测试（Fitness Function）

`tests/ModuleIsolationTest.php`：

```php
final class ModuleIsolationTest extends TestCase
{
    private const DISALLOWED = ['Ups\\', 'Carrier\\', 'Order\\']; // 'Carrier\\' 是 Carrier 自己，跳过

    public function test_does_not_depend_on_other_modules(): void
    {
        foreach (self::DISALLOWED as $namespace) {
            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator(__DIR__ . '/../src')
            );
            foreach ($iterator as $entry) {
                if (! $entry->isFile() || $entry->getExtension() !== 'php') continue;
                $contents = (string) file_get_contents($entry->getPathname());
                $this->assertStringNotContainsString('use ' . $namespace, $contents);
            }
        }
    }
}
```

> 这是 **Neal Ford《Building Evolutionary Architectures》** 里的"Fitness Function" —— 把架构原则**落到 CI 的红条上**：Carrier 包永不能 `use Order\` / `use Ups\` / `use Ups\Carrier\`。一旦违反，测试失败。

> **教学价值**：架构说"我不应该 use 上游"听起来像口号，把它写成断言就是"自动失败的红条"。

---

## 7. 端到端的"打单 + 追踪 + 作废"链路图

```
[Order Bounded Context]
   │
   │ envelope (shipping-label-envelope.v1)
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Carrier\Application\PrintLabel::execute()                   │
│   ├── SchemaValidator::assert(envelope)              <入参 ACL│
│   ├── supplement()                                   <注入 context.pipeline, defaults>
│   ├── CarrierRegistry::has/driver($code)             <按 code 查闭包>
│   ├── ($driver)($envelope)                           <调到外部承运商>
│   ├── normalize()                                    <盖 carrier_code / processed_at>
│   └── SchemaValidator::assert(result)                <出参 ACL>
└─────────────────────────────────────────────────────────────┘
   │
   ▼   (driver 是闭包，来自 Ups\Carrier\Adapter...)
[UPS 实际 API]
   │
   ├── 后续: TrackShipment::execute()  ─► TrackingProvider::track()
   └── 后续: CancelShipment::execute() ─► CancellationProvider::cancel()
```

> **整条链路里没有出现 UPS 私有类型**。UPS 客户端代码放在 `Ups\` 命名空间下，需要被引入时**通过 DI 注入 `CarrierRegistry`** 的实现。

---

## 8. 反模式（仓库外的常见踩坑）

1. **接口写在适配器侧**。`Ups\Carrier\Adapter\Provider` 被 Order 包 `use`，等于业务层硬编码到 UPS。六边形永远把接口放在 Application 侧。
2. **把 envelope 当成"图省事"。** 它是一个**有意识**的 ACL 选型。当 envelope 字段数远超用例时，应当升级到真实 VO。
3. **ModuleIsolationTest 只想不做**。这是仓库最有教学价值的"原则变成测试"的反例机制，必须在 CI 中跑起来，否则就是僵尸。

---

## 9. 30 秒最小复刻

```php
// 1) 端口
interface NotificationPort { public function send(string $to, string $body): void; }

// 2) ACL：用 envelope 把外部域的字段标准化
final class NotifyUser {
    public function __construct(private NotificationPort $channel) {}
    public function welcome(array $signUpPayload): void {
        // ACL: 不让外部"raw signup"渗到 channel 里
        $this->channel->send(
            to:   $signUpPayload['contact']['email'],
            body: "Welcome, {$signUpPayload['profile']['nickname']}!",
        );
    }
}

// 3) 适配器：基础设施层
final class SmtpNotificationAdapter implements NotificationPort {
    public function __construct(private \Swift_Mailer $mailer) {}
    public function send(string $to, string $body): void {
        $this->mailer->send((new \Swift_Message('Hi'))->setTo($to)->setBody($body));
    }
}

// 4) 装配
$this->app->bind(NotificationPort::class, SmtpNotificationAdapter::class);
```

> 这就是 ACL + Port + Adapter 的同款心法：**业务层只见端口 + ACL 包内做翻译**。

---

## 10. 小结

- **Ports & Adapters + ACL**：让外部域的"私有语义"不会穿透到内核。
- **Envelope** = "用最小数据对象做边界协议" —— 当字段数稳定时足够用。
- **ModuleIsolationTest** = 架构原则的"红条化" —— 比口头约定靠谱得多。
- 想升级到真正 Domain 时，先看 envelope 是否有重复 / 跨用例逻辑再决定。

> 上一篇：[`06-trait-mixin.md`](./06-trait-mixin.md)｜下一篇：[`08-fitness-function.md`](./08-fitness-function.md)
