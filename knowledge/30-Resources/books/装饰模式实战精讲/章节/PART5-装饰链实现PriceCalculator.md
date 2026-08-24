---
type: book
topic: design-patterns
subtopic: book-solution
tags: [book, design-patterns, decorator, python, oop]
difficulty: 3
confidence: 3
reviewed: 2026-08-24
next-review: 2026-09-07
source:
  - book: 《装饰模式实战精讲》PART 5（重构 · 解法）
created: 2026-08-24
updated: 2026-08-24
---

# 章节精读 · PART 5 重构解：PriceCalculator 装饰链实现

> 书摘。原文用 > blockquote 引用，感想用普通段落。

## 章节定位

- 书：《装饰模式实战精讲》
- 章节：PART 5 · 重构 · 解法（v2 装饰链代码）

## 原文摘录（用自己的话转述）

### 抽象基类

```python
from abc import ABC, abstractmethod

class PriceCalculator(ABC):
    @abstractmethod
    def calculate(self, order) -> float: ...

class BasePriceCalculator(PriceCalculator):
    def calculate(self, order):
        return sum(i.unit_price * i.quantity for i in order.items)

class PriceDecorator(PriceCalculator):
    def __init__(self, wrapped: PriceCalculator): self._wrapped = wrapped
    def calculate(self, order): return self._wrapped.calculate(order)
```

### 4 个装饰器（每个只做一件事）

```python
class VIPDiscountDecorator(PriceDecorator):
    def calculate(self, order):
        base = super().calculate(order)
        return base * 0.9 if order.user.is_vip else base  # base 而非 else

class CouponDecorator(PriceDecorator):
    def calculate(self, order):
        base = super().calculate(order)
        if not order.coupon: return base
        if order.coupon.type == 'fixed':   return base - order.coupon.value
        if order.coupon.type == 'percent': return base * (1 - order.coupon.value/100)
        return base

class FullReductionDecorator(PriceDecorator):
    def calculate(self, order):
        base = super().calculate(order)
        return base - 30 if base >= 300 else base

class ShippingDecorator(PriceDecorator):
    def calculate(self, order):
        base = super().calculate(order)
        ship = 12 if base < 99 else 0
        if order.user.is_remote: ship += 25
        return base + ship
```

### 组装（按业务动态启用）

```python
def build_calculator(order, ctx) -> PriceCalculator:
    calc = BasePriceCalculator()                         # 起点：纯小计
    if ctx.get('enable_member'):                          # VIP 折扣
        if order.user.is_vip: calc = VIPDiscountDecorator(calc)
    if order.coupon:                                       # 优惠券
        calc = CouponDecorator(calc)
    if ctx.get('enable_full_reduction'):                  # 满减
        calc = FullReductionDecorator(calc)
    if ctx.get('include_shipping'):                       # 运费
        calc = ShippingDecorator(calc)
    return calc
```

> **关键洞察**：每个装饰器只做一件事；组装完全按 `ctx` 动态启用；客户端只看到一个 `PriceCalculator` 接口，无需关心包了几层。

## 我用自己的话说

这一章让我把"装饰模式"从理论变成肌肉记忆。三个关键设计：

### 1. 装饰器内部用 `super().calculate(order)` 拿到上家结果

```python
class VIPDiscountDecorator(PriceDecorator):
    def calculate(self, order):
        base = super().calculate(order)         # ← 上家结果 = 基础
        return base * 0.9 if order.user.is_vip else base
```

每个装饰器只看到"上家给我的数"，不知道是哪个上家——这是**职责单一 + 解耦的极致**。

### 2. 组装不是写死顺序，而是按业务动态启用

```python
if ctx.get('enable_member'):     ...
if order.coupon:                  ...
if ctx.get('enable_full_reduction'): ...
```

业务标志、用户属性、订单属性都是**输入**——同一个 `build_calculator()` 在不同订单下生成不同的链。**装饰器顺序是运行时决策，不是编译期决定**。

### 3. 客户端无感知包了几层

```python
calc = build_calculator(order, ctx)
final_price = calc.calculate(order)     # 客户端只看到一个接口
```

5 个装饰器嵌套后，客户端仍然 `calc.calculate(order)` 一行——递归委托完全透明。这是**OCP 的极致**：加 1 种促销 = 加 1 个装饰器 + 1 行组装，**零修改旧代码**。

### 三句口诀

1. **每个装饰器只做一件事**
2. **base = super().calculate(order) 是关键模式**
3. **组装顺序是业务决策，不是代码决策**

## 与已知笔记的关联

- [[10-Notes/70-Design-Patterns/装饰模式-Decorator]] — 本项目 `packages/front-nav` 落地（前端版）
- [[30-Resources/books/装饰模式实战精讲/章节/PART4-重构从if-else到装饰链]] — 上篇：v1 坏味道
- [[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]
- [[30-Resources/books/深入设计模式/章节/装饰器-Decorator-精读]]

## 行动计划 / One Thing

- [ ] 把 3 句口诀抄到 review checklist
- [ ] 用 `InventoryReconcileService` 对照看："它的 if 是'叠加'还是'判定'？"——如果是叠加，可考虑装饰链