---
type: atomic
topic: design-patterns
subtopic: observer
tags: [design-patterns, oop, observer, php, laravel, eloquent]
difficulty: 3
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-21
source:
  - book: 深入设计模式（Dive Into Design Patterns, Refactoring.Guru）Observer p.315
  - code: gz168/Inventory/src/Observers/*.php、gz168/FrontNav/src/Shared/Events/NavStructureChanged.php
created: 2026-08-14
updated: 2026-08-14
---

# 观察者模式：Eloquent Observer 与事件（库存/导航变更联动）

## 一句话

> **观察者模式** = 被观察者状态变化时，自动通知一组订阅者，双方不直接耦合。Laravel 给了两套实现：**Eloquent Observer**（模型生命周期钩子）和**事件/监听器**（`Event::dispatch` + `listen`）。本仓库两者都用。

## 是什么

### 观察者模式的三个角色

```
Subject（被观察者）          Observer（观察者/订阅者）
    ListenerChange 变化  ──►  ListingChangeRowObserver
    ├─ attach(listener)        ↳ 刷新父批次计数
    ├─ detach(listener)
    └─ notify() → 逐个调用 listener
```

关键：Subject **不知道** Observer 的具体类，只通过统一接口通知——松耦合。

### 实现方式 A：Eloquent Observer（`Inventory/src/Observers/`）

Laravel 内建：模型 `saved/updated/created/deleting` 时触发。

**例 1：父批次计数刷新（`ListingChangeRowObserver`）**

```php
class ListingChangeRowObserver
{
    // 任一类型化变更行保存后，刷新父批次计数
    public function saved(
        ListingPriceChange|ListingQuantityChange|ListingStatusChange
        |ListingContentChange|ListingImageChange|ListingCreateChange $change,
    ): void {
        $change->batch?->reconcileCounters();
    }
}
```

**例 2：创建成功后联动拉取 SKU（`ListingCreateChangeObserver`）**

```php
public function updated(ListingCreateChange $change): void
{
    if (! $change->wasChanged('status') || $change->status !== 'succeeded') {
        return;                                     // ← 只对"变为成功"响应
    }
    $delay = max(0, (int) config('amazon.listings.create.sync_delay_seconds', 8));
    SyncCreatedListingProductJob::dispatch($change->id)->delay(now()->addSeconds($delay));
}
```

要点：**一个 Observer 类只做一件事**。`ListingCreateChangeObserver` 只在"状态变为 succeeded"时联动，其余状态完全忽略——这就是观察者的职责边界。

### 实现方式 B：事件 + 监听器（`FrontNav` 的 `NavStructureChanged`）

观察者模式的"发布/订阅"版——多个模块解耦触发方与处理方：

```php
// 触发方（业务模块改完导航后）：
NavStructureChanged::dispatch($location);

// 订阅方（FrontNavServiceProvider::registerEventListeners）：
$this->app->make(Dispatcher::class)->listen(
    NavStructureChanged::class,
    function (NavStructureChanged $event): void {
        $this->app->make(NavResolver::class)->invalidate();   // ① 失效缓存
        // ② 审计日志（logger）
    },
);
```

触发方不 import 任何处理方；处理方在 ServiceProvider 里注册。**加一个新的监听器 = 新增一行 listen，不改触发方代码**——开闭原则。

## 为什么重要

- **横切关注点解耦**：库存联动、缓存失效、审计日志都不污染核心业务逻辑。
- **扩展点即插即用**：新增"导航变化后发邮件"只需再加一个 listener。
- **框架内建**：Eloquent Observer / Event 是 Laravel 原生，不需自造订阅系统。

## 怎么用 / 怎么实现（套路）

1. **模型生命周期联动** → 用 Eloquent Observer（`php artisan make:observer`），一个类一个关注点。
2. **跨模块 / 跨进程联动** → 用 Event + Listener，事件类放 `Shared/Events/`（如 `NavStructureChanged`）。
3. **注册 Observer**：在 ServiceProvider 的 `boot()` 里 `Model::observe(MyObserver::class)`。
4. **守则**：Observer/Listener 只做"响应"，不做"主逻辑"；耗时操作（如拉 SKU）放进 Job/队列。

## 易错 / 注意

- **避免观察者连环触发**：A 的 Observer 改了 B，B 的 Observer 又改 A → 无限循环。用 `$model->wasChanged()` / `isDirty()` 守卫。
- **Observer 里别做重活**：模型事件在事务内同步执行，重活要 dispatch Job（如 `SyncCreatedListingProductJob`）。
- **`updated` 会对每次更新触发**：必须用 `wasChanged('status')` 精确判断（见例 2）。
- 事件 vs Observer：Observer 绑定具体模型，Event 绑定业务语义；跨模块用 Event，单模型生命周期用 Observer。

## 关联

- 上位概念：[[10-Notes/70-Design-Patterns/MOC]]、[[00-Home/学习地图]]
- 平行概念：[[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]（事件失效缓存）、[[10-Notes/60-PHP-Laravel/MOC]]
- 下位例子：`gz168/Inventory/src/Observers/ListingCreateChangeObserver.php`、`gz168/FrontNav/src/Shared/Events/NavStructureChanged.php`
- 反模式对照：《深入设计模式》"观察者循环依赖、通知风暴"

## 复盘

- 信心：2（首次写）
- 自测题：Observer 和 Event 两种实现分别适合什么场景？为什么 `updated` 要用 `wasChanged('status')` 守卫？如何避免观察者触发循环？
