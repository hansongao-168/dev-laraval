## 目标

1. 在 **每个 gz168 子模块**（21 个）的 `composer.json` 与 `module.json` 中注册对 `gz168/filament-admin` 的依赖关系，让任何使用这些模块的下游应用都能自动启用后台聚合。
2. 把 `gz168/filament-admin/composer.json` 的依赖**精简为它实际使用的模块**（按 `AdminPanelProvider` 的 use 语句确认）。

## 关键发现（影响方案的边界）

- `AdminPanelProvider` 的 `use` 语句只引用了 **9 个** 模块：
  `CacheManagement`, `CustomConfig`, `DatabaseBackup`, `ExtensionData`, `GitManagement`, `LogManagementPage`, `ModuleCore`, `ModuleSettings`, `SystemSettings`。
  没有"11 个"——这是 provider 实际需要的精确集合。其它 12 个模块（`ApiAuth`、`AttributeManagement`、`ExportManagement`、`KafkaManagement`、`ModuleSettings` 不在内…等等）通过 `ModuleScanner` 在运行时发现，不要求它们出现在 `filament-admin/composer.json` 中，只要它们被宿主应用安装到 vendor（即 host 的 path repository + composer require）即可。
- `filament-admin/composer.json` 当前 require **21 个**模块，过度耦合。
- 当前所有模块的 composer.json / module.json 都没有提到 `gz168/filament-admin`，全部依赖 host app 拉取。
- `module.json` 的 `requires` 与 composer.json 的 `require` 是**两套机制**：前者由 `ModuleScanner` 在 boot 时检查，后者由 Composer 解析。本次两处都要同步追加。

## 计划

### 第 1 步：精简 `gz168/filament-admin/composer.json`

把 `require` 从 21 个减少为 9 个（按 provider 文件实际 `use` 排序后保留）：

- `gz168/cache-management`
- `gz168/custom-config`
- `gz168/database-backup`
- `gz168/extension-data`
- `gz168/git-management`
- `gz168/log-management-page`
- `gz168/module-core`
- `gz168/module-settings`
- `gz168/system-settings`

其它依赖（如 `filament/filament`）维持由 host app 提供，不下沉到模块层。

### 第 2 步：在 21 个模块的 `composer.json` 中加入 `gz168/filament-admin`

为每个模块：
```json
"gz168/filament-admin": "@dev"
```

按字母顺序插入到现有 require 列表中（不破坏现有顺序风格）。仅修改 `composer.json`；**不** 触动 `composer.lock`——lock 更新留给用户在合并后执行 `composer update gz168/filament-admin --no-interaction`。

被影响的 21 个模块（`filament-admin` 自己除外）：
ApiAuth, AttributeManagement, CacheManagement, CustomConfig, DatabaseBackup, ExportManagement, ExtensionData, Filament, GitManagement, GmailApi, KafkaManagement, LogManagementPage, ModuleSettings, PackageRegistration, RedisManagement, RolePermission, SystemSettings, UserManagement, common, deepseek, module-core

注意：纯后端模块（`common`、`module-core`、`GmailApi`、无 Filament 子目录的几个）会被这次改动间接拉入 `gz168/filament-admin`，但因为该包不再 require `filament/filament`，所以 `filament/filament` 仍由 host app 单独提供，纯后端模块独立发布时不会崩。

### 第 3 步：在 21 个模块的 `module.json` 的 `requires` 数组中追加 `gz168/filament-admin`

按现有数组顺序（字母序）插入字符串项。已存在则跳过。

### 第 4 步：风险与不做的事

- **不会** 更新 `composer.lock`：那是用户执行 `composer update` 时的事，AI 不该替代用户做依赖升级决定。
- **不会** 修改 `AdminPanelProvider` 代码本身——它已经按预期扫描模块。
- **不会** 修改 host app 的 `composer.json` 或 `bootstrap/providers.php`——`AdminPanelProvider` 已经通过 `extra.laravel.providers` 自动发现。
- **不会** 删除任何 module.json / composer.json 中的现有 require。

### 第 5 步：验证

修改完成后，可执行（**仅作为建议，由用户执行**）：

```shell
cd /Users/37user/Documents/dev-laraval
for m in gz168/*/composer.json; do
  grep -q '"gz168/filament-admin"' "$m" && echo "OK: $m" || echo "MISSING: $m"
done
composer validate --no-check-publish gz168/*/composer.json
php artisan gz168:module:check filament-admin   # 期望 0 报错
vendor/bin/pint --dirty --format agent           # 我们没改 PHP，但保险起见跑一遍
```

由于 `ModuleScanner` 只在 `GZ168_ENABLED=true` 时扫描，仅 `module:check` 是必跑的人工步骤。

## 待澄清的点（写在 plan 里供用户决策）

- "11 个模块" 的提法与 provider 的 9 个 import 不一致。建议严格按 9 个实际 import 收敛；若用户后续要扩到 11 个，可指定哪两个额外模块需要显式依赖。
- 模块 `Filament`（`gz168/Filament`）本身是 Filament 组件库（`src/Tables/`），不是后台页面。它被 `filament-admin` require 是历史遗留；本次精简后 `filament/filament` 与 `gz168/Filament` 由各自的下游模块按需声明。