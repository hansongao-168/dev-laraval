# ERP

面向全球市场并兼容中国渠道的 ERP 多端基础项目。

## 技术栈

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

需要从本项目生成一个包含后端、全部客户端、AI 配置、Obsidian 和 Markdown 文档的
新项目时，执行：

```shell
bin/create-project ../new-erp "New ERP"
```

创建过程中可以直接初始化新项目的 `.env`。已经创建的项目可在其根目录执行
`bin/configure-env` 重新配置。

完整说明参见 [docs/NEW_PROJECT.md](docs/NEW_PROJECT.md)。

## Obsidian 知识库

使用 Obsidian 打开项目中的 `knowledge` 目录即可。知识库首页为
[knowledge/00-Home/ERP知识库.md](knowledge/00-Home/ERP知识库.md)，需求、架构决策、会议和 API
文档应优先使用 `knowledge/90-Templates` 中的模板。

知识库随项目通过私有 Git 管理。财务明细、客户资料、个人信息、`.env` 内容、密码、令牌和密钥
不得写入知识库；完整边界参见
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
