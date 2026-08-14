---
type: atomic
topic: design-patterns
subtopic: interpreter
tags: [design-patterns, oop, interpreter, php, dsl]
difficulty: 4
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-28
source:
  - book: 深入设计模式（Dive Into Design Patterns, Refactoring.Guru）Interpreter p.380 附近
  - code: gz168/LabelPrinting/src/Services/PlaceholderParser.php
created: 2026-08-14
updated: 2026-08-14
---

# 解释器模式（Interpreter）：标签占位符 DSL（PlaceholderParser）

## 一句话

> **解释器模式** = 为一种小型语言定义文法，并提供一个解释器按文法求值。`PlaceholderParser` 就是这样一个微型 DSL 解释器：`{{entity.field|filter:arg}}` 语法，一次 `preg_replace_callback` 解释执行。

## 是什么

### 问题：标签模板需要动态字段

打印标签时，模板里要写"这个商品叫什么、条形码是什么"，但不能写死——运行时才知道具体实体。于是模板写成占位符：

```
{{inventory_product.sku|upper}}
{{warehouse_location.code|append:_A}}
{{inventory_transfer.received_at|date:Y-m-d}}
```

### 解：解释器把占位符"字符串语言"翻译成取值+管道

`PlaceholderParser::parse()` 就是解释器：

```php
private const PATTERN = "/\{\{\s*([a-z_]+)\.([a-zA-Z0-9_.]+)([^}]*)\}\}/";
//                   alias        field         filters

public function parse(string $template, array $entities): string
{
    return preg_replace_callback(self::PATTERN, function (array $m) use ($entities) {
        [$full, $alias, $field, $filterStr] = $m;
        $value = data_get($entities[$alias] ?? [], $field);   // ① 取值
        foreach ($this->parseFilters($filterStr) as [$name, $arg]) {
            $value = $this->applyFilter($value, $name, $arg); // ② 逐层管道
        }
        return (string) ($value ?? '');
    }, $template) ?? $template;
}
```

**文法（mini-language）**：
- `{{ alias.field }}` → 取实体字段（`data_get` 支持点号路径）
- `{{ ... | filter }}` / `{{ ... | filter:arg }}` → 管道过滤器（`|` 分隔、`:` 传参）
- 过滤器：`upper` / `lower` / `default` / `append` / `prepend` / `truncate` / `date` / `currency`

**求值**：`parseFilters()` 把 `|upper|truncate:10` 解析成 `[[upper,null],[truncate,'10']]`，`applyFilter()` 用 `match` 逐层作用到值上。

```php
private function applyFilter(mixed $value, string $name, ?string $arg): mixed
{
    return match ($name) {
        'upper' => $value === null ? null : mb_strtoupper((string) $value),
        'append' => $value === null ? null : $value.$arg,
        'truncate' => $value === null ? null : mb_strimwidth((string) $value, 0, (int) ($arg ?? 30), '…'),
        'date' => $value === null ? null : Carbon::parse((string) $value)->format($arg ?? 'Y-m-d H:i:s'),
        default => throw new LabelPrintingException("Unknown placeholder filter [{$name}]"),
    };
}
```

## 为什么重要

- **把"模板字符串"变成可配置的领域语言**：新增过滤器 = 加一个 `match` 分支，不改调用方。
- **关注点分离**：模板作者写声明式占位符，解释器负责求值，渲染器负责排版——三者解耦。
- **它是简化版 Interpreter**：完整 GoF 用"表达式树 + 节点类"表达文法；这里用**正则 + match** 实现，文法简单时更实用。

## 怎么用 / 怎么实现（套路）

1. 定义小型文法（占位符 + 管道语法）。
2. 用正则把文法 token 拆出来（`preg_replace_callback`）。
3. 每类 token 一个求值规则（`applyFilter` 的 `match`）。
4. 未知 token 报错（`throw Unknown placeholder filter`）——**文法可穷举、可失败**。

## 易错 / 注意

- **别用 Interpreter 做复杂语言**：只有几种 token 时正则+match 够用；token 多了（嵌套、运算）才考虑表达式树。
- **正则要转义好**：`{` `}` `|` `:` 在占位符文法里是元字符，正则里的 `\s*`、`([^}]*)` 边界要小心。
- **过滤器顺序敏感**：`upper|truncate` ≠ `truncate|upper`，管道顺序是语义的一部分。
- 性能：正则逐条替换，批量模板大量占位符时考虑预编译。

## 关联

- 上位概念：[[10-Notes/70-Design-Patterns/MOC]]、[[00-Home/学习地图]]
- 平行概念：[[10-Notes/70-Design-Patterns/桥接模式-标签打印双维解耦]]（同属 LabelPrinting）、[[10-Notes/70-Design-Patterns/装饰模式-Decorator]]（管道=逐层装饰）
- 下位例子：`gz168/LabelPrinting/src/Services/PlaceholderParser.php`
- 反模式对照：《深入设计模式》"正则造了一个不可维护的语言"

## 复盘

- 信心：2（首次写）
- 自测题：为什么 `PlaceholderParser` 是"简化版 Interpreter"而不是完整 GoF 表达式树？`upper|truncate` 和 `truncate|upper` 结果为何可能不同？`applyFilter` 的 `match` 是策略吗？
