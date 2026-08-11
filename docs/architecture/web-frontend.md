# Web 前端架构（PC / 手机 / 平板）

> 适用范围：`apps/web`（Next.js 16，单工程覆盖 PC / 手机 / 平板 Web）。
> 与 `apps/mobile`（Expo 原生 App）、`apps/miniapp`（Taro 微信小程序）解耦，仅共享 `packages/api-client` 等契约层。

## 设计目标

- 一个 Web 工程同时覆盖桌面、平板、手机三端，UI 差异由 Shell + 设备类驱动，不拆多工程。
- 真正做到模块化、低耦合、高内聚、单向依赖，由 npm workspaces + 包边界 ESLint 强制。
- "页面长什么样"与"我能跳到哪"两件事正交，分别由 layout 分层和声明式导航承担。
- 业务模块（`modules/*`）不知道 layout 长什么样；壳工程（`apps/web`）不写业务实现。
- 与现有 Laravel 后端（`/api/v1/*`）通过 Sanctum SPA Cookie 模式对接。

---

## 1. npm workspaces 顶层结构

根 `package.json` 启用 workspaces，把 monorepo 升级为多包仓库：

```jsonc
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "modules/*"
  ]
}
```

### 目录树

```
dev-laraval/
├─ apps/                              # 仅承载可独立运行的"应用"
│  ├─ web/                            # 壳工程：路由装配、布局、Provider 注入
│  │  ├─ src/
│  │  │  ├─ app/                      # App Router 入口（不再放业务实现）
│  │  │  │  ├─ (auth)/
│  │  │  │  ├─ (desktop)/
│  │  │  │  ├─ (tablet)/
│  │  │  │  ├─ (mobile)/
│  │  │  │  ├─ layout.tsx             # L0 RootLayout
│  │  │  │  └─ page.tsx               # 设备探测 → redirect
│  │  │  └─ bootstrap/                # 全局初始化
│  │  ├─ next.config.ts
│  │  ├─ tailwind.config.ts
│  │  └─ package.json                 # name: "@erp/web"
│  ├─ mobile/                         # Expo（维持现状，仅消费 packages）
│  └─ miniapp/                        # Taro（维持现状，仅消费 packages）
│
├─ packages/                          # 共享库（不依赖任何 apps/* 或 modules/*）
│  ├─ api-client/                     # @erp/api-client — HTTP/CSRF/DTO
│  ├─ config/                         # @erp/config — env、路由表、NavRegistry
│  ├─ ui/                             # @erp/ui — 设计系统、Shell、Frame、原子组件
│  ├─ devices/                        # @erp/devices — 设备类 Hook/Provider
│  ├─ i18n/                           # @erp/i18n — 字典与 hook（可选）
│  ├─ eslint-config/                  # @erp/eslint-config — lint 规则
│  └─ tsconfig/                       # @erp/tsconfig — 共享 tsconfig 继承
│
└─ modules/                           # 业务模块（垂直切片，可独立打包）
   ├─ auth/                           # @erp/module-auth
   ├─ users/                          # @erp/module-users
   ├─ dashboard/                      # @erp/module-dashboard
   └─ _template/                      # 业务模块脚手架
```

### 三类包的边界

- **app**：入口与装配，**不允许承载业务实现**。
- **package**：无业务实现的库，可被 app 与 module 共同引用。
- **module**：带业务逻辑的垂直切片，只能被 app 引用。

### 依赖方向（强约束）

```
                ┌──────────────────┐
                │   apps/* (壳)    │   仅路由、layout、Provider
                └─────────┬────────┘
                          │
                ┌─────────▼────────┐
                │  modules/* (业务) │   一个业务一个包
                └─────────┬────────┘
                          │
        ┌─────────────────┼────────────────────┐
        │                 │                    │
   ┌────▼─────┐    ┌──────▼──────┐     ┌───────▼──────┐
   │  ui      │    │  devices    │     │  i18n        │
   └────┬─────┘    └──────┬──────┘     └───────┬──────┘
        │                 │                    │
        └─────────────────┼────────────────────┘
                          │
                ┌─────────▼────────┐
                │  api-client      │
                └─────────┬────────┘
                          │
                ┌─────────▼────────┐
                │  config          │
                └──────────────────┘
```

规则（ESLint 边界守卫）：

- `apps/*` 可依赖 `modules/*` 和 `packages/*`。
- `modules/*` 只能依赖 `packages/*`，**禁止横向依赖其他 `modules/*`**。
- `packages/{ui,devices,i18n}` 互不依赖，**仅**依赖 `api-client`、`config`。
- `packages/api-client` 仅依赖 `config`。
- `packages/config` 是叶子节点，零依赖。

---

## 2. 单个业务模块结构

```
modules/<name>/
├─ package.json                      # name: "@erp/module-<name>"
├─ tsconfig.json                     # 继承 @erp/tsconfig/web
├─ nav.ts                            # 声明式导航条目
├─ src/
│  ├─ index.ts                       # 唯一对外出口（public API）
│  ├─ server/                        # 仅在 RSC/Server Action 中使用
│  │  ├─ actions.ts                  # 'use server'
│  │  ├─ queries.ts                  # 服务端数据获取
│  │  └─ session.ts                  # 受保护数据访问
│  ├─ client/                        # 仅在 Client Component 中使用
│  │  ├─ hooks/
│  │  └─ stores/
│  ├─ views/                         # 业务视图（不感知端）
│  ├─ components/                    # 业务专属组件（跨 shell 共享）
│  ├─ types/                         # 业务类型
│  └─ schemas/                       # Zod schema（与 Laravel FormRequest 对齐）
└─ README.md
```

约束：

- `index.ts` 是唯一对外出口（ESLint `allowOnly` 规则强制）。
- `server/*` 与 `client/*` 物理隔离，禁止互相反向引用。
- `views/*` 纯函数式，可被 `(desktop)/(tablet)/(mobile)` 三个 layout 直接 re-export。

---

## 3. Layout 四层模型

页面渲染拆为四层，单向依赖、上层感知下层、下层不感知上层。

```
┌─────────────────────────────────────────────────────────────┐
│  L0  RootLayout          apps/web/src/app/layout.tsx        │
│      唯一接触 <html>/<body>；Provider 注入                  │
├─────────────────────────────────────────────────────────────┤
│  L1  ShellLayout         apps/web/src/app/{group}/layout   │
│      端级骨架：DesktopShell / TabletShell / MobileShell     │
├─────────────────────────────────────────────────────────────┤
│  L2  FrameLayout         由 Shell 内部按路由 frame 挂载     │
│      路由级骨架：ListFrame / DetailFrame / AuthFrame /      │
│                  WorkspaceFrame / EmptyFrame                │
├─────────────────────────────────────────────────────────────┤
│  L3  Page                apps/web/src/app/.../page.tsx       │
│      单行 re-export 自 modules/<m>/views/...                 │
└─────────────────────────────────────────────────────────────┘
```

### L0 RootLayout（仅一份）

`apps/web/src/app/layout.tsx` 升级为：

- 渲染 `<html>` 与 `<body>`，引入字体（`next/font`）、`globals.css`、设计 token。
- 注入 `Providers`：`<ErrorBoundary>` → `<ThemeProvider>` → `<DeviceProvider>` → `<SessionProvider>` → `<NavRegistryProvider>` → `<Shell>`。
- 全局 metadata、viewport、theme-color、robots。

禁止：调用任何业务 API、写导航、判断设备类。

### L1 ShellLayout（按端三份）

位置：

- `apps/web/src/app/(desktop)/layout.tsx` → `<DesktopShell>`
- `apps/web/src/app/(tablet)/layout.tsx` → `<TabletShell>`
- `apps/web/src/app/(mobile)/layout.tsx` → `<MobileShell>`

Shell 组件位于 `@erp/ui/shells/`：

```
packages/ui/src/shells/
├─ DesktopShell/
│  ├─ index.tsx                 # 组合：Sidebar + TopBar + <main>
│  ├─ Sidebar.tsx               # 二级导航
│  ├─ TopBar.tsx                # 全局搜索、用户菜单、主题
│  └─ SecondaryNav.tsx          # 一级导航
├─ TabletShell/
│  ├─ index.tsx                 # TopBar + 可折叠侧栏 + <main>
│  └─ Drawer.tsx
├─ MobileShell/
│  ├─ index.tsx                 # TopBar + 底部 TabBar + <main>
│  └─ TabBar.tsx
└─ shared/
   ├─ Brand.tsx
   ├─ UserMenu.tsx
   └─ GlobalSearch.tsx          # ⌘K 命令面板入口
```

三端差异仅体现在：导航位置、内容容器最大宽度、触屏/鼠标交互尺寸。

数据来源：`useNavRegistry()` → `@erp/config` 的 `routes.ts`（声明式）。

### L2 FrameLayout（按页面类型挂载）

位于 `@erp/ui/frames/`，由 Shell 根据当前路由的 `frame` 元数据动态挂载。

```
packages/ui/src/frames/
├─ ListFrame/                   # 列表/搜索/筛选
│  ├─ index.tsx                 # 标题 + 工具栏(主操作) + 筛选条 + 数据区 + 分页
│  └─ Toolbar.tsx
├─ DetailFrame/                 # 详情
│  ├─ index.tsx                 # 标题 + 返回 + 操作区 + Tabs + 主体
│  └─ ActionBar.tsx
├─ AuthFrame/                   # 登录/注册/找回
│  └─ index.tsx                 # 居中卡片
├─ WorkspaceFrame/              # 仪表盘/工作台
│  └─ index.tsx                 # 网格卡片区
├─ EmptyFrame/                  # 单页/错误/空状态
│  └─ index.tsx
└─ index.ts                     # 统一导出：getFrame(routeId)
```

挂载机制：Shell 内部 `useFrame()` → `getFrame(route.frame)` → 渲染对应 Frame。`route.frame` 在 `@erp/config/routes.ts` 声明，**不在 page.tsx 硬编码**。

### L3 Page（业务页，单行 re-export）

```ts
// apps/web/src/app/(desktop)/users/page.tsx
export { default, metadata, generateMetadata } from '@erp/module-users/views/UsersListView'
```

ESLint 规则：禁止超过 N 行（默认 5 行）业务实现，确保 page.tsx 仅做装配。

---

## 4. 设备类适配层

`packages/devices/src/`：

```
├─ DeviceProvider.tsx         # Context：deviceClass + viewport 监听
├─ useDeviceClass.ts          # 'mobile' | 'tablet' | 'desktop'
├─ useBreakpoint.ts           # 订阅 matchMedia
├─ useIsTouch.ts              # 触屏能力（影响交互元素尺寸）
├─ useOrientation.ts          # 横竖屏
└─ DeviceGate.tsx             # <DeviceGate allow={['desktop']}>...</DeviceGate>
```

- 设备类划分：`< 768px` mobile；`768~1279px` tablet；`≥ 1280px` desktop。
- `DeviceProvider` 在 `RootLayout` 注入，初始值由 SSR 注入的 `sec-ch-viewport-width` / UA 计算，避免闪烁。
- `useIsTouch()` 用于决定按钮尺寸、是否显示 hover 态、是否启用拖拽。
- Tailwind v4 `container-queries` 配合 `@container` 用于组件内部布局，**不**用于整页路由判断。

---

## 5. 导航：声明式路由表

### 路由表

位置：`@erp/config/src/routes.ts`

```ts
export type DeviceClass = 'mobile' | 'tablet' | 'desktop'
export type FrameId = 'list' | 'detail' | 'auth' | 'workspace' | 'empty'

export interface NavItem {
  id: string                       // 'users'
  labelKey: string                 // i18n key（可后置）
  path: string                     // '/users'
  icon?: string                    // lucide name
  frame: FrameId                   // 决定 L2 用哪个 Frame
  deviceVisibility?: DeviceClass[] // 默认全端可见
  requireAuth?: boolean            // 配合 SessionProvider
  permissions?: string[]           // 客户端只用来显隐，服务端仍需 Policy
  children?: NavItem[]             // 二级导航
  badge?: 'new' | 'beta' | number  // UI 装饰
  priority?: number                // 移动端 TabBar 排序，默认 100
}
```

### 单一事实源

Sidebar、TopBar、TabBar、Breadcrumb、⌘K 命令面板、移动端"更多"页 都从同一份 `NavItem[]` 派生。

业务模块在 `modules/<m>/nav.ts` 声明自己的条目，由 `@erp/config` 的 `aggregateNav()` 工具在 `apps/web` 启动时聚合。

### 三端派生规则

| 端 | 导航形态 | 渲染组件 | 限额 |
|---|---|---|---|
| Desktop | 左侧固定 Sidebar（可折叠为图标） + 顶栏 | `<DesktopSidebar>` 渲染一级 + 二级 | 一级 ≤ 8 |
| Tablet | 顶部 Tabs（一级） + 抽屉二级 | `<TabletTabs>` + `<Drawer>` | 一级 ≤ 5 |
| Mobile | 底部 TabBar（一级 ≤ 4）+ 顶栏汉堡触发"更多"抽屉 | `<MobileTabBar>` | 一级 ≤ 4 |
| 全端 | ⌘K 命令面板 | 横跨三端 | 全文搜索 nav + 业务实体 |

### 移动端"4 + 更多"算法

由 `NavItem.priority` 自动截断（默认 100，越大越靠前）：

- `primaryItems.length ≤ 4` → 全部进 TabBar。
- `primaryItems.length > 4` → 取 `priority` 最高的 4 个进 TabBar，其余进"更多"页。

### 命令面板（⌘K）

- 位置：`@erp/ui/command/`，基于 `cmdk` 实现。
- 数据源：`useNav().flatten()` + 模块自注册的"实体跳转"（订单号 → 详情等）。
- 移动端用底部 sheet 形式呈现，**同一个数据源**。

### `useNav()` 暴露能力

- `primaryItems`：一级
- `secondaryItems(parentId)`：二级
- `flatten()`：命令面板用
- `resolveActive(pathname)`：高亮当前项
- `visibleTo(deviceClass, session)`：过滤不可见项

---

## 6. 数据获取与状态

| 场景 | 机制 | 备注 |
|---|---|---|
| 首屏 SSR | Server Component + 服务端直调 `api-client` | 鉴权 cookie 通过 Next `cookies()` 透传 |
| 用户态数据 | Server Component `fetch` 内部缓存 | 配合 `revalidateTag` |
| 客户端交互 | React 19 `use()` + Server Action | 避免引入额外状态库 |
| 全局会话 | `useSession()` 读 Server Component 注入的 context | 减少 client auth 请求 |
| 复杂表单 | `react-hook-form` + Zod | 与 Laravel FormRequest 字段对齐 |
| 长列表 | `@tanstack/react-virtual`（仅 desktop/tablet） | 移动端优先分页 |

默认 **不引入** Redux/Zustand 等全局状态库；如确需，单独评审。

---

## 7. 鉴权：Sanctum SPA Cookie 模式

链路：

1. Laravel `EnsureFrontendRequestsAreStateful` 中间件对 `apps/web` 域名单放行。
2. 登录：`POST /api/v1/auth/login`（先 `GET /sanctum/csrf-cookie` 拿 XSRF），成功后 Set-Cookie `XSRF-TOKEN` + session cookie（`HttpOnly`, `SameSite=Lax`, `Secure`）。
3. 客户端拿到 `XSRF-TOKEN` 后，**所有写请求** 通过 `api-client` 注入 `X-XSRF-TOKEN` 头。
4. Server Component 通过 Next `cookies()` 读 session，调用 `api-client` 转发到 Laravel。
5. 登出：`POST /api/v1/auth/logout` + 清 cookie。

`api-client` 增强：

- 内部封装 `csrf()`，自动 `GET /sanctum/csrf-cookie`。
- 写方法自动加 `X-XSRF-TOKEN`（从 `document.cookie` 解码）。
- 浏览器环境与 Node SSR 环境走两套 cookie 源（SSR 走 `cookies()` 参数注入；浏览器读 `document.cookie`）。
- 统一错误：`401 -> redirect('/login?next=...')`，`419 -> 自动重取 CSRF 重放一次`，`422 -> 抛 ValidationError`。

禁止：

- 把 token 存 LocalStorage / SessionStorage。
- 在前端判断权限作为安全边界（遵循 `docs/AI_DEVELOPMENT.md` 第 5 条）。

---

## 8. 样式与设计系统

- Tailwind v4（已锁定），不引入组件库（MUI/Antd）。
- 设计 token 集中在 `packages/ui/src/styles/tokens.css`：`--color-*`、`--space-*`、`--radius-*`；Tailwind v4 `@theme` 引用。
- 字体：默认系统字体栈；中英文混排由 `font-sans` 控制。
- 暗色模式：基于 `prefers-color-scheme` + 用户偏好（Cookie 存 `theme`）。
- 图标：`lucide-react`，统一封装 `<Icon name="..." />`。

---

## 9. 性能与构建

- **SSR/SSG 划分**：
  - 营销/介绍类：`generateStaticParams` + ISR。
  - 后台（用户/订单/系统管理）：SSR + 短 revalidate（30~60s）。
  - 个人中心：SSR + `revalidate: 0`（按需）。
- **代码分割**：`next/dynamic` 仅对体积大的编辑器、图表延迟加载。
- **图片**：`next/image` + `deviceSizes`/`imageSizes` 覆盖 1x/2x/3x 与三端宽度。
- **构建产物**：根 `npm run build:all` 串好；Web 端 `next build`；`output: 'standalone'` 配合 Apache 部署。
- **Bundle 预算**：每个路由 first-load JS ≤ 200KB（gzip）。

---

## 10. 测试策略

| 层 | 工具 | 覆盖目标 |
|---|---|---|
| 单元 | Vitest + Testing Library | `packages/*` 内 `components/`、`hooks/`、`lib/` |
| 组件 | Storybook | 原子 + 复合组件视觉与交互 |
| 端到端 | Playwright | desktop + tablet + mobile 三个 viewport 跑关键路径 |
| 类型 | `tsc --noEmit` | 通过 `npm run check:web` 强制 |
| Lint | ESLint（next + 自定义） | 规则：禁 SSR 危险 API、禁 device 误用、限 page.tsx 行数 |

CI：`npm run check:clients` 已覆盖 lint + typecheck；后续接入 `npm run test:web`（vitest + playwright）。

---

## 11. 与原生 App / 小程序的关系

```
        ┌──────────────┐
        │ Laravel API  │  /api/v1/*  (Sanctum)
        └──────┬───────┘
               │
       ┌───────┴────────────────────────┐
       │                                │
┌──────▼──────┐  ┌──────────┐  ┌────────▼───────┐
│ apps/web    │  │ apps/    │  │ apps/miniapp  │
│ Next.js     │  │ mobile   │  │ Taro           │
│ (PC/手机/   │  │ Expo SDK │  │ (微信小程序)   │
│  平板)      │  │ 57       │  │                │
└──────┬──────┘  └────┬─────┘  └────────┬───────┘
       │              │                │
       └──────┬───────┴────────────────┘
              │
   ┌──────────▼──────────┐
   │ @erp/api-client      │  共享：HTTP、CSRF、DTO、Zod
   └─────────────────────┘
```

- Web 与原生 App **不共享代码**，只共享契约；UI 各自为政。
- 鉴权：Web 用 Sanctum Cookie；Expo 用 Sanctum Token（Bearer）；小程序用微信 code 换 session。`api-client` 通过 `createClient({ mode: 'web' | 'mobile' | 'mp' })` 切换实现。

---

## 12. workspace 协议与版本对齐

| 关系 | 写法 | 备注 |
|---|---|---|
| `apps/web` → `modules/auth` | `"@erp/module-auth": "workspace:*"` | 由 root 提升解析 |
| `modules/auth` → `packages/ui` | `"@erp/ui": "workspace:*"` | 同上 |
| `apps/*` → `packages/api-client` | `"@erp/api-client": "workspace:*"` | 替换原 `file:..` |
| `tsconfig` 继承 | `"extends": "@erp/tsconfig/web.json"` | 统一 strict |

根 `package.json` 脚本调整：

```jsonc
"build:web": "npm -w @erp/web run build"
"build:all": "npm -w @erp/web run build && npm -w @erp/miniapp run build:weapp"
"check:clients": "npm -w @erp/web run check && npm -w @erp/mobile run check && npm -w @erp/miniapp run check"
```

---

## 13. 风险与待评审项

1. **Route Group 重复入口**：`page.tsx` 在 `(desktop)/(tablet)/(mobile)` 各有一份 re-export，需配 ESLint 规则禁止其中一份误改实现。
2. **设备类闪烁**：SSR 阶段只能从 Header 推断，移动端从 `sec-ch-viewport-width` 拿不到时降级 UA；首屏可能错位 1 帧，必要时加 splash。
3. **`api-client` 双环境**（浏览器 / Node SSR）会引入 cookie 抽象层，需在 PR 中单独评审 API。
4. **Tailwind v4 + Next 16** 训练数据滞后，关键 API（`@theme`、`container-queries`、`next/font`）以 `node_modules/next/dist/docs/` 与 Tailwind 4 官方文档为准。
5. **i18n 后置**：先全中文，**严禁**中文硬编码到非 messages 目录之外的视图（建立 lint 规则）。
6. **BFF 是否启用**：当前架构默认不启用 `app/api/`，仅当有鉴权/聚合/缓存需求时再加；新建文件前必须评审。

---

## 14. 验收清单

- [ ] `apps/web/src/app/**/page.tsx` 99% 都是单行 re-export（ESLint 规则）。
- [ ] Sidebar、TabBar、Tab、面包屑、命令面板 都从同一份 `NavItem[]` 渲染。
- [ ] 新增一个业务模块 = 新建 `modules/<m>/nav.ts` + `views/*.tsx`，**不动** `apps/web` 任何文件（除注册到 `aggregateNav`）。
- [ ] 切换设备类（手动改 viewport）三端 Shell 平滑切换，URL 不变（除非显式 `redirect`）。
- [ ] 导航数据由 `NavItem` 单一来源驱动，权限、徽标、可见性字段都可声明。
- [ ] 业务模块**不感知** layout 分层，模块视图只关心"我渲染什么"。
- [ ] ESLint 边界守卫通过（`apps/*`、`modules/*`、`packages/*` 互不越界）。

---

## 15. 落地里程碑

| 阶段 | 动作 | 风险 |
|---|---|---|
| **M0** | 根 `package.json` 开 workspaces；新建 `docs/architecture/web-frontend.md` | 几乎无 |
| **M1** | 抽 `packages/{config,devices}` 空壳；`apps/web` 改 import 路径 | 低 |
| **M2** | 落 L0 RootLayout + L1 三端 Shell（最小版）；抽 `packages/ui` 雏形 | 中 |
| **M3** | 落 L2 Frame 五件套；接通 `NavRegistry` 与 `aggregateNav` | 中 |
| **M4** | 抽 `packages/api-client` 增强（CSRF/SSR cookie）；Laravel 端 `EnsureFrontendRequestsAreStateful` 放行 | 中 |
| **M5** | 鉴权贯通：登录页 → Sanctum Cookie → 受保护页面 SSR | 中 |
| **M6** | 落 `modules/auth` + `modules/users`（首个范式） | 中 |
| **M7** | `apps/web` 删除业务实现，仅留 re-export 与 layout | 中 |
| **M8** | `apps/mobile`、`apps/miniapp` 同步切 workspace 协议；CI 串 `check:clients` | 低 |

> 每个 M 阶段独立提交，**任何阶段回滚都只影响单个包**。

---

## 16. 已采纳决策（首版）

| 决策点 | 选择 |
|---|---|
| Shell 组件归属 | `@erp/ui/shells/`（设计系统统一所有端） |
| 导航权限字段 | 保留 `permissions: string[]`，客户端**只做显隐**，服务端仍走 Laravel Policy |
| 命令面板 | M2 集成 `cmdk`，与设计系统同步落地 |
| 移动端"4 + 更多" | 由 `NavItem.priority` 自动截断（默认 100） |
