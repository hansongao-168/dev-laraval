# AI 开发约定

本文档是本项目所有 AI 编程助手共享的项目事实与工程约定。工具专属配置用于加载本文档，Laravel Boost 生成的规则用于补充具体框架规范。

项目长期知识记录在 `knowledge` Obsidian Vault 中。开始较大需求前应先查看
`knowledge/00-Home/AI上下文.md` 和相关领域笔记；完成后更新对应需求、架构决策或 API 文档。
知识库不得包含财务明细、客户资料、个人信息、环境变量值、密码、令牌或密钥。

## 项目事实

- 项目类型：ERP 管理后台基础项目
- Web 服务器：Apache，DocumentRoot 必须指向 `public`
- PHP：8.5
- Laravel：13
- Filament：5
- Livewire：4
- Next.js：16
- Expo SDK：57
- Taro：4
- React：Web/Expo 使用 19；Taro 使用其官方兼容的 React 18
- MySQL：8
- Redis：8，用于 cache、session 和 queue
- 测试：PHPUnit 12
- 格式化：Laravel Pint
- 前端：Tailwind CSS 4、Vite

以 `composer.lock`、`package-lock.json` 和实际代码为准确版本来源，不凭记忆套用旧版本 API。

## 关键业务不变量

1. 受保护超级管理员由 `php artisan app:initialize` 创建。
2. 超级管理员账号不得通过应用代码修改或删除。
3. 不得移除 `User` 模型中的超级管理员保护，除非用户明确要求改变该业务规则。
4. 初始化流程必须保持幂等；重复执行不得覆盖超级管理员或重置其密码。
5. Filament 后台访问权限必须通过服务端授权判断，不能仅依赖隐藏菜单或按钮。

## 安全与隐私

- 不读取、回显、记录或提交 `.env` 中的密码和密钥。
- 示例配置只使用占位符，不复制真实凭据到文档、测试或提交内容。
- 不在前端代码中实现服务端授权。
- 所有外部输入都要验证；批量赋值、文件上传、查询筛选和导出功能需要检查越权风险。
- 数据库结构变更必须使用 migration，不直接手工修改生产表。
- 破坏性数据库操作和依赖升级必须先获得用户明确许可。

## 开发方式

- 开始修改前先检查相邻代码与现有命名方式。
- 优先使用 Laravel、Filament 和 Livewire 的原生机制。
- 创建 Laravel 文件时优先使用带 `--no-interaction` 的 `php artisan make:*` 命令。
- 控制器保持精简；验证放入 Form Request，复杂业务放入命名清晰的 Action 或 Service。
- 使用 Eloquent 关系、Policy、Gate、Resource 和队列，避免重复实现框架能力。
- 访问环境变量只在 `config/*.php` 中进行，业务代码使用 `config()`。
- 新功能应包含成功、失败、权限与边界场景测试。
- 修复缺陷时先添加能复现问题的测试。

## Filament 约定

- 资源放在 `app/Filament/Resources`，页面和 relation manager 遵循 Filament 5 目录结构。
- 表格查询必须考虑授权、N+1 查询、分页和大数据量。
- Action 的可见性不是授权；执行 Action 时仍需 Policy 或服务端校验。
- 表单中的唯一性、状态转换和跨字段规则必须在服务端验证。
- 使用当前安装版本的 Filament API，不照搬 Filament 3/4 示例。

## 数据与性能

- 列表页按需 eager load，禁止循环内查询。
- 常用筛选、关联和排序字段应评估索引。
- 大批量导入、导出和耗时任务使用队列。
- Redis key 应有明确前缀和有效期；缓存更新要有失效策略。
- migration 的 `down()` 必须可逆；无法安全逆转时要明确说明。

## 验证清单

PHP 代码修改后至少执行：

```shell
vendor/bin/pint --dirty
php artisan test --compact
```

前端代码修改后执行：

```shell
npm run build
```

依赖或 Composer 配置修改后执行：

```shell
composer validate --no-check-publish
```

数据库相关变更还要验证 migration 可执行，并确保测试使用独立测试数据库。

## 常用入口

- 初始化：`composer initialize`
- 完整首次安装：`composer setup`
- 生成独立新项目：`bin/create-project <目标目录> [项目名称]`
- 本地开发：`composer dev`
- 后台：`/admin`
- 客户端 API：`/api/v1`
- Next.js：`apps/web`
- Expo：`apps/mobile`
- Taro 微信小程序：`apps/miniapp`
- 共享 API SDK：`packages/api-client`
- 安装文档：`docs/INSTALL.md`
- Apache 示例：`docs/apache-vhost.conf.example`
- Laravel Boost 配置：`boost.json`
- Laravel Boost MCP：`php artisan boost:mcp`

## 完成标准

任务完成时说明变更结果、验证结果、未完成事项和需要人工执行的部署步骤。不要声称未实际运行的测试或迁移已经通过。
