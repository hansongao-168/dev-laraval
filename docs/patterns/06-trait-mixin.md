# Trait 组合实战精讲
## —— DPD 用 `HasDpdApi + HasDpdLabel + HasOrder` 替代多继承

> **核心结论**：仓库里只在 `carrier-dpd` 一个承运商里**实际**用 Trait 组合。但这一处就足够讲清楚"什么时候 trait 比继承和组合更合适"。

---

## 1. PHP 8.x 里 Trait 的位置

Trait 不是继承（is-a），不是组合（has-a），是 **"编译期把方法粘进来"**（can-do）。它是 PHP 对"多继承"的妥协方案：

- **类 vs Trait**：类只能单继承；Trait 可以多粘。
- **Trait vs Interface**：Interface 只声明签名；Trait 既声明又给实现。
- **Trait vs 静态方法集合**：Trait 可以用 `$this`，所以能写"实例方法"。

---

## 2. 仓库里那一处：`Creator` 用 Trait 组合

`express/carrier-dpd/src/Label/Creator.php`：

```php
class Creator implements CreateLabelContract
{
    use HasDpdApi, HasDpdLabel, HasOrder;
}
```

`express/carrier-dpd/src/Track/Tracker.php`：

```php
class Tracker implements LogisticsTracker
{
    use HasDpdApi, HasTrackingNumber {
        HasDpdApi::getRequestData as private baseRequestData;
    }
}
```

| Trait | 职责 | 通常包含的方法 |
|---|---|---|
| `HasDpdApi` | SOAP 客户端、Header、retry 代理 | `getClient()`, `getRequestData()`, `logRequest()` |
| `HasDpdLabel` | DPD 面单 payload 拼装 | `formatShipment()`, `formatPackages()` |
| `HasOrder` | Order/Profile 访问器 | `order()`, `account()` |
| `HasTrackingNumber` | 跟踪号规范化 | `normalizeTrackingNumber()` |

### 2.1 冲突处理：`as private`

当 `HasDpdApi` 与 `HasTrackingNumber` 都定义了同方法签名时，**用 `as private` 改名隔离**：

```php
use HasDpdApi, HasTrackingNumber {
    HasDpdApi::getRequestData as private baseRequestData;
}
```

效果：
- `Tracker` 里有一个 **私有别名 `baseRequestData()`**，来自 `HasDpdApi`。
- `HasTrackingNumber::getRequestData()` 继续存在，没有冲突。

> **设计哲学**："Trait 冲突不是 bug，是提醒你要决定这个名字到底归谁"。`as private` 是显式表达"这个名字在我这里归 A，不归 B"。

---

## 3. 与继承/组合的取舍

| 取舍 | Trait 组合（本仓库 DPD） | 基类继承（多数 Java/C#） | 组合（has-a） |
|---|---|---|---|
| 改动一行能换实现？ | ✅ | ❌（破坏继承） | ✅ |
| 多重能力叠加？ | ✅（多 trait） | ❌（单继承） | ✅（多个 helper） |
| 接口隔离？ | ✅（按 method 切） | ✅（按类切） | ✅（按对象切） |
| 类型提示稳定？ | ✅（implements 接口） | ✅ | ✅ |
| 调试栈可读？ | 中（栈帧能看到 trait 方法） | 高 | 高 |
| 多态替换？ | ✅（通过接口） | ✅（override） | ✅（持有别的对象） |

> 仓库使用 trait 的**唯一原因**：`Creator` 没有"上层公共基类"，trait 直接挂方法比建 `BaseDpdCreator` 继承树更克制。

---

## 4. Trait 自身的纪律

- **Trait 命名 `HasXxx`** —— 表达"我提供 Xxx 能力"，与 `AbstractXxx` 区分开。仓库全部沿用此规范。
- **Trait 不应该"我塞进来就用 `$this->foo()` 假定方法存在"**，所有依赖都应通过参数或注入。`HasDpdApi` 拿 SOAP client 是通过 `app()`，不是 `$this->getSomeClass()`。
- **方法名带命名空间前缀**，尤其是会被多个 trait 混用时。
- **`as` / `insteadof` 仅在冲突时使用**，不要为了"统一入口"做 trait 内部别名——这会让阅读者走神。

---

## 5. "用 trait 写 Loggable/Serializable" 是不是过度？

Java / C# 程序员习惯：

```php
class Foo { use Loggable, Timestamps, SoftDeletes; }
```

这种"全平台 mixin"被仓库 **明确回避**：日志走 `LoggerPort`、时间戳由模型 trait 提供（Eloquent 内置）、软删由模型 trait 提供。**每个 trait 都有 single responsibility**。

> 当你看到"用 trait 把 Loggable/SoftDeletes/Cacheable 都堆到一个类"时，要警觉：那通常是"我嫌加 service 麻烦"的设计偷懒。

---

## 6. 仓库里的其他"准 trait 形态"

- `LaravelColissimoLogger`（Colissimo 的 `LoggerPort` 实现）—— 用 **构造函数注入 `Logger` 实例**，不是 trait。
- `Express\LogisticsOrder\Concerns\HasOrder` —— 这是 trait，但放在上层 `logistics-order` 包；DPD 的 `Creator` 通过这种方式"挂上父包能力"。

---

## 7. 反模式（仓库外的常见踩坑）

1. **Trait 里 `new SomeOtherClass()`**：破破坏 DI，仓库 trait 不 `new`。
2. **Trait 引用未声明的属性**：PHP 不允许，但很多人改 trait 时忘记自己悄悄破坏。仓库每个 trait 都用构造期注入确保属性存在。
3. **Trait 跟 interface 重合**：写了一个 trait 又写了一个同名 interface 是冗余；仓库只用 trait 实现"已被 interface 声明的方法"。
4. **多个 trait 方法互相依赖**：trait 之间形成隐形调用链，读时一团乱麻。仓库 trait 内部方法**互不依赖**，只读自己的依赖。

---

## 8. 30 秒最小复刻

```php
// 1) Trait 提供能力
trait HasTimestamps {
    public function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }
    public function ageInSeconds(): int { return time() - $this->updatedAt->getTimestamp(); }
}
trait HasUuid {
    public static function generate(): string { return \Ramsey\Uuid\Uuid::uuid4()->toString(); }
}

// 2) 多个类按需粘
final class Article implements \JsonSerializable {
    use HasTimestamps, HasUuid;
    public string $id;
    public \DateTimeImmutable $updatedAt;
    public function __construct() {
        $this->id = self::generate();
        $this->updatedAt = new \DateTimeImmutable();
    }
    public function jsonSerialize(): array {
        return ['id' => $this->id, 'updatedAt' => $this->updatedAt->format(\DateTimeInterface::ATOM)];
    }
}
```

> 这就是 DPD trait 心法："按能力拼装、不引入父类、不破坏接口"。

---

## 9. 小结

- **Trait 是 PHP 体系的多继承替代**，但仓库只在差异大、又不想用继承树的少数场合使用。
- `HasDpdApi / HasDpdLabel` 的组合方式展示了"用 trait 表达**能力**而不是表达**身份**"。
- 配套的 `as private` 是显式仲裁，**不是规避**。

> 上一篇：[`05-template-method.md`](./05-template-method.md)｜下一篇：[`07-hexagonal.md`](./07-hexagonal.md)
