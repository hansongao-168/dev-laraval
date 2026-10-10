# ApiDoc 文章 MD + 章节内容类型设计

> 日期：2026-09-21  
> 模块：`gz168/ApiDoc`  
> 状态：待用户确认后进入实现计划

## 1. 目标

在 API 文档模块中：

1. 新增可维护的「文章 MD」库（FR / ZH / EN 三份 Markdown）。
2. 文档章节增加章节级内容类型：`html` | `md`。
3. `html` 保持现有结构化章节能力；`md` 引用一篇文章，前台只渲染该文章。
4. 支持按语言导入/下载单个 `.md`，以及整篇 zip 打包导入/下载。
5. 保存后前台 `/api-doc` 可正确显示。

## 2. 已确认决策

| 主题 | 选择 |
| --- | --- |
| 多语言 | 一篇文章存 FR / ZH / EN 三份 Markdown |
| MD 章节下的结构化子表 | 后台仍可编辑；前台 MD 模式忽略 |
| 导入导出 | 单语言 `.md` + 整篇 zip 都要 |
| 引用关系 | 一篇文章可被多个章节共享 |
| 存储 | 数据库为主；导出时临时生成文件，不长期落盘 |
| Intro + MD | 仍显示 `intro_base` 与 quickstart；主正文用文章 |

## 3. 非目标

- 不替换字段级 `content_format`（段落/提示等仍可各自选 markdown/html）。
- 不把正文长期写入 `storage/` 目录作为源（导出临时文件除外）。
- 不新增前台独立路由；仍走 `/api-doc` 与现有模板体系。
- 不在本期做 Markdown 实时协同编辑或版本历史。

## 4. 架构

```text
Filament「文章 MD」CRUD + 导入/导出
        ↓
api_doc_articles (body_fr/zh/en)
        ↑ article_id
api_doc_sections.content_type = html|md
        ↓
ApiDocRenderer
  ├─ html → 现有 paras/notes/blocks/params
  └─ md   → ApiDocContentRenderer(article body) + 章节壳
        ↓
前台 /api-doc（缓存失效走 FlushesApiDocCache）
```

模块边界：全部落在 `gz168/ApiDoc`，不新增跨模块依赖。

## 5. 数据模型

### 5.1 新表 `api_doc_articles`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | bigint PK | |
| `slug` | varchar(100) unique | 机器名 |
| `title` | varchar(200) | 后台显示标题（单语） |
| `body_fr` | longText | 法文 Markdown，默认 `''` |
| `body_zh` | longText | 中文 Markdown，默认 `''` |
| `body_en` | longText | 英文 Markdown，默认 `''` |
| `is_active` | bool | 默认 true |
| `sort` | int | 默认 0 |
| `timestamps` | | |

索引：`slug` unique；列表常用 `(is_active, sort)`。

### 5.2 改表 `api_doc_sections`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `content_type` | varchar(16) | 默认 `html`；取值 `html` \| `md` |
| `article_id` | bigint nullable FK | → `api_doc_articles.id`；`onDelete` 限制为 restrict |

### 5.3 约束与行为

- `content_type = html`：`article_id` 必须为 null（保存时清空或校验失败）。
- `content_type = md`：`article_id` 必填，且目标文章必须存在；新建关联时建议要求 `is_active = true`。
- 删除文章：若仍有章节引用，拒绝并提示先解绑。
- 结构化子表不因切换 `content_type` 而自动删除。
- Enum：`ApiDocSectionContentType`（`Html` / `Md`），与现有字段级 `ApiDocContentFormat` 区分命名，避免混淆。

### 5.4 快照

`ApiDocExporter` / `ApiDocImporter` 增加 `articles` 段；章节快照带上 `content_type` 与 `article_slug`（导入时按 slug 解析为 `article_id`，避免跨环境 id 漂移）。导入模式（覆盖/跳过）与现有快照页一致。

## 6. 后台 Filament

### 6.1 资源 `ApiDocArticleResource`

- 导航：组「API 文档」，标签「文章 MD」。
- 列表：slug、title、is_active、updated_at；操作查看/编辑/下载/删除。
- 表单：slug、title、is_active、sort；`MarkdownEditor` ×3（FR/ZH/EN）。
- 权限：查看/更新用 `api-doc.view` / `api-doc.update`；导入/导出用 `api-doc.import` / `api-doc.export`。

### 6.2 文章导入 / 下载

| 动作 | 行为 |
| --- | --- |
| 按语言导入 | 上传 `.md`，选择 FR/ZH/EN，覆盖该语言正文 |
| 按语言下载 | 响应 `{slug}-{lang}.md`，不落盘 |
| Zip 导入 | 识别 `fr.md` / `zh.md` / `en.md`（及 `{slug}.fr.md` 等同名约定）；缺语言跳过不覆盖 |
| Zip 下载 | 临时 zip 三文件后响应，用完丢弃 |
| 创建时导入 | 可选预填三语言正文 |

实现放在 `Application` 层 Service（如 `ApiDocArticleImportExport`），Filament Action 只做 UI 与授权。

### 6.3 章节资源改动

- 基础信息增加：
  - `content_type` Select（HTML / MD），默认 HTML，`live()`
  - `article_id` Select（启用中的文章），仅 MD 时显示且必填
- Relation Managers 始终可见可编辑。
- 表格增加「类型」列；MD 时显示关联文章 slug。

## 7. 前台渲染

### 7.1 `ApiDocRenderer`

对每个 section：

1. 始终输出壳字段：slug、nav/title、verb、path、stamp、template、is_intro。
2. 若 `content_type = md`：
   - 按显示模式从文章取对应语言 body，空语言按现有 localize 回退。
   - `ApiDocContentRenderer::toHtml($raw, Markdown)`。
   - 聚合结果中提供 `article_html`（或等价字段）；**不**填充可用于展示的 paras/notes/blocks/params/returns（可给空数组）。
   - Intro：仍输出 `intro_base`、quickstart；intro 主正文用文章 HTML。
3. 若 `content_type = html`：现有逻辑不变。

### 7.2 Blade

- API section / intro section：当存在已渲染文章 HTML 时，在正文区输出整篇 HTML，不再按段落包 `<p>`。
- 导航与锚点行为不变。

### 7.3 缓存

文章 CRUD、章节 `content_type` / `article_id` 变更时调用现有缓存失效机制。`/api-doc.json` 与页面渲染使用同一套 shape。

## 8. 错误处理

| 场景 | 行为 |
| --- | --- |
| MD 章节未选文章 | 表单/服务端校验失败 |
| 引用已删或不存在的文章 | 保存失败；前台若脏数据则该节正文为空并记日志（不 500） |
| 删除被引用文章 | 拦截，提示关联章节 |
| Zip 内无法识别语言文件 | 通知警告，已识别语言照常写入 |
| 非 `.md` 上传 | 校验拒绝 |

## 9. 测试

- Feature：文章 CRUD；单语言/zip 导入导出内容一致。
- Feature：章节 `html` 回归；`md` 前台见文章、不见结构化段落。
- Feature：共享文章，更新后两章节前台同步。
- Feature：Intro + MD 仍见 base / quickstart。
- Feature：删除被引用文章失败。
- Feature：快照含 articles 且可再导入。
- Unit：语言回退；zip 文件名约定解析。

## 10. 文件落点（实现时）

- Migration / Model / Factory / Enum：`gz168/ApiDoc/...`
- Filament Resource + Actions：`gz168/ApiDoc/src/Filament/...`
- Service：`ApiDocArticleImportExport`、扩展 `ApiDocRenderer` / Exporter / Importer
- Views：`resources/views/front/components/{api,intro}-section.blade.php`
- Tests：`tests/Feature/ApiDoc/`、`tests/Unit/ApiDoc/`

## 11. 成功标准

1. 后台可管理文章 MD，并完成单文件与 zip 导入下载。
2. 章节可选 HTML（现状）或 MD（选文章）。
3. MD 章节保存后前台显示对应语言 Markdown 渲染结果。
4. HTML 章节与现有测试不回归。
5. 文章可被多章节共享；删除保护生效。
