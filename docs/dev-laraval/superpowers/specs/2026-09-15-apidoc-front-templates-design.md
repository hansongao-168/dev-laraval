# ApiDoc 前台显示模板（皮肤）— 设计规格

> 状态：已定案（brainstorm 2026-09-15）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-15-apidoc-front-templates-design.md`  
> 前置：`2026-09-14-apidoc-display-modes-design.md`（`template_key` 预留）  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 1. 目标与非目标

### 1.1 目标（V1）

- 把现有 `/api-doc` 前台正式注册为皮肤 **`classic`**。
- 每个 **显示方式**（`api_doc_display_modes`）的 `template_key` **生效**：解析后驱动 Blade 布局 / 组件命名空间。
- `null` / 空 / **未知** key → 安全回退 `classic`（不抛 500；可记 warning）。
- Filament 编辑显示方式时可从 **配置白名单** 选择 `template_key`。
- 聚合缓存键纳入规范化后的 `template_key`，换皮肤不串缓存。
- 快照 **导出 / 导入** 带上 `template_key`，避免与前台行为漂移。

### 1.2 非目标（V1 不做）

- 第二套皮肤 UI（紧凑 / 打印 / 深色等）。
- 运营可视化「拖拽换皮肤」或单独的 `api_doc_templates` 数据表。
- 改章节内容模型、权限模型。
- 前台访客「换皮肤」控件（皮肤只随显示方式变化）。
- 把现有 Blade 大搬家到 `templates/{key}/`（V1 仅映射到现有 `front` 命名空间）。

### 1.3 与显示方式规格的关系

| 项 | 显示方式规格（2026-09-14） | 本规格（2026-09-15） |
| --- | --- | --- |
| `template_key` | 预留，不读 | **接线并生效** |
| Filament | 隐藏或只读占位 | **Select，白名单选项** |
| 组合排版 | 临时主文 + 次文规则 | 仍由内容渲染负责；皮肤只换外壳，不改 locale 回落逻辑 |

本规格 **取代** 显示方式规格中「`template_key` 本期不读」的约束；其余显示方式行为不变。

## 2. 概念

| 概念 | 说明 |
| --- | --- |
| 显示方式 | 已有：有序语种列表 + 顶栏切换 + 默认 |
| 显示模板（皮肤） | 决定 **同一套 DB 内容** 用哪套 Blade/CSS 外壳 |
| `template_key` | 机器码，对应 `config('api-doc.templates.catalog')` 中的键 |
| `classic` | V1 唯一注册皮肤；映射现有 `gz168-api-doc::front.*` |

绑定规则：**每个显示方式一行一个 `template_key`**；切语言/模式时顺带换皮肤（若 key 不同）。

## 3. 架构：配置注册表

### 3.1 `config/api-doc.php` 增补

```php
'templates' => [
    'default' => 'classic',
    'catalog' => [
        'classic' => [
            'label' => '经典',
            'views_prefix' => 'gz168-api-doc::front',
            // 可选预留；V1 classic 指向现有内联资源
            'assets' => [
                'css' => 'resources/css/api-doc.css',
                'js' => 'resources/js/front/api-doc/api-doc.js',
            ],
        ],
    ],
],
```

- `default` 必须存在于 `catalog`。
- 空 catalog 或缺 default → **首次 resolve fail-fast**（明确配置异常）。

### 3.2 `ApiDocTemplateResolver`

职责：

- 输入 `?string $templateKey` → 规范化后的 key + catalog 条目（含 `views_prefix`）。
- `null` / `''` → `templates.default`。
- 未知 key → `templates.default`，并 `Log::warning`（含 bad key；调用方可附带 mode code）。
- 提供 `options(): array<code, label>` 供 Filament Select。
- 提供 `assertRegistered(string $key): void` 或 `isRegistered` 供模型 / Form 校验。

消费方：

- `ApiDocPage`（及 layout 解析）只依赖 Resolver，不散落 `if`。
- `ApiDocRenderer` / `ApiDocCacheManager` 使用规范化 key 参与缓存键。

依赖方向：Filament → Application（Resolver）→ Domain（DisplayMode）→ views。

### 3.3 视图策略（V1）

- **不搬家**：`classic` 的 `views_prefix` = 现有 `gz168-api-doc::front`。
- 以后加皮肤：catalog 新条目 + 新视图目录（如 `front-{key}` 或 `templates/{key}`），再改 mapping。
- **已注册但视图文件缺失** → fail-fast（与「未知 key 回退」区分）。

## 4. 数据模型与 Filament

### 4.1 字段语义

`api_doc_display_modes.template_key`：

| 值 | 含义 |
| --- | --- |
| `null` | 使用 `templates.default`（运行时仍规范化为 `classic`） |
| 合法 catalog key | 使用该皮肤 |
| 其它字符串 | 不得落库（校验拦截）；若历史脏数据，运行时回退 `classic` + warning |

类型：varchar nullable（已有预留；若迁移尚未含列，实现计划中补迁移）。

### 4.2 Seeder

五个内置 mode（`fr` / `zh` / `en` / `fr_zh` / `zh_en_fr`）全部显式写入 **`classic`**，不再写 `null`，避免半接线状态。

### 4.3 校验

- 模型 `saving` 或 Form 规则：`template_key` 为 `null` 或 ∈ catalog keys。
- Filament：`Select::make('template_key')->options(Resolver::options())`，可允许 placeholder「默认」映射 null，或直接默认 `classic`。
- 列表：可显示模板列（label 或 key）。
- 权限：复用 `api-doc.view` / `api-doc.update`；写成功后 flush ApiDoc 缓存。

### 4.4 快照

当前 `ApiDocExporter` **尚未**导出 `display_modes`。V1 **必须**：

1. 在快照中新增稳定键 `display_modes`（按 `sort` / `code` 有序）。
2. 每条至少含：`code`、`label`、`locales`、`is_active`、`is_default`、`sort`、`template_key`。
3. `ApiDocImporter` 能往返导入；非法 `template_key` → **整包校验失败并报告**，不静默改写为 default。
4. 导入后仍满足「至少一个启用默认」等显示方式不变量（复用现有模型校验 / Resolver::ensureInvariant）。

## 5. 前台渲染与缓存

### 5.1 页面

1. `ApiDocDisplayModeResolver` 解析当前 mode（现有逻辑）。
2. `ApiDocTemplateResolver` 规范化 `mode.template_key`。
3. 用 `views_prefix` 解析 layout 与 page view（及组件若需动态前缀）。
4. 数据聚合仍走 `ApiDocRenderer`：**payload 与皮肤无关**（locale 排版逻辑不变）。

### 5.2 缓存键

现有键形如 `render:{mode}[:html]`，改为包含规范化模板 key，例如：

```text
render:{modeCode}:{templateKey}[:html]
```

同一 mode、不同 `template_key` 必须缓存隔离。测试可用 **假注册第二 catalog key**（不必做第二套真实 UI）验证隔离。

### 5.3 资源

- V1：仍可内联现有 css/js；catalog `assets` 为挂载点，`classic` 指向现有文件。
- 前台 **不** 提供换肤 UI。

## 6. 错误处理

| 情况 | 行为 |
| --- | --- |
| 未知 / 空 `template_key`（运行时） | 回退 `classic`；可选 `Log::warning` |
| 空 catalog / 缺 `default` | resolve 时配置异常（开发期 fail-fast） |
| Filament / 导入非法 key | 校验拦截，不落库 |
| 已注册 key 但视图缺失 | fail-fast（明确异常） |

## 7. 测试（PHPUnit）

| 用例 | 断言要点 |
| --- | --- |
| Resolver | `null` / `classic` / 未知 key → 规范化结果与回退 |
| Seeder | 五 mode 的 `template_key` 均为 `classic` |
| Filament | Select 选项 = catalog；非法值无法保存 |
| Front | mode 绑 `classic` 时页面 200；行为与现网一致 |
| Cache | 同 mode 不同 `template_key` → 缓存键不同（假注册第二 key） |
| Snapshot | 导出含 `template_key`；导入往返保持 |

## 8. 实现边界清单

实现计划应覆盖（顺序建议）：

1. Config `templates` 块 + `ApiDocTemplateResolver` + 单测。
2. Seeder 改写 `classic`；模型校验；Filament Select / 列表列。
3. `ApiDocPage`（及必要时 layout）接 `views_prefix`。
4. 缓存键改造 + 隔离测试。
5. Exporter / Importer：**新增** `display_modes` 快照段（含 `template_key`）；非法 key 整包失败。
6. 前台回归：现有显示方式切换仍正常。

## 9. 后续（非 V1）

- 第二套皮肤：catalog 新 key + 独立 Blade/CSS。
- 可选：URL `?template=` 覆盖（本期明确不做；语言与皮肤保持绑在 display mode）。
- 可选：DB 模板元数据表（仅当运营需要非部署即可增皮肤时再评估）。
