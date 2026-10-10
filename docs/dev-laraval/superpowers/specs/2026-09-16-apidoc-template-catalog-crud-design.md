# ApiDoc 前台模板目录 CRUD + 分区源码编辑 — 设计规格

> 状态：已实现（brainstorm 2026-09-16；修订：同期纳入分区 HTML/CSS 编辑；验收：ApiDoc 套件 PHPUnit 全绿）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-16-apidoc-template-catalog-crud-design.md`  
> 前置：`2026-09-15-apidoc-front-templates-design.md`（V1：config 注册 `classic` + `template_key` 接线）  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 0. 在路线图中的位置

本规格是「模板能力」的 **子项目 1 + 子项目 3 的最小切片**（目录 CRUD **与** 分区 HTML/CSS 编辑同期）。

| 后续（不在本期） | 说明 |
| --- | --- |
| 子项目 2 | 运营可视化拖拽布局编排 |
| 子项目 3 余量 | JS 源码字段、iframe 真前台预览、自动复制整目录 Blade |
| 子项目 4 | MD 正文编辑增强 |
| 子项目 5 | 开发编辑器改仓库 HTML/MD |

本期交付：**皮肤元数据 CRUD（DB 为运行时源）** + **冻结分区清单上的 HTML/CSS 编辑、保存消毒、简易预览**。空分区回退仓库 Blade。

## 1. 目标与非目标

### 1.1 目标

- Filament 可 **创建 / 编辑 / 软删除** 皮肤元数据（允许软删 `classic`，但全库未软删且 `is_active` 的行必须 ≥ 1）。
- 显示方式的「前台模板」Select 改为选择 **DB 中启用且未删** 的皮肤。
- 新建只填 `code` / `label` / `is_active` / `sort`；`views_prefix` 按约定自动生成。
- 编辑页可改 **冻结清单** 内各分区 HTML + 一份 `css_text`；空分区 / 空 CSS **回退** `views_prefix` 下对应 Blade / 现有 css 文件。
- 保存时 **剥离** `<script>`、`<iframe>`、`<object>`、`<embed>` 及 `on*` 事件；CSS 去掉 `expression(` / `javascript:`。交互仍走仓库 JS。
- 编辑页提供 **简易预览**：当前草稿 + **固定样例 payload** 拼一页 HTML（非完整 Livewire `/api-doc`）。未保存草稿只用于预览。
- `ApiDocTemplateResolver` **运行时只读 DB**（不再读 `config('api-doc.templates.catalog')` 作为运行时源）；config 仅作 seeder 种子。
- 快照导入导出包含 `templates`（含 `body_parts`、`css_text`）；`display_modes.template_key` 导入时必须指向未删 `code`，否则整包失败。

### 1.2 非目标

- 可视化拖拽布局（子项目 2）。
- 开放 JS 源码字段；自动复制整目录 Blade 到新皮肤。
- iframe 打开真实 `/api-doc` 作为预览（可后期加）。
- 新增 `templates.is_default` 列（回退策略用 sort/id，见 §2）。

### 1.3 对 V1 规格的取代点

| 项 | V1（2026-09-15） | 本期 |
| --- | --- | --- |
| 皮肤注册源 | `config` catalog | **`api_doc_templates` 表** |
| Filament | 仅 DisplayMode 上 Select | **独立 Resource「前台模板」** + Select 改读 DB + 分区编辑 |
| 回退（皮肤 key） | `templates.default` = classic | **启用未删中 sort 最小，再比 id** |
| 渲染 | 仅 Blade 文件 | **DB 分区优先，空则 Blade 文件** |

## 2. 数据模型

### 2.1 表 `api_doc_templates`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `code` | varchar(64) unique | 机器码；小写字母/数字/连字符；**创建后不可改** |
| `label` | varchar(120) | 后台与 Select 显示名 |
| `views_prefix` | varchar(120) | 由 code 生成，只读展示 |
| `is_active` | bool | 是否可选、是否参与前台 resolve |
| `sort` | int | 越小越优先（回退与列表） |
| `body_parts` | json | 分区 HTML：`{ part_key: string }`；缺 key 或空串 = 回退文件 |
| `css_text` | mediumtext nullable | 自定义 CSS；null/空 = 回退仓库 `api-doc.css`（classic 资源） |
| `deleted_at` | timestamp nullable | 软删 |
| `timestamps` | | |

**`views_prefix` 生成规则**

- `code === 'classic'` → `gz168-api-doc::front`（兼容现有视图，不搬家）
- 其它 → `gz168-api-doc::front-{code}`（仍作文件回退前缀；无文件且无 DB 分区时 fail-fast）

**冻结的 `body_parts` key（镜像现有 front 文件，不可由运营增删 key）**

| key | 对应文件 |
| --- | --- |
| `page` | `api-doc-page.blade.php` |
| `layout` | `layout.blade.php` |
| `header` | `components/header.blade.php` |
| `nav` | `components/nav.blade.php` |
| `intro_section` | `components/intro-section.blade.php` |
| `api_section` | `components/api-section.blade.php` |
| `carriers_section` | `components/carriers-section.blade.php` |
| `decisions_section` | `components/decisions-section.blade.php` |
| `note` | `components/note.blade.php` |
| `panel` | `components/panel.blade.php` |
| `param_table` | `components/param-table.blade.php` |
| `ret_table` | `components/ret-table.blade.php` |

保存前丢弃未知 key。分区内容按 Blade 语法编写时，变量名必须与对应现文件一致（实现计划列出每文件 `compact`/`@include` 变量）。

**不变量（模型 saving / deleting）**

- 操作完成后，满足：`whereNull(deleted_at)->where(is_active, true)` 的数量 ≥ 1。
- 违反则抛明确异常 / Form 校验失败，不落库。

### 2.2 Seeder

- Upsert `classic`：`label=经典`，`is_active=true`，`sort=10`，`views_prefix` 按规则，`deleted_at=null`，`body_parts={}`，`css_text=null`（全部回退仓库文件）。
- 可从现有 `config('api-doc.templates.catalog')` 读 label 作初始值，但 **seed 之后运行时以 DB 为准**。

### 2.3 `api_doc_display_modes.template_key`

- 语义：指向 `api_doc_templates.code`（未删；保存时建议要求启用）。
- 运行时若引用已删/禁用/缺失：Resolver 回退到「启用未删中 sort 最小，同分比 id」，并 `Log::warning`。

## 3. 架构

```
Filament ApiDocTemplateResource
        ↓
ApiDocHtmlSanitizer（保存时）
        ↓
ApiDocTemplate (Eloquent SoftDeletes)
        ↓
ApiDocTemplateResolver  ←── DisplayMode form / 缓存键
        ↓
ApiDocTemplateViewResolver  ←── ApiDocPage / 组件 include
        ├── 非空 body_parts[key] → Blade::render(string)
        └── 否则 view(views_prefix + 相对路径)
        └── 非空 css_text 覆盖内联 CSS；否则仓库 css 文件
```

- 依赖方向：Filament → Application（Resolver / Sanitizer / ViewResolver）→ Domain(Model) → Blade 引擎 / 文件。
- 废弃运行时路径：`config('api-doc.templates.catalog')` 作为 resolve 来源。

## 4. Filament

### 4.1 Resource「前台模板」

- 导航组：`API 文档`；标签：`前台模板`。
- 权限：`api-doc.view` / `api-doc.update`（与现有 ApiDoc 一致）。仅 `update` 可改 `body_parts` / `css_text`。
- 列表：code、label、views_prefix、is_active、sort；可过滤/查看软删。
- 创建：code、label、is_active、sort；views_prefix 只读；分区默认为空（回退文件）。
- 编辑：label、is_active、sort；code、views_prefix 只读；**Tabs = 各 part_key + CSS**；Textarea 或 CodeEditor。
- **简易预览**：同一编辑页；用当前表单草稿（可未保存）+ 固定样例 payload 渲染；失败时展示 Blade 错误文本，不 500 整页。
- 删除：软删；触发启用不变量。

### 4.2 显示方式

- `template_key` Select：`ApiDocTemplateResolver::options()` = 未删且启用。
- 保存校验：key 必须对应未删且启用记录。

### 4.3 缓存

- 模板 CRUD / 分区保存成功后 `ApiDocCacheManager::flush()`。

## 5. Resolver、渲染与消毒

| 方法 | 行为 |
| --- | --- |
| `options()` | 未删 + 启用，按 sort、id；`code => label` |
| `resolve(?string $key, ?string $modeCode)` | 命中启用未删 → 该行；否则回退 + warning |
| `isRegistered(string $key)` | 未删（含禁用） |
| `assertActiveInvariant()` | 供模型/导入调用 |

**分区 vs 文件**

- 坏 key / 禁用 / 已删：只回退**皮肤行**，不混用其它皮肤的 DB 分区。
- 已解析皮肤上，某 `body_parts[key]` 非空：`Blade::render` 该字符串（传入与现文件相同的数据）。
- 该 key 空：`view($prefix.相对路径)`；**文件也不存在** → 该 include **fail-fast**（与 V1「已注册缺视图」一致）。
- `css_text` 非空：layout 内联该 CSS（仍可叠加或替换现有 file_get_contents；实现计划定为 **替换** 内联块，避免双份经典 CSS 冲突）。空则保持 V1 读仓库 css 文件。

**消毒（保存路径必经，导入同样执行）**

- HTML：删除 `script` / `iframe` / `object` / `embed` 节点；删除所有 `on*` 属性。
- CSS：删除含 `expression(` 或 `javascript:` 的声明/值（大小写不敏感）。
- 不在运行时二次消毒（避免预览与前台不一致）；测试覆盖「带 script 的保存结果不含 script」。

## 6. 快照

- 键 `templates`：按 sort、code 导出；字段含 `code,label,views_prefix,is_active,sort,body_parts,css_text,deleted_at`。
- 导入：upsert by `code`；先消毒再落库；可还原软删；导入后跑启用不变量。
- `display_modes.template_key`：必须指向 **未删** 的 template code，否则 **整包失败**。

## 7. 测试（PHPUnit）

| 用例 | 要点 |
| --- | --- |
| Seeder | 存在 classic，prefix 正确，body_parts 空 |
| 不变量 | 不能删/禁到零启用 |
| Resolver | 未知 key / 禁用引用 → 回退 |
| Sanitizer | script / onerror 被剥除；合法 markup 保留 |
| Render | 非空 header 分区覆盖文件；空分区走文件 |
| Filament | CRUD；Select 仅启用项；编辑页含分区 tabs |
| Preview | 草稿含样例节点（feature 或单元测 ViewResolver） |
| DisplayMode | 非法 template_key 无法保存 |
| Snapshot | templates 往返含 body_parts；坏 template_key 导入失败 |
| Front | classic 且空分区时仍 200（回归） |

## 8. 实现边界清单（供 writing-plans）

1. Migration（含 `body_parts`、`css_text`）+ Model SoftDeletes + Factory + Seeder。  
2. `ApiDocHtmlSanitizer` + 单测。  
3. 改写 `ApiDocTemplateResolver` 读 DB。  
4. `ApiDocTemplateViewResolver`：分区 vs 文件；接 `ApiDocPage` / 组件。  
5. Filament `ApiDocTemplateResource`：元数据 + Tabs + 简易预览。  
6. DisplayMode Select / 校验。  
7. Exporter / Importer 增加 `templates`（含分区字段）。  
8. 回归：前台 + 更新既有 template 测试的期望源。

## 9. 开放决策（已拍板摘要）

| 决策 | 结论 |
| --- | --- |
| 范围 | 目录 CRUD **+** 分区 HTML/CSS 编辑（选项 D） |
| 分区形态 | 镜像全部现有 front Blade（冻结 12 key）+ `css_text` |
| 存储 | 主表 JSON `body_parts` + `css_text`；空则回退文件 |
| 安全 | 保存剥离 script/iframe/object/embed 与 on*；CSS 禁 expression/javascript: |
| 预览 | 编辑页草稿 + 固定样例 payload，非真 `/api-doc` |
| 删除 | 任意可软删（含 classic），≥1 启用未删 |
| views_prefix | 按 code 约定自动生成 |
| 皮肤 key 回退 | sort 最小启用未删，不分 is_default 列 |
| 运行时源 | 皮肤目录仅 DB |
