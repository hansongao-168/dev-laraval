# Web 前端 Shell 路由选型 — 设计规格

> 状态：已定案（brainstorm 2026-10-02）  
> 范围：`apps/web` App Router L1 Shell 选型；修订 `docs/dev-laraval/architecture/web-frontend.md`  
> 路径：`docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-shell-routing-design.md`  
> 说明：docs 仓库根目录忽略 `/superpowers/`，本仓库规格落在 `dev-laraval/superpowers/`。  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。  
> **修订**：原「单一 `(app)/` 业务树」由站点 IA 细化为 `(storefront)` + `(account)`（另保留 `(auth)`）。设备壳原则不变——见 `2026-10-02-web-frontend-site-ia-design.md`。

## 1. 目标与非目标

### 1.1 目标

- 解除 Next.js App Router 硬约束：不同 Route Group **不得**解析到同一 URL（`next build` 已证实失败）。
- 保持验收项：**切换 viewport 时换 Shell，URL 不变**。
- 每个业务路径恰好一份 `page.tsx`（后续为 module re-export）。
- L0 / L1 / L2 / L3 分层与依赖方向不变；仅修正 L1 的挂载方式。

### 1.2 非目标（本期不做）

- 不启用 URL 端前缀（`/d/me`、`/t/me`、`/m/me`）。
- 不启用 Middleware rewrite 到内部 `_shell/*` 路径。
- 不在本规格内落地 `packages/{config,devices,ui}` 或迁移业务代码（属后续里程碑）。
- 不在本规格内修复 `@erp/front-nav/core` 解析（实现阶段处理）。

## 2. 背景与裁决

### 2.1 原模型问题

原架构用 `(desktop)/(tablet)/(mobile)` 三套 Route Group，各自挂 `me/page.tsx` 等，公开 URL 均为 `/me`。Next.js 文档与本地 `next build` 均报：

> You cannot have two parallel pages that resolve to the same path.

### 2.2 备选与选择

| 方案 | 摘要 | 结果 |
|---|---|---|
| **A** | 单路由树 `(app)/` + layout 内按 `deviceClass` 选 Shell | **采纳** |
| B | 公开 URL 带端前缀 | 否决（违反 URL 不变） |
| C | Middleware rewrite 到内部路径 | 否决（复杂度高、CH/UA 与 viewport 易不一致） |

## 3. 目标目录结构

> 站点分区的权威目录以 **站点 IA 规格** 为准：`(storefront)` + `(account)` + `(auth)`。  
> 本节保留设备壳原则示意；下表中的 `(app)` 已拆分为店面/账户两树。

```
apps/web/src/app/
├─ layout.tsx                 # L0：html/body、Providers（含 DeviceProvider）
├─ (auth)/                    # AuthFrame
├─ (storefront)/              # 店面；layout 内按 deviceClass 选 Device 变体
│  └─ …/page.tsx              # 每公开 URL 一份
└─ (account)/                 # 账户；同上
   └─ …/page.tsx
```

**删除**：`(desktop)/`、`(tablet)/`、`(mobile)/` 及其中重复的平行 `page.tsx`。  
**保留**：`(auth)/`；业务不再使用单一 `(app)/` 笼统树（见站点 IA）。

## 4. Layout 职责修订

### 4.1 L0 RootLayout

- 渲染 `<html>` / `<body>`，字体、`globals.css`、metadata / viewport。
- 注入 Provider 链：`ErrorBoundary` → `ThemeProvider` → `DeviceProvider` → `SessionProvider` → `NavRegistryProvider`。
- **不**在 L0 内选择或渲染 Shell。
- **不**写导航、不调用业务 API（会话读取若已存在可维持，直至 SessionProvider 正式化）。

### 4.2 L1 Zone layout（每区一份）

位置：`(storefront)/layout.tsx`、`(account)/layout.tsx` 等（**不是**三份 device Route Group）。

行为：

1. 读取 `deviceClass`（来自 `DeviceProvider`：SSR 初值 + 客户端 `matchMedia`）。
2. 按类挂载该区使用的 DeviceShell 变体。
3. 将 `children` 放入内容槽；Frame（L2）仍按路由 `frame` 元数据挂载。

Shell 组件仍归属 `packages/ui/src/shells/`（三端组件文件保留；**不是**三份 Next device layout）。

### 4.3 L2 / L3

- L2 Frame 五件套、声明式 `NavItem.frame`：**不变**。
- L3 示例：`app/(account)/me/page.tsx` → re-export module view。
- 业务视图**不感知**端；**区 layout** 才感知 `deviceClass`。

## 5. 设备类与闪烁

- 断点：`< 768` mobile；`768–1279` tablet；`≥ 1280` desktop。
- SSR 初值：`sec-ch-viewport-width` → 否则 UA 启发式 → 默认 `desktop`。
- 客户端：`matchMedia` 校正；resize 换 Shell，**URL 不变**。
- 接受最多约 1 帧 Shell 错位；hydrate 前保持与 SSR 相同骨架，减少跳变。
- Tailwind `@container` 仅用于组件内部布局，**不**用于整页路由分叉。

## 6. 对既有文档与代码的影响

### 6.1 文档

`docs/dev-laraval/architecture/web-frontend.md` 同步修订：

- 目录树：废除 `(desktop|tablet|mobile)` 平行业务 page；业务区见站点 IA（storefront/account/auth）。
- §3 L1：各区一份 layout + 动态 DeviceShell。
- L0：Shell 仅在区 L1，不在 RootLayout 直接挂。
- §2 views：每 URL 唯一 page re-export。
- §13 风险 #1：标为已裁决（设备壳方案 A）。
- §14：每个业务路径恰好一份 page；URL 不变换 Shell。
- §16：设备壳裁决 + 站点 IA 裁决（现行双树）。

### 6.2 实现迁移意图（属后续 plan，非本规格交付）

| 现状 | 目标 |
|---|---|
| `(desktop\|tablet\|mobile)/me/**` 三份 | 合并为 `(account)/me/**` 一份（以现 desktop 为底） |
| 三份 layout 硬编码导航 | 各区一份 layout + `@erp/ui` / FrontNav |
| `next build` 因平行 path 失败 | 合并后路径冲突应消失 |

## 7. 验收标准（本规格）

- [ ] 架构文档不再出现「三端各一份业务 `page.tsx`」的要求。
- [ ] 架构文档明确：L1 = 区 layout + 动态 DeviceShell（区划分见站点 IA）。
- [ ] 风险「Route Group 重复入口」标记为已裁决，并指向本规格。
- [ ] 与站点 IA 规格无矛盾（双树命名以站点 IA 为准）。

## 8. 后续

1. 用户审阅本规格与已修订的 `web-frontend.md`。
2. 通过后调用 writing-plans，产出「合并 route + 可选 M1 抽包」实现计划。
3. 实现阶段再改 `apps/web` 源码并跑 `next build`。
