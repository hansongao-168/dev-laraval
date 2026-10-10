# gz168 前台体验三层架构 — 设计规格（总览）

> 状态：P1–P16 FE 已落地；P17–P49 导入摘要 + 下载分享图；Studio 全链路
> 范围：`gz168/FrontShell` + `gz168/FrontTemplate`（Theme + Contrib）+ `gz168/FrontPage`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-09-23-front-experience-architecture-design.md`  
> 参考：`gz168/FrontNav` Registrar；ApiDoc 冻结分区思想（无其后台）  
> 实现：须先有分模块 writing-plans；本文件是总图。

---

## 0. 已拍板摘要

| 决策 | 结论 |
| --- | --- |
| 产品形态 | A 页面搭建 + B 多端壳层/Slot 注入 + 模仿 C（ApiDoc 式模板思想） |
| 文档策略 | 先写完整三层总架构，实现计划再分期 |
| **后台 Admin** | **不考虑**：无 Filament Resource、无 Admin Panel、无 `/admin` 写路径 |
| 编辑者 | **开发**：改仓库模板 / Page Document / 主题日程；可选在 `apps/web` 做开发态可视化（非后台） |
| 客户端 | `apps/web` / `apps/miniapp` / `apps/mobile` 同一套 Page Schema + 各端适配层 |
| 存储 | **仓库为权威源**：皮肤、主题、页面、**模块贡献模板**均以文件为准 |
| **贡献源** | 除 FrontTemplate 核心外，**任意业务模块**（如 UserManagement）可在自身 `src/` 下贡献模板/皮肤碎片 |
| **跨模块调用格式** | **YAML**：模板声明对其他模块能力的调用一律写 YAML，禁止在模板里硬编码他模块 PHP 类名 |
| **节假日主题** | Theme 调度层按日期选中主题 → 映射到 Skin；例：国庆 / 元旦 / 圣诞节 |
| 模块切分 | **方案 2**：三模块分层（Shell → Template(+Theme+Contrib) → Page） |

---

## 1. 目标与非目标

### 1.1 目标

1. 建立可扩展的前台体验底座：业务模块通过契约注入能力，不反向依赖壳层。
2. 提供仿 ApiDoc **思想**的模板能力：冻结分区、仓库默认、可复制皮肤、可预览；**支持「只改模板、不动页面编排」**。
3. 页面编排以 **Page Document（仓库 YAML；API 可转 JSON）** 表达；开发可改文件，也可在前台应用内用开发态可视化编辑同一 Schema。
4. 三端消费同一 Document + Skin Manifest；差异只在适配层。
5. 与 `FrontNav` 正交：导航归 FrontNav，页面布局与区块归本体系。
6. **节假日主题**：按仓库日程（国庆、元旦、圣诞等）自动切换主题/皮肤，无需改每页 Document 的 slots。
7. **多模块贡献模板**：业务模块在自己的 `src/` 下放置模板资源，由 FrontTemplate 发现并聚合；模板通过 **YAML** 声明对其它模块能力的调用。

### 1.2 非目标（本总规格明确不做）

- **任何后台 Admin / Filament**：不含 Skin Resource、Page Resource、主题后台、Admin CRUD API。
- 本期不写生产代码、不建模块目录（仍仅文档）。
- 不合并或改造 `FrontNav` / `ApiDoc` 源码（可借鉴模式）。
- 不在第一期锁定拖拽库；若做可视化，编辑器必须读写同一 Page Schema，且挂在 **前台应用或本地工具**，不挂 Admin。
- 不在壳层实现商品/订单/支付业务逻辑。
- 不开放匿名用户写入模板 JS / 任意 script。
- 不把「运营在后台改 DB 覆盖」作为本规格路径（与「无 Admin」一致）。
- 结构扩展（新 part key / 新 slot）必须走仓库发版，不可运行时随意增删 key。
- 主题调度 **不**依赖外部日历 SaaS；节假日区间由仓库日程文件维护（可每年更新一次）。
- 第一期主题默认只切换 **Skin（外观）**；不强制切换整页 Document（可选「页面叠加」见 §6.6.6，默认关闭）。
- **FrontTemplate / FrontShell 不得 `use` 业务模块命名空间**；跨模块只通过 YAML 声明的 capability id + 已注册 Handler。
- 模板文件中 **禁止** 出现他模块的 PHP FQCN、内部路径或直接 HTTP 乱指；一律 YAML `call` / `provides`。

---

## 2. 模块边界与依赖

### 2.1 三模块职责

| 模块 | Composer | 别名 | 命名空间 | 职责 | 明确不负责 |
| --- | --- | --- | --- | --- | --- |
| **FrontShell** | `gz168/front-shell` | `front-shell` | `Gz168\FrontShell` | 壳层契约、Slot、BlockType、**Capability** 注册、可见性、调色板只读 API | 皮肤文件、页面 Document、Admin |
| **FrontTemplate** | `gz168/front-template` | `front-template` | `Gz168\FrontTemplate` | 皮肤/主题聚合、**模块 contrib 发现**、YAML 解析、Theme→Skin、跨模块 `call` 路由 | 业务查询实现、Admin、页面 Block 树权威（在 Page） |
| **FrontPage** | `gz168/front-page` | `front-page` | `Gz168\FrontPage` | 页面 Document（YAML）仓库、解析、只读前台 API | Mall 领域规则；Admin CRUD |

业务场景 = FrontPage 消费者 + 业务模块向 Shell 注册 Block/Capability + **在 `src/FrontTemplates/` 贡献 YAML 模板**。

### 2.2 依赖方向（单向，无环）

```
apps/web · apps/miniapp · apps/mobile
        │  HTTP/JSON（响应）；仓库源文件以 YAML 为主
        ▼
   FrontPage  ──►  FrontTemplate  ──►  FrontShell  ──►  gz168/common
        ▲                ▲                 ▲
        │                │ 扫描 contrib.yaml
        │                │                 │ register(BlockType|Capability)
   UserManagement / Mall* / Customer / … ──┘
        │
        └──► FrontNav（可选；不合并）
```

规则：

- `FrontShell` / `FrontTemplate` **不得** `use` 业务模块命名空间。
- 业务模块可依赖两者的 **Contracts**（Registrar、CapabilityHandler）。
- 模板引用他模块：只写 YAML `call`（§6.8），由 CallRouter 按 `module` + `capability` 分发。
- Host：Composer 引入与配置；不挂 Filament 本体系资源。

### 2.3 与现有模块关系

| 现有模块 | 关系 |
| --- | --- |
| `FrontNav` | 并行；Registrar 发现模式可对齐。 |
| `UserManagement` 等 | 在 `src/FrontTemplates/` 贡献皮肤/part/YAML provides 与 call。 |
| `ApiDoc` | 只借鉴冻结分区思想。 |
| `MallContent` | 可作 Block / capability 数据源。 |
| `Filament` / Admin | **范围外**。 |

### 2.4 包内目录约定

**FrontTemplate 核心：**

```
gz168/FrontTemplate/resources/
├── skins/…                 ← 内置皮肤（manifest.yaml）
└── themes/…                ← 主题 + schedule.yaml
```

**业务模块贡献（示例 UserManagement，模板在 src 下）：**

```
gz168/UserManagement/src/FrontTemplates/
├── contrib.yaml                 ← 贡献清单（必填）
├── skins/
│   └── user-profile/
│       ├── manifest.yaml
│       ├── tokens.yaml
│       └── parts/
│           └── chrome.header.yaml
├── parts/                       ← 可被他皮引用的共享 part
│   └── account.badge.yaml
└── calls/                       ← 可复用的 call 片段（可选）
    └── load-profile.yaml
```

- 默认贡献根：`src/FrontTemplates/`（模块 config 可覆盖路径，默认固定便于发现）。  
- **仓库权威格式：YAML**；运行时 API 可序列化为 JSON。  
- FrontTemplate 启动扫描各模块 `contrib.yaml`（或 Registrar 注册路径），合并索引；**同名 skin/theme code 冲突则启动失败**（或按 priority，见 §6.8）。  
- 本体系包 **不含** `src/Filament/`。跨模块只依赖 Contracts。

---

## 3. 架构总览（详细）

### 3.1 一句话

**Shell 定坑；Template 聚合核心与各业务模块 `src/FrontTemplates` 的 YAML 模板，并按节假日 Theme 选皮；Page 定往坑里放哪些块；跨模块只用 YAML call。不设 Admin。**

### 3.2 运行时分层

```
┌──────────────────────────────────────────────────────────────────┐
│  端适配层 apps/web · miniapp · mobile                             │
└───────────────────────────────┬──────────────────────────────────┘
                                │ GET（JSON 响应）
┌───────────────────────────────▼──────────────────────────────────┐
│  FrontPage：加载页面 YAML → effectiveSkin → 校验                  │
└───────────────────────────────┬──────────────────────────────────┘
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│  FrontTemplate            │   │  FrontShell                   │
│  合并核心 + 各模块 contrib│   │  BlockType / Capability       │
│  YAML → Manifest          │   │  Registrar                    │
│  resolveTheme / Skin      │   │                               │
│  CallRouter(YAML call)    │   │                               │
└───────────▲───────────────┘   └───────────────▲───────────────┘
            │  contrib.yaml                     │ register
   UserManagement/src/FrontTemplates/ … ────────┘
```
**Theme vs Skin：**

| 概念 | 是什么 | 例子 |
| --- | --- | --- |
| **Skin** | 一套完整外观资源（parts/tokens/css/js） | `classic`、`national-day-2026` |
| **Theme** | 有名字的「活动/节日包装」，**指向**一个 `skinCode`，并可挂日程 | `national-day`、`new-year`、`christmas` |

一个 Theme 通常对应一个 Skin 目录（档②复制皮肤）；日程只决定「现在启用哪个 Theme」，不改 Page 的 slots。

### 3.3 两套「位置」

| | **模板分区 `part`** | **壳层插槽 `slot`** |
| --- | --- | --- |
| 模块 | FrontTemplate | FrontShell（结构）+ FrontPage（填充） |
| 定义者 | 开发：皮肤 `manifest` 冻结清单 | 开发：`ShellDefinition.slots` |
| 改内容 | 开发改仓库 `parts/*`（或开发态工具写回文件/导出） | 开发改 Page Document 的 slots |
| 「只改模板」 | **只动这个** | **不动** |
| 例子 | `chrome.header`、`chrome.footer` | `header` / `main` / `footer` |

```
┌─ Skin（仓库 resources/skins/{code}）──────────────────────────┐
│  part: chrome.header     ← 只改模板改这里                      │
│  ┌─ slots（仓库 pages/{slug}.json）─────────────────────────┐ │
│  │  main → [ banner, product-grid ]  ← 改页面编排改这里      │ │
│  └──────────────────────────────────────────────────────────┘ │
│  part: chrome.footer / tokens / css / js                       │
└────────────────────────────────────────────────────────────────┘
```

- part ≠ slot：新业务拖放区必须新增 Shell slot + 端布局；仅新壳文案则只加 part。

### 3.4 四种变更路径（无 Admin）

| 意图 | 改什么 | 怎么改 | 影响面 |
| --- | --- | --- | --- |
| **只改模板/皮肤** | 核心 `resources/skins/` 或某模块 `src/FrontTemplates/skins/` | IDE | 被 Theme/页面引用该 skin 的外观 |
| **只改节假日主题** | `resources/themes/*.yaml` + `schedule.yaml` | 改日程或 theme→skin | 到点换皮；不动 pages slots |
| **只改页面编排** | `FrontPage/resources/pages/*.yaml` | IDE / 开发态可视化 | 该 slug |
| **模块贡献新模板** | 业务模块 `src/FrontTemplates/contrib.yaml` + 资源 | 发版；注册 Capability | 全局可发现新皮/part/call |
| **扩展能力** | 新 BlockType / Capability / slot / part key | 代码 + YAML 发版 | 结构变大 |

### 3.5 端到端读路径（含主题）

```
1. Client: GET /api/v1/front-pages/{slug}?channel=web
           可选调试：?theme=christmas 或 ?skin=classic（仅非生产或带预览门闸）
2. FrontPage: 加载仓库 Document（channel 精确优先于 all）
3. FrontPage + FrontTemplate: resolveEffectiveSkin(document, now, query)
      优先级见 §6.7
4. FrontShell: 校验 block.type 与 slot 约束
5. FrontTemplate: resolveSkin(effectiveSkinCode)
6. Response: {
     document,
     theme: { code, label, skinCode } | null,
     skin: SkinManifest,
     resolvedAt, etag
   }
7. Client: 渲染；Block 自拉业务 API
```

### 3.6 写路径（开发侧，非 Admin）

| 路径 | 入口 | 说明 |
| --- | --- | --- |
| 改皮肤 | 核心 skins 或 `模块/src/FrontTemplates/skins/` | Git；YAML |
| 改主题/日程 | `FrontTemplate/resources/themes/` | `schedule.yaml` |
| 改页面 | `FrontPage/resources/pages/*.yaml` | Git |
| 模块贡献 | 模块内 `contrib.yaml` + provides/call | 须注册 Capability Handler |
| 开发态可视化 | 可选 `apps/web` | 预览 `theme=`；导出 YAML |

本规格 **不**定义登录后台保存到 DB 的写 API。

---

## 4. 统一 Page Schema 与三端适配

### 4.1 核心概念

| 概念 | 说明 |
| --- | --- |
| **Shell** | 根布局；定义 slot 列表与端适用性 |
| **Slot** | 命名插槽；限制 cardinality / 允许的 BlockType |
| **BlockType** | 可注册区块类型 |
| **Block Instance** | `id` + `type` + `props` + 可选 `dataSource` |
| **Skin** | 冻结 parts + tokens + css + 可选 js（外观资源包） |
| **Theme** | 节日/活动包装：元数据 + 指向 `skinCode`；由日程激活 |
| **Theme Schedule** | 仓库日程：日期区间 → themeCode（可重叠时比 priority） |
| **Page Document** | 某页编排 JSON（仓库权威） |
| **Skin Manifest** | resolve 后的只读皮肤视图 |

### 4.2 Page Document（示意）

```json
{
  "schemaVersion": 1,
  "page": {
    "slug": "home",
    "channel": "all",
    "title": { "zh_CN": "首页", "en": "Home" },
    "shellKey": "storefront.main",
    "defaultSkinCode": "classic",
    "themePolicy": "follow_schedule",
    "lockedThemeCode": null,
    "lockedSkinCode": null
  },
  "shell": {
    "key": "storefront.main",
    "slots": {
      "header": [
        { "id": "b1", "type": "shell.nav-bar", "props": { "navLocation": "header" } }
      ],
      "main": [
        { "id": "b2", "type": "mall.banner-carousel", "props": { "source": "mall_banners:home" } },
        { "id": "b3", "type": "mall.product-grid", "props": { "limit": 8, "collection": "hot" } }
      ],
      "footer": [
        { "id": "b4", "type": "content.rich-text", "props": { "partKey": "chrome.footer" } }
      ]
    }
  },
  "meta": { "seo": { "title": "…", "description": "…" } }
}
```

`page` 主题相关字段：

| 字段 | 说明 |
| --- | --- |
| `defaultSkinCode` | 无命中主题时使用的皮肤（原 `skinCode` 语义） |
| `themePolicy` | `follow_schedule`（默认）\| `ignore_schedule`\| `force_locked` |
| `lockedThemeCode` | `force_locked` 时固定主题（如活动落地页常年圣诞皮） |
| `lockedSkinCode` | 直接锁皮肤，跳过 Theme（优先级见 §6.7） |

兼容：若旧字段仅有 `skinCode`，视为 `defaultSkinCode`。

约束：`schemaVersion` 必填；`type` 须已注册；Document 不内嵌大列表；`dataSource` 仅白名单 key。

### 4.3 仓库页面布局（示意）

```
gz168/FrontPage/resources/pages/
├── home.all.yaml
├── home.web.yaml
└── campaign/
    └── 2026-spring.all.yaml
```

页面文件为 YAML；§4.2 的 JSON 形状表示 **API 响应 / 逻辑模型**（与 YAML 同构）。
### 4.4 Skin Manifest（示意）

```json
{
  "code": "classic",
  "tokens": { "color.primary": "#0F766E" },
  "parts": {
    "chrome.header": { "source": "repo", "value": {} },
    "chrome.footer": { "source": "repo", "value": {} }
  },
  "css": { "source": "repo", "text": "…" },
  "js": { "source": "repo", "text": null },
  "compatibleShellKeys": ["storefront.main"]
}
```

无 Admin 时 `source` 恒为 `repo`（若将来有非 Admin 写路径再扩展，不在本规格）。

### 4.5 三端适配

| 端 | 职责 |
| --- | --- |
| Web | React 映射；可跑 skin.js；可选开发态可视化 |
| Miniapp | Taro 映射；建议忽略 js |
| Mobile | RN 映射；建议忽略 js |

可选 `packages/front-schema` 与后端夹具同源。

---

## 5. FrontShell —— 壳层与注入

### 5.1 职责

回答：有哪些 shell/slot、允许哪些 BlockType、访客是否可见、调色板有哪些 type（供前台开发态编辑器）。

### 5.2 Contracts（示意）

`ShellDefinition`、`SlotDefinition`、`BlockTypeDefinition`、`ShellRegistrar`、`BlockTypeRegistrar`、Registry、`VisibilityChecker`。

业务在 `ServiceProvider::boot` 注册，对齐 FrontNav Registrar。

### 5.3 示例 Shell：`storefront.main`

| Slot | Cardinality | 允许类型（示例） |
| --- | --- | --- |
| `header` | many | `shell.nav-bar`、`shell.announcement` |
| `main` | many | `mall.*`、`content.*` |
| `footer` | many | `content.*`、`shell.link-row` |
| `floating` | many | `shell.fab`、`campaign.*` |

### 5.4 注入

1. 业务注册 BlockType（不自动写入页面文件）。  
2. 开发把 type 写进 Page Document（或开发态可视化写入后再导出回仓库）。  
3. 只读 API：`GET /api/v1/front-shell/block-types`（给编辑器调色板）。

### 5.5 FrontNav

`shell.nav-bar` 调 FrontNav API；Shell 不存菜单。

---

## 6. FrontTemplate —— 只改模板 / 定义位置 / 扩展

### 6.1 借鉴 ApiDoc 的思想（不含其后台）

| 思想 | 本体系 |
| --- | --- |
| 冻结 part key | `manifest.json` 冻结清单 |
| 仓库默认文件 | `resources/skins/{code}/parts/…` |
| 复制皮肤 | CLI 或 Copier 类复制目录 |
| 危险 JS | 仅出现在仓库 `skin.js`；由代码评审约束（无超管后台门闸） |

### 6.2 仓库皮肤目录

```
gz168/FrontTemplate/resources/skins/classic/
├── manifest.yaml
├── tokens.yaml
├── skin.css
├── skin.js                 ← 可选；建议仅 Web 使用
└── parts/
    ├── chrome.header.yaml
    ├── chrome.footer.yaml
    ├── seo.default.yaml
    └── empty.main.yaml
```

#### `manifest.yaml`（示意）

```yaml
code: classic
schemaVersion: 1
label: 经典
compatibleShellKeys:
  - storefront.main
parts:
  - key: chrome.header
    label: 顶栏壳
    valueType: json
  - key: chrome.footer
    label: 底栏壳
    valueType: json
  - key: seo.default
    label: 默认 SEO
    valueType: json
  - key: empty.main
    label: 主区空态
    valueType: json
```

规则：

- part key **冻结**；增删 key = 发版。  
- `valueType`：`json`（推荐）或 `html`（须消毒策略，主要 Web）。  
- `compatibleShellKeys`：页面 `shellKey` 必须命中。

### 6.3 `resolveSkin`（仓库版）

```
输入: code
1. 读 resources/skins/{code}/manifest.json；不存在 → 回退默认 code（config）或 fail-fast
2. 对每个 part key: 读 parts/{key}.json|.html
3. 读 tokens.json、skin.css、可选 skin.js
4. 返回 SkinManifest（source=repo）
```

本规格 **不**做 DB∪仓库合并层（那是 Admin 覆盖模型；已排除）。

### 6.4 「只改模板」工作流

```
开发
  → 编辑 …/skins/{code} 下 YAML parts|tokens|css|js（核心或模块 src/FrontTemplates）
  → 提交 Git
  → resolveSkin 刷新
  → pages/*.yaml 的 slots 不变
```

验收：未改 pages；未改 Shell Registrar；仅皮肤/贡献目录变更。

### 6.5 拓展模板三档

#### 档① — 只改内容

改已有 part/css/tokens/js（YAML）。无结构变更。

#### 档② — 新皮肤、同结构

1. 复制皮肤目录（核心或模块下），改 `manifest.yaml` 的 code。  
2. 改视觉 YAML/CSS。  
3. 页面 YAML 仅改 `defaultSkinCode`，或由 Theme 指向新皮。

#### 档③ — 扩展结构 / 跨模块

| 目标 | 做法 |
| --- | --- |
| 多一块壳文案 | manifest + part YAML |
| 新可编排坑 | Shell 新 slot + 端布局 |
| 新业务块 | 注册 BlockType + 端组件 |
| **他模块数据进模板** | 对方 `provides.capabilities` + 本处 YAML `call`（§6.8） |
### 6.6 节假日主题（Theme）——定义、日程与解析

#### 6.6.1 仓库布局

```
gz168/FrontTemplate/resources/
├── skins/
│   ├── classic/
│   ├── national-day/          ← 国庆皮肤（档②从 classic 复制后改视觉）
│   ├── new-year/              ← 元旦
│   └── christmas/             ← 圣诞
├── themes/
│   ├── national-day.yaml
│   ├── new-year.yaml
│   ├── christmas.yaml
│   └── schedule.yaml          ← 激活日程（权威）
```

#### 6.6.2 Theme 定义文件（示意）

`themes/national-day.yaml`：

```yaml
code: national-day
label:
  zh_CN: 国庆
  en: National Day
skinCode: national-day
enabled: true
channels: [all]
notes: 红金配色；顶栏标语在 skin parts 内
```

`themes/new-year.yaml` → `skinCode: new-year`  
`themes/christmas.yaml` → `skinCode: christmas`

规则：`skinCode` 必须存在对应皮肤目录（核心或某模块 contrib）；`channels` 含 `all` 或具体端；`enabled: false` 永不被日程选中。

#### 6.6.3 日程 `schedule.yaml`（示意）

```yaml
schemaVersion: 1
timezone: Asia/Shanghai
defaultThemeCode: null
rules:
  - id: national-day-2026
    themeCode: national-day
    start: "2026-10-01T00:00:00"
    end: "2026-10-07T23:59:59"
    priority: 100
    channels: [all]
  - id: christmas-2026
    themeCode: christmas
    start: "2026-12-20T00:00:00"
    end: "2026-12-26T23:59:59"
    priority: 100
    channels: [all]
  - id: new-year-2027
    themeCode: new-year
    start: "2026-12-31T00:00:00"
    end: "2027-01-03T23:59:59"
    priority: 110
    channels: [all]
```
日程规则：

- 时刻按 `timezone` 解释（默认 `Asia/Shanghai`）。  
- 区间为闭区间：`start ≤ now ≤ end`。  
- 多条同时命中：取 **priority 更大**；再相同则取 `start` 更晚；再相同则稳定按 `id` 字典序。  
- 上例元旦与圣诞在 12/31–1/1 可能重叠，用更高 priority 让元旦胜出。  
- `defaultThemeCode`：无任何 rule 命中时的全局主题；`null` 表示不套主题，走页面 `defaultSkinCode`。  
- **每年**由开发更新 `rules` 中的具体日期（或增加翌年条目）；不设 Admin 改期。

#### 6.6.4 `resolveEffectiveSkin` 优先级

从高到低：

1. **预览查询**（非生产或具备预览门闸）：`?skin=` > `?theme=`  
2. 页面 `lockedSkinCode`（非空）  
3. 页面 `themePolicy === force_locked` 且 `lockedThemeCode` → 该 theme 的 skin  
4. 页面 `themePolicy === ignore_schedule` → `defaultSkinCode`  
5. **日程命中**（且页面为 `follow_schedule`）→ 命中 theme 的 `skinCode`  
6. 日程 `defaultThemeCode`（若配置）  
7. 页面 `defaultSkinCode`  
8. 模块 config 全局默认皮肤（如 `classic`）

响应中附带 `theme` 对象便于端上埋点/角标；未走主题时 `theme: null`。

#### 6.6.5 只改节假日主题（不动页面编排）

```
开发
  → 复制 skins/classic → skins/christmas，改 tokens/parts（档②）
  → 新增 themes/christmas.json 指向该 skin
  → 在 schedule.json 增加当年圣诞区间
  → Git 合并
  → 到点后所有 themePolicy=follow_schedule 的页面自动换皮
  → pages/*/slots 不变
```

国庆、元旦同理。活动落地页若要「永远圣诞皮」：该页设 `themePolicy: force_locked` + `lockedThemeCode: "christmas"`。

#### 6.6.6 可选：主题页面叠加

若某节日除换皮外还要临时多一个主区 Banner / Announcement Block：

- Theme YAML：`pageOverlays.{slug}.{slot}.prepend|append = [ block… ]`。  
- Resolve 时在 call enrich **之前**合并；叠加块会带 `props.themeOverlay` / `themeCode`。  
- 开关：`FRONT_TEMPLATE_PAGE_OVERLAYS`（默认 true）。  
- 已落地样例：`christmas` / `national-day` 主题对 `home.main` 的 announcement 叠加。

#### 6.6.7 缓存

- 解析结果可按 `date(timezone)` + slug + channel 缓存；跨日或 `schedule.json` / skin 变更时失效。  
- ETag 建议包含 `effectiveSkinCode` + `themeCode` + document hash。

### 6.7 模块内拓扑（无 Filament）

```
Gz168\FrontTemplate
├── Contracts（SkinResolver、ThemeResolver、ContribRegistry、CallRouter、…）
├── Application
│   ├── ResolveSkinAction / ResolveThemeAction / ResolveEffectiveSkinAction
│   ├── DiscoverModuleContribsAction
│   ├── ExecuteTemplateCallAction
│   └── CopySkinAction
├── Infrastructure
│   ├── YamlDocumentLoader
│   ├── RepoSkinFilesystem（核心 + 模块路径）
│   ├── RepoThemeSchedule
│   └── ModuleContribScanner
├── Console（copy-skin、themes、contrib:list）
├── Http（只读 GET）
└── resources/skins/…  resources/themes/…
```

### 6.8 多模块贡献模板 + YAML 跨模块调用

#### 6.8.1 为何要放在业务模块 `src/` 下

- 用户相关壳/卡片跟 `UserManagement` 一起演进，避免全塞进 FrontTemplate。  
- 对齐 FrontNav：业务模块自带资源，核心只聚合。  
- 依赖单向：业务模块实现 CapabilityHandler 并注册；Template 只认 YAML 里的 id。

#### 6.8.2 `contrib.yaml`（UserManagement 示例）

路径：`gz168/UserManagement/src/FrontTemplates/contrib.yaml`

```yaml
schemaVersion: 1
module: user-management          # 与 module.json alias 一致
priority: 100                    # 同 code 冲突时：更大优先；仍建议 code 全局唯一
provides:
  skins:
    - code: user-profile
      path: skins/user-profile
  parts:
    - key: account.badge
      path: parts/account.badge.yaml
  capabilities:                  # 本模块可被 YAML call 调用的能力
    - id: user.profile.summary
      description: 当前登录用户摘要（头像、昵称、等级）
    - id: user.profile.security-flags
      description: 是否已绑手机/邮箱等标志位
calls:                           # 本模块模板会发起的 call（文档/校验用）
  - id: load-profile
    file: calls/load-profile.yaml
```

ServiceProvider 中（示意）：

1. 注册 `TemplateContribPath` → `src/FrontTemplates`；或实现 `TemplateContribRegistrar`。  
2. 绑定 CapabilityHandler：`user.profile.summary` → 本模块类（仅在本模块内 `use` 自己的 Model）。

#### 6.8.3 模板内调用其他模块 —— 必须用 YAML

**禁止**在 part/页面里写 PHP 类名。统一 `call` 节点：

`UserManagement/src/FrontTemplates/parts/account.badge.yaml`：

```yaml
key: account.badge
valueType: structured
# 渲染前由 CallRouter 执行 calls，结果注入 context
calls:
  - id: profile
    module: user-management
    capability: user.profile.summary
    args:
      fields: [avatar, displayName, level]
    onError: omit          # omit | empty | fail
content:
  type: badge
  bindings:
    title: "{{ profile.displayName }}"
    subtitle: "{{ profile.level }}"
    avatar: "{{ profile.avatar }}"
```

核心皮肤引用用户模块 part / call：

`FrontTemplate/resources/skins/classic/parts/chrome.header.yaml`：

```yaml
key: chrome.header
valueType: structured
imports:
  - module: user-management
    part: account.badge
    as: accountBadge
calls:
  - id: nav
    module: front-nav          # 若 FrontNav 暴露 capability；或页面用 Block shell.nav-bar
    capability: nav.header-items
    args:
      location: header
    onError: empty
content:
  logoToken: color.primary
  slotsHint: header
  embed:
    - ref: accountBadge
```

页面 Document 中的 Block 也可带 YAML call（与 `dataSource` 等价、更明确）：

```yaml
# pages/home.all.yaml 片段
shell:
  slots:
    main:
      - id: b-user
        type: user.profile-card
        call:
          module: user-management
          capability: user.profile.summary
          args: {}
```

#### 6.8.4 Call 路由语义

```
YAML call { module, capability, args }
  → FrontTemplate\CallRouter
  → FrontShell CapabilityRegistry 查找 Handler
  → Handler->handle(args, visitor): array|DTO
  → 写入模板 context[call.id]
```

| 规则 | 说明 |
| --- | --- |
| `module` | 必须等于某 contrib 的 `module` 或内置别名 |
| `capability` | 必须已 `provides.capabilities` 且有 Handler 绑定 |
| 未知 capability | `onError: fail` → 整页/该 part 失败；`omit`/`empty` → 降级 |
| 禁止 | YAML 中写 `class:`、`php:`、任意 URL（非白名单 source） |

#### 6.8.5 发现与冲突

1. 扫描 Composer 已安装的 gz168 包下 `src/FrontTemplates/contrib.yaml`。  
2. 合并 skins/parts/themes 索引；`code` / `part key` **默认全局唯一**。  
3. 若冲突：比较 `priority`，更高覆盖并 `Log::warning`；CI 可用 `--strict-contrib` 直接失败。  
4. `front-template:contrib:list` 列出所有贡献源，便于调试。

#### 6.8.6 与「只改模板」的关系

- 只改 **UserManagement** 下 YAML/皮肤 → 不必动 FrontTemplate 核心与 pages slots。  
- 只改 **日程** → 不必动各业务模块 contrib。  
- 跨模块接线变更 = 改 YAML `call`/`imports` + 确保对方 `provides` 仍存在（契约测试）。

---

## 7. FrontPage —— 页面 Document（无 Admin）

### 7.1 权威源

仓库 **YAML**（如 `resources/pages/home.all.yaml`）。可选：启动/CI 校验全部页面。API 响应转为 JSON。

### 7.2 与「只改模板 / 主题 / 模块贡献」

| 操作 | 是否改 pages YAML |
| --- | --- |
| 改皮肤 / 模块 FrontTemplates | 否 |
| 改 themes / schedule | 否 |
| 只改 `defaultSkinCode` / `themePolicy` | 是（仅页头） |
| 增删 main 内 Block / call | 是 |
### 7.3 可视化（可选，非 Admin）

- 挂在 `apps/web` 开发态路由（如仅 `APP_ENV=local` 或显式 feature flag）。  
- 读写同一 Page Document；调色板调 Shell 只读 API。  
- 保存策略二选一（实现期定）：导出下载 JSON 由开发提交仓库，或本地写入挂载目录（仅开发机）。  
- **不**提供生产环境匿名/运营写接口。

### 7.4 「发布」在无 Admin 下的含义

- 默认：**Git 合并即发布**（main/生产分支上的 JSON 即线上源）。  
- 不维护 `draft`/`published` 双列 DB 状态（除非将来另开规格且仍非 Filament Admin）。

---

## 8. 错误与安全

| 情况 | 行为 |
| --- | --- |
| 未知 BlockType | 解析/CI 失败；运行时可降级 unknown-block |
| 皮肤缺失 | 回退默认 skin 或 5xx |
| 主题指向缺失 skin | 打 error；回退 `defaultSkinCode` |
| 日程重叠未设 priority | 按 §6.6.3 平局规则；CI 可警告重叠 |
| part 文件缺失 | 该 part 空值 + 日志；可配置严格模式 |
| 某端不支持 Block | 跳过/占位 |
| 生产滥用 `?theme=` | 忽略或要求预览门闸；默认生产忽略强制预览参数 |
| 生产开启写接口 | **不允许**（本规格无写 API） |

安全：只读前台 API；仓库 JS 靠代码评审；`dataSource` 白名单；不泄露 `.env`。

---

## 9. API 草图（仅只读前台）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/front-shell/shells` | 壳与 slot（编辑器/调试） |
| GET | `/api/v1/front-shell/block-types` | 调色板 |
| GET | `/api/v1/front-templates/skins/{code}` | Skin Manifest |
| GET | `/api/v1/front-templates/themes` | 主题列表 |
| GET | `/api/v1/front-templates/themes/active` | 当前命中主题（可 `?at=`） |
| GET | `/api/v1/front-templates/contribs` | 已发现的模块贡献列表（调试） |
| GET | `/api/v1/front-pages/{slug}` | Document + theme + skin |

**不包含** `PUT`/`POST` admin 路径。

---

## 10. 测试策略

| 层级 | 重点 |
| --- | --- |
| Unit | Registry；YAML 加载；resolveSkin；日程；**contrib 发现**；**CallRouter**；effectiveSkin |
| Feature | 只读 API；模块 contrib 皮肤可被 resolve；call 成功/降级；改 UserManagement YAML 不影响 pages slots |
| Contract | Document/Manifest/Theme/Schedule/contrib/call 夹具 |
| 跨模块 | UserManagement 风格假 contrib + Handler → 模板 context 有数据 |

---

## 11. 分期路线图

| 阶段 | 内容 |
| --- | --- |
| **P0** | 本规格 | ✅ |
| **P1** | FrontShell：Contracts、Registry、只读 API | ✅ `gz168/FrontShell` |
| **P2** | FrontTemplate：YAML 皮肤、resolveSkin、copy CLI | ✅ |
| **P2.1** | Theme + schedule.yaml、resolveEffectiveSkin | ✅ |
| **P2.2** | Module contrib 扫描、`contrib.yaml`、CallRouter、Capability 注册 | ✅（含 UserManagement 样例） |
| **P3** | FrontPage：pages YAML、只读 GET、接主题与 call | ✅ |
| **P4** | 可选 web 开发态可视化 | ✅ `apps/web` `/dev/front-studio`（dev-only，Download JSON） |
| **P5** | 三端 blockRegistry | ✅ `@erp/front-experience` + web / miniapp / mobile registries |
| **P6** | 更多 Mall Blocks / 皮肤打磨 | ✅ `mall.banner-carousel` / `product-grid` / `category-nav` + 四皮肤 parts/CSS |
| **P7** | 生产预览门闸 + call/`{{ path }}` + front-schema | ✅ |
| **P8** | Mall Catalog call + schema 契约测试 | ✅ `mall.catalog.collection`；空库回退 skin parts |
| **P9** | Studio 本地写回 + `mall.banners.home` | ✅ PUT（非生产）；Banner capability |
| **P10** | Studio 块级编排 | ✅ 增删/上下移 + 实时预览 + dirty/写回 |
| **P11** | Studio HTML5 拖拽 | ✅ 同 slot / 跨 slot；↑↓ 仍保留 |
| **P12** | Studio 块 props 表单 | ✅ 选中编辑 + Raw JSON；写回仓库 |
| **P13** | Studio `call` 编辑 | ✅ capability / args / onError；可清除 |
| **P14** | JSON Schema 引擎 | ✅ `@erp/front-schema/validate`；写回前校验 page document |
| **P15** | Mall ops Banner 源 | ✅ `BannerLookupContract` + `mall_banners`；YAML 空库回退 |
| **P16** | 三端 Banner 图/链 | ✅ web / miniapp / mobile 渲染 `imageUrl` + `href` |
| **P17** | MallContent Banner 运营后台 | ✅ Filament `MallBannerResource`（独立于 FE；权限门闸） |
| **P18** | 文章/FAQ + Banner 图上传 | ✅ `MallArticle`/`MallFaq` Resource；上传走 `MediaStorageContract` |
| **P19** | 前台文章/FAQ + 权限种子 | ✅ `mall.article-list`/`mall.faq-list` + call；`MallContentPermissionSeeder` |
| **P20** | 文章详情 / FAQ 搜索 / Studio 预置 | ✅ `article`/`help` 页；`{{ query.* }}`；block `defaultCall` |
| **P21** | 三端帮助路由 + 客户端 FAQ | ✅ web `/storefront/help|article`；miniapp/mobile 页；FAQ 即时请求 |
| **P22** | FAQ 防抖 / 文章分页 / SEO | ✅ 300ms 防抖；`page`+`hasMore`；help/article metadata |
| **P23** | 帮助中心分享卡片 | ✅ OG/Twitter meta；web Share；miniapp/mobile 分享 |
| **P24** | 无限滚动 + 分享图 | ✅ 文章/FAQ append；`faqPage`；`meta.seo.image` |
| **P25** | 主题页面叠加 | ✅ `pageOverlays`；christmas/national-day 样例；可配置关闭 |
| **P26** | 分享图 + Studio 叠加可视 | ✅ `/brand/*-share.*`；overlay 标记；写回剥离 |
| **P27** | Studio 编辑 theme overlays | ✅ PUT `…/themes/{code}/page-overlays`；Studio JSON 编辑器 |
| **P28** | 结构化 overlay 表单 | ✅ Form/JSON 双模式；slug/slot/position/type；round-trip 测试 |
| **P29** | overlay 拖拽 + PNG 分享图 | ✅ DnD/↑↓；`/brand/*-share.png` OG 卡片 |
| **P30** | overlay 跨 slug/slot 分组 | ✅ `groupOverlayRows`；Studio Form 分组头 |
| **P31** | 组内快速新增 | ✅ 每组 `Add here`（继承 slug/slot） |
| **P32** | 分享图多语言 + 空态占位 | ✅ `seo.images` locale 映射；Studio home/help/article 占位 |
| **P33** | 用户 locale + 自定义占位 | ✅ `resolveStorefrontLocale`；localStorage 占位列表 |
| **P34** | home OG + YAML 占位同步 | ✅ storefront home metadata；`overlayPlaceholders` 写回 |
| **P35** | 三端分享图 + 占位 diff | ✅ miniapp/mobile `seo.images`；Studio Use theme/Keep/Merge |
| **P36** | 分享图按钮 + 冲突记忆 | ✅ ShareButton `image`；按 themeCode 记忆冲突选择 |
| **P37** | 文件分享 + Forget choice | ✅ Web Share Level 2 files；Studio 忘记已存选择 |
| **P38** | 分享 toast + 选择导入导出 | ✅ aria-live 降级提示；choices JSON export/import |
| **P39** | 可关闭 toast + bundle 导出 | ✅ toast × 关闭；choices+placeholders 打包 |
| **P40** | overlays 草稿 + toast dwell | ✅ bundle 含 pageOverlays；`toastDwellMs` / env |
| **P41** | themeCode 提示 + dwell 预览 | ✅ 导入不匹配确认；Studio toast dwell 控件 |
| **P42** | 延迟 Apply + dwell env | ✅ 跳过 overlays 可稍后 Apply；`.env.example` dwell |
| **P43** | 延迟 merge + locale 预览 | ✅ Merge last import；Studio share locale 切换 |
| **P44** | page 预览 + 过期提示 | ✅ home/help/article slug；deferred age/stale |
| **P45** | stale 清理 + 缩略图 | ✅ 加载时 prune stale；Studio share 图预览 |
| **P46** | 拖放导入 + 图回退 | ✅ bundle drop zone；broken-image fallback |
| **P47** | 粘贴 JSON + 复制 URL | ✅ paste textarea 导入；Copy image URL |
| **P48** | 导出剪贴板 + 开图 | ✅ Copy bundle JSON；Open image 新标签 |
| **P49** | 导入摘要 + 下图 | ✅ summarizeStudioBundleImport；Download image |

---

## 12. 开放问题（已决）

1. 开发态可视化保存：**Download JSON** + **Write to repo**（local/testing PUT）；生产 404。  
2. `packages/front-schema`：**已建** 夹具 + 零依赖 validate 引擎；写回走同一 schema。  
3. 多环境皮肤差异：**Git 分支 / 目录覆盖**；无 DB。  
4. `js`：**仅 Web**；miniapp/mobile 忽略。  
5. 主题按 `channel` 分日程：**已支持** `rules.channels`（默认 all）。  
6. 主题页面叠加：**已支持** `pageOverlays.{slug}.{slot}.{prepend|append}`；可用 `FRONT_TEMPLATE_PAGE_OVERLAYS=false` 关闭。  
7. contrib `code` 冲突：开发 **warning**；`FRONT_TEMPLATE_STRICT_CONTRIB=true` 时 **CI strict**。  
8. YAML 绑定：仅简单 **`{{ path }}`**（`SimpleBindingResolver`）。

---

## 13. 规格自检

| 检查项 | 结果 |
| --- | --- |
| 排除 Admin/Filament | 是 |
| part vs slot | 是 |
| 节假日主题 | §6.6 |
| 多模块 src 贡献 | §2.4、§6.8 |
| 跨模块 YAML call | §6.8.3–6.8.4（P7 已接入 resolve） |
| 权威源在仓库 YAML | 是 |
| 生产忽略 `?theme=`/`?skin=`/`?at=` | 是 |

---

## 14. 下一步

1. 提交并推送 Front Experience + Mall Content（P1–P49）。  
2. （可选）暂停增量 Studio 打磨；优先提交推送或回归全站测试。
