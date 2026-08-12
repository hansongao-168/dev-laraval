# dev-laraval

> **Dev 学习 / Playground 仓库**。原 ERP 多端基础项目（见下方"业务项目说明"）已演化为学习底座，配套知识库见 [Obsidian 知识库](#obsidian-知识库)。

## 当前定位

- 这是个人 Dev 学习的载体：Laravel 13 + Filament 5 + Livewire 4 + Tailwind v4 + Boost v2 等新版本生态的实验场
- 配套 `knowledge/` Vault（独立 git 仓库）作为长期学习笔记与项目复盘
- 仓库根 `AGENTS.md` 与 `docs/AI_DEVELOPMENT.md` 仍约束代码规范与多端架构
- 历史 ERP 业务版（多端 ERP、订单 / 客户 / 财务业务描述）保留在 `apps/`、`bin/`、`gz168/` 子模块与 `99-Archive/erp-snapshot-2026-07-26/`，仅作为参考底座，不再是主线目标

## 业务项目说明（原 ERP）

仓库内仍然包含面向全球市场并兼容中国渠道的 ERP 多端基础项目，下方的"技术栈 / 开始使用 / 安全说明"主要描述这一块内容。

### 技术栈

- Apache
- PHP 8.5
- Laravel 13
- Filament 5 / Livewire 4
- Next.js 16 / React 19
- Expo SDK 57 / React Native
- Taro React 4
- MySQL 8
- Redis 8
- Tailwind CSS 4 / Vite
- PHPUnit 12

## 开始使用

```shell
cp .env.example .env
composer setup
```

Apache 的站点根目录必须指向项目的 `public` 目录。管理后台默认路径为 `/admin`。

常用命令：

```shell
composer initialize
composer dev
composer test
vendor/bin/pint
npm run build
npm run dev:web
npm run dev:mobile
npm run dev:miniapp
```

详细安装说明参见 [docs/INSTALL.md](docs/INSTALL.md)。
系统结构与多端边界参见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## gz168 模块架构

本项目按"模块化、高内聚、低耦合、单向依赖"原则把业务切成多个 `gz168/*` 公共 Composer 包，
每个模块都是单一 Composer 包 + 单一 ServiceProvider + 两棵子树（`src/Front/` 与 `src/Admin/`，默认关闭）。

- 模块设计基线：[`docs/architecture/gz168-customer.md`](docs/architecture/gz168-customer.md)
  —— `gz168/Customer`（前台用户域）的完整架构、约束与边界守卫。
- 多端前端架构：[`docs/architecture/web-frontend.md`](docs/architecture/web-frontend.md)
  —— L0/L1/L2/L3 分层、声明式导航、三端 Shell。
- Customer 域 host 接入：[`docs/architecture/customer-host-integration.md`](docs/architecture/customer-host-integration.md)
  —— `.env` / `config/customer.php` / Filament / Sanctum 接入步骤。

需要从本项目生成一个包含后端、全部客户端、AI 配置、Obsidian 和 Markdown 文档的
新项目时，执行：

```shell
bin/create-project ../new-erp "New ERP"
```

创建过程中可以直接初始化新项目的 `.env`。已经创建的项目可在其根目录执行
`bin/configure-env` 重新配置，并执行 `bin/configure-apache` 生成 Apache VirtualHost。

完整说明参见 [docs/NEW_PROJECT.md](docs/NEW_PROJECT.md)。

## Obsidian 知识库

使用 Obsidian 打开项目中的 `knowledge` 目录即可。知识库首页为
[knowledge/00-Home/学习地图.md](knowledge/00-Home/学习地图.md)。

知识库主题分区（MOC）位于 [knowledge/00-Home/MOC-前端.md](knowledge/00-Home/MOC-前端.md)、
[knowledge/00-Home/MOC-后端.md](knowledge/00-Home/MOC-后端.md)、
[knowledge/00-Home/MOC-算法.md](knowledge/00-Home/MOC-算法.md)、
[knowledge/00-Home/MOC-AI.md](knowledge/00-Home/MOC-AI.md)、
[knowledge/00-Home/MOC-工程实践.md](knowledge/00-Home/MOC-工程实践.md)。

新笔记应优先使用 `knowledge/90-Templates/` 下的对应模板（`note.md` / `atomic-note.md` /
`book-note.md` / `project-retro.md` / `weekly.md` / `Daily.md`）。

历史 ERP 业务版（2026-07-26 前）已归档为只读快照，位于
[knowledge/99-Archive/erp-snapshot-2026-07-26/](knowledge/99-Archive/erp-snapshot-2026-07-26/)。

知识库随项目通过私有 Git 管理。`.env` 内容、密码、令牌、个人信息、生产数据不得写入；
完整边界参见
[knowledge/07-Operations/知识库安全规范.md](knowledge/07-Operations/知识库安全规范.md)。

## AI 开发支持

项目已安装 Laravel Boost，并提供适用于 Codex、Claude Code、Cursor、Junie、GitHub Copilot、Gemini、Windsurf、Cline、Roo Code 和 Aider 的项目配置。

所有工具共同遵循 [docs/AI_DEVELOPMENT.md](docs/AI_DEVELOPMENT.md)。Laravel Boost 会额外提供版本匹配的框架规范、项目技能与 MCP 工具。

更新依赖后，可同步最新 AI 规则：

```shell
php artisan boost:update
```

## 安全说明

- `.env` 不得提交到版本控制。
- 超级管理员由初始化命令创建，应用层禁止修改或删除。
- 不要在文档、测试、日志或 AI 对话中输出数据库密码、管理员密码及其他密钥。
