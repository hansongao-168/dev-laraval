# ApiDoc 模板 JS / 真预览 / Blade 复制 — 设计规格（子项目 3 余量）

> 状态：已实现（brainstorm 2026-09-16；验收：JS/预览/SkinCopier 相关 PHPUnit 全绿）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-16-apidoc-template-js-preview-copy-design.md`  
> 前置：`2026-09-16-apidoc-template-catalog-crud-design.md`（目录 CRUD + 分区 HTML/CSS）  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 0. 在路线图中的位置

本规格是「模板能力」的 **子项目 3 余量**（在已交付的目录 CRUD + HTML/CSS 编辑之上）。

| 后续（不在本期） | 说明 |
| --- | --- |
| 子项目 2 | 运营可视化拖拽布局编排 |
| 子项目 4 | MD 正文编辑增强 |
| 子项目 5 | 开发编辑器改仓库 HTML/MD |

本期交付：`js_text`（仅受保护超管可写）+ 编辑页双档预览（草稿简易 / 已保存 iframe 真前台）+ 新建非 classic 皮肤时复制 Blade 目录并预填 DB。

## 1. 目标与非目标

### 1.1 目标

- 表 `api_doc_templates` 增加 `js_text`（nullable mediumtext）。空则 layout 回退仓库 `api-doc.js`；非空则**替换**内联 `<script>` 块（与 `css_text` 对称）。
- 仅 **受保护超级管理员**（`is_protected === true` 且 `is_super_admin === true`）可编辑/保存 `js_text`。其它具备 `api-doc.update` 的用户：表单隐藏该字段（不 dehydrated）。模型 saving：若非超管且 `js_text` dirty → **还原为原值**（新建则为 null）并继续保存其它字段，不抛崩整单。
- 创建 **非 `classic`** 皮肤时调用 `ApiDocTemplateSkinCopier`：
  - 复制 `resources/views/front/`（**排除** `resolved-page.blade.php` / `resolved-layout.blade.php`）到 `resources/views/front-{code}/`（含 `components/`）。
  - 预填冻结 12 key 的 `body_parts` ← 对应 Blade 原文；`css_text` ← `resources/css/api-doc.css`；`js_text` ← `resources/js/front/api-doc/api-doc.js`（**仅创建者是受保护超管**时写入，否则 `js_text = null`，运行时回退仓库 JS）。
  - 目标目录已存在 → **跳过文件复制**（不覆盖）；对仍为空的 `body_parts` key / 空 `css_text` 仍可预填，**不覆盖**已有非空 DB 内容。
- 软删除皮肤 **不删除** 已复制目录；同 code 恢复或再创建时走「目录存在则跳过复制」。
- 编辑页预览 **两档并存**：
  - **未保存草稿**：沿用现有简易预览（固定样例 payload + ViewResolver）。
  - **已保存记录**：额外 iframe，`src=/api-doc?mode={默认显示方式 code}&template_preview={template.code}`。
- Query `template_preview`：仅当请求用户已登录且具备 `api-doc.view` 时生效；命中未删 `code`（可含禁用）则强制该皮肤；否则忽略并 `Log::warning`。
- HTML 分区 sanitizer **仍剥离** `script`/`iframe`/`object`/`embed`/`on*`；交互只走 `js_text` 或仓库 JS。
- 快照 `templates` 增加 `js_text`；导入时非超管会话不得用 payload 覆盖已有 `js_text`（保持原值）；超管/无认证 CLI 导入可写入。

### 1.2 非目标

- 可视化拖拽（子项目 2）。
- MD 正文编辑增强（子项目 4）。
- 开发编辑器直接改仓库文件作为主路径（子项目 5）；本期复制是创建时一次性文件系统写入，不是持续双向同步。
- 允许在 `body_parts` HTML 中保留 `<script>`。
- 公开匿名 `template_preview`。

### 1.3 已拍板摘要

| 决策 | 结论 |
| --- | --- |
| 范围 | `js_text` + iframe 真预览 + 自动复制 Blade（选项 A 全做） |
| JS 权限 | 仅受保护超管可写（选项 B） |
| 预览 | 草稿简易 + 已保存真 `/api-doc` 两档（选项 B） |
| 复制形态 | 文件系统复制 **且** 预填 DB（选项 C） |
| 软删文件 | 不删目录；存在则跳过复制（选项 A） |
| preview 授权 | 登录 + `api-doc.view`（选项 A） |
| 架构 | 沿用现 Resource 增量扩展（方案 1） |

## 2. 数据模型

### 2.1 变更

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `js_text` | mediumtext nullable | 自定义前台 JS；null/空 = 回退仓库 `api-doc.js` |

### 2.2 不变量（补充）

- 启用不变量不变（≥1 启用未删）。
- `code` 仍不可改；`classic` 不触发 SkinCopier。
- 非超管不得持久化其发起的 `js_text` 变更。

### 2.3 超管判定

```text
$user->is_protected === true && $user->is_super_admin === true
```

与宿主「受保护超级管理员」语义对齐；实现集中在小 helper（如 `ApiDocTemplateJsGate`），Filament 与 Model/Importer 共用。

## 3. 架构

```
CreateApiDocTemplate (afterCreate)
        ↓
ApiDocTemplateSkinCopier
        ├── copy views front → front-{code} (skip if dir exists)
        └── prefill body_parts / css_text / js_text (gate js)
        ↓
ApiDocTemplate (js_text gated on save)
        ↓
ApiDocTemplateResolver → ApiDocResolvedTemplate (+ jsText)
        ↓
layout inline_js 替换或 file_get_contents(api-doc.js)

Edit page:
  draft → ApiDocTemplatePreviewRenderer (existing)
  saved → iframe /api-doc?mode=…&template_preview={code}
        ↓
ApiDocPage + api-doc.view check → force skin
```

依赖方向：Filament → Copier / Gate / Resolver → Model → Blade / 文件系统。

## 4. Filament

- 「前台模板」编辑：Tabs 增加 **JS**（`js_text`）；`visible`/`disabled` 按超管 Gate。
- Create：成功后 Copier + `ApiDocCacheManager::flush()`。
- Edit：保留简易预览 Placeholder；记录已存在时增加 iframe（sandbox 可按需 `allow-scripts allow-same-origin`，因真前台需要 JS；注意与简易预览区分说明文案）。
- 列表无需展示整段 JS；可选 Icon「含自定义 JS」。

## 5. 真预览与 Resolver

- `ApiDocPage::render`（或 DisplayMode 解析之后）：读取 `template_preview` query。
- 授权：Filament/web 用户 `Authorizable` + `hasPermission('api-doc.view')`（超管绕过权限的现有宿主行为若已存在则沿用 `hasPermission` 实现）。
- 授权失败或 code 已软删/不存在：忽略参数，按显示方式原 `template_key` resolve。
- 授权成功：`templates->resolve` 的强制路径——按 code 取未删行（**含禁用**），构造 `ApiDocResolvedTemplate`；不因禁用而回退到 sort 最小启用项。

## 6. SkinCopier 细节

| 项 | 规则 |
| --- | --- |
| 视图源 | `ApiDocServiceProvider::packagePath('resources/views/front')` |
| 排除 | `resolved-page.blade.php`, `resolved-layout.blade.php` |
| 视图目标 | `.../resources/views/front-{code}/` |
| CSS/JS 源 | 包内现有经典资源路径（复制内容进 DB；**不强制**复制出独立 css/js 文件，除非实现计划为文件回退对称选择复制；默认 **只复制 Blade 树到磁盘**，CSS/JS 以 DB 字段 + 仓库经典文件回退为准） |
| 预填映射 | 与 `ApiDocTemplateParts::PATHS` 一致 |
| 幂等 | 目标目录 `is_dir` → 跳过一切文件写入 |
| 失败 | 复制失败应让 Create 事务失败或明确报错，避免半创建无文件且无预填 |

说明：磁盘侧只需 Blade 以支撑 `views_prefix` 文件回退；`css_text`/`js_text` 预填来自读经典文件内容，不必在 `front-{code}` 旁再落一份 css/js 文件（避免双份资产路径约定）。若后续子项目 5 需要仓库级 CSS/JS 文件，另开规格。

## 7. 快照

- Export：`js_text` 随 templates 导出。
- Import：upsert 时若当前操作者非受保护超管，保留行上已有 `js_text`，忽略 payload 中的 `js_text`；超管或无 user 的 console 导入写入 payload 值（仍可先经可选长度校验，不做 HTML sanitizer）。

## 8. 测试（PHPUnit）

| 用例 | 要点 |
| --- | --- |
| Model gate | 非超管改 `js_text` 失败；超管成功 |
| Copier | 创建 `skin-a` 出现 `front-skin-a/api-doc-page.blade.php`；`body_parts.page` 非空 |
| Copier idempotent | 目录存在时再跑不覆盖文件 mtime/内容 |
| Copier js gate | 非超管创建 `js_text` null；超管非空 |
| Layout JS | 设 `js_text` 后前台 HTML 含该片段；清空后回退经典 JS 特征 |
| template_preview | 有 view 权限强制皮肤；无权限忽略 |
| Filament | 超管见 JS 字段；编辑页 iframe URL 含 `template_preview=` |
| Snapshot | 含 `js_text` 往返（超管导入） |

## 9. 实现边界清单（供 writing-plans）

1. Migration `js_text` + `ApiDocTemplateJsGate` + model saving。  
2. `ApiDocTemplateSkinCopier` + Create/可选 Artisan 回填。  
3. `ApiDocResolvedTemplate::$jsText` + layout `inline_js` + ViewResolver helper。  
4. `template_preview` 于 `ApiDocPage` + 权限检查。  
5. Filament：JS Tab、双预览、Create 后 Copier。  
6. Exporter / Importer。  
7. 回归 `tests/Unit/ApiDoc` + `tests/Feature/ApiDoc`。

## 10. 开放决策（本规格已关闭）

见 §1.3；无未决项。
