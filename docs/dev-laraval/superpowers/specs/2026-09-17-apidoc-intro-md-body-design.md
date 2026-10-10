# ApiDoc 介绍页 Markdown 正文编辑 — 设计规格（子项目 4）

> 状态：已定案（brainstorm 2026-09-17）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-17-apidoc-intro-md-body-design.md`  
> 前置：既有 `LocalizedBodyFields`、`ApiDocContentRenderer`、`intro_paras_format`  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 0. 在路线图中的位置

本规格是「模板/文档编辑能力」的 **子项目 4**（最小切片）。

| 背景 | 说明 |
| --- | --- |
| 已完成 | 章节 `paras` / notes / param rows / decisions / quickstart 已用 `LocalizedBodyFields` |
| 本期缺口 | 介绍页 `intro_paras` 仍为纯文本 `LocalizedKeyValue` |
| 后续（不在本期） | 子项目 5：开发编辑器改仓库 HTML/MD；侧栏预览与工具栏增强 |

## 1. 目标与非目标

### 1.1 目标

- 介绍页 `intro_paras` Repeater：每条按章节级 `intro_paras_format` 显示 FR/ZH/EN 的 `MarkdownEditor` 或 `RichEditor`。
- 保持章节级 `intro_paras_format`（`live()`）；切换格式**不自动转换**已存正文。
- 扩展共享组件：`LocalizedBodyFields::makeShared($name, $parentFormatField)` — 不渲染自身 Select，visible 读父级格式。
- `ApiDocIntroShape` 与前台 `ApiDocRenderer::pickJsonList(..., $intro_paras_format)` **不变**。
- Create / Edit 介绍节均走 IntroShape mutate（若 Create 尚未接线则补上）。
- Feature 测试：保存 Markdown 介绍段落后前台可见渲染结果。

### 1.2 非目标

- 每条 intro 段落独立 `content_format`。
- 侧栏预览、表格/代码块工具栏增强。
- 将 `nav_label` / `title` / `intro_h1` 等短字段改为 Markdown。
- 子项目 5（仓库文件编辑器）。

### 1.3 已拍板

| 决策 | 结论 |
| --- | --- |
| 范围 | 只补介绍页 intro_paras（选项 A） |
| 格式字段 | 保持章节级 `intro_paras_format`（选项 A） |
| 架构 | 扩展 `LocalizedBodyFields::makeShared`（方案 1） |

## 2. 数据与形状

- 表字段无变更：`api_doc_sections.intro_paras` (json)、`intro_paras_format` (string, default markdown)。
- Form 形状：`[{ text: { fr, zh, en } }, ...]`（`ApiDocIntroShape::parasForForm`）。
- Storage 形状：`[{ fr, zh, en }, ...]`（`parasForStorage`）。
- 前台：`localizeBody` + `intro_paras_format`。

## 3. 架构

```
ApiDocSectionResource (intro tab)
  intro_paras_format Select (live)
  Repeater intro_paras
        └── LocalizedBodyFields::makeShared('text', 'intro_paras_format')
              ├── MarkdownEditor × locales  (visible when parent = markdown)
              └── RichEditor × locales     (visible when parent = html)

Edit/Create mutate ↔ ApiDocIntroShape
        ↓
ApiDocSectionService::update → cache flush
        ↓
ApiDocRenderer pickJsonList(..., intro_paras_format)
```

**Repeater 内 Get 路径**：`makeShared` 必须用经实测的父级相对路径读取 `intro_paras_format`（Filament 5 Repeater 嵌套常见为 `../../intro_paras_format`）；路径以 feature 测试覆盖，实现计划写死最终路径。

## 4. Filament

- `intro_paras_format`：保留现有 Select + options + helperText；确保 `live()`。
- Repeater schema：替换 `LocalizedKeyValue::make('text', ...)` 为 `...LocalizedBodyFields::makeShared('text', 'intro_paras_format')`。
- `make()` 现有调用方（paras/notes 等）行为不变。

## 5. 测试

| 用例 | 要点 |
| --- | --- |
| Unit IntroShape | 既有测仍绿 |
| Filament intro | 受保护超管编辑介绍节：`intro_paras_format=markdown`，段落 FR 为 `**bold**`，保存无错误 |
| Front | `/api-doc`（或默认 mode）HTML 含加粗节点或等效，且不含字面量 `**bold**`（在 html 渲染模式下） |

## 6. 实现边界（供 writing-plans）

1. `LocalizedBodyFields::makeShared` + 父级 format Get 路径。  
2. `ApiDocSectionResource` intro Repeater 接线；Create 页 IntroShape（若缺）。  
3. Feature 测试 Filament → front。  
4. 回归 `tests/Unit/ApiDoc` + 相关 Feature。

## 7. 开放决策

本规格已关闭；无未决项。
