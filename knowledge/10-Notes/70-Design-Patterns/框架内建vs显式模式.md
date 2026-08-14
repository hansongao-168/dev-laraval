---
type: atomic
topic: design-patterns
subtopic: framework-vs-explicit
tags: [design-patterns, oop, laravel, framework, flyweight, prototype]
difficulty: 3
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-28
source:
  - book: 深入设计模式（Dive Into Design Patterns, Refactoring.Guru）Flyweight p.207 / Prototype p.119
  - code: gz168 容器 singleton 绑定、DataSourceRegistry、NavItem::with()、Laravel Collection
created: 2026-08-14
updated: 2026-08-14
---

# 框架内建 vs 显式模式：Flyweight 与 Prototype 的"借用"

## 一句话

> 有些模式不需要自己写——**框架已经内建了**（中间件=责任链、Collection=迭代器、Observer=Eloquent、容器单例=Flyweight 借用）。识别"框架内建"和"需显式实现"的边界，比硬凑 23 个模式更重要。

## 是什么

### 本书视角：模式的"两层存在"

1. **显式实现**：你为某个问题手写一个符合 GoF 结构的类（本仓库大多数笔记）。
2. **框架内建 / 借用**：框架或语言已经用该模式解决了问题，你只是"用了框架"，不写模式类。

本仓库正好演示了两种都有。**识别框架内建模式**，能避免重复造轮子。

### 借位落点 ①：Flyweight → 容器单例 + 注册表

**Flyweight 核心**：大量相似对象共享**内部状态**（不变部分），外部状态单独存放，减少内存。

本仓库没有手写 Flyweight 类，但**Laravel 容器单例就是框架级 Flyweight 借用**：

```php
// FrontNavServiceProvider.php —— 共享单实例（内部状态复用）
$this->app->singleton(NavRegistry::class, fn ($app) => new InMemoryNavRegistry(...));
$this->app->singleton(NavResolver::class, fn ($app) => new NavResolver(...));
$this->app->singleton(VisibilityChecker::class, ...);

// AmazonServiceProvider.php —— 同样模式
$this->app->singleton(PiiCipher::class, ...);          // 加密实例全进程共享
$this->app->singleton(DataSourceRegistry::class, ...); // 注册表单例
```

**91 处容器单例绑定** + **32 个 enum**（值对象天然共享），都是"共享不变状态"思想的体现。

**更接近 Flyweight 工厂的是注册表**（`DataSourceRegistry`）：

```php
class DataSourceRegistry
{
    protected array $fetchers = [];                     // 享元池

    public function register(DataSourceFetcher $fetcher): void  // 注册享元
    {
        $this->fetchers[$fetcher->sourceName()] = $fetcher;
    }

    public function get(string $name): ?DataSourceFetcher          // 从池取（没有则 null）
    {
        return $this->fetchers[$name] ?? null;
    }
}
```

**诚实定位**：这是 Flyweight 的**借代**而非完整实现——`get()` 不自动创建（无 lazy factory），但"共享注册实例、避免重复构造"的核心思想一致。

### 借位落点 ②：Prototype → 值对象复制

**Prototype 核心**：用"克隆已有对象"代替"重新构造"。

本仓库没有 `clone`/`replicate()` 显式用 Prototype，但**不可变值对象 + 拷贝方法**是 Prototype 思想的借用：

```php
// NavItem::with() —— 返回浅拷贝（已有对象克隆出变体）
public function with(array $overrides): self
{
    $merged = [ /* 全字段 */ ];
    foreach ($overrides as $k => $v) { $merged[$k] = $v; }
    return new self(...$merged);      // 克隆"模板"，只改部分字段
}
```

**诚实定位**：`with()` 是"拷贝-定制"（Prototype 变体），但 GoF Prototype 需要 `clone()` + 原型注册表，这里只是值对象的常用手法，**不足以单独立笔记**。

## 为什么重要

- **避免重复造轮子**：Laravel 已内建责任链（中间件）、观察者（Eloquent）、迭代器（Collection）、Flyweight 借用（容器单例）——不写框架已有模式。
- **识别"借用 vs 显式"**：本仓库既有框架内建（中间件），也有显式（`ChannelInventoryAdapter` 策略池），两者共存才健康。
- **判断力 > 凑数**：剩余无强证据的模式（Prototype/Flyweight/Mediator/Visitor），诚实标注"借用/无"比硬写更有价值。

## 框架内建模式速查（本仓库）

| 模式 | 框架内建位置 | 你该做的 |
|---|---|---|
| 责任链 Chain | Laravel 中间件管道 | 写中间件类即可（见 [[10-Notes/70-Design-Patterns/责任链模式-中间件管道]]） |
| 观察者 Observer | Eloquent Observer + Event/Listener | `make:observer` / `Event::listen`（见 [[10-Notes/70-Design-Patterns/观察者模式-Eloquent事件联动]]） |
| 迭代器 Iterator | Laravel Collection + PHP 数组 | 直接用 `collect()`（见架构笔记） |
| 单例 Singleton | 容器 `singleton()` | 注册即可，不写单例类 |
| Flyweight（借用） | 容器单例 + 注册表 | 用 `singleton()` + `DataSourceRegistry` 式池 |
| 模板方法 | `PackageServiceProvider` 生命周期 | 实现钩子即可（见 [[10-Notes/70-Design-Patterns/模板方法模式-导出骨架与ServiceProvider]]） |

## 怎么用 / 怎么实现（判断套路）

1. **先问"框架解决了吗？"**：中间件、事件、Collection、容器单例——先查 Laravel 有没有。
2. **框架有的 → 用框架**：不要自己写责任链类、单例类。
3. **框架没有的 → 显式写**：多平台适配、状态机、桥接——这些 Laravel 不提供，才显式实现。
4. **借用的要诚实标注**：Flyweight 借容器单例、Prototype 借 `with()`——在笔记里写"借用"而非"完整实现"。

## 易错 / 注意

- **别把框架当模式大全**：Laravel 内建 ≠ 你要学 GoF 的完整版；知道"框架实现了哪一步"即可。
- **借用与完整实现的差距要诚实**：容器单例 ≠ 完整 Flyweight（无外部状态分离），注册表 ≠ 享元工厂（无 lazy 创建）。
- **不要为了凑 23 个硬写**：Visitor/Mediator 本仓库无强证据，记录"无"比硬凑健康。

## 关联

- 上位概念：[[10-Notes/70-Design-Patterns/MOC]]、[[00-Home/学习地图]]
- 平行概念：[[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]（23 模式落点全景）、[[10-Notes/60-PHP-Laravel/MOC]]
- 下位例子：`gz168/ProductResearch/src/Services/ProductResearch/DataSourceRegistry.php`、`gz168/FrontNav/src/Contracts/NavItem.php`（`with()`）
- 反模式对照：《深入设计模式》"过度设计——把框架已有的再写一遍"

## 复盘

- 信心：2（首次写）
- 自测题：为什么容器单例是 Flyweight 的"借用"而非完整实现？`NavItem::with()` 和 GoF Prototype 的差距在哪？还有哪些模式是 Laravel 内建而本仓库没显式写的？
