---
type: book
topic: design-patterns
subtopic: book-anti-pattern
tags: [book, design-patterns, decorator, anti-pattern]
difficulty: 3
confidence: 2
reviewed: 2026-08-24
next-review: 2026-09-07
source:
  - book: 《装饰模式实战精讲》PART 6（反模式 & 结论）
created: 2026-08-24
updated: 2026-08-24
---

# 章节精读 · PART 6 反模式与最终结论

> 书摘。原文用 > blockquote 引用，感想用普通段落。

## 章节定位

- 书：《装饰模式实战精讲》
- 章节：PART 6 · 反模式 & 结论

## 原文摘录（用自己的话转述）

> 书里列了 4 条反模式警示。

### 反模式 1：装饰器变成上帝类
> 装饰器只应加**一点**职责。如果一个装饰器内部又写 if-else、又写日志、又写缓存——它就不是装饰器，而是上帝类。
>
> **正确做法**：拆成多个职责单一的装饰器，按需叠加。

### 反模式 2：嵌套顺序影响结果没注意到
> 加密/压缩是经典例子：`Encryption(Compression(FileDataSource))` ≠ `Compression(Encryption(FileDataSource))`。
>
> **正确做法**：装饰链顺序必须有文档/测试固定，不能靠"记得应该这样"。

### 反模式 3：装饰器过多时考虑 Builder
> 5 个以上装饰器 + 复杂组装逻辑 → `build_calculator()` 函数变得和原 if-else 一样难读。
>
> **正确做法**：用工厂/Builder 抽象组装步骤（也可借助 Laravel 容器）。

### 反模式 4：装饰器 vs 继承傻傻分不清
> "我有 5 个功能可选，每个都要不要都开放" —— 这是装饰链。
> "我有 5 个算法可选，到底用哪个" —— 这是 Strategy。
>
> **正确做法**：判断标准是"两个维度是否正交叠加"——是则装饰，否则策略/其他。

## 我用自己的话说

### 最终结论（书里的"FINAL TAKEAWAY"）

> **装饰模式是消除 if-else 的利器，但不是替代 if-else 的银弹。**
>
> 当业务规则**互相独立 + 可叠加 + 按场景动态启用**时，装饰链是最佳选择。
>
> 当业务规则**互相依赖 + 互斥选择 + 一次只能用一个**时，**Strategy** 更合适。
>
> 选用模式前先问："我到底在解决什么问题？"——模式是工具，**问题**才是目标。

### 一句话决策规则

> **"叠加 vs 替换"**——
> 叠加 → Decorator
> 替换 → Strategy
> 共享接口 + 正交两维 → Bridge

### 我从这章学到的 code review 原则

1. **每个装饰器只做一件事**（不止是"小函数"，更是"职责独立"）
2. **装饰顺序必须有测试**（不能凭记忆）
3. **超过 5 个装饰器考虑 Builder 抽象**（别让组装函数变成新上帝）
4. **不要用装饰器替代策略**（叠加 vs 替换，分清）

## 与已知笔记的关联

- [[10-Notes/70-Design-Patterns/装饰模式-Decorator]] — 核心笔记
- [[10-Notes/70-Design-Patterns/策略与适配器-多平台库存推送]] — Strategy 的对照
- [[10-Notes/70-Design-Patterns/桥接模式-标签打印双维解耦]] — Bridge 的对照
- [[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]] — 23 模式全景对照
- [[30-Resources/books/装饰模式实战精讲/章节/PART4-重构从if-else到装饰链]]
- [[30-Resources/books/装饰模式实战精讲/章节/PART5-装饰链实现PriceCalculator]]

## 行动计划 / One Thing

- [ ] 把"叠加 vs 替换 vs 正交两维"三条决策规则抄到 review checklist
- [ ] 用此规则 review `InventoryReconcileService` 的 if 分支——它们是叠加、替换、还是判定？
- [ ] 找出本仓库 1 个真实的"装饰链 vs 策略"边界模糊点（如有），做对比笔记