# Web 前端站点信息架构 — 设计规格

> 状态：已定案（brainstorm 2026-10-02）  
> 范围：`apps/web` 店面 / 账户 / 鉴权 分区；与 FrontNav、FrontShell/FrontPage 对齐  
> 路径：`docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-site-ia-design.md`  
> 前置：`docs/dev-laraval/superpowers/specs/2026-10-02-web-frontend-shell-routing-design.md`（设备壳：每 URL 一份 page）  
> 相关：`docs/dev-laraval/superpowers/specs/2026-09-23-front-experience-architecture-design.md`  
> 实现：须先有实现计划（writing-plans），再开发；**先文档后代码**。

## 1. 目标与非目标

### 1.1 目标

- 用一张总图覆盖 **访客店面** 与 **登录后账户**，以及注册/登录。
- 明确：首页、产品、顶/底菜单、个人中心、注册各归哪棵路由树、哪套 chrome、哪份菜单。
- 现行落地 **方案 A（双树）**；**方案 B、C 仅文档保留**，不实现。
- 遵守设备壳裁决：任意公开 URL 仅一份 `page.tsx`；区内 layout 按 `deviceClass` 选 DeviceShell。

### 1.2 非目标（本期不做）

- 不实现 B（单树 + chrome 元数据）或 C（账户嵌店面顶底）。
- 不在本规格内改 `apps/web` 源码或合并现有 `(desktop|tablet|mobile)`（属实现计划）。
- 不重新设计 FrontPage Document schema / Mall 领域规则。
- 不定稿全部商品/订单子路由清单（可按模块迭代增页）。

## 2. 三层「壳」正交

| 名称 | 回答 | 实现位置 |
|---|---|---|
| **设备壳 DeviceShell** | PC / 平板 / 手机骨架差异 | `@erp/ui/shells` + 各区 `layout` 内 `deviceClass` |
| **体验壳 ExperienceShell** | 页内 `header` / `main` / `footer` 槽与区块 | FrontShell（如 `storefront.main`） |
| **菜单 FrontNav** | 顶/底/侧/移动链到哪 | FrontNav `location`；Shell 不存菜单树 |

业务 module **不感知**上述三层；只提供 views / actions。

## 3. 现行决策：方案 A（双树）

| 项 | 结论 |
|---|---|
| 路由分区 | `(storefront)` + `(account)` + `(auth)` |
| 店面体验壳 | 默认 `storefront.main`（已有 FrontExperience） |
| 账户 chrome | `account.main`（可后置；首期最小侧栏 + 顶栏即可） |
| 菜单 | 店面：`header` + `footer`；账户：`sidebar`（+ 移动 `mobile`） |
| 与 shell-routing | 原规格中的单一 `(app)/` **拆**为 `(storefront)` 与 `(account)`；「每 URL 一份 page + 区内动态 DeviceShell」不变 |

改走 B/C 必须新开评审，禁止实现中静默切换。

## 4. 目标目录与 URL

```
apps/web/src/app/
├─ layout.tsx                         # L0：Providers（含 DeviceProvider）
├─ (auth)/
│  ├─ layout.tsx                      # AuthFrame；无店面底栏、无账户侧栏
│  ├─ login/page.tsx                  # /login
│  ├─ register/page.tsx               # /register
│  └─ forgot-password/page.tsx        # /forgot-password
├─ (storefront)/
│  ├─ layout.tsx                      # ExperienceShell=storefront.main
│  │                                  # + Device 变体（顶/底为主）
│  ├─ page.tsx                        # / 首页
│  ├─ products/page.tsx               # /products
│  ├─ products/[id]/page.tsx         # /products/:id
│  ├─ cart/page.tsx                   # /cart（可选）
│  └─ help/...                        # 帮助/文章等
└─ (account)/
   ├─ layout.tsx                      # Account chrome + DeviceShell
   ├─ me/page.tsx                     # /me
   ├─ me/settings/page.tsx
   ├─ me/security/page.tsx
   └─ orders/...                      # 后续
```

约束：

- `(storefront)` 与 `(account)` 的公开 path **不得重叠**。
- **禁止**再引入 `(desktop)/(tablet)/(mobile)` 平行业务 page。
- 根级不再单独放「营销 page 与店面争夺 `/`」；`/` 归店面首页。若需独立营销域，另开 path（如 `/campaign/...`）或后置评审。

## 5. FrontNav location 映射

| location | 使用区 | 典型项 |
|---|---|---|
| `header` | storefront 顶栏 | 首页、产品、帮助、登录/我的 |
| `footer` | storefront 底栏 | 关于、条款、联系 |
| `sidebar` | account 桌面侧栏 | 我的、订单、设置、安全 |
| `mobile` | account 移动 Tab/更多；店面「更多」按需 | 由 `priority` 截断 |

规则：

- 整棵导航树只来自 FrontNav（或聚合后的 NavRegistry）；page/module **不**硬编码完整菜单。
- 顶栏「我的」：匿名 → `/login?next=/me`；已登录 → `/me`。
- 客户端 `permissions` 仅显隐；服务端仍走 Laravel Policy。

## 6. 页面渲染路径

| 页面 | 渲染 |
|---|---|
| 首页 `/` | FrontPage Document（`shellKey: storefront.main`）→ slots → blocks（含 `shell.nav-bar` → FrontNav） |
| 产品列表/详情 | `@erp/module-*` views + Mall/API；非整页 Document（营销落地页除外） |
| 注册/登录/找回 | `(auth)` + AuthFrame + auth module |
| 个人中心及子页 | `(account)/me/*` + users/account module views；侧栏 FrontNav `sidebar` |

店面 `layout`：`header`/`footer` 由体验壳/槽渲染；`main` 放 `children`（首页则为 PageRenderer 的 main 槽内容，或 layout 委托 Document 整页——实现计划二选一并写清，默认可「layout 提供 chrome，page 只填 main」或「首页 page 拉整份 Document」；**推荐：首页 page 拉 Document，layout 仅补 Device 级包装与未进 Document 的全局行为**）。

推荐默认（写入实现约束）：

- **首页**：page 负责拉取并渲染完整 FrontPage Document（含 header/main/footer blocks）。
- **其它店面页**（产品等）：layout 渲染轻量 chrome（顶/底 Nav），page 只渲染业务 main。
- 二者都不得复制三份 device page。

## 7. 鉴权与跳转

- 进入 `(account)/*` 且会话匿名 → `redirect('/login?next=...')`。
- 登录成功 → `next` 或默认 `/me`。
- `(storefront)` 默认可匿名浏览；加购/结算等动作由业务逼登，layout 不拦截整树浏览。
- Sanctum SPA Cookie 模式不变（见 `web-frontend.md` §7）。

## 8. 与设备壳的关系

每个分区 `layout.tsx`：

1. 读取 `deviceClass`（SSR 初值 + 客户端校正）。
2. 选择该区的 Device 变体（店面：顶底；账户：桌面侧栏 / 移动 Tab）。
3. **不**按设备复制 `page.tsx`。

详见 shell-routing 规格。

## 9. Alternatives retained（不实现）

### 9.1 方案 B — 单树 + chrome 元数据

全部挂在 `(site)/`，由 NavItem 或 page 元数据声明 `chrome: storefront | account | auth`。

- **优点**：目录少。  
- **缺点**：layout 易成巨型 switch；难强制约定；易误套 chrome。  
- **重评触发**：站点极简、分区长期只有少数页、团队明确接受中心化 chrome 路由表。

### 9.2 方案 C — 账户嵌在店面顶底内

账户页仍包在 storefront header/footer 中，侧栏叠在 main。

- **优点**：品牌顶栏始终在。  
- **缺点**：账户信息密度差；移动端易出现顶栏 + 底栏 + Tab 三重导航。  
- **重评触发**：产品强制要求账户区与店面共用同一条品牌顶栏，且接受导航密度代价。

## 10. 对架构文档与前置规格的影响

- `docs/dev-laraval/architecture/web-frontend.md`：目录改为 `(auth)/(storefront)/(account)`；链到本规格；决策表增加站点 IA = A（保留 B/C）；里程碑 M0.5 改为合并平行 device 树并落地双区分区骨架。
- shell-routing 规格：`(app)/` 语义由本规格细化为双树；设备壳原则不改。

## 11. 验收标准（本规格）

- [x] 文档明确现行 A，且 B/C 以「保留备选、不实现」写清重评条件。
- [x] 路由树、FrontNav location、页面渲染路径无互相矛盾。
- [x] 与「每 URL 一份 page」及禁止 `(desktop|tablet|mobile)` 平行业务页一致。
- [x] `web-frontend.md` 已同步分区命名（不再以单一 `(app)` 表示全部业务）。

## 12. 后续

1. **M0.5 已完成**（平行 device 树已移除；`(storefront)/(account)/(auth)` 骨架与 zone 校验已落地）。
2. 下一步：**M1+**（按 `web-frontend.md` 里程碑继续，如抽包、Shell 深化等；具体顺序见 writing-plans）。
3. 各阶段继续跑 `npm --prefix apps/web run check:zones` 与 `next build` 验收。
