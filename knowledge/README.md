# Dev 学习知识库（Obsidian Vault）

这是个人 **Dev 学习 / Playground** 的 Obsidian Vault。请在 Obsidian 中选择"打开本地仓库"并选择本目录（`./knowledge`）。

入口：[[00-Home/学习地图]]

## 定位

- 用 LYT（Linking Your Thinking）：MOC 作主题索引，原子笔记挂载
- 复习靠 Dataview + 手写 `next-review` 字段
- 不混业务 / 生产资料；示例数据统一虚构

## 安全边界

本知识库不得保存：

- 密码、Token、API Key、Cookie、证书和私钥
- `.env` / 连接串 / SSH 配置
- 真实个人信息：姓名、邮箱、手机、地址、身份证号
- 生产数据库导出文件、生产日志、未脱敏错误截图

示例数据必须使用明显虚构。详见 [[07-Operations/知识库安全规范]]。

## 目录速览

| 分区 | 用途 |
| --- | --- |
| `00-Inbox` | 暂存区 |
| `00-Home` | 入口与 MOC |
| `10-Notes` | 原子笔记（按 topic 组织） |
| `20-Projects` | 项目复盘 |
| `30-Resources` | 外部资料（书 / 文章 / 视频 / 工具） |
| `06-Meetings/Daily` | Daily Notes |
| `07-Operations` | 安全与运维规范 |
| `90-Templates` | 笔记模板 |
| `99-Archive` | 历史归档（含 ERP 快照） |

## 仓库关系

- 父仓库：`/Users/37user/Documents/dev-laraval`（Dev 学习主项目）
- 历史 ERP 业务版（2026-07-26 前）已归档：`99-Archive/erp-snapshot-2026-07-26/`
- 仓库根 `AGENTS.md` 与 `docs-host/AI_DEVELOPMENT.md` 决定代码规范
