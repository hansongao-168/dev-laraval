---
type: atomic
topic: design-patterns
subtopic: decorator
tags: [design-patterns, oop, decorator, php, javascript]
difficulty: 3
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-21
source:
  - book: 深入设计模式（Dive Into Design Patterns, Refactoring.Guru）p.181–198
  - book: 装饰模式实战精讲（同书 Decorator 精讲）
created: 2026-08-14
updated: 2026-08-14
---

# 装饰模式（Decorator）

## 一句话

> 装饰器 = Wrapper：**在不修改原类/原数据的前提下，通过"一层套一层"的组合给对象动态叠加职责**，替代继承的横向扩展，避免"类爆炸"。

## 是什么

### 结构四要素（《深入设计模式》p.189–190）

```
┌────────────────┐  实现同一接口  ┌────────────────┐
│    Component   │◄──────────────│ BaseDecorator  │
│   operation()  │               │  wrappee: Comp │
└────────────────┘               │  op(){委托}     │
        ▲                        └────────────────┘
        │                                ▲
┌────────────────┐            ┌──────────┴──────────┐
│ ConcreteComp   │            │ DecoratorA │ DecoratorB │
│ op(){真实逻辑}  │            │ 处理→委托   │ 处理→委托   │
└────────────────┘            └───────────────────────┘
```

1. **Component**：业务接口（如 `writeData/readData`）
2. **Concrete Component**：真实实现（如 `FileDataSource`）
3. **Base Decorator**：持有 `wrappee` 并默认透传委托
4. **Concrete Decorator**：在委托前后加职责（如加密、压缩）

关键：装饰器**与组件实现同一接口**（所以能互相嵌套），但内部**组合委托**而非继承行为。

### 与相邻模式的区别（装饰实战 PART 3）

| 对比 | 一句话区别 | 本项目对应 |
|---|---|---|
| **Adapter** | 转换**接口**（Type-C↔USB），目标是"兼容" | `gz168/common` 的 `ApiController` 适配 Laravel 基类 |
| **Proxy** | **控制访问**（可延迟创建真实对象） | `NavResolver` 的缓存层（缓存代理） |
| **Decorator** | **增强行为**，包装后仍是原接口，可叠加 | `packages/front-nav` 的 `resolveLabels` |
| **Strategy** | 换**整颗算法**，装饰器是**逐层加小职责** | `VisibilityChecker` 接口 + 两实现互换 |

## 为什么重要

- **开闭原则（O）**：加一种职责 = 新增一个装饰器类，**零改动旧代码**。
- **组合优于继承**：避免 `VIPFixedCouponFullReductionShipping` 这类"2^n 类爆炸"。
- **运行时动态**：职责顺序可在组装时决定，不受继承的静态约束。

## 怎么用 / 怎么实现

### 例 1：PDF 经典案例（订单计价重构，装饰实战 PART 4→5）

**坏味道 v1**：`calculate_total()` 里堆 5 层 if-else（VIP 折扣 / 优惠券 / 满减 / 运费），每加一种促销就改这个函数。

**v2 装饰链**：

```python
calc = BasePriceCalculator()                # 纯算小计
calc = VIPDiscountDecorator(calc)           # ×0.9
calc = CouponDecorator(calc)                # 减券
calc = FullReductionDecorator(calc)         # 满300-30
calc = ShippingDecorator(calc)              # 加运费
```

每个 Decorator 只做一件事：`base = super().calculate(order)` 拿到上家结果 → 叠加自己的规则 → 返回。

### 例 2：本项目真实落地 —— `packages/front-nav/src/core/labels.js`

前端 SDK 给导航树叠加 i18n 翻译，**不改后端原始数据**（纯函数式装饰器）：

```js
// 单个 item 的装饰：只覆盖 label，其余字段透传
export function resolveLabel(item, translate) {
  let label = item.label;
  if (item.labelKey) {
    const translated = translate(item.labelKey);
    if (translated && translated !== item.labelKey) {   // i18n missing-key 回退
      label = translated;
    }
  }
  return {
    ...item,                                            // ← 原对象不被 mutate
    label,
    children: Array.isArray(item.children)
      ? resolveLabels(item.children, translate)          // ← 递归装饰子树
      : [],
  };
}

// 整层装饰
export function resolveLabels(items, translate) {
  return items.map((item) => resolveLabel(item, translate));
}
```

对照四要素：`NavItem` 数据 = Component；后端原始 `label` = Concrete Component；`resolveLabel` = Base Decorator；`resolveLabels` 递归整树 = Concrete Decorator。

使用方（`react/index.js`）按需注入翻译器，**传不传 `translate` 行为都正确**：

```js
out[loc] = translate ? resolveLabels(cached.data, translate) : cached.data;
```

### 例 3：Decorator 与 Strategy 的分界（同属本项目）

- **Strategy**（二选一）：`DefaultVisibility` ↔ `RolePermissionAwareVisibility`，经 `config('front-nav.visibility')` 换整颗算法。
- **Decorator**（逐层叠加）：若未来要"可见性 + 埋点 + 节流"，应写装饰器包 `VisibilityChecker`，而不是再加第 3 个平级类。

## 易错 / 注意

- **嵌套顺序影响结果**（加密 vs 压缩顺序不同，结果不同）——装饰链顺序是语义的一部分，需用测试固定。
- **不要把装饰器写成上帝类**——每个装饰器只做一件事。
- **包装对象身份**：装饰后 `instanceof` 原类可能失败，注意对真实对象做类型判断的地方。
- **装饰器过多** → 用 Builder/工厂组装（本项目 `NavItem::with()` + `singleton()` 就是这种配置化组装）。

## 关联

- 上位概念：[[10-Notes/70-Design-Patterns/MOC]]、[[00-Home/学习地图]]
- 平行概念：[[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]（策略/代理/门面对比）
- 下位例子：`packages/front-nav/src/core/labels.js`、`gz168/FrontNav/src/Resolver/VisibilityChecker.php`
- 反模式对照：装饰实战 PART 6（上帝类、嵌套顺序、过度抽象）

## 复盘

- 信心：2（首次写）
- 自测题：`packages/front-nav` 的 `resolveLabels` 为什么是"装饰器"而不是"策略"？如果把 i18n 翻译改成 `DefaultVisibility`/`RolePermissionAwareVisibility` 那种可互换实现，还是装饰器吗？
