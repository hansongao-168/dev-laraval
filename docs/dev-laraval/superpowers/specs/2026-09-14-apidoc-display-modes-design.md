# ApiDoc 三语录入与可配置显示方式 — 设计规格

> 状态：已定案（brainstorm 2026-09-14）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-14-apidoc-display-modes-design.md`  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 1. 目标与非目标

### 1.1 目标

- **后台录入**与**前台显示**严格分离。
- 内容只存三种语言：法文 (`fr`)、中文 (`zh`)、英文 (`en`)。
- 前台通过可配置的**显示方式**选择单语或组合显示；访客可切换；站点有默认显示方式。
- 运营可**自建**显示方式：从中/英/法多选、排序、命名、启用。
- 组合显示在「显示模板」上线前，使用临时排版规则（主文 + 次文对照标记）。
- 缺译时**仅在当前显示方式所选语种内**回落；不强制三语齐全即可保存。

### 1.2 非目标（本期不做）

- 前台显示模板引擎（`template_key` 仅预留字段，不生效）。
- 访客自建组合、AI 翻译、按语种独立发布状态。
- 中/英/法以外的内容语种。
- 拆分比现有更细的显示方式专用权限（复用 `api-doc.view` / `api-doc.update`）。

## 2. 概念分层

| 层 | 名称 | 职责 |
| --- | --- | --- |
| 内容语种 | `ApiDocContentLocale`：`fr` \| `zh` \| `en` | 入库字段键；后台 Tab 编辑 |
| 显示方式 | 新资源 / 表 `api_doc_display_modes` | 前台顶栏选项；有序语种列表 + 默认/启用 |
| 显示模板 | 后续功能 | 决定组合如何排版；本期忽略 `template_key` |

硬编码前台枚举（如仅 `default|fr|zh|en|both`）不再作为唯一来源；以前台读表为准。

## 3. 数据模型

### 3.1 内容字段（已有约定，保持）

所有本地化短文案/正文继续使用 JSON：

```json
{ "fr": "...", "zh": "...", "en": "..." }
```

- Cast：`LocalizedString`（normalize 保证三键存在）。
- `default`、组合方式**不写入**内容 JSON。

### 3.2 新表 `api_doc_display_modes`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `code` | varchar，unique | 机器码，如 `fr`、`zh`、`en`、`fr_zh`、`zh_en_fr` |
| `label` | varchar | 顶栏与后台列表显示名（v1 单字符串） |
| `locales` | json | 有序数组，如 `["fr","zh"]`；**第一项 = 主语言** |
| `is_active` | bool | 是否对访客可见 |
| `is_default` | bool | 是否默认；全表至多一条为 true |
| `sort` | int | 顶栏顺序，越小越前 |
| `template_key` | varchar，nullable | 预留；本期不读 |
| `timestamps` | | |

**约束**

- `locales` 非空；元素 ⊆ `{fr,zh,en}`；去重；顺序有意义。
- 勾选 `is_default` 保存时，清除其他行的默认。
- 不允许「零个启用方式」；不允许删除/停用导致无默认或无启用项（种子 + 校验保证）。
- 系统种子 `code` 建议软保护（可改 label/启用/默认，谨慎删改 code）。

### 3.3 设置表 `api_doc_settings.default_locale`

- v1 **保留列**，避免破坏性迁移。
- **前台首次进入**只认显示方式的 `is_default`，**不读**本列。
- 写路径约定：当保存「默认显示方式」时，将方式 `locales[0]` **同步写入** `default_locale`，供尚未改完的旧调用过渡；新代码不得再把本列当作顶栏默认来源。

## 4. 后台设计

### 4.1 内容录入

- 所有 `{fr,zh,en}` 字段使用 **Tabs：法文 | 中文 | 英文**，同时只编辑一种语言。
- 短文案：Tab 内 TextInput。
- 正文：三语共用 `content_format`（markdown \| html）；Tab 内对应 MarkdownEditor / RichEditor。
- 录入页不出现「显示方式 / 对照 / 默认显示」等前台概念。
- **不强制**三语齐全；有内容即可保存。

### 4.2 Filament 资源「显示方式」

- 独立 Resource（导航组「API 文档」）。
- 表单：`code`、`label`、`locales`（有序多选，仅 fr/zh/en）、`is_active`、`is_default`、`sort`；`template_key` 隐藏或只读占位。
- 列表：label、locales 顺序、启用、默认、sort；可调序。
- 权限：`api-doc.view` / `api-doc.update`。
- 写成功后调用现有 ApiDoc 缓存 `flush`。

### 4.3 种子数据

| code（建议） | label | locales | 默认 |
| --- | --- | --- | --- |
| `fr` | 法文 | `["fr"]` | 是（建议） |
| `zh` | 中文 | `["zh"]` | |
| `en` | 英文 | `["en"]` | |
| `fr_zh` | 中/法 | `["fr","zh"]` | |
| `zh_en_fr` | 中/英/法 | `["zh","en","fr"]` | |

说明：`fr_zh`（中/法）采用 **法文为主、中文为对照**，与旧 `both` 行为一致；若需中文为主，运营另建方式并调整 `locales` 顺序即可。

运营可自建更多组合（命名 + 有序多选）。

### 4.4 文档设置页

- 去掉与前台档位冲突的「默认语言 = 顶栏默认」表述。
- 引导至「显示方式」资源设置默认项。
- 品牌、缓存、待决策等其它设置不变。

## 5. 前台设计

### 5.1 顶栏

- 数据源：`is_active = true` 的显示方式，按 `sort`。
- 按钮文案：`label`；当前项 `aria-pressed`。
- Livewire 状态：当前 `mode` = `code`。
- Query：`?mode=<code>`；非法或停用 → 静默回退默认方式（不 404）。

### 5.2 旧参数兼容

| 旧 `?lang=` | 映射到种子 `code` |
| --- | --- |
| `fr` | `fr` |
| `zh` | `zh` |
| `en` | `en` |
| `both` | `fr_zh`（中/法，法为主） |
| `default` 或空 | 默认显示方式 |

过渡期可同时认 `mode` 与 `lang`；`mode` 优先。

### 5.3 渲染（模板上线前的临时规则）

- **单语**（`locales` 长度 1）：对该语种取值；空则仅在该方式的 `locales` 列表内按顺序回落。
- **组合**（长度 ≥ 2）：第一项为主文；其余依次包进对照标记。标记 class 按语种：`zh` → `class="zh"`，`en` → `class="en"`，`fr` 作次文时 → `class="fr"`（CSS 可先复用 `.zh` 样式再分化）。
- **绝不**回落到方式未包含的语种。
- 方式内全部为空：输出空字符串，不强制「（未翻译）」占位。

### 5.4 缓存

- 聚合缓存键按 `mode.code`（及是否 html）区分。
- 内容或显示方式变更 → 统一 `flush`。
- 无 tag 的 store：flush 列表覆盖种子 code，并保持写路径全量 flush 策略。

## 6. 错误处理

- `locales` 空 / 非法语种 / 未去重导致的无效配置 → 表单校验失败。
- 停用或删除导致无启用项或无默认项 → 拒绝并提示。
- 前台未知 `mode` → 回退默认，不抛 500。
- 组合中某一语种在方式内仍空 → 该层省略。

## 7. 测试要求

- **Unit**：方式内回落；组合主/次格式；方式外语种不参与。
- **Feature**：显示方式 CRUD 约束；顶栏仅启用项；`?mode=` 与旧 `?lang=` 兼容；变更后缓存失效可见。
- **回归**：更新现有 ApiDoc 前台与章节写路径测试断言。

## 8. 文档与实现顺序

1. 本规格（本文）评审通过。
2. 编写实现计划（writing-plans）→ `docs/dev-laraval/superpowers/plans/`。
3. 按计划开发；可选再补运维向「如何设置」短文（操作说明 ≠ 本规格）。

## 9. 架构小结（方案 1）

```text
后台 Tab 录入 {fr,zh,en}
        ↓
   内容表（既有）
        ↓
ApiDocRenderer + LocalizedString
        ↑
显示方式表（locales 有序）← 访客顶栏切换 / ?mode=
        ↑
template_key（预留，本期不用）
```

## 10. 定案摘要

| 决策点 | 选择 |
| --- | --- |
| 实现路径 | 方案 1：显示方式独立资源 |
| 后台录入 UI | Tab：法 / 中 / 英 |
| 前台 | 启用的显示方式可切换 + 默认项 |
| 方式目录 | 可自建组合（多选有序 + 命名） |
| 组合临时排版 | 主文 + 次文对照（规则 A） |
| 缺译回落 | 仅方式内语种（规则 B） |
| 发布门槛 | 不强制三语齐全（规则 A） |
| 管理入口 | 独立 Filament 资源（规则 B） |
| 显示模板 | 后续迭代 |
