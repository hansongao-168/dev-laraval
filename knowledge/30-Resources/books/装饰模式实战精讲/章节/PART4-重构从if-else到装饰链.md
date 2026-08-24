---
type: book
topic: design-patterns
subtopic: book-refactoring
tags: [book, design-patterns, decorator, refactoring, if-else]
difficulty: 3
confidence: 3
reviewed: 2026-08-24
next-review: 2026-09-07
source:
  - book: 《装饰模式实战精讲》PART 4（重构 · 问题）
created: 2026-08-24
updated: 2026-08-24
---

# 章节精读 · PART 4 重构：从 if-else 到装饰链

> 书摘。原文用 > blockquote 引用，感想用普通段落。

## 章节定位

- 书：《装饰模式实战精讲》
- 章节：PART 4 · 重构 · 问题

## 原文摘录（用自己的话转述）

> 当我们遇到一个**订单计价**的场景：一笔订单有用户（可能 VIP/金卡）、可能有优惠券（fixed/percent）、要算满减、要加运费。
>
> **v1 的 if-else 大泥球**：
> ```python
> class OrderService:
>     def calculate_total(self, order):
>         total = sum(item.price * item.qty for item in order.items)
>         if order.user.is_vip:       total *= 0.9
>         elif order.user.level == 'gold': total *= 0.95
>         if order.coupon:
>             if order.coupon.type == 'fixed':    total -= order.coupon.value
>             elif order.coupon.type == 'percent': total *= (1 - order.coupon.value/100)
>         if total >= 300: total -= 30
>         if total < 99:    total += 12
>         elif order.user.is_remote: total += 25
>         return max(total, 0)
> ```
>
> **5 条 if 分支**揉在一个函数里——加一种促销就改 `calculate_total` 一处大函数。

### 改进方向

> - **加一种促销**（如"生日券 -50"）= 改 1 个函数 → 改 N 处 if 分支
> - **新增组合**（如"VIP + 优惠券 + 满减 + 运费"）= 写一个新的 if 组合
> - **5 类促销** × **2 种组合方式** = **5² - 1 = 31 个排列组合** —— 类爆炸
>
> 不可能用类继承硬写 `VIPFixedCouponFullReductionShipping` 等 31 个子类。

## 我用自己的话说

这一章给我的最大启示：**重构到模式，不是为了用模式，而是为了把一个"if-else 大泥球"拆成可独立测试、可独立扩展的小单元**。

更深的洞察：
- 5 条 if 各自对应一个"业务规则"
- 业务规则**互相独立**——VIP 折扣不影响满减
- 业务规则**按业务动态启用**——VIP 标志、是否有券、`enable_full_reduction` 标志都是动态的
- → **每个规则一个装饰器**，组装时按规则动态叠加

这种"独立 + 动态 + 可叠加"恰好就是装饰模式的用武之地。

### 与本仓库的对照

观察 `gz168/Purchase/Services/Procurement/PurchaseThreeWayMatchService::resolveStatus()`：
- 接收 3 个数量 → 输出 4 个状态
- 4 个 if 分支 → 集中在一个纯函数
- 这是**纯函数式状态机**，而不是装饰链

为什么这里没有用装饰链？因为**状态机是"判定"而不是"叠加"**——3 个数量只有一种合法状态，不存在"组合出多种计价"。装饰链适合"叠加"，不适合"判定"。

**判断标准**：业务规则是"叠加"（先减后减再乘）→ 装饰链；"判定"（根据多个值给一个结果）→ 状态机/枚举/纯函数。

## 与已知笔记的关联

- [[10-Notes/70-Design-Patterns/装饰模式-Decorator]]
- [[10-Notes/70-Design-Patterns/状态模式-采购状态机与三方匹配]] — 同一仓库，"叠加 vs 判定"的对照
- [[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]
- [[30-Resources/books/装饰模式实战精讲/书评]]

## 行动计划 / One Thing

- [ ] 看完这章，扫描本仓库代码找一个 v1 if-else 候选（最有可能的是 `InventoryChannelPushThrottler`/`InventoryReconcileService` 这类"做一件事但 if 很多"的服务）
- [ ] 评估"哪些 if 适合抽装饰器、哪些适合抽策略、哪些适合保留"