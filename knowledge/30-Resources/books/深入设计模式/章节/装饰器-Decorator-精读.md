---
type: book
topic: design-patterns
subtopic: book-decorator
tags: [book, design-patterns, decorator]
difficulty: 3
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-28
source:
  - book: 《深入设计模式》第 4 章 结构型 · Decorator（p.181–198）
created: 2026-08-14
updated: 2026-08-14
---

# 章节精读 · Decorator（p.181–198）

> 书摘。原文用 > blockquote 引用，感想用普通段落。

## 章节定位

- 书：《深入设计模式》
- 章节：结构型模式 · 装饰器（Decorator），p.181–198

## 原文摘录

> 装饰器：**允许在不修改原类的情况下，把一个对象放进包含行为的"包装对象"里，动态地给对象附加职责。**
>
> 核心矛盾：继承是静态的、编译期确定的；组合（包装）是动态的、运行时组装的。
>
> 经典类比：**叠外套**——穿 T 恤 → 套卫衣 → 套羽绒服，每件"包装"不改变"你是谁"，只增加功能；顺序不同，效果也不同。

## 关键结构（用自己的话说）

```
Component（接口）
  ▲
  ├── ConcreteComponent   真实对象（如 FileDataSource）
  └── BaseDecorator       持 wrappee，默认透传
        ▲
        └── ConcreteDecorator  在委托前后加行为（如加密/压缩）
```

三个要点：
1. **装饰器与组件实现同一接口** → 才能一层套一层、互相替代。
2. **委托而非继承** → BaseDecorator 转发给 wrappee，子类只加"自己的那一段"。
3. **客户端看到的是接口，不知道套了几层** → 透明性。

## 我用自己的话说

这一章我读了 `packages/front-nav/src/core/labels.js` 才算真懂：

```js
export function resolveLabel(item, translate) {
  let label = item.label;
  if (item.labelKey) {
    const translated = translate(item.labelKey);
    if (translated && translated !== item.labelKey) label = translated;
  }
  return { ...item, label, children: resolveLabels(item.children, translate) };
}
```

- `item`（后端原始数据）= Concrete Component，**没有被修改**。
- `resolveLabel` = 装饰器：只覆盖 `label`，其余透传；`children` 递归再装饰 = 整棵树叠加翻译。
- 传不传 `translate` 都正确 = 装饰器可插拔，这是它优于"直接改后端 JSON"的原因。

书中"加密/压缩套 FileDataSource"和这里"翻译套 NavItem"本质完全一样：**包装不改原、逐层加职责**。

## 与相邻模式的区分（这本书最值钱的部分）

| 模式 | 一句话 | 本书页码 |
|---|---|---|
| Adapter | 改**接口**让它兼容 | p.143 |
| Proxy | **控制访问**，可延迟创建真实对象 | p.219 |
| Decorator | **增强行为**，仍是原接口 | p.181 |

## 与已知笔记的关联

- [[10-Notes/70-Design-Patterns/装饰模式-Decorator]] — 本项目落地详解
- [[30-Resources/books/深入设计模式/书评]]
- [[10-Notes/70-Design-Patterns/MOC]]

## 行动计划 / One Thing

- [ ] 把 `packages/front-nav` 的 `resolveLabels` 和书中 `DataSourceDecorator` 代码逐行对照一遍，写下"对应关系表"
