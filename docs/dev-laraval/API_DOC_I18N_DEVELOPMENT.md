# API 文档多语言开发文档

> 状态：**文档已定案（含双编辑器）**；代码按章节优化文档 E1–E7 实施。  
> 模块：`gz168/ApiDoc`  
> 关联：[`API_DOC_MODULE_PLAN.md`](./API_DOC_MODULE_PLAN.md)、[`API_DOC_SECTION_EDIT_OPTIMIZATION.md`](./API_DOC_SECTION_EDIT_OPTIMIZATION.md)  
> 约束：不触碰受保护超级管理员与 `app:initialize` 幂等；不暴露 `.env` 密钥。

## 1. 已确认需求

两套概念必须分开，不得混用：

| 概念 | 用在哪里 | 取值 | 说明 |
| --- | --- | --- | --- |
| **内容语种**（Content locale） | 后台录入、数据库 JSON | `fr` / `zh` / `en` | 每种文案存一份；后台编辑顶栏/Tabs 只出现这三档 |
| **显示方式**（Display mode） | 前台顶栏、`?lang=`、渲染管线 | `default` / `fr` / `zh` / `en` / `both` | 决定「怎么展示已有内容」；`both` = 现有「FR + 中文」对照模板 |

产品口径：

1. **后台编辑录入**：需要「法 / 中 / 英」三语（内容语种）。
2. **前台显示**：按**模板 + 显示方式**渲染；「FR + 中文」是显示方式的一种，**保留**，不是被废弃的临时方案。
3. **正文类字段用编辑器录入**，且 **Markdown 编辑器与 HTML 编辑器都要**（按 `content_format` 切换）；短标题/标识仍用普通输入。详见章节优化文档 §11 与下文 §4.4。
4. 本期文档已定案；代码按 E1–E7 实施。

## 2. 现状

| 层 | 现状 | 缺口 |
| --- | --- | --- |
| 存储 | JSON `{fr, zh}` + `LocalizedString` | 无 `en` |
| 后台 | `LocalizedKeyValue` = 单行 TextInput 并排 FR + ZH | 无 EN；无语种 Tab；**正文无富文本编辑器** |
| 前台顶栏 | `Français` / `中文` / `FR + 中文` | 无「默认」、无「英文」 |
| 枚举 | `ApiDocLocale`：`fr` \| `zh` \| `both` | 缺 `en`、`default`；未区分「内容语种 / 显示方式」 |
| 设置 | `default_locale` ∈ {`fr`,`zh`} | 需支持 `en` |
| 渲染 | `pick` / `format` / `formatCompact`；`both` → FR + `<span class="zh">` | `en` 与 `default` resolve；`both` 是否纳入 EN 需定规则（见 §5.3） |

## 3. 领域模型

### 3.1 内容语种（入库）

```text
ContentLocale = fr | zh | en
```

所有「可本地化」字段统一形状（无破坏性 migration，JSON 列兼容旧数据）：

```json
{ "fr": "...", "zh": "...", "en": "..." }
```

- 旧数据缺 `en` → 读作 `""`。
- 导入/导出：写出三键；导入兼容仅有 `fr`/`zh` 的快照。
- 种子：英文可先空，靠回落显示。

### 3.2 显示方式（前台）

```text
DisplayMode = default | fr | zh | en | both
```

| 显示方式 | URL / 顶栏 | 渲染行为 |
| --- | --- | --- |
| `default` | 顶栏「默认」；无 `lang` 或 `?lang=default` | 先 resolve 为 `settings.default_locale`（必为 `fr`\|`zh`\|`en`），再按单语模板渲染 |
| `fr` | 法文 | 单语：取 `fr`，空则按回落链 |
| `zh` | 中文 | 单语：取 `zh`，空则按回落链 |
| `en` | 英文 | 单语：取 `en`，空则按回落链 |
| `both` | FR + 中文 | **对照模板**：沿用现有 `LocalizedString::format(..., 'both')`（FR 主文 + 中文 muted span）；**不是**第三种入库语种 |

要点：

- `default` **永不入库**；只是浏览态，resolve 后走单语管线。
- `both` **永不入库**；只是显示模板。对照内容仍来自内容语种 `fr` + `zh`（本期对照不拼 `en`，见 §5.3）。
- 后台编辑 **禁止**出现 `default` / `both` Tab，避免运营误以为要「录入对照稿」。

### 3.3 枚举拆分（实现时）

建议拆成两个枚举，避免再把「显示」和「内容」塞进同一个 `ApiDocLocale`：

```php
enum ApiDocContentLocale: string  // fr, zh, en
enum ApiDocDisplayMode: string    // default, fr, zh, en, both
```

- `ApiDocDisplayMode::toContentLocale(?ApiDocContentLocale $default): ?ApiDocContentLocale`  
  - `default` → 设置中的默认内容语种  
  - `fr|zh|en` → 自身  
  - `both` → `null`（走对照模板，不 pick 单一语种）
- 旧 `ApiDocLocale` 可标记废弃并委托到 `DisplayMode`，降低改动面。

## 4. 后台编辑（内容语种）

### 4.1 UX

章节 Create/Edit（及各 RelationManager 表单）顶部：

```text
[ 法文 ] [ 中文 ] [ 英文 ]
```

- 当前 Tab 只展示该语种输入框（标题、段落、告警、参数说明等）。
- 保存时 **merge** 到 JSON 对应键，其它语种键保持不变。
- 切换 Tab 不丢未保存草稿（Livewire/Filament 表单状态保留三语，仅控制可见字段）。

子表（段落 / 告警 / 代码块标题 / 参数说明）与主表同一套「活动内容语种」上下文（页面级 state，或各 Manager 同步同一 `contentLocale`）。

### 4.2 组件

- 将 `LocalizedKeyValue` 升级为支持 `locales: ['fr','zh','en']`，并按字段类型分流：
  - **短文**：`LocalizedText` → `TextInput`。
  - **正文**：`content_format` + 条件渲染：
    - `markdown` → `MarkdownEditor`
    - `html` → `RichEditor`
  - 见 §4.4 与章节优化文档 §11。
- 由页面按当前内容语种 Tab 只渲染该语种控件。
- 列表摘要：`strip_tags` + limit（HTML）或截断 MD 源文。

### 4.3 权限与写路径

仍遵守章节编辑优化文档：写走 `ApiDocSectionService`（或写后统一 `flush`）；权限 `api-doc.update`。多语言不另开权限。

### 4.4 内容编辑器（与三语联动）

**定案（已更新）**：**Markdown 编辑器与 HTML 编辑器都需要。**

| 内容格式 | 后台控件 | 库存 | 前台 |
| --- | --- | --- | --- |
| `markdown` | Filament `MarkdownEditor`（预览开） | MD 源文 | CommonMark → 消毒 HTML |
| `html` | Filament `RichEditor` | HTML | 消毒后输出 |

- 每条正文记录（或 intro 节级）有 `content_format`；三语共用该格式。
- 切换格式：**不自动互转**正文，仅换编辑器并确认提示。
- 短标题：`TextInput`；代码：等宽 `Textarea`。
- HTML 工具栏：`bold | italic | link | bulletList | orderedList | h2 | h3 | undo | redo`。
- `both`：fr/zh 各自按格式渲染后再套对照模板。

完整矩阵、migration、测试见 [`API_DOC_SECTION_EDIT_OPTIMIZATION.md`](./API_DOC_SECTION_EDIT_OPTIMIZATION.md) §11。
## 5. 前台显示（显示方式 + 模板）

### 5.1 顶栏

```text
默认 | 法文 | 中文 | 英文 | FR + 中文
```

对应：`default` / `fr` / `zh` / `en` / `both`。

- 交互继续用现有 `.langs` + Livewire `switchLang`。
- `aria-pressed`：当前 `displayMode` 高亮对应按钮；选「默认」时高亮「默认」（即使 resolve 后实际是法语正文）。
- 移动端五钮可能偏挤：允许换行或缩小字号，不改为下拉（除非实现阶段验收要求改）。

### 5.2 Resolve 流程

```text
request ?lang=…
    → 非法/空 → DisplayMode::Default
    → DisplayMode
         ├─ Default → content = settings.default_locale → 单语模板
         ├─ Fr|Zh|En → content = 自身 → 单语模板
         └─ Both → 对照模板（fr + zh）
```

缓存：

- 单语：`render:{fr|zh|en}`、`render:{fr|zh|en}:html`（及 ui 键）。
- 对照：`render:both`、`render:both:html`。
- **不对 `default` 单独建缓存键**（resolve 后再记）。

`ApiDocCacheManager::flush()` 回退列表补齐 `en` 与所有 `:html` 变体。

### 5.3 对照模板（`both`）与英文的关系

**本期定案**：`both` 仍为 **法文 + 中文** 对照，模板与现网一致（`format` / `formatCompact` 的 both 分支）。

- 不引入「FR + EN」或「三语对照」变体。
- 英文只通过显示方式 `en`（及 `default=en`）以**单语模板**阅读。
- 若未来要「可配置对照语言对」，另开需求；不在本文范围。

### 5.4 单语回落链

对内容语种 `L` 取字段时：

1. `value[L]` 非空 → 用它  
2. 否则 `value[default_locale]` 非空 → 用它  
3. 否则按固定次序尝试：`fr` → `zh` → `en` 中尚未试过的键  
4. 仍空 → `""`（避免抛错；标题类可在后台用 required 约束至少一语）

`both` 模式：`fr` 与 `zh` 各自取串后按现有 HTML 模板拼接；某一侧为空时行为与现网一致（仅显示有内容的一侧）。

### 5.5 设置页

- `default_locale` options：`fr` / `zh` / `en`。
- 文案说明：仅影响「默认」显示方式与回落第二步，不影响已入库的三语文案。

## 6. 与章节编辑优化的关系

| 文档 | 职责 |
| --- | --- |
| `API_DOC_SECTION_EDIT_OPTIMIZATION.md` | 编辑闭环：Service、缓存、intro 形状、**内容编辑器**、复制、权限、测试（E1–E5 / E7） |
| **本文** | 内容语种三语 + 前台显示方式五档（E6）；正文编辑器与语种 Tab 的联动（§4.4） |

依赖：

- E6.3（三语录入）与 E3 / E7（intro + 双编辑器）宜同一批改 `Localized*`，避免返工。
- E6 不替代 E1/E2；无统一刷缓存则多语言编辑同样会「前台不更新」。

建议实施顺序：

```text
E1 → E2 → E3 → E7（Markdown + HTML 双编辑器 + 消毒）→ E5 冒烟 → E4 → E6 → E5 全量
```

## 7. 实施清单（代码阶段，本文不执行）

| 编号 | 内容 | 完成标准 |
| --- | --- | --- |
| I18N-1 | `ApiDocContentLocale` / `ApiDocDisplayMode`；Cast `pick`/`format` 支持 `en` + 回落；`both` 保持法中对照 | 单元测试覆盖 pick / both / 空 en |
| I18N-2 | CacheManager 键补齐；Renderer / Livewire resolve `default` | `?lang=default\|en\|both` 行为正确 |
| I18N-3 | 前台顶栏五档；设置页 default 含 en | 顶栏可点、高亮正确 |
| I18N-4 | 后台「法/中/英」Tab + 短文/正文分流；正文接双编辑器 | 只改 en 不丢 fr/zh；MD/HTML 可切换 |
| I18N-5 | Exporter / Importer / 种子兼容三键（正文可为 HTML） | 旧纯文本快照可导入；新导出含 en |
| I18N-6 | Feature：显示方式切换、回落、权限下编辑三语、正文 HTML 消毒 | `--filter=ApiDoc` 绿 |

## 8. 验收标准

### 后台（内容语种）

- [ ] 章节与子表编辑可见「法文 / 中文 / 英文」切换。
- [ ] 在英文 Tab 录入并保存后，库中 JSON 含非空 `en`，且 `fr`/`zh` 未被清空。
- [ ] 正文类可切换 Markdown / HTML 编辑器；短标题为 TextInput；代码为等宽 Textarea。
- [ ] 无 `api-doc.update` 不可保存。

### 前台（显示方式）

- [ ] 顶栏：默认、法文、中文、英文、FR + 中文，均可切换。
- [ ] 「默认」跟随设置 `default_locale`（含设为 en）。
- [ ] 「FR + 中文」仍为对照模板（法主文 + 中文 span），与现网视觉一致。
- [ ] 「英文」单语；`en` 为空时按回落链出文案，不白屏、不 500。
- [ ] 旧数据未填 en 时，法/中/`both` 行为与改前一致。

### 工程

- [ ] `php artisan test --compact --filter=ApiDoc` 通过。
- [ ] Pint dirty 通过。
- [ ] 不削弱受保护管理员与 initialize 幂等。

## 9. 非目标

- 机器翻译或自动从 fr/zh 生成 en。
- 可配置对照语言对（如 FR+EN）；本期 `both` 固定法+中。
- 前台按浏览器 `Accept-Language` 自动选档（可后续加；本期仅顶栏 + query + 设置默认）。
- 为每个内容语种复制整页路由或独立站点。
- Monaco / 完整 IDE 级代码编辑器。
- 编辑器内上传大图/媒体库（本期工具栏不含图片，或仅允许外链）。
- Markdown ↔ HTML 自动双向转换。
## 10. 风险

| 风险 | 缓解 |
| --- | --- |
| 把 `both` 误当成入库语种 | 枚举拆分 + 后台禁止 both Tab |
| 三语并排表单过宽 | 强制 Tab 单语可见 |
| 改 Cast 破坏旧 both HTML | both 分支单测锁定现网拼接格式 |
| 与章节 E3 表单改造冲突 | 同一 PR/同一阶段改 Localized 组件 |

## 11. 文档状态

- 本文审阅通过前：**不改业务代码**。
- 拍板记录：后台录入 = 法/中/英；正文 = **Markdown 编辑器 + HTML 编辑器**（`content_format` 切换）；前台 = 模板 + 显示方式；`FR + 中文` = 显示方式之一（保留）。
