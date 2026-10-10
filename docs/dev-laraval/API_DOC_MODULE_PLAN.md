# API 文档模块 (gz168/api-doc) 实施计划

> 本文档记录 \`gz168/ApiDoc\` 的前台、Filament 后台、数据结构、批量导入导出和验证方式。前台效果对标 \`html/api-doc-complete.html\`（37 Express · API Colis v2）；数据库与前台入口已经落地，后台已提供章节内容及全局数据维护能力。

## 1. 背景与目标

### 1.1 现状

- \`html/api-doc-complete.html\`（1597 行，单文件，含完整 CSS / JS / 数据）当前是 37 Express 法语 / 中文双语 API 文档的唯一发布形态。
- \`html/index.html\` + \`html/api-data.js\` 是同一份文档的"分离版"，但同样没有后台编辑入口。
- 文档内容（章节、参数表、代码示例、告警、承运商参考、待决策清单）目前硬编码在 JS 数据对象 \`DOC / CARRIERS / DECISIONS / UI / QUICKSTART\` 中。
- 任何文案、参数或样例代码变更都需要开发改文件、跑 \`npm run build\` 或手动替换静态文件，运营无法独立维护。
- 双语字段（FR/ZH）以 \`t("fr","zh")\` 形式同表存储，没有 i18n key 抽象，前台语言切换走 URL hash \`#lang=...\`，没有任何持久化。

### 1.2 目标

在不破坏现有 \`html/api-doc-complete.html\` 的前提下，新增独立模块 \`gz168/ApiDoc\`，提供：

| 能力 | 阶段 | 说明 |
| --- | --- | --- |
| 数据库存储：章节 / 参数表行 / 代码块 / 告警 / 承运商 / 待决策 / 启动步骤 | 阶段 1 | 全部取代硬编码 JS 数据 |
| Filament 后台：分组、章节、参数、代码块、告警、承运商、待决策、界面文案、启动步骤、设置 | 阶段 1 | 全部可视化 CRUD + 排序 + 启用 |
| 前台 \`/api-doc\` 页面：完全还原 \`api-doc-complete.html\` 的视觉与交互 | 阶段 1 | Livewire + Blade + Tailwind 4 + Alpine.js；URL \`#lang=...\` 切换 |
| 后台权限：\`api-doc.view\` / \`api-doc.update\` / \`api-doc.publish\` / \`api-doc.export\` / \`api-doc.import\` | 阶段 1 | 复用 \`gz168/role-permission\`，不依赖前端隐藏 |
| 缓存：内容编辑即时失效，前台首屏 < 50 ms（Redis 命中） | 阶段 1 | 服务端聚合 + Redis 缓存 + 版本号失效 |
| 双语（FR / ZH / FR+ZH）字段统一模型，渲染时按语言位选择 | 阶段 1 | \`localized_string\` cast + 模板层选语 |
| 从 \`html/api-data.js\` 一次性导入种子数据（idempotent seeder） | 阶段 1 | 首次 \`php artisan app:initialize\` 后即可访问 \`/api-doc\` |
| 导出当前数据库快照（JSON）及按模式导入 | 阶段 1 | 快照页：\`/admin/api-doc-snapshot-page\` |
| 导出当前快照为静态 HTML（\`api-doc-complete.html\`） | 阶段 2 | 给外部客户 / 离线 PDF 用 |
| Markdown 编写面板 + 实时预览 | 阶段 2 | 让非技术运营也能维护 |
| 翻译记忆 / AI 辅助补全 FR ↔ ZH | 阶段 3 | 走 \`gz168/deepseek\` |
| 多版本快照（保留历史 v1 / v2） | 阶段 3 | 切换查看 |

### 1.3 非目标

- 不在阶段 1 中改动 \`html/api-doc-complete.html\` 本身；保留作为对标"目标态"参考，前台访问路径换成 \`/api-doc\`。
- 不在本期引入全文搜索（Meilisearch / Elastic）；仅保留当前"参数名高亮过滤"客户端方案。
- 不复制原页面里的整套法语备注"Rejouer une requête crée un second envoi facturé"等运营文案到数据库 —— 阶段 1 一次性 seeder 灌入，阶段 2 才是"运营独立维护"。

## 2. 架构决策

### 2.1 模块边界

- 新建独立模块 \`gz168/ApiDoc\`（目录 \`gz168/ApiDoc/\`），不复用任何已有业务模块。
- 不依赖 \`gz168/CustomConfig\`：本模块自带强类型表结构（章节、参数、代码块、告警都是 1:N 关系），不适配 KV 表。
- \`CustomConfig\` 仅用作"模块开关 / 缓存 TTL / 显示"等少数标量配置；本模块不读取任何其它模块的 KV。

### 2.2 依赖方向

\`\`\`text
ApiDoc (功能)
├── common           (基础契约 / 枚举 / JSON 工具)
├── Filament         (Filament v5 通用封装)
├── filament-admin   (隐式, 通过 Filament 间接)
└── role-permission  (后台权限)
\`\`\`

**禁止**：依赖任何业务模块（Customer / Order / Mail / ...）。前台访问无须登录鉴权，但后台入口必须走 \`gz168/role-permission\`。

### 2.3 协议与认证

| 入口 | 认证 | 鉴权 |
| --- | --- | --- |
| 前台 \`/api-doc\` | 无（公开访问） | 无 |
| 前台 \`/api-doc.json\`（可选聚合 API） | 无（公开访问） | 仅返回已发布版本 |
| 后台 Filament \`/admin/api-doc/*\` | 受保护管理员 | \`api-doc.view / .update / .publish\` |

前台不返回任何 \`.env\` / 凭据 / 密钥。后台编辑内容走 \`Crypt::encryptString\` 备份快照（阶段 2）。

### 2.4 内容模型

阶段 1 创建 7 张主表 + 4 张子表，集中在 \`gz168/ApiDoc/database/migrations/\`：

#### \`api_doc_settings\`

模块级标量配置（仅有 1 行，\`id = 1\`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | tinyint PK | 固定 1 |
| \`cache_ttl\` | int | 前台聚合缓存 TTL（秒），默认 3600 |
| \`cache_store\` | varchar(64) nullable | Redis store 名；null 用默认 |
| \`default_locale\` | enum \`fr\`,\`zh\`,\`both\` | URL 无 \`#lang=\` 时默认语言 |
| \`show_decisions\` | bool | 是否显示"待决策"区块（对应原 HTML \`SHOW_DECISIONS\`） |
| \`brand_name\` | varchar(80) | 顶部品牌行（默认 "API Colis v2"） |
| \`version_label\` | varchar(40) | 右上角版本号（默认 "v2"） |
| \`footer_left\` | varchar(200) | 页脚左 |
| \`footer_right\` | varchar(200) | 页脚右 |
| \`updated_by\` | bigint FK → users.id nullable | 最后修改人 |
| \`timestamps\` | | |

#### \`api_doc_groups\`

侧边栏分组（"Commencer / Expédier / Suivre / Enlèvement / Réseau"等）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | bigint PK | |
| \`code\` | varchar(64) unique | 机器名（用于排序 / 重命名检测） |
| \`label\` | json | 双语 \`{fr: "...", zh: "..."}\` |
| \`sort\` | int | 排序，默认 0，越小越前 |
| \`is_active\` | bool | 默认 true |
| \`timestamps\` | | |

#### \`api_doc_sections\`

API 文档章节：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | bigint PK | |
| \`slug\` | varchar(80) unique | 锚点 id（例 \`intro / oauth / devis / bordereau\`） |
| \`group_id\` | FK → api_doc_groups.id nullable | null 表示不在侧边栏显示（如 intro） |
| \`nav_label\` | json | 双语（侧边栏显示文案） |
| \`title\` | json | 双语（h2 显示文案） |
| \`verb\` | varchar(10) nullable | \`POST / GET / REF / TODO\`，intro 节不填 |
| \`path\` | varchar(255) nullable | 路径或根键（intro 节不填） |
| \`stamp_kind\` | enum \`ok\`,\`warn\`,\`alert\`,\`new\`,null | 右上角徽章颜色 |
| \`stamp_label\` | json nullable | 双语徽章文案 |
| \`is_intro\` | bool | 是否首页"总览"（独立布局，无参数表） |
| \`intro_h1\` | json nullable | is_intro=true 时使用 |
| \`intro_paras\` | json nullable | is_intro=true 时使用，数组 \`[{fr, zh}]\` |
| \`intro_base\` | json nullable | is_intro=true 时使用，\`[[label, value], ...]\` 双语 label |
| \`sort\` | int | 章节在分组内排序 |
| \`is_active\` | bool | 默认 true |
| \`timestamps\` | | |

章节下挂载的子表：

- \`api_doc_section_paras\`（普通段落，1:N）
  - \`section_id\` FK；\`sort\` int；\`text\` json 双语
- \`api_doc_section_notes\`（alert / warn / info 提示框，1:N）
  - \`section_id\` FK；\`kind\` enum \`info\`,\`warn\`,\`alert\`；\`label\` json；\`body\` json nullable；\`sort\` int
- \`api_doc_section_blocks\`（代码块，1:N）
  - \`section_id\` FK；\`heading\` json 双语；\`code\` text；\`sort\` int
- \`api_doc_section_param_rows\`（参数 / 返回 / 错误表行，1:N）
  - \`section_id\` FK；\`table_kind\` enum \`params\`,\`ret\`,\`errors\`；\`path\` varchar(160)（参数路径，如 \`carriers/parcels/weight\`）；\`required\` enum \`y\`,\`n\`；\`type\` varchar(40)；\`description\` json 双语；\`flag\` enum \`legacy\`,\`added\`,\`fixed\`,null；\`sort\` int
  - 索引：\`(section_id, table_kind, sort)\`

> 设计要点：所有双语字段统一 \`{fr, zh}\` JSON + \`localized_string\` cast；空语言自动回落到另一语言；\`both\` 模式两个并列渲染。

#### \`api_doc_carriers\`

承运商参考表（独立于 \`api_doc_sections\`，单独展示）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | bigint PK | |
| \`code\` | varchar(40) unique | 承运商 code（\`<path> <b>code</b>\` 里的 code） |
| \`name\` | json | 双语商业名 |
| \`geo\` | json | 双语（覆盖国家清单，长文本） |
| \`sort\` | int | |
| \`is_active\` | bool | |
| \`timestamps\` | | |

#### \`api_doc_decisions\`

"待决策"清单（对应原 HTML \`DECISIONS\`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | bigint PK | |
| \`topic\` | json | 双语主题 |
| \`body\` | json | 双语正文 |
| \`sort\` | int | |
| \`is_active\` | bool | |
| \`timestamps\` | | |

#### \`api_doc_quickstart_steps\`

首页"快速开始"4 步：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | bigint PK | |
| \`heading\` | json | 双语标题 |
| \`description\` | json | 双语描述 |
| \`code\` | text nullable | curl 示例 |
| \`sort\` | int | |
| \`is_active\` | bool | |
| \`timestamps\` | | |

#### \`api_doc_ui_strings\`

界面文案（对应原 HTML \`UI\`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| \`id\` | bigint PK | |
| \`code\` | varchar(80) unique | 文案 key（如 \`copy\`,\`copied\`,\`search\`,\`param\`,\`req\`,\`type\`,\`desc\`,\`field\`,\`err\`,\`cause\`,\`see\`,\`anchor\`,\`latest\`,\`entry\`,\`quickH\`,\`quickSub\`,\`quickStep\`,\`codesOnly\`,\`open\`,\`decideH\`,\`decideSub\`,\`ref\`,\`carriersH\`,\`carriersLede\`,\`carriersNote\`,\`carrierCode\`,\`carrierName\`,\`carrierGeo\`,\`footL\`,\`searchNone\`） |
| \`text\` | json | 双语 |
| \`is_active\` | bool | |
| \`timestamps\` | | |

## 3. 渲染层设计（前台）

### 3.1 路由

\`\`\`text
GET /api-doc                  Livewire 渲染页面（替代 html/api-doc-complete.html）
GET /api-doc.json             聚合 JSON（供阶段 2 静态导出 / 第三方抓取）
GET /api-doc/sections/{slug}  单章节锚点（Livewire partial reload）
\`\`\`

前台路由文件：\`gz168/ApiDoc/routes/front.php\`，通过 ServiceProvider 在模块启用时载入。

### 3.2 Livewire 组件

| 组件 | 职责 |
| --- | --- |
| \`Gz168\ApiDoc\Livewire\ApiDocPage\` | 顶层页面：接收 \`#lang=\`，调度 \`ApiDocRenderer\` 渲染所有章节 |
| \`Gz168\ApiDoc\Livewire\ApiDocSearch\` | 参数表过滤（高亮匹配）—— 沿用原 HTML 的纯客户端实现，避免引入 Livewire 状态往返 |
| \`Gz168\ApiDoc\Livewire\ApiDocNavSpy\` | IntersectionObserver 驱动的侧边栏高亮（Alpine.js 即可，不上 Livewire） |

### 3.3 Blade 视图

\`\`\`text
resources/views/front/
├── layout.blade.php                 公共外壳（head / fonts / 全局样式 / toast）
├── api-doc-page.blade.php           顶部 / 侧边栏 / 主区容器
├── partials/
│   ├── header.blade.php
│   ├── nav.blade.php
│   ├── intro-section.blade.php
│   ├── api-section.blade.php
│   ├── carriers-section.blade.php
│   ├── decisions-section.blade.php
│   ├── footer.blade.php
│   └── toast.blade.php
└── components/
    ├── panel.blade.php              代码块（含复制按钮）
    ├── note.blade.php               info/warn/alert 提示框
    ├── param-table.blade.php
    ├── ret-table.blade.php
    ├── err-table.blade.php
    └── decision-list.blade.php
\`\`\`

### 3.4 样式策略

- **第一阶段**：将 \`api-doc-complete.html\` 的 CSS 复制到 \`resources/css/api-doc.css\`，作为 \`@vite\` 入口资源，所有自定义属性（\`--teal\` 等）从 \`api_doc_settings\` 注入。
- **第二阶段**：把 CSS 用 Tailwind 4 + 自定义组件类（\`@layer components\`）重构，颜色变量由 \`api_doc_settings\` 提供。
- 沿用原页面的字体堆栈（Plus Jakarta Sans / IBM Plex Mono / Noto Sans SC），无需改字体源。

### 3.5 JS 交互

\`\`\`text
resources/js/front/api-doc/
├── render.js                  渲染入口（仅装配 Alpine 数据）
├── nav-spy.js                 IntersectionObserver 侧边栏高亮
├── lang-switch.js             #lang= 切换 + history.replaceState
├── search-filter.js           参数表过滤 + 高亮（沿用原 applyFilter）
├── copy.js                    代码块复制 + toast
└── hash-jump.js               #s=slug 滚动
\`\`\`

只引入 Alpine.js + 自写脚本，不引入 jQuery / Vue / React。Vite 配置新增入口 \`resources/js/front/api-doc/index.js\`。

### 3.6 国际化

- 所有用户可见的双语字段来自数据库 \`{fr, zh}\` JSON，模板用 \`@localize($value, $lang)\` blade helper：
  - \`fr\`：取 \`fr\`，缺省回退 \`zh\`
  - \`zh\`：取 \`zh\`，缺省回落 \`fr\`
  - \`both\`：渲染 \`<span>fr</span><span class="zh">zh</span>\`
- URL hash \`#lang=fr|zh|both\` 决定 \`$lang\`，无 hash 用 \`api_doc_settings.default_locale\`。

## 4. 服务层设计

### 4.1 聚合服务

\`\`\`php
namespace Gz168\ApiDoc\Services;

final class ApiDocRenderer
{
    public function render(string $lang): array;        // 一次性返回所有前台需要的结构
    public function section(string $slug, string $lang): ?array;
    public function forgetCache(): void;
}
\`\`\`

- \`render()\` 内部从 \`ApiDocSection / ApiDocCarrier / ApiDocDecision / ApiDocQuickstartStep / ApiDocUiString / ApiDocSetting\` 读数据，按 \`sort\` 装配。
- 用 \`Cache::tags(['api_doc'])->remember($cacheKey, $ttl, ...)\` 缓存；任何写操作触发 \`forgetCache()\`。

### 4.2 章节写服务

\`\`\`php
namespace Gz168\ApiDoc\Services;

final class ApiDocSectionService
{
    public function create(array $payload): ApiDocSection;
    public function update(ApiDocSection $section, array $payload): ApiDocSection;
    public function reorderGroup(int $groupId, array $orderedIds): void;  // 批量排序
    public function duplicate(ApiDocSection $section, string $newSlug): ApiDocSection;
}
\`\`\`

子表（段落 / 告警 / 代码块 / 参数行）走 \`upsertMany()\`：接收数组，diff 后批量写入并 \`forgetCache()\`。

### 4.3 种子与导入

- \`php artisan api-doc:seed-from-html {path=html/api-data.js}\` 命令（阶段 1）：
  - 用正则从 \`api-data.js\` 解析出 \`DOC / CARRIERS / DECISIONS / UI / QUICKSTART\`，构造数组。
  - 走 \`ApiDocSectionService::create()\` 批量入库，**幂等**：先按 \`slug\` \`updateOrCreate\`，子表按 \`(section_id, table_kind, sort, path)\` 复合键 \`updateOrCreate\`。
  - 命令执行完成后打印"已导入 X 章节 / Y 参数行 / Z 代码块"统计。
- \`InitializeApplication\` 不自动调用此命令；它只在开发环境或显式执行时跑，避免破坏 \`initialize\` 的幂等性。

## 5. 后台设计（Filament）

### 5.1 导航

挂在 \`filament-admin\` 的 \`/admin\` 下。模块通过 Filament 自动发现 Resource 和 Page；访问入口与授权如下：

| Filament 单元 | 实际入口 | 资源 | 权限 |
| --- | --- | --- | --- |
| \`ApiDocSectionResource\` | \`/admin/api-doc-sections\` | Resource（含四个 RelationManager） | 查看：\`api-doc.view\`；编辑：\`api-doc.update\` |
| \`ApiDocGroupResource\` | \`/admin/api-doc-groups\` | Resource | 查看：\`api-doc.view\`；编辑：\`api-doc.update\` |
| \`ApiDocCarrierResource\` | \`/admin/api-doc-carriers\` | Resource | 查看：\`api-doc.view\`；编辑：\`api-doc.update\` |
| \`ApiDocDecisionResource\` | \`/admin/api-doc-decisions\` | Resource | 查看：\`api-doc.view\`；编辑：\`api-doc.update\` |
| \`ApiDocQuickstartStepResource\` | \`/admin/api-doc-quickstart-steps\` | Resource | 查看：\`api-doc.view\`；编辑：\`api-doc.update\` |
| \`ApiDocUiStringResource\` | \`/admin/api-doc-ui-strings\` | Resource | 查看：\`api-doc.view\`；编辑：\`api-doc.update\` |
| \`ApiDocSettingsPage\` | \`/admin/api-doc-settings-page\` | Page（Form） | \`api-doc.update\` |
| \`ApiDocSnapshotPage\` | \`/admin/api-doc-snapshot-page\` | Page（Actions） | 导出：\`api-doc.export\`；导入：\`api-doc.import\` |

前台 \`/api-doc\`、\`/api-doc.json\` 和章节接口公开访问；后台入口需要登录，并且每个 Resource/Page 在服务端执行权限判断，不依赖菜单隐藏。

### 5.2 章节编辑 UX

- 顶部使用 Tabs：\`基础信息\`、\`Stamp 标签\`、\`介绍页内容\`；双语文本统一通过 \`LocalizedKeyValue\` 组件。
- 中部四个 RelationManager：\`正文段落\`、\`提示与告警\`、\`代码块\`、\`参数与返回字段\`。每张表提供 \`sort\` 字段，列表默认按 \`sort\` 升序，可在后台直接修改排序号。
- 代码块使用 \`Textarea\` 保存纯文本，不引入 Monaco/Prism；前台代码复制由前台 Blade/JS 负责。
- \`is_active\` 控制发布/显示；编辑 RelationManager、创建、编辑、删除动作只对拥有 \`api-doc.update\` 的用户显示。
- **正文编辑器（已改定案）**：正文类字段同时提供 Filament \`MarkdownEditor\` 与 \`RichEditor\`，由 \`content_format\`（\`markdown\`|\`html\`）切换；详情见 \`API_DOC_SECTION_EDIT_OPTIMIZATION.md\` §11 与 \`API_DOC_I18N_DEVELOPMENT.md\` §4.4。短标题仍用输入框；代码块仍用 Textarea；\`both\` 对照显示方式保留。原「仅 Markdown」或「仅 RichEditor」方案均已合并为本双编辑器方案。

### 5.3 双语输入

- 通用组件：\`Gz168\ApiDoc\Filament\Forms\Components\LocalizedKeyValue\`。
- 组件固定渲染两列 \`FR\` 与 \`ZH\` 的输入框，字段路径为 \`field.fr\` / \`field.zh\`。
- 章节、参数行、告警、代码块、界面文案等所有 JSON 双语字段统一使用该组件；数据库仍保存 \`{fr, zh}\` JSON。

## 6. 权限设计

\`\`\`php
namespace Gz168\ApiDoc\Enums;

enum ApiDocPermission: string
{
    case View     = 'api-doc.view';
    case Update   = 'api-doc.update';
    case Publish  = 'api-doc.publish';
    case Export   = 'api-doc.export';
    case Import   = 'api-doc.import';
}
\`\`\`

- 权限由 \`Gz168\ApiDoc\Database\Seeders\ApiDocPermissionSeeder\` 注册；执行 \`php artisan db:seed --class='Gz168\ApiDoc\Database\Seeders\ApiDocPermissionSeeder'\` 可幂等补齐权限，并同步 admin 角色。
- Resource 通过 \`ApiDocAuthorization\` Trait 统一执行 \`view/update/delete/reorder\` 权限判断；Snapshot Action 在执行回调中再次检查 \`api-doc.export\` / \`api-doc.import\`，防止绕过可见性直接触发。
- \`Publish\` 已注册但当前没有独立发布页面；章节的 \`is_active\` 由编辑页直接控制。后续发布工作流应继续复用 \`api-doc.publish\`，不要在客户端单独实现授权。
- 前台 \`/api-doc\` 完全公开，不做权限判断；只有后台入口强制鉴权。

## 7. 缓存与失效

| 数据 | 缓存键 | 失效触发 |
| --- | --- | --- |
| 聚合渲染结果 | \`api_doc:render:{lang}\` | 任一表写操作 → \`forgetCache()\` |
| 单章节 | \`api_doc:section:{lang}:{slug}\` | 同上 |
| UI 文案 | \`api_doc:ui:{lang}\` | \`api_doc_ui_strings\` 写 |
| 设置 | \`api_doc:settings\` | \`api_doc_settings\` 写 |

阶段 1 用 Redis tag \`api_doc\`；写操作统一调用 \`Cache::tags(['api_doc'])->flush()\`。

## 8. 模块清单（落地物）

\`\`\`text
gz168/ApiDoc/
├── composer.json
├── module.json
├── ARCHITECTURE.md
├── config/
│   └── api-doc.php
├── database/
│   ├── migrations/
│   │   ├── 2026_xx_xx_000001_create_api_doc_settings_table.php
│   │   ├── 2026_xx_xx_000002_create_api_doc_groups_table.php
│   │   ├── 2026_xx_xx_000003_create_api_doc_sections_table.php
│   │   ├── 2026_xx_xx_000004_create_api_doc_section_paras_table.php
│   │   ├── 2026_xx_xx_000005_create_api_doc_section_notes_table.php
│   │   ├── 2026_xx_xx_000006_create_api_doc_section_blocks_table.php
│   │   ├── 2026_xx_xx_000007_create_api_doc_section_param_rows_table.php
│   │   ├── 2026_xx_xx_000008_create_api_doc_carriers_table.php
│   │   ├── 2026_xx_xx_000009_create_api_doc_decisions_table.php
│   │   ├── 2026_xx_xx_000010_create_api_doc_quickstart_steps_table.php
│   │   └── 2026_xx_xx_000011_create_api_doc_ui_strings_table.php
│   ├── factories/
│   │   ├── ApiDocGroupFactory.php
│   │   ├── ApiDocSectionFactory.php
│   │   ├── ApiDocSectionParamRowFactory.php
│   │   ├── ApiDocCarrierFactory.php
│   │   ├── ApiDocDecisionFactory.php
│   │   ├── ApiDocQuickstartStepFactory.php
│   │   └── ApiDocUiStringFactory.php
│   └── seeders/
│       ├── ApiDocUiStringSeeder.php
│       └── ApiDocSettingsSeeder.php
├── routes/
│   └── front.php
├── resources/
│   ├── css/
│   │   └── api-doc.css
│   ├── js/
│   │   └── front/api-doc/index.js
│   └── views/
│       ├── front/
│       │   ├── layout.blade.php
│       │   ├── api-doc-page.blade.php
│       │   └── partials/
│       │       ├── header.blade.php
│       │       ├── nav.blade.php
│       │       ├── intro-section.blade.php
│       │       ├── api-section.blade.php
│       │       ├── carriers-section.blade.php
│       │       ├── decisions-section.blade.php
│       │       ├── footer.blade.php
│       │       └── toast.blade.php
│       ├── components/
│       │   ├── panel.blade.php
│       │   ├── note.blade.php
│       │   ├── param-table.blade.php
│       │   ├── ret-table.blade.php
│       │   ├── err-table.blade.php
│       │   └── decision-list.blade.php
│       └── filament/
│           ├── pages/
│           │   └── api-doc-settings-page.blade.php
│           └── resources/
│               └── api-doc-section-resource/
│                   └── pages/
│                       ├── edit.blade.php
│                       └── preview.blade.php
├── src/
│   ├── Console/
│   │   └── Commands/
│   │       └── SeedFromHtmlCommand.php
│   ├── Enums/
│   │   ├── ApiDocPermission.php
│   │   ├── ApiDocNoteKind.php
│   │   ├── ApiDocParamFlag.php
│   │   ├── ApiDocStampKind.php
│   │   ├── ApiDocTableKind.php
│   │   └── ApiDocLocale.php
│   ├── Models/
│   │   ├── ApiDocCarrier.php
│   │   ├── ApiDocDecision.php
│   │   ├── ApiDocGroup.php
│   │   ├── ApiDocQuickstartStep.php
│   │   ├── ApiDocSection.php
│   │   ├── ApiDocSectionBlock.php
│   │   ├── ApiDocSectionNote.php
│   │   ├── ApiDocSectionParamRow.php
│   │   ├── ApiDocSectionPara.php
│   │   ├── ApiDocSetting.php
│   │   └── ApiDocUiString.php
│   ├── Livewire/
│   │   ├── ApiDocPage.php
│   │   └── ApiDocSearch.php
│   ├── Casts/
│   │   └── LocalizedString.php
│   ├── Services/
│   │   ├── ApiDocRenderer.php
│   │   ├── ApiDocSectionService.php
│   │   └── ApiDocCacheManager.php
│   ├── Filament/
│   │   ├── Pages/
│   │   │   └── ApiDocSettingsPage.php
│   │   └── Resources/
│   │       ├── ApiDocCarrierResource.php
│   │       ├── ApiDocDecisionResource.php
│   │       ├── ApiDocGroupResource.php
│   │       ├── ApiDocQuickstartResource.php
│   │       ├── ApiDocSectionResource.php
│   │       └── ApiDocUiStringResource.php
│   ├── Support/
│   │   └── api_doc_helper.php
│   └── Providers/
│       └── ApiDocServiceProvider.php
└── tests/
    ├── Feature/
    │   ├── Front/ApiDocPageTest.php
    │   ├── Admin/ApiDocSectionResourceTest.php
    │   └── Console/SeedFromHtmlCommandTest.php
    └── Unit/
        ├── ApiDocRendererTest.php
        ├── ApiDocSectionServiceTest.php
        └── Casts/LocalizedStringTest.php
\`\`\`

### 8.1 当前已落地文件

- 前台入口：\`gz168/ApiDoc/routes/front.php\` 与 \`gz168/ApiDoc/src/Livewire/ApiDocPage.php\`。
- 后台资源：\`src/Filament/Resources/ApiDoc*Resource.php\` 及各自的 \`Pages/\`、章节四个 \`RelationManagers/\`。
- 后台页面：\`src/Filament/Pages/ApiDocSettingsPage.php\` 与 \`src/Filament/Pages/ApiDocSnapshotPage.php\`。
- 快照服务：\`src/Services/ApiDocExporter.php\`、\`src/Services/ApiDocImporter.php\`；页面 Action 位于 \`src/Filament/Actions/\`。
- 授权复用：\`src/Support/ApiDocAuthorization.php\`；权限注册位于 \`database/seeders/ApiDocPermissionSeeder.php\`。
- 原始静态参考文件 \`html/api-doc-complete.html\` 不由本模块修改；重新灌数优先使用 \`gz168/ApiDoc/database/seeders/snapshots/api-data.json\`。

## 9. 数据迁移路线（一次性灌入）

阶段 1 可执行 \`php artisan api-doc:seed-from-html gz168/ApiDoc/database/seeders/snapshots/api-data.json --fresh\`，预期导入：

- 5 个分组（Commencer / Expédier / Suivre / Enlèvement / Réseau）
- 12 个章节（intro / oauth / errors / devis / bordereau / etiquette / detail / suivi / enlevement / annuler / relais / douane / adresses）
- ≈ 250 行参数表（来自 \`ACCOUNT\` + \`addr()\` + \`pickup()\` + \`relay()\` 复用展开）
- 18+ 代码块
- 8+ 告警 / 警告 / info
- 13 承运商
- 10 待决策
- 4 启动步骤
- 30+ UI 文案

灌完后 \`/api-doc\` 即可用；JS 数据文件仍可作为兼容输入，但优先使用 JSON 快照以避免旧版 Node 解析差异。

## 10. 安全与隐私

- 不在数据库里存任何 \`.env\` 密钥 / OAuth client_secret；模块不读 \`.env\`。
- 后台编辑页面只对受保护管理员 + 拥有 \`api-doc.update\` 权限的用户开放（服务端判断）。
- Filament 表单提交走标准 CSRF + Authorize 中间件，**不**依赖前端隐藏菜单。
- 数据库迁移不使用破坏性操作；新增列带默认值（避免破坏受保护管理员初始化流程）。
- 测试与种子使用脱敏示例 URL（\`https://example.com/qyfr\`），不写入真实 37 Express 业务地址。

## 11. 验证脚本

- PHP 语法：\`php -l\` 检查所有新增 \`src/Filament\`、\`src/Services\` 和 Seeder 文件。
- 格式化：\`vendor/bin/pint --dirty --format agent\`。
- 路由：\`php artisan route:list --path=api-doc --except-vendor\`，确认前台 3 个入口和 Filament 资源/页面入口。
- 权限：\`php artisan db:seed --class='Gz168\ApiDoc\Database\Seeders\ApiDocPermissionSeeder' --no-interaction --force\`。
- 缓存命中时可用 \`CACHE_STORE=file\`、\`SESSION_DRIVER=file\` 跑 Filament/Feature 测试；本机 Redis 不可用时不要硬编码 Redis 环境。
- 模块测试：\`php artisan test --compact --filter=ApiDoc\`，应覆盖渲染聚合、章节排序、双语回落、缓存失效、权限拦截、导入/导出和 seeder 幂等。
- 页面缓存：\`php artisan view:cache\`，用于捕获 Filament Blade 组件错误。
- 手工核对：
  1. \`php artisan app:initialize\`（不破坏受保护管理员），再执行权限 Seeder。
  2. \`php artisan api-doc:seed-from-html gz168/ApiDoc/database/seeders/snapshots/api-data.json\` → 访问 \`/api-doc?lang=fr\`、\`/api-doc?lang=zh\`、\`/api-doc?lang=both\`。
  3. 后台 \`/admin/api-doc-sections/{record}/edit\` 编辑任一章节或新增 RelationManager 子表 → 前台刷新可见 → 前台缓存已清空。
  4. 后台 \`/admin/api-doc-snapshot-page\` 导出 JSON，再分别以“覆盖 / 跳过 / 复制”模式导入 → 统计通知与数据库结果符合导入器约定。
  5. 使用无 \`api-doc.update\`、\`api-doc.export\`、\`api-doc.import\` 权限的账号访问对应入口 → 403/不可见。

## 12. 实施阶段

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| M1（本文） | 设计文档 + 模块骨架 + ServiceProvider | 文档与实际目录一致 |
| M2 | 11 张 migration + 11 个 model + 枚举 + LocalizedString cast + Factory | \`php artisan migrate\` 成功；模型测试覆盖双语回落 |
| M3 | \`SeedFromHtmlCommand\` + Service 层（Renderer / SectionService / CacheManager） | JSON 快照可幂等灌入；聚合渲染通过 |
| M4 | 前台 Blade / Tailwind / Alpine.js / Vite 入口 | \`/api-doc\` 正常；FR / ZH / both 切换正常 |
| M5 | Filament 后台 6 个 Resource + SettingsPage + SnapshotPage + LocalizedKeyValue | 后台编辑 → 前台即时刷新；章节四组子表可维护 |
| M6 | 权限注册 + 导入导出 + Pint + 文档收尾 | 权限 Seeder 可重复执行；JSON 快照三种模式可操作 |

## 13. 完成标准

- [x] 11 张 migration 在现有数据库中完成；数据模型和 Seeder 已落地。
- [x] \`SeedFromHtmlCommand\` 支持 JSON 输入，权限 Seeder 可重复执行。
- [x] 前台 \`/api-doc\` 路由和 FR / ZH / both 模式已注册。
- [x] 后台章节、六个资源、设置页、快照页和四个 RelationManager 可自动发现。
- [x] 后台权限由 \`api-doc.view/update/publish/export/import\` 控制，并同步 admin 角色。
- [x] 快照 JSON 支持下载、上传、覆盖/跳过/复制三种导入模式。
- [x] \`vendor/bin/pint --dirty --format agent\` 已通过。
- [ ] 补充 ApiDoc Feature/Unit 测试并达到目标覆盖率。
- [ ] 完成视觉截图差异与缓存性能基准记录。
- [x] 受保护超级管理员初始化流程未被本模块触碰或弱化。
