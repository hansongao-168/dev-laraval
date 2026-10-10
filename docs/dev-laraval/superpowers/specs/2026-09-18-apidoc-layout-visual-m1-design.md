# ApiDoc 运营可视化布局编排 M1 — 设计规格（子项目 2）

> 状态：已定案（brainstorm 2026-09-18）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-18-apidoc-layout-visual-m1-design.md`  
> 前置：`2026-09-16-apidoc-template-catalog-crud-design.md`、`2026-09-16-apidoc-template-js-preview-copy-design.md`  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 0. 在路线图中的位置

本规格是「模板能力」的 **子项目 2 / M1**（冻结分区文档树编排 + 三套编辑器壳同期交付）。

| 后续（不在本期） | 说明 |
| --- | --- |
| M2 | 嵌套容器 / 基础栅格（Section/Columns） |
| M3 | 自定义组件库与半自由样式 |
| 其它已交付 | 子项目 1、3 余量、4、5 |

完整「自由建站」拆为 M1→M2→M3；本期只交付 M1 能力，但 **三种 UI 驱动一并实现**（同数据模型，不同壳）。

## 1. 目标与非目标

### 1.1 目标

- 对皮肤做 **7 个冻结页面区块** 的排序与显隐：`header`、`nav`、`intro_section`、`api_section`、`carriers_section`、`decisions_section`、`note`。
- 表 `api_doc_templates` 增加：
  - `layout_visual_enabled`（bool, default false）
  - `layout_editor`（string, default `filament_tab`）：`filament_tab` \| `livewire_page` \| `grapesjs`
  - `layout_tree`（json nullable）
- **双写**：可视化保存 ⇒ 更新 `layout_tree`，并用 `PageSkeletonWriter` 生成 `body_parts.page` 骨架（`api_doc_part(...)` 顺序/显隐）。
- **分轨加锁**：`layout_visual_enabled=true` 时分区源码编辑中 **`page` 只读**（提交忽略）；各分区 HTML（header/nav/…）及 `css_text` / `js_text` 规则不变。
- **三驱动同能力、不同壳**（见 §4）：共享 `LayoutTreeService`；按每皮肤 `layout_editor` 挂载。
- GrapesJS 驱动 = 同构编排 + **分区 HTML 只读预览壳**；禁止自由拖 DOM、禁止自定义组件。
- 新权限：`api-doc.templates.layout`；无此权限不可改布局相关写操作 / 不可启用画布写。
- 快照导入导出包含上述三列；校验枚举与树 schema。

### 1.2 非目标

- 自由网格、嵌套容器、自定义组件库。
- 在画布内编辑分区内部 HTML（仍走现有分区编辑器）。
- 编排 `panel` / `param_table` / `ret_table` 等碎片，或 `layout` 外壳进树。
- 全局唯一 `config` 切换编辑器（已否决；采用每皮肤字段）。
- M2/M3 能力。

### 1.3 已拍板摘要

| 决策 | 结论 |
| --- | --- |
| 里程碑 | M1 文档树；完整建站拆期 |
| 树 ↔ page | 双写：`layout_tree` + 生成 `page` |
| 冲突 | 启用可视化后锁 `page`；分区内容仍可源码编 |
| 叶子 | 上述 7 个；不含碎片与 layout/page key |
| ACL | `api-doc.templates.layout` |
| 开关 | `layout_visual_enabled`；关闭保留树，运行时不用树 |
| UI | 三驱动同期：`filament_tab` / `livewire_page` / `grapesjs` |
| 驱动选择 | 每皮肤 `layout_editor` |
| GrapesJS 边界 | 同构 7 块 + 只读预览壳 |

## 2. 数据模型

### 2.1 新列

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `layout_visual_enabled` | bool, default false | true = 结构走可视化并锁 `page` |
| `layout_editor` | varchar(32), default `filament_tab` | 三枚举之一 |
| `layout_tree` | json nullable | 见 §2.2；null 时编辑器初始化用默认树，直至首次保存写库 |

### 2.2 `layout_tree` schema（version 1）

```json
{
  "version": 1,
  "nodes": [
    { "id": "header", "part": "header", "visible": true },
    { "id": "nav", "part": "nav", "visible": true },
    { "id": "intro_section", "part": "intro_section", "visible": true },
    { "id": "api_section", "part": "api_section", "visible": true },
    { "id": "carriers_section", "part": "carriers_section", "visible": true },
    { "id": "decisions_section", "part": "decisions_section", "visible": true },
    { "id": "note", "part": "note", "visible": false }
  ]
}
```

规则：

- `part` 必须恰好覆盖上述 7 key 各一次；只允许重排与改 `visible`。
- `id` 本期等于 `part`（预留嵌套，M1 无父子）。
- 校验失败（缺/多余/非法/重复）⇒ 保存拒绝。
- 默认树：上表顺序；`note.visible=false`（classic 文件 `page` 当前未挂 note）。

### 2.3 权限

- `ApiDocPermission::TemplatesLayout = 'api-doc.templates.layout'`（展示名如「编排前台模板布局」）。
- Seeder 注册；与现有 Resource 门禁组合：能进模板编辑 **且** 有本权限才可写布局 / 改 `layout_*` 写字段。
- 无 layout 权限：可查看（若有 view/update 进页）但布局控件只读或隐藏写入口；不能把 `layout_visual_enabled` 打开后的树写回。

### 2.4 快照与复制

- Export/Import `templates[]` 含三列；导入校验 `layout_editor` 与树 schema。
- SkinCopier / 创建副本：复制三列；软删不删树/文件策略不变。

## 3. 双写、锁轨与运行时

### 3.1 `PageSkeletonWriter`

- 输入：通过校验的 `layout_tree`。
- 输出：`body_parts['page']` 字符串——与 classic 同构外壳（外层容器、`.wrap`、`<main>`、footer、toast），按节点插入可见分区的 `{!! api_doc_part('…', [约定参数]) !!}`。
- **`visible:false` ⇒ 不输出该调用**（不使用 Blade 注释包一层）。
- **sections 槽简化**：`intro_section` 与 `api_section` 在树中视为 **同一 `@foreach ($data['sections']…)` 槽** 的开关：
  - 二者皆 hidden ⇒ 不输出整段 foreach；
  - 仅其一 visible ⇒ 循环内只渲染对应分支；
  - 二者均 visible ⇒ 保持现有 `is_intro` 分流；
  - 二者在树中的 **相对顺序忽略**（仍由数据 `is_intro` 决定分支）。
- 其余 5 个叶子（header/nav/carriers/decisions/note）严格按树顺序输出。
- 生成结果经现有 HTML sanitizer 后再写入（与分区保存一致）。

### 3.2 `LayoutTreeService::save`

1. 校验树；  
2. 写 `layout_tree`；  
3. Writer 写 `body_parts.page`；  
4. 清 ApiDoc 相关视图/解析缓存（与现模板保存一致）。

关闭可视化（`layout_visual_enabled=false`）**不**清空树，也 **不**自动重写 `page`。

### 3.3 锁 `page`

| 状态 | `page` 源码字段 | 画布 |
| --- | --- | --- |
| enabled + 有 layout 权限 | disabled；dehydrated 忽略客户端篡改 | 可写 |
| enabled + 无 layout 权限 | 仍锁 | 只读提示 |
| disabled | 可编（需既有模板 update 权限） | 不可用或只读；改 `page` **不**回写树 |

### 3.4 前台运行时

| `layout_visual_enabled` | `page` 来源 |
| --- | --- |
| true | DB `body_parts.page`（应与树双写一致）；若空则 fail-soft：请求期用 Writer 从树生成（**不写库**） |
| false | 现有逻辑：非空 DB `page` 或 `views_prefix` 文件回退；**不读** `layout_tree` |

不新增第二条前台渲染管线；可视化结果以生成后的 `page` 字符串进入现有 `ViewResolver` / `api_doc_part` 路径。

## 4. 三驱动 UI

共享内核：`LayoutTreeValidator`、`LayoutTreeDefaults`、`PageSkeletonWriter`、`LayoutTreeService`、`LayoutEditorDriver` 接口。  
UI 实现只负责展示/收集树，全部写库走 Service。

建议落点：`gz168/ApiDoc/src/Layout/` + Filament Resource / Livewire Pages。

### 4.1 共用 Filament 字段

- Edit：`layout_visual_enabled`、`layout_editor`（无 layout 权限则禁用）。
- 切换 `layout_editor` **不修改** `layout_tree`。
- 新建默认：`enabled=false`，`editor=filament_tab`，树 null（打开编辑器时用 Defaults）。

### 4.2 `filament_tab`

- 模板 Edit 增加 Tab「布局编排」：Sortable 七行 + 显隐 Toggle。
- 无独立路由。

### 4.3 `livewire_page`

- Resource Action「打开布局编排」→ 全宽 Livewire Page（如 `ApiDocTemplateLayoutEditor`）。
- 左：同构 Sortable；右：简易结构预览（节点占位，非完整前台）。
- 无权限：隐藏 Action 或进页只读。

### 4.4 `grapesjs`

- 独立页与驱动 2 **共用路由入口**，按 `layout_editor` 分支视图（避免双路由漂移）。
- 画布仅 7 个块：排序 + 显隐；禁止自由 DOM / 自定义 block。
- 选中块：侧栏或展开区 **只读** 展示该 part 的 HTML（DB 或文件回退；消毒后 srcdoc iframe 或只读文本）。
- GrapesJS 仅后台该页经 Vite/npm 打包加载。

## 5. 测试要求

- Unit：Validator 合法/缺节点/非法 part；Writer 顺序与显隐（含 sections 槽、`note` 默认 hidden）；Defaults。
- Feature：`LayoutTreeService` enabled 双写；disabled 不覆盖 `page`；enabled 时更新模板忽略 `page` 篡改。
- 权限：无 `templates.layout` 不能保存树 / 不能打开写入口。
- 快照：三列往返与非法 editor/树拒绝。
- 三驱动各自 smoke：授权 200；无权限无写或 403。
- 前台：enabled 且 carriers hidden ⇒ 响应 HTML 无 carriers 区特征标记。

## 6. 风险与约束

- 三 UI 同期交付工作量大；**必须**先内核与 Writer 测试绿灯，再并行三壳，避免三套各写一套持久化。
- GrapesJS 体积与 CSP：仅布局页加载；不进公开 `/api-doc`。
- intro/api 槽简化若未来要「完全打散 sections 循环」，属 M2+ 变更，需改 Writer 与前台数据契约。

## 7. 实现顺序（规格约束，计划细化）

1. Migration + 模型 cast + Permission enum/seeder。  
2. Validator / Defaults / Writer / Service + PHPUnit。  
3. Filament 字段 + `page` 锁定 + 快照。  
4. 驱动 1 Tab。  
5. 驱动 2 Livewire 页。  
6. 驱动 3 GrapesJS 页（复用入口）。  
7. 前台 enabled 回归测试 + Pint。
