# API 文档章节编辑能力优化

> 状态：**E1–E7 代码已落地**（章节写路径、双编辑器、三语/五档显示、缓存修复）；详见实施说明与测试。  
> 范围：`gz168/ApiDoc` 后台「文档章节」完整可编辑闭环（含子表、缓存、权限、测试）。  
> 关联总规：[`API_DOC_MODULE_PLAN.md`](./API_DOC_MODULE_PLAN.md) §4.2 / §5.2 / §7 / §11。  
> 约束：不触碰受保护超级管理员与 `app:initialize` 幂等流程；不读取或写入 `.env` 密钥。

## 1. 目标

把「文档章节」从「表单能打开、子表按钮能点」提升到：

1. **写路径统一**：创建 / 更新 / 删除 / 排序 / 复制全部走 `ApiDocSectionService`（或等价、可测试的写入口）。
2. **前台即时可见**：任意章节或子表写入后，`ApiDocCacheManager::flush()` 必触发，前台 `/api-doc` 刷新即见新内容。
3. **表单数据正确**：双语字段、`intro_*` JSON、子表字段形状与库表 / Cast 一致，可稳定读写。
4. **权限服务端生效**：无 `api-doc.update` 时编辑入口与 Action 不可用（不只靠隐藏菜单）。
5. **可回归**：Feature 测试覆盖写路径、缓存失效、无权限拦截。

### 1.1 非目标（本轮不做）

- Monaco / Prism / IDE 级代码编辑器（代码块保持等宽 Textarea）。
- 独立「草稿 / 发布工作流」页面（继续用 `is_active`；`api-doc.publish` 权限预留）。
- 前台可视化所见即所得整页编辑。
- 改造其他 Resource 的非正文能力——决策/快速开始等可同迭代跟进双编辑器。
- 自动翻译 / 机器翻译管道。
- 编辑器内大图上传 / 媒体库（本期工具栏不含图片，或仅允许外链）。
- Markdown ↔ HTML 自动双向转换入库（切换格式仅换编辑器，正文由人确认）。

### 1.2 已确认产品需求：多语言（内容语种 ≠ 显示方式）

定案见独立开发文档 [`API_DOC_I18N_DEVELOPMENT.md`](./API_DOC_I18N_DEVELOPMENT.md)：

- **后台录入**：内容语种 **法 / 中 / 英**（Tabs）；正文类提供 **Markdown 编辑器 + HTML 编辑器**（可切换格式）。
- **前台显示**：按模板 + **显示方式**（默认 / 法 / 中 / 英 / **FR + 中文**）；对照模式保留。

实现阶段：**E6**（多语言）+ **E7**（双编辑器）；宜与 E3 同批改 `Localized*`。本期文档先定案；实现见 E1–E7。

## 2. 现状盘点

### 2.1 已落地

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 章节 Resource + 路由 | `ApiDocSectionResource` | index / create / view / edit |
| 表单 Tabs | `form()` | 基础信息 / Stamp / 介绍页内容（按 `is_intro` 显隐） |
| 四组 RelationManager | Paras / Notes / Blocks / ParamRows | CRUD Action + `canUpdatePermission()` |
| 写服务骨架 | `ApiDocSectionService` | `create` / `update` / `delete` / `reorderGroup` + `syncChildren` |
| 缓存管理 | `ApiDocCacheManager` | `remember` / `flush` |
| 权限 Trait | `ApiDocAuthorization` | view / create / edit / delete / reorder |
| 双语组件 | `LocalizedKeyValue` | `field.fr` / `field.zh` |

### 2.2 缺口（相对「编辑完成」）

| # | 缺口 | 影响 | 严重度 |
| --- | --- | --- | --- |
| G1 | `EditApiDocSection` / `CreateApiDocSection` 为空壳，未调用 `ApiDocSectionService` | 写路径与计划 §4.2 脱节；缓存、事务、子表同步无统一入口 | 高 |
| G2 | Filament 默认 `EditRecord` / RelationManager 直写 Eloquent，**不** `flush` 缓存 | 后台改完前台仍可能显示旧内容（验收清单 §11.3 会失败） | 高 |
| G3 | `intro_paras` 使用 `LocalizedKeyValue::make('', …)`（空 name） | 介绍段落无法正确绑定/落库 | 高 |
| G4 | `intro_base` 用 `0`/`1` 作字段名，与计划「`[[label, value], …]` + 双语 label」语义脆弱 | 基础信息表编辑易错、导入导出难对齐 | 中 |
| G5 | 计划中的 `duplicate()` 未实现；列表无拖拽排序，仅手填 `sort` | 运营效率低；`reorderGroup` 无 UI 调用方 | 中 |
| G6 | Edit 页无 Header Actions（删除、查看前台锚点、复制、返回列表增强） | 编辑闭环不完整 | 中 |
| G7 | 列表 `Edit`/`Delete` Action 未显式 `visible` 绑权限（依赖 Resource `can*`，需测试确认） | 权限边界不清晰 | 中 |
| G8 | `ApiDocCacheManager::flush()` 非 tag 回退键未覆盖 `render:{lang}:html` 等实际 key | file/database store 下刷缓存不彻底 | 中 |
| G9 | 几乎无章节写路径 Feature 测试（仅有前台渲染烟测） | 无法防止回归 | 高 |
| G10 | View 页为空；编辑页无保存后提示 / 前台链接 | UX 不完整，非阻塞 | 低 |
| G11 | 存储无 `en`；未区分内容语种与显示方式；顶栏无「默认」「英文」 | 见 [`API_DOC_I18N_DEVELOPMENT.md`](./API_DOC_I18N_DEVELOPMENT.md) | 高（产品） |
| G12 | 正文类无编辑器（仅 TextInput）；未同时提供 Markdown 与 HTML 两种录入方式 | 与「编辑内容应是编辑器，且 MD/HTML 都要」不符 | 高（产品） |

### 2.3 根因一句话

后台编辑目前是 **Filament 默认 CRUD**，而模块设计要求 **Service 写 + 统一刷缓存**；两者未接通，再叠加 intro 表单字段名错误，导致「编辑功能未完成」。多语言需三语入库与五档显示方式；正文需 **Markdown + HTML 双编辑器** + 前台按格式安全渲染。

## 3. 目标架构

```text
Filament Pages / RelationManagers
        │  (仅做表单装配、权限可见性、调用编排)
        ▼
ApiDocSectionService
        │  create / update / delete / reorderGroup / duplicate
        │  syncChildren（paras/notes/blocks/param_rows）
        ▼
Eloquent Models + DB transaction
        │
        ▼
ApiDocCacheManager::flush()
        │
        ▼
前台 ApiDocRenderer::render() 下次 miss → 读到新数据
```

依赖方向保持：`Http/Filament → Application(Service) → Domain(Model)`，不在 Model Observer 里堆业务（Observer 仅可作「兜底刷缓存」的可选方案，见 §4.2）。

## 4. 设计方案

### 4.1 Create / Edit 页接通 Service

**`CreateApiDocSection`**

- 覆盖 `handleRecordCreation(array $data): Model`，调用 `app(ApiDocSectionService::class)->create($data)`。
- 创建成功后跳转 `edit`（便于继续维护子表），或保持 Filament 默认并在文档中固定一种行为。

**`EditApiDocSection`**

- 覆盖 `handleRecordUpdate(Model $record, array $data): Model`，调用 `->update($section, $data)`。
- Header Actions（均需 `api-doc.update`，删除同现有 `canDelete`）：
  - 删除（确认）
  - 复制章节（调用 `duplicate`，slug 弹窗）
  - 「前台预览」外链：`/api-doc#{slug}`（intro 用首页锚点约定）
- 保存后 Notification：已更新 + 缓存已刷新（文案中文即可）。

子表仍走 RelationManager；主表 payload **不要**再塞 `paras`/`notes` 等，避免与 RelationManager 双写冲突。`update()` 仅在 payload 含子表键时才 `syncChildren`（现状已如此，保持）。

### 4.2 缓存失效：首选显式，兜底 Observer

**首选（本轮必做）**

| 写入口 | 刷缓存方式 |
| --- | --- |
| Create/Edit/Delete 章节 | 已在 Service 内 `flush()` |
| RelationManager Create/Edit/Delete | Action `after` 回调或自定义 `mutate*` 后显式 `ApiDocCacheManager::flush()` |
| 列表 reorder（若启用） | 调用 `reorderGroup()`（内部已 flush） |

**可选兜底（建议同轮或紧随）**

- 在 `ApiDocSection` 及四个子模型上注册轻量 Observer / `booted`：`saved`/`deleted` → `flush()`。
- 优点：堵住未来「有人直写 Model」的洞。  
- 缺点：测试/Seeder 频繁 flush；需保证 Seeder 路径可接受（灌数结束已有一次 flush）。

**CacheManager 回退键补齐**

`flush()` 在无 tag 时除现有 `render:fr|zh|both` 外，增加：

- `render:fr:html` / `render:zh:html` / `render:both:html`（与 `ApiDocRenderer::render()` 实际 key 一致）
- 若将来启用单章节缓存键，一并列入或改为维护「已知 key 列表」常量。

### 4.3 修复介绍页表单形状

**`intro_paras`**

计划形状：`[{fr, zh}, …]`。

建议 Repeater 项：

```php
Repeater::make('intro_paras')->schema([
    LocalizedKeyValue::make('text', '段落 (FR)', '段落 (ZH)')->required(),
])->...
```

并在 `mutateFormDataBeforeFill` / `mutateFormDataBeforeSave` 中做兼容映射：

- DB → Form：若元素已是 `{fr,zh}`，包成 `{text: {fr,zh}}`；若已是 `{text:{…}}` 则原样。
- Form → DB：存回 `[{fr,zh}, …]`（去掉 `text` 包装），与种子 / Exporter 一致。

**`intro_base`**

计划形状：`[[label, value], …]`，label 为双语。

建议显式键名，避免 `0`/`1`：

```php
Repeater::make('intro_base')->schema([
    LocalizedKeyValue::make('label', '名称 (FR)', '名称 (ZH)'),
    TextInput::make('value')->label('URL / 值')->maxLength(255),
])->...
```

Fill/Save 时在 `[{label, value}]` 与历史 `[[label, value]]` 元组之间做兼容转换；Exporter/Importer 同步约定**一种**规范形状（推荐对象数组 `{label, value}`，导入时兼容旧元组）。

### 4.4 子表 RelationManager 增强

四组 Manager 统一：

1. Create/Edit/Delete 后 `flush()`（若未上 Observer）。
2. `reorderable('sort')` + `reorderRecordsTriggerAction`（Filament 5 Table reorder），`canReorder` 已有权限钩子可复用。
3. 列表列保持双语摘要；代码块继续 `Textarea`，不加 Monaco。
4. ParamRows：`table_kind` / `required` 继续用枚举 options；可选按 `table_kind` 分组 Tabs 或 Filter（增强项，非阻塞）。

不强制子表改走 `syncChildren` 全量替换；单行 CRUD + flush 即可，避免 RelationManager 与全量 sync 互相踩。

### 4.5 `duplicate` 与列表排序

**`ApiDocSectionService::duplicate(ApiDocSection $section, string $newSlug): ApiDocSection`**

- 事务内复制主表字段（`is_active` 默认 `false` 更安全，或保持可配置）。
- 深拷贝 paras / notes / blocks / param_rows（重置 id，保留 sort）。
- `flush()`。
- slug 唯一校验失败抛 ValidationException，Filament 表单可捕获。

**列表**

- `->reorderable('sort')` 或按 `group_id` 分组后调用 `reorderGroup(?int $groupId, array $orderedIds)`。
- 注意：全局 `sort` 与「组内 sort」语义需与前台 `orderBy('sort')` 对齐；若前台是全局排序，列表 reorder 写全局序号；若应按组，UI 需按组分页/过滤后再 reorder，并只更新同组 id。

建议本轮：**列表增加 Group 筛选 + 组内 reorder 调用 `reorderGroup`**，与现有 Service 签名一致。

### 4.6 权限与可见性

- Resource 层继续用 `ApiDocAuthorization`。
- 表记录 Action：`Edit` / `Delete` 增加 `->visible(fn () => static::canEdit($record))` 一类显式绑定（与 RelationManager 一致），避免仅依赖框架默认。
- 无 `api-doc.update` 的用户：可 `view` 时进 View 页只读；不可进 Edit；RelationManager 无写按钮（已有）。
- 测试账号：有权限 / 无权限各一条（工厂 + RolePermission 现有测法）。

### 4.7 测试清单（本轮必补）

| 测试 | 断言要点 |
| --- | --- |
| `ApiDocSectionServiceUpdateTest` | update 改 title → 库变更；再次 `render` 见新值 |
| `ApiDocSectionCacheInvalidationTest` | 先 `render` 填缓存 → Service/模拟 Relation 写 → 再 `render` 非旧值 |
| `ApiDocSectionIntroShapeTest` | intro_paras / intro_base mutate 往返形状正确 |
| `ApiDocSectionDuplicateTest` | duplicate 后新 slug + 子表条数一致；旧记录不变 |
| `ApiDocSectionAuthorizationTest` | 无 `api-doc.update` 访问 edit 路由 403 / 不可见 |
| （可选）Livewire 组件测 Edit 页保存 | 若项目已有 Filament 测试惯例则跟；否则以 Service + HTTP 为主 |

运行：`php artisan test --compact --filter=ApiDoc`。

## 5. 实施阶段（代码阶段，本文不执行）

| 阶段 | 内容 | 完成标准 |
| --- | --- | --- |
| E1 | CacheManager 回退键补齐；Create/Edit 接通 Service；Edit Header Actions | 手工改章节标题 → 前台刷新可见 |
| E2 | RelationManager 写后 flush（或 Observer 兜底）；列表 Group 筛选 + 组内 reorder | 改段落/参数行 → 前台可见；拖拽排序生效 |
| E3 | 修复 intro_paras / intro_base 形状 + Exporter/Importer 兼容 | intro 章节可编辑且前台布局正确 |
| E4 | 实现 `duplicate` + Edit/List 入口 | 复制后得新 slug 草稿章 |
| E5 | Feature 测试 + Pint | `--filter=ApiDoc` 绿；`vendor/bin/pint --dirty --format agent` |
| E6 | 多语言（详见 I18N 开发文档） | 后台法/中/英可录；前台五档显示方式可用；`both` 对照保留；空 en 回落 |
| E7 | 正文双编辑器（Markdown + HTML）+ 格式字段 + 前台按格式渲染/消毒 | 见下文「内容编辑器」；旧纯文本兼容 |

建议顺序：**E1 → E2 → E3 → E7 → E5 冒烟 → E4 → E6 → E5 全量**（E3/E7 可同一迭代）。

## 6. 验收标准

- [ ] 后台 `/admin/api-doc-sections/{id}/edit` 保存主表后，`/api-doc?lang=zh`（及 fr/both）立即反映变更。
- [ ] 四个 RelationManager 任一增删改后，前台同样立即反映。
- [ ] intro 章节可编辑 `intro_h1` / 段落 / 基础信息表，前台介绍区正确。
- [ ] 无 `api-doc.update` 用户无法保存或看不到写 Action。
- [ ] `ApiDocSectionService::duplicate` 可用（若 E4 纳入交付）。
- [ ] 正文段落 / 告警等可在 Markdown / HTML 两种编辑器间切换并保存；前台按格式正确渲染；XSS 被消毒。
- [ ] `php artisan test --compact --filter=ApiDoc` 通过。
- [ ] `php artisan app:initialize` 行为未被本改动影响；不出现 `.env` 密钥进库或进文档。
- [ ] 不扩大受保护管理员可改字段、不削弱删除保护。

## 7. 手工核对步骤

1. `php artisan db:seed --class='Gz168\ApiDoc\Database\Seeders\ApiDocPermissionSeeder' --no-interaction`（如需）。
2. 登录具备 `api-doc.update` 的账号，打开任意非 intro 章节编辑页，改 `nav_label.zh`，保存。
3. 无痕或另开窗口访问 `/api-doc?lang=zh`，侧栏文案已变。
4. 在「正文段落」新增一行，保存；前台对应章节出现新段落。
5. 打开 intro 章节，改介绍段落与基础信息行；前台首页介绍区正确。
6. （E4）执行复制 → 新 slug 存在且默认不覆盖前台（若 `is_active=false`）。
7. 使用无更新权限账号：编辑入口不可用或 403。

## 8. 风险与回滚

| 风险 | 缓解 |
| --- | --- |
| intro 形状迁移导致旧数据读空 | Fill 兼容旧 `{fr,zh}` 与元组；先写测试再改表单 |
| Observer 双重 flush | 可接受；或 E2 只选「显式回调」一种，文档标明 |
| 组内 reorder 与全局 sort 语义混乱 | UI 强制先选 Group；orphan（`group_id=null`）单独桶 |
| Filament 5 API 与示例差异 | 改代码前用 Boost `search-docs` 核对 EditRecord / RelationManager / reorderable |

回滚：还原 `Pages/Edit*`、`Create*`、RelationManager、`ApiDocSectionService`、`ApiDocCacheManager` 相关提交即可；无破坏性 migration 预期。若 E3 改动了导出 JSON 形状，快照需同步版本说明。

## 9. 文档维护

- 代码落地后：把 `API_DOC_MODULE_PLAN.md` §5.2 / §13 对应勾选更新为「章节编辑闭环已完成」，并链到本文。
- 本文状态改为「已实施」并注明合并日期；知识库若需记录，只写原子学习笔记，不把本需求全文搬进 Vault。

## 10. 多语言（已迁出）

多语言定案与实施清单已独立为：

**[`API_DOC_I18N_DEVELOPMENT.md`](./API_DOC_I18N_DEVELOPMENT.md)**

摘要（已拍板，不再二选一）：

| 侧 | 定案 |
| --- | --- |
| 后台录入 | 内容语种：**法 / 中 / 英**；正文：**Markdown 编辑器 + HTML 编辑器**（格式可切换） |
| 前台 | 显示方式：**默认 / 法 / 中 / 英 / FR + 中文**；`both` 为对照模板，保留 |
| 存储 | `{fr, zh, en}` + 内容格式 `markdown` \| `html`；`default` / `both` 不入库 |
| 代码 | 按 E1–E7 实施；本定案已写入文档 |

## 11. 内容编辑器（已拍板：Markdown + HTML 都要）

### 11.1 需求

后台「编辑内容」不能只靠单行输入框。正文类字段必须提供编辑器，且：

1. **Markdown 编辑器**（含预览）——适合 API 文档、版本友好、快照可读。
2. **HTML 编辑器**（Filament `RichEditor` 所见即所得）——适合不熟悉 MD 的运营。

同一正文字段通过 **内容格式** 切换使用哪一种编辑器；短标题 / 标识仍用 `TextInput`；代码块仍用等宽 `Textarea`（不是这两种正文编辑器）。

### 11.2 技术选型

| 项 | 定案 | 理由 |
| --- | --- | --- |
| Markdown | Filament 5 `MarkdownEditor`（预览开启） | 承接原 MODULE_PLAN 阶段 2；快照/Git 友好 |
| HTML | Filament 5 `RichEditor` | 同仓 Amazon A+ 已用 |
| 切换 | 表单「内容格式」：`markdown` \| `html` | 切换时显示对应编辑器；**不自动互转正文**（避免丢失），切换前提示「请确认原文格式一致」 |
| 代码 | `Textarea`（mono） | 禁止 MD/HTML 编辑器改写代码空白 |

### 11.3 存储模型

语种正文仍为 JSON 字符串：

```json
{ "fr": "...", "zh": "...", "en": "..." }
```

另存 **内容格式**（整段/整行一条记录一个格式，三语共用同一格式，降低复杂度）：

| 场景 | 格式字段 | 默认 |
| --- | --- | --- |
| `api_doc_section_paras` | 新列 `content_format` `enum('markdown','html')` | `markdown`（旧纯文本按 markdown 渲染） |
| `api_doc_section_notes` | `content_format`（作用于 `body`） | `markdown` |
| `api_doc_sections` 的 `intro_paras` | 节级 `intro_paras_format` 或 intro JSON 旁列 | `markdown` |
| `api_doc_section_param_rows.description` | `content_format` | `markdown` |
| Decision / Quickstart 长文 | 同行 `content_format` | `markdown` |

- `content_format=markdown` → 库内为 Markdown 源文；前台 CommonMark（或等价）→ HTML → 消毒。
- `content_format=html` → 库内为 HTML；前台消毒后输出。
- 旧数据：无列时 migration 默认 `markdown`；无标签纯文本与现网一致。
- **不在本期做** MD↔HTML 自动双向转换入库；切换格式时若原文非空，Filament 弹出确认，由编辑者自行调整内容。

导出/导入快照：子行携带 `content_format`；缺省当 `markdown`。

### 11.4 字段矩阵

| 控件 | 字段 |
| --- | --- |
| `TextInput` | `slug`、`group_id`、`verb`、`path`、`sort`、短标题类 `nav_label` / `title` / `stamp_label` / `intro_h1` / note `label` / block `heading` 等 |
| `Select` 内容格式 + 条件编辑器 | 正文：`paras.text`、`notes.body`、`intro_paras`、`param_rows.description`；建议同步 Decision `body`、Quickstart `description` |
| `MarkdownEditor` | 当 `content_format=markdown` |
| `RichEditor` | 当 `content_format=html` |
| `Textarea`（代码） | `blocks.code`、Quickstart `code` |

### 11.5 HTML 工具栏

```text
bold | italic | link | bulletList | orderedList | h2 | h3 | undo | redo
```

本期关闭：图片上传、附件、iframe、表格、任意危险 HTML 源码模式。

Markdown 编辑器：开启预览；常用语法说明可放 helper text（加粗、列表、链接、二级标题）。

### 11.6 组件形态（与三语）

```text
Select::make('content_format')->options([markdown, html])
LocalizedMarkdownText::make('text')->locale($active)->visible(format===markdown)
LocalizedHtmlText::make('text')->locale($active)->visible(format===html)
```

- 「法/中/英」Tab 只切换语种；格式选择在语种 Tab 之外（或之上），三语共享 `content_format`。
- 保存时 merge 语种键；格式写入 `content_format` 列。

### 11.7 前台安全渲染

| `content_format` | 管线 |
| --- | --- |
| `markdown` | CommonMark（安全配置）→ HTML → 白名单消毒 → 输出 |
| `html` | 白名单消毒 → 输出 |
| 短标题 | 仍 `e()` / `format` / `formatCompact` |
| `both` | 对 fr/zh **分别**走上述管线后再套对照模板 |

消毒白名单示例：`p,br,strong,em,a[href],ul,ol,li,h2,h3,code,pre,blockquote`（实现时落配置类）。

禁止：未消毒 HTML 直出；Markdown 渲染开启原始 HTML 穿透（应关闭或再消毒）。

### 11.8 测试与验收（E7）

- [ ] 同一段落可选手 Markdown，编辑保存后前台有正确排版。
- [ ] 切换为 HTML 编辑器，用 RichEditor 加粗/列表/链接，前台可见。
- [ ] 切换格式有确认提示；不自动改写导致静默损坏。
- [ ] `<script>` / 事件属性在 html 与 markdown（若夹带 HTML）路径下均不可执行。
- [ ] 旧种子纯文本（默认 markdown）渲染不回归。
- [ ] 代码块仍为纯文本。
- [ ] 快照导出含 `content_format`，导入缺省兼容。

### 11.9 实施步骤（代码阶段）

| 步骤 | 内容 |
| --- | --- |
| E7.1 | migration：相关表 `content_format`；枚举 `ApiDocContentFormat` |
| E7.2 | `LocalizedMarkdownText` / `LocalizedHtmlText` + 格式 Select 组合组件 |
| E7.3 | Paras / Notes / intro / param description 接入双编辑器 |
| E7.4 | `ApiDocContentRenderer`（md→html / 消毒）；Renderer + Blade 接入 |
| E7.5 | Exporter/Importer 带 format；Decision/Quickstart 跟进 |
| E7.6 | Feature + XSS 用例；Pint |

---

**下一步**：双编辑器已拍板。可按 E1→E7 继续改代码（上轮「继续开发」未完成部分从 E1 接着做）。
