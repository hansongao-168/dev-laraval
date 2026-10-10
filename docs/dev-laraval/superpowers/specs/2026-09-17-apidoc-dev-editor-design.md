# ApiDoc 开发编辑器（仓库文件）— 设计规格（子项目 5）

> 状态：已定案（brainstorm 2026-09-17）  
> 模块：`gz168/ApiDoc`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-17-apidoc-dev-editor-design.md`  
> 前置：模板目录 CRUD、分区 HTML/CSS/JS、介绍页 MD（子项目 1–4）  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 0. 在路线图中的位置

本规格是「模板/文档编辑能力」的 **子项目 5**：在 Filament 后台由受保护超管**直接编辑白名单内的仓库磁盘文件**。

| 已有能力 | 关系 |
| --- | --- |
| DB `body_parts` / `css_text` / `js_text` | 运行时优先；非空时覆盖文件回退 |
| 本编辑器 | 改磁盘文件；影响空分区回退与经典资源；**不**自动写回 DB |

## 1. 目标与非目标

### 1.1 目标

- Filament 独立页「开发编辑器」：左侧白名单文件树，右侧代码编辑，保存写盘。
- 仅 **受保护超级管理员**（`is_protected && is_super_admin`，复用 `ApiDocTemplateJsGate::allows`）可访问与保存。
- 可配置白名单 `config('api-doc.dev_editor')`：
  - `enabled`（env `API_DOC_DEV_EDITOR`，默认 true）
  - `max_bytes`（默认 2MiB）
  - `extensions`：`blade.php`, `css`, `js`, `md`, `html`
  - `roots` 默认四项：
    1. `package:resources/views/front`（含 `front-{code}` 子目录若存在于该树旁：见 §2）
    2. `package:resources/css`
    3. `package:resources/js/front/api-doc`
    4. `base:html`
- 路径安全：禁止 `..`、绝对路径逃逸；`realpath` 必须位于所选 root 的 realpath 之下；扩展名白名单；超大文件拒绝打开/保存。
- 保存成功后 `ApiDocCacheManager::flush()`。
- 不做 HTML/JS sanitizer（信任受保护超管写盘）。

### 1.2 非目标

- 自动 `git commit` / PR。
- 非超管只读浏览。
- DB 分区与文件双向同步。
- 任意路径或上传二进制。
- 可视化拖拽布局（子项目 2）。

### 1.3 已拍板

| 决策 | 结论 |
| --- | --- |
| 范围 | 可配置 roots，默认包内 front 资源 + 应用 `html/`（选项 B） |
| 权限/落盘 | 仅受保护超管；直接覆盖磁盘（选项 A） |
| UI | Filament 独立页 + 文件树（选项 A） |
| 架构 | Page + `ApiDocDevEditorService`（方案 1） |

## 2. 配置

```php
// config/api-doc.php
'dev_editor' => [
    'enabled' => env('API_DOC_DEV_EDITOR', true),
    'max_bytes' => (int) env('API_DOC_DEV_EDITOR_MAX_BYTES', 2097152),
    'extensions' => ['blade.php', 'css', 'js', 'md', 'html'],
    'roots' => [
        ['key' => 'views-front', 'label' => 'Front views', 'path' => 'package:resources/views/front'],
        ['key' => 'views-skins', 'label' => 'Skin view copies', 'path' => 'package:resources/views', 'only_prefix' => 'front-'],
        ['key' => 'css', 'label' => 'CSS', 'path' => 'package:resources/css'],
        ['key' => 'js', 'label' => 'Front JS', 'path' => 'package:resources/js/front/api-doc'],
        ['key' => 'html-seed', 'label' => 'HTML seed', 'path' => 'base:html'],
    ],
],
```

**路径前缀约定**
- `package:` → `ApiDocServiceProvider::packagePath(substr after prefix)`
- `base:` → `base_path(substr after prefix)`

**`only_prefix`（可选）**：在 root 为 `resources/views` 时，文件树只列出目录名以 `front-` 开头的子树（SkinCopier 产物），避免把整个 `filament/` 等视图暴露出来。`views-front` root 仍覆盖经典 `front/`。

运维可通过改 config 增删 roots / extensions；不提供运行时 UI 改白名单（避免自我提权扩大攻击面）。

## 3. 架构

```
ApiDocDevEditorPage (Filament)
        ↓ canAccess: JsGate + enabled
ApiDocDevEditorService
        ├── listTree()
        ├── read(rootKey, relative)
        └── write(rootKey, relative, contents) → flush cache
                ↓
        resolvePath → realpath ⊆ root realpath
```

## 4. Filament 页

- 类：`Gz168\ApiDoc\Filament\Pages\ApiDocDevEditorPage`
- 导航：组「API 文档」，标签「开发编辑器」，sort `95`，图标 code-bracket
- `canAccess`：`config enabled` 且 `ApiDocTemplateJsGate::allows(auth user)`
- 状态：`selectedRoot`, `selectedPath`, `content`, `dirty` 可选
- 交互：选 root → 树；点文件 → read 填编辑器；保存按钮 → write
- 编辑器：`Textarea` rows 大；若 Filament 有可用 CodeEditor 组件可选用，非必须
- 错误：校验失败 Notification danger，不写盘

## 5. 安全细则

| 检查 | 行为 |
| --- | --- |
| rootKey 未知 | 失败 |
| relative 含 `..` 或绝对路径 | 失败 |
| 扩展名不在白名单 | 失败（匹配最长后缀，如 `blade.php`） |
| realpath 缺失（读）或不在 root 下 | 失败 |
| 写时目标父目录必须已在 root 内；不创建跳出 root 的新目录 | 失败 |
| strlen(contents) > max_bytes | 失败 |
| 路径是目录 | 失败 |

符号链接：若 `realpath` 跳出 root，拒绝。

## 6. 测试（PHPUnit）

| 用例 | 要点 |
| --- | --- |
| Service path | `../etc/passwd`、坏扩展名拒绝 |
| Service IO | 临时目录 root fixture 读写 |
| Symlink escape | 拒绝（若环境可建 symlink） |
| Page access | 非超管不可访问；超管可 |
| Write flush | mock `ApiDocCacheManager::flush` 被调用 |

测试用临时目录注册为 config roots，避免写真实包文件。

## 7. 实现边界（供 writing-plans）

1. config `dev_editor` + 文档注释。  
2. `ApiDocDevEditorService` + 单测。  
3. `ApiDocDevEditorPage` + blade 视图 + 权限。  
4. Feature 测 canAccess / 保存 flush。  
5. 回归 ApiDoc 相关测试。

## 8. 开放决策

本规格已关闭；无未决项。
