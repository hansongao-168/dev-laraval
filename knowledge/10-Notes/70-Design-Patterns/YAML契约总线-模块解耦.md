---
type: atomic
topic: design-patterns
subtopic: solid
tags: [design-patterns, solid, laravel, php, yaml, modules, dsl]
difficulty: 3
confidence: 3
reviewed: 2026-09-18
next-review: 2026-10-18
source:
  - code: gz168/contract-bus(2026-09 新增模块,11 Contracts + 8 Impl)
  - code: gz168/{customer,front-nav,inventory,erp-core,mall-customer,mall-order}/resources/contracts/contract.yaml
  - pattern: Facade + DIP + Strategy
created: 2026-09-18
updated: 2026-09-18
---

# YAML 契约总线:把 SOLID 落到模块边界

## 一句话

> gz168 项目把"模块用 YAML 声明通信接口"做成了**框架级机制**:扫描 → 校验 → 注册 → 依赖图,**运行时**强制模块间低耦合、单向依赖。SOLID 不是评论,而是 CI 闸口。

## 为什么

[10-Notes/70-Design-Patterns/SOLID原则-gz168落地] 讲了 gz168 怎么用 SOLID:`Contracts/` 接口层 + 容器注入。但 DIP 落点是"代码 import 路径里只出现 Contracts"。**这次的问题是:跨模块通信的契约本身没有显式表达**——Customer 模块里 `Event::listen(CustomerRegistered::class, ...)` 是硬编码的 PHP 字符串,只有运行起来才知道其他模块想订阅什么事件;OpenAPI YAML 各自维护,跟实际事件流脱钩。

需要一个**机器可读的、能跨语言生成的、能被 CI 校验的契约层**——YAML。

## 是什么

`gz168/contract-bus` 模块,4 个 Contracts 接口 + 8 个实现 + 3 个 artisan 命令:

```
Contracts\
  ContractDocument       readonly DTO,一份契约 = 一份 YAML
  ContractKind           enum:Http/Event/Subscribe/Command/Query/Schema
  ContractLoader         interface(读取契约)
  ContractValidator      interface(meta-schema + 跨文档校验)
  ContractRegistry       interface(只读注册中心)
  ContractScanner        interface(扫描模块树)
  DependencyGraph        interface(DAG + 拓扑序)
  ContractBusRegistry    facade(组合 Scanner+Validator+Registry)

Impl\
  YamlContractLoader      symfony/yaml 解析 + 严格类型守卫
  ContractScanner         组合 gz168/module-core 的 ModuleScanner
  MetaSchema              元 schema 常量表(声明 required/optional)
  ContractValidator       per-doc + cross-doc 两遍校验
  InMemoryContractRegistry 双索引(byKind + byKey)
  DependencyGraph          Kahn 拓扑 + DFS 环检测
  ContractBusRegistry      facade 默认实现
```

`Resources/contracts/contract.yaml` 是契约本身。例如 gz168/customer 的契约:

```yaml
module: customer
version: 2.0.0
depends_on:
  - common
  - front-nav
schemas:
  Customer:
    type: object
    required_fields: [id, email]
emits:
  CustomerRegistered:
    schema: Customer
http:
  - method: POST
    path: /api/v1/customers
    operation: customer.create
    request: CustomerCreateInput
    response: Customer
```

3 个 artisan 命令:

```
php artisan contract-bus:validate    # CI 闸:校验 + 检查环,exit 0/1
php artisan contract-bus:list        # 列出已发现的所有契约
php artisan contract-bus:graph       # 输出 DOT(管道 `dot -Tpng` 渲染)
```

## SOLID 在这里的精确落点

| 原则 | 落点 |
|---|---|
| **SRP** | Loader 只解析、Validator 只校验、Registry 只存、Graph 只算图、Scanner 只走模块树。每个文件 30-200 行,单一变化理由。 |
| **OCP** | 加新 kind:只动 4 处——`ContractKind` 加 enum、`MetaSchema::CAPABILITY_RULES` 加规则、`InMemoryContractRegistry::add()` 加 1 行 kindMap、`ContractValidator::collectReferencedSchemas()` 加可选分支。**不动** Scanner/Graph/CLI,既有 YAML 不破坏。 |
| **LSP** | `Loader\ContractScanner implements Contracts\ContractScanner`,所有 LSP 子类可替换(已为后续 filesystem-backed / network scanner 留口)。 |
| **ISP** | 读侧只有 `ContractRegistry` + `DependencyGraph`(纯只读);写侧只有 `InMemoryContractRegistry::add()/reset()`;协调侧是 `ContractBusRegistry` facade。命令只 depend 自己用到的接口。 |
| **DIP** | `Gz168\ContractBus\Contracts\` 是其它模块唯一可 import 的入口;ServiceProvider 是**唯一**知道具体类的地方。Customer 的 ServiceProvider 只 `use Gz168\ContractBus\Contracts\ContractBusRegistry`,不 import 任何 Impl/。 |

## 模式视角

| 模式 | 用在哪 |
|---|---|
| **Facade** | `ContractBusRegistry` 是 Scanner + Validator + Registry 的 facade,给 CLI 和消费者一个稳定入口。 |
| **Strategy** | `ContractLoader` 接口允许多种解析策略(YAML 是默认,未来可换 JSON Schema / TOML);`ContractValidator` 同理。 |
| **Observer 的反向** | 传统 Observer 模式让 Subject 知道 Observer,YAML 反过来——Observer(订阅方)声明自己订阅什么,Subject 不用知道。 |
| **Adapter** | `InMemoryContractRegistry` 的双索引(byKind + byKey)是适配多种查询模式;HTTP 索引用 `operation` 字段而不是数组 key。 |
| **Pipeline** | `refresh()` = scan → validate(per-doc) → reset → add → validate(cross-doc),每段独立可换。 |

## 单向依赖怎么落地

`depends_on` 是**出边**(我引用谁的契约),不是入边。

- DAG 检测:`DependencyGraph::cycles()` 用 DFS 三色,任何长度环都报。
- 拓扑序:`topologicalOrder()` 用 Kahn 算法(出度为 0 先入队 + 反向邻接表),依赖项在前,被依赖项在后。
- CI 闸:`contract-bus:validate` 遇 error 或 warning 都非零退出。

实际产出的依赖图(10 节点 / 14 边 / 0 环):

![gz168 契约依赖图](file:///D:/www2/dev-laraval/gz168/ContractBus/docs/deps.png)

解读:
- `common` 是底,被 6 个模块依赖。
- `front-nav` 只被 `customer` 引用(因为 NavRegistrar 是 customer 唯一导航源)。
- `inventory` 是事件流中枢:订阅 `erp-core` 三个事件,自己也发三个事件供 audit 订阅。
- `mall-customer` 订阅 `mall-order` 的 `OrderPaid`(会员等级评估触发器)。
- 没有任何反向边,符合单向依赖。

## 为什么这次实现能"成功落地"

| 决策 | 弃 | 选 | 理由 |
|---|---|---|---|
| Schema 共享 | 跨文档全局 schema registry | 文档局部 | 跨文档共享 = 跨模块边界共享,违背低耦合;v1 故意禁掉 |
| 校验时机 | 每次调用都重扫 | 启动时一次 + `refresh()` 显式触发 | Laravel 容器单例足够;开发期 artisan 即时 |
| 依赖图算法 | DFS 递归 | Kahn 拓扑 | 测试要可断言固定序;DFS 输出序不稳 |
| Schema 类型系统 | 完整 JSON Schema | 最小子集(type/required/properties) | 复杂 feature 留给 v2,够用优先 |
| 命名空间 | `App\Contracts\*` | `Gz168\ContractBus\Contracts\*` | 与既有 `Gz168\FrontNav\Contracts\*` 同形,业务模块 `use` 全路径无需别名 |

## 给业务模块的接入模板

```yaml
# gz168/<你的模块>/resources/contracts/contract.yaml
module: <你的模块别名>
version: 1.0.0
description: 一句话讲清这个模块对外暴露什么
depends_on:
  - common                # 单向,只列已存在的模块

schemas:
  Widget:
    type: object
    required_fields: [id, name]

emits:
  WidgetCreated:
    schema: Widget

http:
  - method: POST
    path: /api/v1/widgets
    operation: widget.create
    request: Widget
    response: Widget
```

```php
// 在另一个模块的 ServiceProvider 里消费
use Gz168\ContractBus\Contracts\ContractBusRegistry;

public function boot(ContractBusRegistry $bus): void
{
    $registry = $bus->registry();
    foreach ($registry->forModule('widget') as $doc) {
        foreach ($doc->emits as $event => $info) {
            Event::listen($event, Listeners\On{$event}::class);
        }
    }
}
```

## Cache 层(v1.1)

生产态不能每次请求都全量扫描 + 解析 + 校验 14 个 YAML,加 cache 层。

设计要点(SOLID 一致):

- 边界接口 ContractRegistryCache(ISP)
- 2 个实现:LaravelCacheContractRegistryCache(默认)+ NullContractRegistryCache(关 cache 时注入,LSP)
- facade 注入接口(DIP),不知道 Illuminate\Cache 存在
- 失效靠 sha1 内容指纹,不靠 TTL — 一行 YAML 改动触发 rebuild

```php
// config/contract-bus.php
cache => [ enabled => true, store => file, ttl => 3600 ]
```

```bash
php artisan contract-bus:cache:warm    # 部署预热,首请求 0 成本
php artisan contract-bus:cache:clear   # 强清
```

测试:tests/Unit/Cache/ 下 3 个测试类,10 个用例。用一个 InMemoryTestCache
绕开 Laravel cache,跑得飞快。

## 迭代历史

| 版本 | 主题 | 增量 |
| --- | --- | --- |
| v1.0 | 起步 | 14 契约 / 29 测试 / Scanner + Validator + InMemoryRegistry + Facade + CLI |
| v1.0.1 | mall-flow 闭环 | +4 契约(MallFulfillment / MallPayment / MailAccount / MailNotification),事件流可视化 |
| v1.1 | Cache 层 | +6 文件(接口 + 2 实现 + fingerprint + 2 CLI),+10 测试,sha1 指纹失效 |
| v1.2 | Impact 分析 | +4 文件(ImpactEntry / Report / Analyzer + CLI),+6 测试,git diff → 受影响消费者清单 |
| v1.3 | 契约扩张 | +22 契约(5 详细 + 17 空),覆盖 36 个 gz168 模块,依赖图 0 环 |
| v1.4 | Mail 套件 + CI | +5 契约(mail-gmail/mail-qq/mail-outbound/mail-inbound/mail-admin),Impact emit 精度 refinement,.github/workflows/contract-bus.yml |

### v1.2 Impact 分析

回答一个具体问题:"我改了 customer.yaml,谁会被影响?"

- 边界接口 ContractBusRegistry 不变
- 新增 Impact\{Analyzer, Report, Entry} 纯服务,无 Laravel 依赖
- 新增 `php artisan contract-bus:impact --since=main [--json]`
- diff 走 git,过滤 contract.yaml 变化,左右两侧分别 loadFromString 然后 diff
- 一份 emit_removed 自动列出所有 `subscribes.X.from=that_module` 的消费者

CLI 三种触发方式:

    php artisan contract-bus:impact --since=main        # vs main 分支
    php artisan contract-bus:impact --from=abc --to=def # 任意两个 ref
    php artisan contract-bus:impact --staged             # 当前 staged 变更

退出码:0 = 无破坏 / 1 = 有破坏(CI gate 可用)/ 2 = git 错误。

### v1.3 契约扩张

76 个 gz168 模块之前没有 contract.yaml,迭代 v1.3 一次性补了 22 份:

- 5 份详细契约:`kafka-management` / `api-auth` / `mail-contracts` / `mall-cart` / `wechat-pay`
- 17 份空契约(module-core / ApiDoc / CacheManagement / LogManagement / QueueManagement 等基础设施)

附带把 ContractValidator 的两处历史限制修了:

- `collectReferencedSchemas` 不再跳过 `Empty` 在 commands/queries input/output 的引用
- `W_UNUSED_SCHEMA` 对 `Empty` 内置占位符豁免(用户可显式声明意图)


### v1.4 Mail 套件 + CI 闸口

邮件域 5 个模块补契约,验证 v1.3 设计的 mail-contracts 依赖链:
mail-contracts -> MailOutbound (emit OutboundMailQueued) -> MailGmail/MailQq (subscribe)。

跨文档 schema 共享的代价暴露:`MailOutbound` 想引用 `mail-contracts:EmailMessage`
被 E_REFERENCED_SCHEMA_MISSING 挡,只能本地复述一份。v2 加 `$ref` 解析后可解。

Impact 精度 refinement:emit 类的 consumers 收窄到该特定事件的订阅者,
避免"模块 X 删了个 emit,所有 depends_on X 的模块都被列出"的误报。

`.github/workflows/contract-bus.yml` 把 composer test:contracts 接入 PR 检查,
3 个并行 job:
- module-tests(Pint + PHPUnit + composer test:contracts)
- impact(--since=main,exit 1 = BREAKING,粘 PR 评论)
- graph-artifact(重生成 deps.png,reviewer 可直接看)


## 关联

- 上位原则:[10-Notes/70-Design-Patterns/SOLID原则-gz168落地] — gz168 现有的 SOLID 落地,这次是其"契约层"的具体延伸。
- 平行概念:[10-Notes/70-Design-Patterns/设计模式落地-gz168模块架构] — 23 模式如何协同,这次新增了 Facade + Strategy 的实例。
- 下位代码:`gz168/contract-bus/src/Contracts/`(11 个接口)+ `gz168/contract-bus/src/{Loader,Validation,Registry,Graph}/`(实现层)+ `gz168/ContractBus/docs/DEVELOPER_GUIDE.md`(实操指南)。
- 平行工具:`gz168/FrontNav/src/Contracts/NavRegistrar.php`(接口反转的早期实例,只覆盖导航一个能力;contract-bus 是它的全量版)。

## 复盘

- 信心:3(已落地,46 单测 + 89 断言 + 41 契约 + 真实依赖图 0 环 + GitHub Actions CI 闸口)
- 关键教训:**DIP 落点不仅是 import 路径,还要把契约本身机器可读化**——否则"模块只依赖接口"只是 grep 出来的假象。
- 自测题:`contract-bus` 的 Facade 模式具体是哪个类?OCP 在加新 kind 时只动哪 4 处?为什么 v1 故意不支持跨文档 schema 共享?Kahn 算法为什么需要反向邻接表?
- 自测题(v1.1):缓存指纹为什么 sha1 包含 size + mtime + 内容而不是只 hash 路径?Null 适配器为什么是必要的而不是可选的?
- 自测题(v1.2):Impact 分析为什么是 facade 之外的独立服务?`consumersOf` 怎么同时处理 `depends_on` 和 `subscribes.from` 两类边?
- 自测题(v1.3):22 个新增契约为什么 17 个是空?基础设施模块的"声明存在"对依赖图的价值是什么?为什么 `Empty` 必须在 schemas 里显式声明才能在 commands/queries input 用?(答:文档局部,跨文档不共享)
- 自测题(v1.4):跨文档 schema 共享 v1 故意禁掉,MailOutbound 复述 EmailMessage 的成本可接受吗?Impact `narrowToEventSubscribers` 为什么只在 emit 变更时生效,不适用于 schema/command 变更?(答:只有 emit 有"事件订阅"这种精确边,其他项只有依赖关系没有订阅关系)
