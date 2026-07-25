# 从本项目创建新项目

本项目可以作为内部私有项目模板。生成器会复制 Laravel、Filament、Next.js、Expo、
Taro、AI 工具配置、Obsidian 知识库和全部 Markdown 文档，但不会复制现有项目的
`.env`、依赖目录、构建产物、运行日志或 Git 历史。

## 创建项目

在本项目根目录执行：

```shell
bin/create-project ../new-erp "New ERP"
```

- 第一个参数可以是尚不存在的目录，或者仅包含无提交 `.git` 的空仓库。
- 第二个参数是可选的项目名称；省略时使用目录名称。
- 普通新目录会自动创建独立的 `.env` 和 `main` Git 仓库。
- 如果目标是仅包含 `.git` 的空仓库，现有分支与远程地址会被保留。
- 在交互式终端中，生成器会询问是否立即配置 `.env`。
- `.env` 只来自无密码的 `.env.example`，不会继承本项目的数据库或管理员密钥。

## 配置新项目

创建时选择配置 `.env`，生成器会逐项询问以下信息，密码输入不会显示在终端。
如果创建时跳过，之后可以执行：

```shell
cd ../new-erp
bin/configure-env
```

也可以手动编辑 `.env`，至少填写：

```dotenv
APP_NAME="New ERP"
APP_URL=https://erp.example.com
FRONTEND_URL=https://app.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=new_erp
DB_USERNAME=new_erp
DB_PASSWORD=使用独立强密码

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

SUPER_ADMIN_NAME="Super Administrator"
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=使用独立强密码
```

不得把真实值写回 `.env.example`、Markdown、AI 配置、测试或 Git。
初始化后的 `.env` 权限会设为仅当前用户可读写，并继续受 `.gitignore` 保护。

## 安装全部环境

```shell
composer setup
```

该命令会：

1. 安装 PHP 依赖。
2. 生成 Laravel 应用密钥。
3. 执行数据库迁移。
4. 创建受保护超级管理员。
5. 安装根目录、Next.js、Expo 和 Taro 依赖。
6. 构建 Laravel 前端、Next.js Web 和微信小程序。

命令可安全重复执行。已存在的受保护超级管理员不会被修改，也不会重置密码。

## Apache

运行 `.env` 配置器时可以同时生成 Apache VirtualHost。也可以单独执行：

```shell
bin/configure-apache
```

默认从 `.env` 的 `APP_URL` 提取域名并使用端口 `80`。也可以显式指定项目、域名和端口：

```shell
bin/configure-apache /absolute/path/to/new-erp erp.example.test 8080
```

配置输出到 `docs/apache-vhost.conf`，其中 `DocumentRoot` 始终指向项目的 `public`
目录。该机器专属文件已被 Git 忽略，不会覆盖可提交的
`docs/apache-vhost.conf.example`。

生成器不会自动修改 `/etc/hosts`、系统 Apache 配置或重启 Apache。管理员需要：

1. 确保 Apache 已启用 `mod_rewrite`。
2. 从 Apache 主配置或 VirtualHost 配置中包含生成文件。
3. 本地域名需要在 `/etc/hosts` 中映射到 `127.0.0.1`。
4. 使用 Apache 配置测试命令验证后再重新加载服务。
5. 确保 Apache 进程可以写入 `storage` 和 `bootstrap/cache`。

HTTPS 应由生产服务器或反向代理配置证书，不要把证书私钥放入项目仓库。

## Obsidian 与 Markdown

使用 Obsidian 打开新项目的 `knowledge` 目录。以下内容会随项目完整复制：

- 产品、需求、业务、工程、架构决策和会议目录
- 需求看板与架构决策看板
- ADR、API、会议、需求、业务流程和日报模板
- AI 项目上下文和知识库安全规范
- Obsidian 核心插件、模板、每日笔记和属性配置

新项目创建后，应立即更新：

- `knowledge/00-Home/AI上下文.md`
- `knowledge/01-Product/产品愿景.md`
- `knowledge/01-Product/功能地图.md`
- `README.md`
- `docs/AI_DEVELOPMENT.md`

财务明细、客户资料、个人信息、密码、令牌和密钥不得写入知识库。

## 私有 Git

生成器只初始化本地仓库，不会自动连接或上传到任何服务。确认文件后执行：

```shell
git add .
git commit -m "chore: initialize project"
git remote add origin <private-repository-url>
git push -u origin main
```

远程仓库必须设置为私有。首次提交前使用 `git status --ignored` 确认 `.env`、依赖目录
和构建产物没有进入版本控制。
