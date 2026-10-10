# UPS 创建面单 · 定义边界 → SPI/Ports → 适配器 设计方案

> **状态**：待评审，仅落盘方案，**不修改任何现有代码**。
> **范围**：express/carrier-ups 内「创建面单」端到端链路的全新实现。
> **目标**：高内聚 / 低耦合 / 单向依赖 / 端口驱动。
> **关联文档**：
> - docs/plans/ups-create-label.md（高层方案）
> - docs/plans/new-features-boundaries.md（四层模板）
> - express/spi-order/etc/architecture.md（既有 SPI 分层）

---

## 0. 设计原则（不可违反）

1. **零侵入既有代码**：V1 的 Label/Creator.php、Http/Requests/Openapi/LabelRequest.php、Concerns/HasUpsApi.php 等所有现有文件一行不改。
2. **新增文件独立目录**：所有 V2 实现位于 express/carrier-ups/src/V2/ 与 express/carrier-ups/tests/V2/，V1 文件零变更。
3. **依赖单向向下**：V2 只能依赖 Express\SpiOrder\* + Express\Carrier\* + Laravel 框架。禁止 use Express\LogisticsOrder\* 与 Express\CarrierUps\Label\* 等上层模型。
4. **端口驱动业务**：用例服务（Use Case）只依赖 SPI 包定义的 Port 接口；具体 Eloquent / Laravel 细节由 Adapter 在包外实现。
5. **DTO 不可变**：所有跨包传输的对象 final readonly + 构造期校验，领域内禁止 setter。
6. **可独立验证**：V2 单测可在不连 Laravel、不连数据库、不连 UPS API 的情况下全部跑通。

---
## 1. 定义边界（Bounded Contexts）

通过 Context Map 划清三方边界，每个上下文拥有自己的模型、规则与接口。

`mermaid
flowchart TB
    subgraph Foundation
        Laravel[Illuminate / XiFu / Eloquent]
    end
    subgraph CarrierUps[express/carrier-ups V2新增]
        UPSDomain[Domain]
        UPSApp[Application]
        UPSAdapter[Adapter]
        UPSHttp[Http]
    end
    subgraph SpiOrder[express/spi-order]
        Ports[Ports]
        DTOs[DTOs]
    end
    subgraph LogisticsOrder[express/logistics-order Adapter]
        LaravelAdapter[LaravelOrderToShipmentAdapter]
    end
    subgraph CarrierCore[express/carrier]
        AccModels[Account]
    end
    Foundation --> CarrierUps
    Foundation --> LogisticsOrder
    Foundation --> CarrierCore
    CarrierUps --> SpiOrder
    CarrierUps --> CarrierCore
    LogisticsOrder --> SpiOrder
    LogisticsOrder --> CarrierCore
    SpiOrder -.实现.-> LaravelAdapter
`

### 1.1 上下文清单

| 上下文 | 角色 | 拥有的概念 | 唯一所有权 |
| --- | --- | --- | --- |
| UPS Domain | 规则与不变量 | UpsServiceCode、UpsLabelSpec、ShipmentDraft 校验 | Express.CarrierUps.V2.Domain |
| UPS Application | 用例编排 | BuildDraft / UploadInvoice / CallApi / PersistLabel | Express.CarrierUps.V2.Services |
| UPS Adapter包内 | 框架/缓存适配 | CachedTokenResolver / LaravelLogger / ShipmentInputMapper / ShippingOrchestratorAdapter | Express.CarrierUps.V2.Adapter |
| SPI Order | 跨包契约 | Port + DTO + 异常 | Express.SpiOrder.Contracts + Express.SpiOrder.Dto |
| Logistics Adapter | Eloquent → SPI 桥接 | LaravelOrderToShipmentAdapter 等 | Express.LogisticsOrder.Support.V2.Adapter |
| Carrier Core | 账号/配置 | Account / Profile / CarrierManager | Express.Carrier |

### 1.2 上游/下游关系

- UPS Application -> SPI Order（向下依赖 Port 与 DTO）
- Logistics Adapter -> SPI Order（实现 Port）
- UPS Adapter包内 -> SPI Order + Laravel（实现 LoggerPort / 包内缓存）
- Carrier Core -> 无（只被依赖）


---

## 2. SPI / Ports 定义（位于 express/spi-order）

> 既有 express/spi-order 包已定义 5 个 Port，本节扩展并明确 UPS 新版本需要哪些 + 还需要补哪些。

### 2.1 既有 Port（直接复用）

| Port | 位置 | UPS 新版本 用途 |
| --- | --- | --- |
| OrderToShipmentPort::assemble(ShipmentSource): ShipmentDraft | Express.SpiOrder.Contracts | BuildDraftService 调用，得到聚合根 |
| InvoiceStoragePort::fetch(string): ?InvoiceContent | Express.SpiOrder.Contracts | UploadCommercialInvoiceService 取发票 |
| LabelPersistencePort::save(ShippingReceipt): void | Express.SpiOrder.Contracts | PersistLabelService 落库 |
| TokenResolverPort::resolve(string, string, bool): string | Express.SpiOrder.Contracts | UpsShippingApiClient 拿 Bearer token |
| LoggerPort::info / error(string, string, array): void | Express.SpiOrder.Contracts | LaravelLogger 实现 |

### 2.2 待补 Port（在 express/spi-order 新增，但 UPS 新版本 不直接改动）

| 待补 Port | 用途 | 备注 |
| --- | --- | --- |
| AccountProviderPort::resolve(string code, string key): AccountCredentials | 把 (carrierCode, accountKey) 映射到账号 | 现有 CachedTokenResolver 通过构造函数注入 TokenResolverPort |
| OrderDocumentRulePort::matches(ShipmentSource): bool | 判断是否需要 UPS Form / Invoice | 由 logistics-order 实现 |
| DocumentUploaderPort::upload(DocumentJob): DocumentUploadResult | 上传商业发票 PDF | 由 logistics-order 实现 |

### 2.3 DTO 清单（不可变，全部 final readonly）

| DTO | 位置 | 关键字段 |
| --- | --- | --- |
| ShipmentSource | Express.SpiOrder.Dto | platformOrderNumber, carrierCode, serviceCode, shipper, receiver, packages[], currency, isInternational, reference, specificData[] |
| ShipmentDraft | Express.SpiOrder.Dto | + needsCustoms, formTypes[], accountNumber, labelSpec |
| ShippingReceipt | Express.SpiOrder.Dto | platformOrderNumber, trackingNumber, trackingAdditionalNumber, labelDocuments[], formImages[], specificData[] |
| Address | Express.SpiOrder.Dto（待补） | name, companyName, line1, line2, city, postcode, countryCode, phone, email, isResidential |
| Package | Express.SpiOrder.Dto（待补） | reference, weightKg, lengthCm, widthCm, heightCm, declaredValue, currency, isDocument |
| InvoiceContent | Express.SpiOrder.Dto（待补） | documentNumber, fileName, mimeType, fileContent |

### 2.4 跨上下文防腐（ACL）

ShippingOrchestratorAdapter（位于 UPS 包 Adapter）承担 ACL 角色：
- **入站**：logistics-order 仍以旧 V1 Shipment 对象调用，Adapter 把数组字段映射成 ShipmentSource。
- **出站**：把 ShippingReceipt 折叠成 V1 期望的数组结构（含 tracking_number / tracking_additional_number / label_documents / form_images）。
- **不变量**：Adapter 内部只做纯转换；不持状态、不调业务规则。


---

## 3. 适配器（Adapter）拆分

### 3.1 包内 Adapter（位于 express/carrier-ups/src/Adapter/）

| Adapter | 实现 / 包裹 | 用途 |
| --- | --- | --- |
| CachedTokenResolver | 包裹既有 TokenResolverPort | 按 (carrierCode, accountKey) 缓存 Bearer token；不依赖 HasUpsApi |
| LaravelLogger | 实现 LoggerPort | 桥接 Log::channel(carrier-ups)，纯封装 |
| ShipmentInputMapper | 纯函数 | 数组 → ShipmentSource |
| ShippingOrchestratorAdapter | 包裹 ShippingOrchestrator | V1 调用方零感知；提供 create/retry/canInsurance/getSpecificData 数组方法 |

### 3.2 包外 Adapter（位于 express/logistics-order/src/Support/Adapter/）

| Adapter | 用途 |
| --- | --- |
| LaravelOrderToShipmentAdapter | 把 Express.LogisticsOrder.Models.Order.* 转成 ShipmentDraft；实现 OrderToShipmentPort |
| LaravelInvoiceStorageAdapter | 读 Express.LogisticsOrder.Models.Attachments.Invoice；实现 InvoiceStoragePort |
| LaravelLabelPersistenceAdapter | 把 ShippingReceipt 写回 Order / Package / Label；实现 LabelPersistencePort |
| LaravelDocumentUploaderAdapter | 包装 Document.Upload；实现 DocumentUploaderPort |

### 3.3 第三方 Adapter

| Adapter | 用途 |
| --- | --- |
| UpsShippingApiClient | Laravel HTTP 客户端封装 UPS /api/shipments/v2403/ship；持有 TokenResolverPort |
| UpsRequestBuilder | ShipmentDraft → v2403 JSON；纯数据转换，无 IO |
| UpsResponseParser | v2403 JSON → ShippingReceipt；抛 V2ApiException / V2ValidationException |
| UpsInputValidator | ShipmentSource 必填校验；抛 InvalidArgumentException |


---

## 4. 单向依赖图（详细）

`mermaid
flowchart TB
    subgraph V2_New[V2 新增仅新增文件]
        Orch[ShippingOrchestrator]
        Build[BuildDraftService]
        Upload[UploadCommercialInvoiceService]
        Call[CallShipmentApiService]
        Persist[PersistLabelService]
        Adapter[ShippingOrchestratorAdapter]
        Mapper[ShipmentInputMapper]
        Token[CachedTokenResolver]
        Log[LaravelLogger]
        Api[UpsShippingApiClient]
        Builder[UpsRequestBuilder]
        Parser[UpsResponseParser]
        Validator[UpsInputValidator]
        Domain[Domain]
    end
    subgraph Spi[express/spi-order]
        Ports[Ports]
        DTOs[DTOs]
    end
    subgraph Logi[express/logistics-order Adapter仅新增]
        LaravelAdapter[LaravelOrderToShipmentAdapter]
        Models[Models.Order.*]
    end
    subgraph Core[express/carrier]
        Account[Account]
        Manager[CarrierManager]
    end
    Orch --> Build
    Orch --> Upload
    Orch --> Call
    Orch --> Persist
    Build --> Ports
    Upload --> Ports
    Call --> Builder
    Call --> Api
    Call --> Ports
    Persist --> Parser
    Persist --> Ports
    Adapter --> Orch
    Adapter --> Mapper
    Mapper --> DTOs
    Token --> Ports
    Log --> Ports
    Api --> Token
    Builder --> Domain
    Builder --> DTOs
    Parser --> DTOs
    Validator --> DTOs
    LaravelAdapter -.实现.-> Ports
    LaravelAdapter --> Models
`

依赖方向（由强约束守住）：
1. 新增 -> spi-order（Ports / DTOs）
2. 新增 -> express/carrier（仅 Account / Manager 公共类，不依赖 Models）
3. logistics-order -> spi-order（实现 Ports）
4. 新增 <-/-> logistics-order（禁止反向依赖）
5. spi-order <-/-> 任何 Logistics* 或 Carrier*


---

## 5. 既有文件影响清单（SHA1 对照，不修改）

以下文件在本次 V2 实现中**一行不动**；后续评审以 git diff 为准。

| 文件 | 路径 |
| --- | --- |
| V1 Creator | express/carrier-ups/src/Label/Creator.php |
| V1 Openapi LabelRequest | express/carrier-ups/src/Http/Requests/Openapi/LabelRequest.php |
| 既有 trait / Document / Upload / Pickup 等 | express/carrier-ups/src/Concerns/*、Document/*、Pickup/*、Track/*、DeliveryProof/* |
| 既有 composer.json | express/carrier-ups/composer.json |
| 既有 carrier.yaml | express/carrier-ups/etc/carrier.yaml |
| 既有 ServiceProvider / EventServiceProvider | express/carrier-ups/src/CarrierUpsServiceProvider.php、EventServiceProvider.php |
| 既有 registration.php | express/carrier-ups/registration.php |
| 既有数据库迁移 | express/carrier-ups/database/migrations/* |
| 既有 AGENTS.md | AGENTS.md（根） |
| 既有根 composer.json | composer.json（仅追加 express/spi-order: * 依赖；V2 启用时由用户在评审通过后一次性手动添加） |

## 6. 验收门槛

| 维度 | 阈值 |
| --- | --- |
| 既有文件 SHA1 变更数 | **0**（仅 V2 与 tests/、etc/v2-*、docs/ 新增） |
| V2 单测覆盖率（领域 + Adapter + Orchestrator） | >= 85% |
| 契约测试 | OrderToShipmentPort / InvoiceStoragePort / LabelPersistencePort / TokenResolverPort / LoggerPort 各 1+ 用例 |
| 反向依赖 | deptrac 守门：V2 <-/-> Logistics*Models、SpiOrder <-/-> Carrier*/Logistics* |
| 静态检查 | phpstan level 8 0 error |
| 既有 phpunit 测试 | 全绿，无破坏 |
| Composer 锁文件 | 若仅增包，运行 composer update express/spi-order --dry-run 后人工执行；不擅自安装 |


---

## 7. 实施步骤（按可独立验证划分，每一步仅落盘与提交，不擅自执行）

### 步骤 1 · 端口契约冻结（既有 express/spi-order 文件已就位）
- 复核 OrderToShipmentPort / InvoiceStoragePort / LabelPersistencePort / TokenResolverPort / LoggerPort。
- 补 DTO：Address / Package / InvoiceContent（**只新增，不改既有文件**）。
- 写契约测试（反射形态）：tests/Unit/PortsContractTest.php（已存在，需复核）。

### 步骤 2 · UPS V2 域模型（仅新增）
- 新建 express/carrier-ups/src/V2/Domain/UpsServiceCodes.php（**已落盘**，含 UPS 服务代码常量）。
- 新建 express/carrier-ups/src/V2/Domain/UpsDocumentFormat.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Domain/UpsLabelSpecification.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Domain/UpsShipmentDraftValidator.php（不变量集中地）。

### 步骤 3 · UPS V2 HTTP（仅新增）
- 新建 express/carrier-ups/src/V2/Http/UpsRequestBuilder.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Http/UpsResponseParser.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Http/UpsShippingApiClient.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Http/LabelRequest.php（**已落盘**，仅协议层）。
- 新建 express/carrier-ups/src/V2/Rules/UpsInputValidator.php（**已落盘**）。

### 步骤 4 · UPS V2 业务编排（仅新增）
- 新建 express/carrier-ups/src/V2/Services/BuildDraftService.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Services/UploadCommercialInvoiceService.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Services/CallShipmentApiService.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Services/PersistLabelService.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/ShippingOrchestrator.php（**已落盘**，编排器）。
- 新建 express/carrier-ups/src/V2/Exceptions/{V2LabelException,V2ApiException,V2TokenException,V2ValidationException}.php（**已落盘**）。

### 步骤 5 · UPS V2 包内 Adapter（仅新增）
- 新建 express/carrier-ups/src/V2/Adapter/CachedTokenResolver.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Adapter/LaravelLogger.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Adapter/ShipmentInputMapper.php（**已落盘**）。
- 新建 express/carrier-ups/src/V2/Adapter/ShippingOrchestratorAdapter.php（**已落盘**，V1 调用方零感知）。

### 步骤 6 · 容器绑定（仅新增）
- 新建 express/carrier-ups/src/V2/ServiceProvider.php（**已落盘**）。
- 评审通过后由用户在 composer.json 的 extra.laravel.providers 末尾追加此 Provider（或保留 dont-discover）。

### 步骤 7 · Adapter 实现（仅新增文件，位于 logistics-order 包）
- 新建 express/logistics-order/src/Support/V2/Adapter/LaravelOrderToShipmentAdapter.php。
- 新建 express/logistics-order/src/Support/V2/Adapter/LaravelInvoiceStorageAdapter.php。
- 新建 express/logistics-order/src/Support/V2/Adapter/LaravelLabelPersistenceAdapter.php。
- 新建 express/logistics-order/src/Support/V2/Adapter/ServiceProvider.php（注册到容器）。
- 在 express/logistics-order/src/ServiceProvider.php 内 register() 末尾 mergeConfigFrom 一行注册新 Provider（**仅追加一行**，既有逻辑不动）。

### 步骤 8 · 测试（仅新增）
- 新建 express/carrier-ups/tests/V2/Support/FakePorts.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/Support/FakeShippingApiClient.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/Support/UpsResponseFixture.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/UpsInputValidatorTest.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/UpsRequestBuilderTest.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/UpsResponseParserTest.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/CachedTokenResolverTest.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/ShippingOrchestratorTest.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/ShippingOrchestratorAdapterTest.php（**已落盘**）。
- 新建 express/carrier-ups/tests/V2/phpunit.xml（**已落盘**）。

### 步骤 9 · 配置与文档（仅新增）
- 新建 express/carrier-ups/etc/v2-carrier.yaml（**已落盘**）：labels_v2 / shipments_v2 段。
- 新建 express/carrier-ups/etc/v2-folder-layout.md（**已落盘**）。
- 新建 express/carrier-ups/etc/v2-integration.md（**已落盘**）。
- 新建 express/carrier-ups/etc/v2-sequence.mmd（**已落盘**）。
- 新建 docs/plans/ups-create-label.md（**已落盘**）。
- 新建 docs/plans/new-features-boundaries.md（**已落盘**）。
- 新建 docs/architecture/ups-v2-bounded-contexts.md（**本文件**）。


---

## 8. 切换机制（V1 / V2）

logistics-order 的 LabelManager::getCreator() 解析优先级：

`php
 = app(CarrierManager::class)->getCarrierConfig(, labels_v2.creator)
        ?? app(CarrierManager::class)->getCarrierConfig(, labels.creator);
`

- labels.creator 指向 V1 Express.CarrierUps.Label.Creator。
- labels_v2.creator 指向 V2 Express.CarrierUps.V2.ShippingOrchestrator（通过 ShippingOrchestratorAdapter 适配）。
- 切换仅修改 etc/carrier.yaml，**无需改代码、无需重启**（Laravel 配置缓存需重生成）。

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| Adapter 误用 Eloquent | 破坏单向依赖 | Adapter 构造函数不允许注入 Models.Order.*；单元测试 assert type |
| V1 调用方期望的字段遗漏 | 切到 V2 后 Tracking / Pickup 异常 | ShippingOrchestratorAdapter 的契约测试覆盖所有 V1 字段 + null 安全 |
| TokenResolverPort 现有实现仍依赖 HasUpsApi | Adapter 仍有间接依赖 | CachedTokenResolver 自行做 token 缓存，不在 Adapter 里再 new 旧 trait |
| 既有 phpunit 测试受影响 | 切到 V2 后回归 | 切换通过 env / yaml，业务侧默认保持 V1；V2 默认 off |
| Composer 自动发现导致新 Provider 提前注册 | ServiceProvider 在 V2 未上线时执行 | composer.json 的 extra.laravel.dont-discover 显式排除 V2 Provider |

## 10. 既有架构优缺点速查

### 10.1 carrier-chronopost 优缺点

**优点**：
- SOAP + SFTP 多协议已封装（Pickup/Ipn/上传发票），结构成熟。
- Concerns 拆分细致（Init / Action / Request / Response / Track），按职责分文件，单文件可控。
- Models.Api 按版本目录切分（ShippingMultiParcel V1/V2/V3/V4 + ShippingV7），版本演进隔离良好。
- Action 抽象基类 + enum 工厂，OCP 友好，新增版本只追加 case。
- Track.Webhook.Processor 与 LogisticsWebhook 协议对齐，可插拔。

**缺点**：
- Creator 仍直接持有 Pickup / Shipment / SFTP Driver / 文件上传注释，多职责未拆；与 V1 一致。
- HasChronopostInit 同时承担 Ipn / Sftp / 上传发票 / 设置运单号四件事，违反 SRP。
- Enums.Action 直接 app(Api.ShippingV7.Action::class) 反向依赖 SPI 实现，Ports/Adapters 边界不清。
- 测试覆盖薄（无 V2 单元测试目录），重构缺保障。
- CarrierChronopostServiceProvider 空类，未注册任何 Port/Adapter；约束靠手写。

### 10.2 carrier-teliae 优缺点

**优点**：
- CarrierTeliae + CarrierTeliaeFacade 提供统一入口，Http facade 封装 ready。
- Enums.Action 与 Models.Api 一对一映射，命名空间清晰。
- HasTeliaeAction 内置 responseToErrorsInterface，错误归一。
- Models.Api 按动词切目录（Activate/AddHandlingUnit/Cancel/Create/...），语义直接。

**缺点**：
- CarrierTeliaeServiceProvider 空类，DI 散落在 app() 调用，难替换。
- Creator 直接 throw LabelException::forException，缺业务级异常（UploadInvoice/Api 区分不彻底）。
- 缺测试目录，无 V2 边界，重构即担风险。
- Pickup.Creator 与 Label.Creator 各自 init() 重复样板，可下沉 Port。
- 没有 CarrierTeliaeRequest 单独拆出 Rules，业务规则与 FormRequest 耦合。

### 10.3 优化建议（高层，不在本次执行）

1. 引入 express/spi-order 通用契约，把 OrderToShipment / LabelPersistence / InvoiceStorage / Token / Logger 五个 Port 公开。
2. 每个承运商按 V2 模板拆 Domain / Application / Adapter 三层；Creator 退化为 Inbound Adapter。
3. 测试目录按 V2 拆分，每个 Service 一个测试类，FakePorts 统一假实现。
4. 用 deptrac 守门：V2 <-/-> Logistics*Models、SpiOrder <-/-> Carrier*/Logistics*。
5. ServiceProvider 必须 register() 注入所有 Port；空 ServiceProvider 视为反模式。

## 11. 后续动作（不在本次执行范围）

1. 评审本文档与 docs/plans/ups-create-label.md、docs/plans/new-features-boundaries.md。
2. 评审通过后由 superpowers:writing-plans 生成 TDD 任务卡片（按步骤 1->9 顺序）。
3. 执行阶段由 superpowers:test-driven-development + superpowers:executing-plans 协同。
4. 每个步骤结束用 superpowers:verification-before-completion 收集证据。
5. 全部绿后由用户在根 composer.json 添加 express/spi-order: * 依赖，并修改 etc/carrier.yaml 切换到 V2。
6. 保留 2 周观察期，再按 docs/plans/ups-create-label.md 阶段 D 清理 V1（**清理动作另行评审，不在本次方案内**）。

> 本方案仅落盘。任何代码改动、Composer 命令、数据库命令、deptrac 初始化均由用户在评审通过后单独授权。
