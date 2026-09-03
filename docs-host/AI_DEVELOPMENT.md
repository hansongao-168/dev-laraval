# AI 开发约定

本文档是本项目所有 AI 编程助手共享的项目事实与工程约定。工具专属配置用于加载本文档，Laravel Boost 生成的规则用于补充具体框架规范。

项目长期学习记录在 `knowledge` Obsidian Vault 中（仓库单独 git 仓库，不与 Laravel 项目混提交）。

**当前定位**：dev-laraval 是 **Dev 学习 / Playground**，原 ERP 多端业务版已演化为学习底座，相关业务参考与子模块保留在 `apps/`、`bin/`、`gz168/`。

AI 助手开始任务前，按 [[00-Home/学习地图]] 与 [[00-Home/AI上下文]] 的顺序阅读：

1. `knowledge/00-Home/学习地图.md` — 入口与维护规则
2. 对应主题 MOC（`MOC-前端.md` / `MOC-后端.md` / `MOC-算法.md` / `MOC-AI.md` / `MOC-工程实践.md`）
3. 主题 MOC 下的具体原子笔记
4. 需要历史 ERP 业务背景时回到 `knowledge/99-Archive/erp-snapshot-2026-07-26/`

任务完成后，同步更新相关知识库笔记（学习库为原子笔记形式，不是需求文档）。

知识库不得包含 `.env`、密码、令牌、个人信息、生产数据或未脱敏日志；详见
`knowledge/07-Operations/知识库安全规范.md`。

## 项目事实

- 项目类型：Dev 学习 / Playground 仓库（保留 ERP 子项目作为参考底座）
- Web 服务器：Apache，DocumentRoot 必须指向 `public`
- PHP：8.5
- Laravel：13
- Filament：5
- Livewire：4
- Next.js：16
- Expo SDK：57
- Taro：4
- React：Web/Expo 使用 19；Taro 使用其官方兼容的 React 18
- MySQL：8
- Redis：8，用于 cache、session 和 queue
- 测试：PHPUnit 12
- 格式化：Laravel Pint
- 前端：Tailwind CSS 4、Vite

以 `composer.lock`、`package-lock.json` 和实际代码为准确版本来源，不凭记忆套用旧版本 API。

## 关键业务不变量

1. 受保护管理员由 `php artisan app:initialize` 创建。
2. 受保护管理员仅允许修改邮箱、密码、状态及管理员权限（包括降权或停用），不得修改其他资料，并且始终不得删除。
3. 不得移除 `User` 模型中的受保护管理员删除保护或扩大可修改字段，除非用户明确要求改变该业务规则。
4. 初始化流程必须保持幂等；重复执行不得覆盖、重新提权或重置受保护管理员密码。
5. Filament 后台访问权限必须通过服务端授权判断，不能仅依赖隐藏菜单或按钮。

## 安全与隐私

- 不读取、回显、记录或提交 `.env` 中的密码和密钥。
- 示例配置只使用占位符，不复制真实凭据到文档、测试或提交内容。
- 不在前端代码中实现服务端授权。
- 所有外部输入都要验证；批量赋值、文件上传、查询筛选和导出功能需要检查越权风险。
- 数据库结构变更必须使用 migration，不直接手工修改生产表。
- 破坏性数据库操作和依赖升级必须先获得用户明确许可。

## 模块化设计原则（强约束）

所有开发必须遵循 **模块化、低耦合、高内聚、单向依赖**。违反这些原则的代码不应通过 Review。

### 1. 模块化

- 一个模块 = 一个明确的业务边界，对应一个 `app/Modules/<Name>` 目录或独立的 `packages/<name>` 包。
- 模块内暴露公共能力（Controller、Action、Service、Repository、Enum、DTO、Contract）作为唯一入口；模块内部实现细节（私有 Helper、Internal Query、缓存策略）不得被外部跨模块直接调用。
- 每个模块必须有：`README.md`（职责与边界）、`composer.json`（如独立包）或 `module.json`、清晰的 `routes/`、`database/`、`tests/`。
- 跨模块集成必须走模块公共入口（接口 + 实现，或事件 + 监听器），禁止反向依赖。

### 2. 低耦合

- 通过接口（Contract）而非具体实现进行依赖；Laravel 使用 `app()->bind(Contract::class, Implementation::class)` 注入。
- 跨模块通信优先使用：领域事件（Event / Listener）、队列任务、API 资源；避免直接调用对方 Service。
- 禁止循环依赖：A → B → A 在任何层面（命名空间、Composer、容器绑定）都不允许。
- 替换或重构一个模块时，不应触发其他模块的代码改动（仅可能需要新增绑定或事件订阅）。

### 3. 高内聚

- 一个类只负责一件事；读、写、验证、渲染、副作用分离。
- 同一业务能力的 Controller、Action、Policy、Repository、Migration 必须位于同一模块内；不要把"用户"相关代码分散到多个模块。
- 公共工具（Helpers、Traits）按主题归类（如 `Money`、`DateRange`、`Tenancy`），禁止出现全局杂项 `Util` / `Common` 类。
- 模块内部按 `Domain` / `Application` / `Infrastructure` / `Http` 分层；不同层只允许向下依赖。

### 4. 单向依赖

依赖方向必须严格自上而下：

```
Http (Controller / Filament / Livewire / API Resources)
    ↓
Application (Action / Service / DTO / UseCase)
    ↓
Domain (Model / Policy / Event / Enum / Contract)
    ↓
Infrastructure (Repository / Cache / Queue / External Adapter)
```

- 上层不得被下层直接引用。
- 跨模块只允许"上层模块依赖下层模块"，禁止反向。
- 基础设施（数据库、缓存、外部 SDK）必须通过 `Domain` 层的接口暴露，业务代码不直接 `new` 第三方客户端。
- 通用类型（枚举、DTO、事件）可放在共享层 `packages/shared` / `app/Shared`，但共享层不依赖任何业务模块。

### 5. 模块边界检查清单

每次新增或修改跨模块代码前，回答：

1. 这个改动属于哪个模块？是否属于该模块的职责？
2. 是否需要暴露新接口？接口是否稳定、可替换？
3. 是否会引入反向依赖或循环依赖？
4. 是否更新了模块的 `README.md`、接口契约、事件清单？
5. 是否新增/更新了对应的模块测试与集成测试？

### 6. 命名与目录

- 模块命名使用单数、PascalCase：`app/Modules/Order`、`app/Modules/Inventory`。
- 命名空间映射：`App\Modules\Order\...`。
- 跨模块导入使用完整命名空间，禁用 `use ... as ...` 掩盖来源。

违反以上原则的代码视为不符合项目规范，必须在 Review 阶段拒绝合并。

## 开发方式

- 开始修改前先检查相邻代码与现有命名方式。
- 优先使用 Laravel、Filament 和 Livewire 的原生机制。
- 创建 Laravel 文件时优先使用带 `--no-interaction` 的 `php artisan make:*` 命令。
- 控制器保持精简；验证放入 Form Request，复杂业务放入命名清晰的 Action 或 Service。
- 使用 Eloquent 关系、Policy、Gate、Resource 和队列，避免重复实现框架能力。
- 访问环境变量只在 `config/*.php` 中进行，业务代码使用 `config()`。
- 新功能应包含成功、失败、权限与边界场景测试。
- 修复缺陷时先添加能复现问题的测试。

## Filament 约定

- 资源放在 `app/Filament/Resources`，页面和 relation manager 遵循 Filament 5 目录结构。
- 表格查询必须考虑授权、N+1 查询、分页和大数据量。
- Action 的可见性不是授权；执行 Action 时仍需 Policy 或服务端校验。
- 表单中的唯一性、状态转换和跨字段规则必须在服务端验证。
- 使用当前安装版本的 Filament API，不照搬 Filament 3/4 示例。

## 数据与性能

- 列表页按需 eager load，禁止循环内查询。
- 常用筛选、关联和排序字段应评估索引。
- 大批量导入、导出和耗时任务使用队列。
- Redis key 应有明确前缀和有效期；缓存更新要有失效策略。
- migration 的 `down()` 必须可逆；无法安全逆转时要明确说明。

## 验证清单

PHP 代码修改后至少执行：

```shell
vendor/bin/pint --dirty
php artisan test --compact
```

前端代码修改后执行：

```shell
npm run build
```

依赖或 Composer 配置修改后执行：

```shell
composer validate --no-check-publish
```

数据库相关变更还要验证 migration 可执行，并确保测试使用独立测试数据库。

## 常用入口

- 初始化：`composer initialize`
- 完整首次安装：`composer setup`
- 生成独立新项目：`bin/create-project <目标目录> [项目名称]`
- 本地开发：`composer dev`
- 后台：`/admin`
- 客户端 API：`/api/v1`
- Next.js：`apps/web`
- Expo：`apps/mobile`
- Taro 微信小程序：`apps/miniapp`
- 共享 API SDK：`packages/api-client`
- 安装文档：`docs-host/INSTALL.md`
- Apache 示例：`docs-host/apache-vhost.conf.example`
- Laravel Boost 配置：`boost.json`
- Laravel Boost MCP：`php artisan boost:mcp`

## 完成标准

任务完成时说明变更结果、验证结果、未完成事项和需要人工执行的部署步骤。不要声称未实际运行的测试或迁移已经通过。
