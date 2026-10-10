# 索引 · 本仓库的设计模式地图

> 适用范围：`express/` 模块（物流承运商集成）与 `gz168/Carrier`（新一代承运商抽象层）。
> 阅读路径：本章先给全景图，再按链接深入每一篇专题实战。

---

## 1. 三分钟电梯演讲

我们的仓库不是一个"教科书式"的模式样本 —— 它**反**而示范了一件事：

- **真正存在的 GoF 装饰器只有一处**：`CachedTokenResolver` (UPS V2)。其他看起来"装饰链"的能力组合，全部由 **Ports & Adapters（六边形架构）**通过接口多态 + DI 容器完成。
- **真正存在的 Laravel Pipeline / 中间件装饰链：零**。仓库刻意没用 `Illuminate\Pipeline`，连 `bootstrap/app.php` 的 `withMiddleware()` 都留空。
- 因此这份教程的核心不是"罗列模式"，而是回答：

> **当你面对一组稳定的承运商集成，要做能力增强（日志、重试、缓存、限流、ACL…）时，**
> **是该用装饰器层层包裹？还是用六边形让接口替你"切换实现"？**
>
> 这份仓库告诉你的是后者，并保留前者那一处作为"为什么它没有扩张成链"的参照系。

---

## 2. 模式 · 文件 · 适用章节

| 模式 | 仓库代表 | 文档 | 速记 |
|---|---|---|---|
| **装饰器 (Decorator)** | `express/carrier-ups/src/V2/Adapter/CachedTokenResolver` | `decorator.md` | 唯一的真实装饰器，缓存增强 `TokenResolverPort` |
| **策略 (Strategy)** | `express/carrier-{bpost,colissimo,dpd,fedex,ups,...}/*/Label/Creator` | `strategy.md` | 配置驱动 + YAML Registry |
| **工厂 + 注册表 (Factory / Registry)** | `express/carrier/src/CarrierManager` + `etc/carrier.yaml` | `factory-registry.md` | `getCarrierConfig($code, 'labels.creator')` 风格 |
| **适配器 / 端口 (Adapter / Port)** | `SpiOrder\Contracts\*Port` ↔ `Carrier*\V2\Adapter\*Adapter` | `adapter-port.md` | 真正的六边形接口边界 |
| **模板方法 (Template Method)** | `LogisticsOrder\Label\LabelAbstract`、`express-label/PrintReceipts/AbstractPrintReceipt` | `template-method.md` | 算法骨架 + 延迟步骤 |
| **Trait 组合 (PHP 8.x)** | `express/carrier-dpd/.../Creator` 的 `HasDpdApi + HasDpdLabel + HasOrder` | `trait-mixin.md` | 用 trait 替代多继承 |
| **Ports & Adapters / 反腐层 (ACL)** | `gz168/Carrier/Application/Ports/*` + 信封 + `SchemaValidator` | `hexagonal.md` | 整套新抽象层的灵魂 |
| **架构守护测试 (Fitness Function)** | `gz168/Carrier/tests/ModuleIsolationTest` | `fitness-function.md` | 把架构规则写进 CI |
| **规范模式 / JSON Schema (Specification)** | `gz168/Carrier/Infrastructure/Validation/SchemaValidator` | `specification.md` | 契约即文档、契约即代码 |
| **Orchestrator with retries** | `carrier-colissimo/src/V2/ColissimoDocumentPipeline` | `orchestrator.md` | 不引 Pipeline 也能表达"管道" |

---

## 3. 怎么读这份教程

1. **如果你想知道"装饰器在我这里该怎么用"** → 先看 `decorator.md`，再回头读 `hexagonal.md`，理解为什么装饰器在这个仓库里被压制。
2. **如果你想接入第 N+1 家承运商** → `factory-registry.md` + `adapter-port.md` + `hexagonal.md` 三篇成体系地读完即可。
3. **如果你是新加入的开发者，想看到仓库整体轮廓** → `00-index`（本文档）→ `adapter-port.md` → `strategy.md` → 其余按需。
4. **如果你只想找一份能照着抄的"装饰器实战示例"** → `decorator.md` 末尾有一段可运行的最小复刻。

---

## 4. 重要免责

- 本文档**只解读仓库里真实存在的代码**，不堆砌"N+1 家工厂都怎么写"的网络段子。
- 凡模式名称都标注 **GoF / POSA / Fowler / Evans / Ford** 等出处，方便回头查经典定义。
- 行号引用以仓库当前 `main` 分支为基准；后续重构可能让行号漂移，但**类名 + 文件相对路径**稳定。
