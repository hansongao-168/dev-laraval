---
type: atomic
topic: design-patterns
subtopic: template-method
tags: [design-patterns, oop, template-method, php, export]
difficulty: 3
confidence: 2
reviewed: 2026-08-14
next-review: 2026-08-28
source:
  - book: 深入设计模式（Dive Into Design Patterns, Refactoring.Guru）Template Method p.357
  - code: gz168/ExportManagement/src/Services/ExportService.php、gz168/*/Providers/*ServiceProvider.php（Spatie PackageServiceProvider）
created: 2026-08-14
updated: 2026-08-14
---

# 模板方法模式（Template Method）：导出骨架与模块 ServiceProvider

## 一句话

> **模板方法模式** = 父类定义算法**骨架**（固定步骤顺序），把可变步骤留给子类/钩子实现，子类不改流程、只填细节。`ExportService::export()` 和 Laravel 的 `PackageServiceProvider` 都是模板方法。

## 是什么

### 模板方法三要素

```
Template Method（骨架方法：定义步骤顺序）
  ├── step1()     ← 固定实现
  ├── step2()     ← 抽象/钩子：子类必须/可覆盖
  └── step3()     ← 固定实现
```

关键：**流程在父类，细节在子类**，好莱坞原则"Don't call us, we'll call you"。

### 落点 ①：导出服务（`ExportService::export`）

```php
public function export(string $modelName, array $data, array $headings, string $format = 'xlsx'): ExportRecord
{
    $fileName = $modelName.'_'.now()->format('Ymd_His').'.'.$format;
    $filePath = 'exports/'.$fileName;
    $fullPath = storage_path('app/'.$filePath);
    // ... mkdir ...

    $total = count($data);

    if ($format === 'csv') {
        $this->exportCsv($headings, $data, $fullPath);   // 钩子 A
    } else {
        $this->exportXlsx($headings, $data, $fullPath);  // 钩子 B
    }

    return ExportRecord::create([...]);                  // 固定收尾
}

protected function exportXlsx(...) { ... }   // 步骤实现
protected function exportCsv(...)  { ... }   // 步骤实现
```

**骨架**：生成文件名 → 建目录 → 统计 → **写文件（可变）** → 落库导出记录。
**钩子**：`exportCsv` / `exportXlsx`（都是 `protected`，子类可覆盖扩展新格式）。

**诚实说明**：这里用 `if ($format === 'csv') ... else ...` 而非多态调用钩子，所以是**简化版模板方法**——骨架固定 + 步骤可选，但切换逻辑是 if-else 而非继承覆盖。如果要严格模板方法，应把 `writeFile()` 做成抽象钩子，子类各实现一种格式。

### 落点 ②：Spatie `PackageServiceProvider`（模块生命周期）

本仓库所有模块的 ServiceProvider 都继承 Spatie 的 `PackageServiceProvider`，它就是模板方法：

```
configurePackage($package)   ← 钩子：模块填包名/资源
packageRegistered()          ← 钩子：注册容器绑定
packageBooted()              ← 钩子：启动路由/命令/事件
```

`DemoConsumerServiceProvider` / `FrontNavServiceProvider` / `CustomerServiceProvider` 只实现这三个钩子，**生命周期流程由父类控制**——模块之间因此高度一致、可预测。这是模板方法在框架层面的最典型应用。

## 为什么重要

- **复用骨架、消灭重复**：每个导出/模块都走同一套流程，差异只在钩子。
- **流程一致性**：收尾（落库、日志）在父类固定，不会被调用方漏掉。
- **与策略的区别**：模板方法是"**流程**固定、步骤可换"；策略是"**整颗算法**可换"。

## 怎么用 / 怎么实现（套路）

1. 把算法拆成：固定步骤 + 可变步骤。
2. 父类写模板方法（final 骨架），可变步骤声明为 protected（钩子）。
3. 子类只覆盖钩子，不改模板方法。
4. 需要"不强制覆盖"的步骤 → 提供默认实现（非抽象）。

## 易错 / 注意

- **模板方法要 final**：防子类覆盖骨架，破坏流程（PHP 用 `final` 关键字）。
- **钩子粒度**：太粗 = 子类重复代码；太细 = 子类被细节淹没。
- **别用 if-else 冒充模板方法**：如果只是"两个分支做不同事"且永不扩展，if-else 更简单；要"开放扩展"才值得模板方法。
- 钩子方法名要语义化（`exportCsv` 而非 `step2`）。

## 关联

- 上位概念：[[10-Notes/70-Design-Patterns/MOC]]、[[00-Home/学习地图]]
- 平行概念：[[10-Notes/70-Design-Patterns/策略与适配器-多平台库存推送]]（策略 vs 模板方法）、[[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构]]
- 下位例子：`gz168/ExportManagement/src/Services/ExportService.php`、`gz168/DemoConsumer/src/Providers/DemoConsumerServiceProvider.php`
- 反模式对照：《深入设计模式》"模板方法被过度设计成回调地狱"

## 复盘

- 信心：2（首次写）
- 自测题：为什么 `ExportService` 是"简化版模板方法"？如果要支持 `pdf` 格式，改 `export()` 是"开"还是"闭"？`PackageServiceProvider` 的三个钩子和模板方法模式什么关系？
