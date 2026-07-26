---
type: ai-context
status: active
created: 2026-07-25
updated: 2026-07-26
tags:
  - ai
  - context
---

# AI 上下文

## 仓库当前定位

这是一个 **Dev 学习 / Playground 仓库**，核心目的是：

- 跑通 Laravel 13 + Filament 5 + Livewire 4 等新版本生态
- 学习 Tailwind v4、Boost v2、MCP v0 等 Laravel 周边
- 在 `20-Projects/` 写项目复盘 / 个人知识库
- 在 `knowledge/`（独立 Vault）维护长期学习笔记

原本的 ERP 业务定位已转为历史快照，整库归档在：

- `99-Archive/erp-snapshot-2026-07-26/`
- 旧的 ERP 模板归档在 `90-Templates/_archived-erp/`

如需查阅历史 ERP 规则（多端技术栈 ADR、订单/客户/财务业务字段说明等），直接读上述归档目录即可，**默认不应用**。

## 不可破坏的规则

1. **代码与凭据隔离**：仓库内不得提交 `.env`、密码、Token、私钥、客户隐私、生产数据。
2. **知识库净化**：笔记中若有截图/日志，只脱敏后再粘贴；示例数据必须是虚构。
3. **本地与示例优先**：示例代码不连真实数据库、不发真实 HTTP 请求、不打实际账单。
4. **保持 AI 阅读顺序**：从 `00-Home/学习地图` → 主题 MOC → 对应原子笔记 → 项目复盘。

## AI 阅读顺序（用于协助学习）

1. [[00-Home/学习地图]] — 入口与维护规则
2. 任务对应主题 MOC：
   - 前端 → [[00-Home/MOC-前端]]
   - 后端 / Laravel → [[00-Home/MOC-后端]]
   - 算法 → [[00-Home/MOC-算法]]
   - AI / Prompt → [[00-Home/MOC-AI]]
   - 工具链 / 工程 → [[00-Home/MOC-工程实践]]
3. 主题 MOC 下的具体原子笔记
4. 需要参考历史 ERP 经验时，回到 `99-Archive/erp-snapshot-2026-07-26/` 索引
5. 仓库根的 `AGENTS.md` 与 `docs/AI_DEVELOPMENT.md` 决定代码规范

## 仓库技术栈（开发时参考）

- PHP 8.5
- Laravel 13
- Filament 5 / Livewire 4
- Boost v2 + MCP v0
- Tailwind v4
- PHPUnit 12
- Composer / npm / Vite

## Git 工作约定（学习库 + 项目）

- 提交前缀建议：`docs:` `notes:` `retro:` `chore:` `feat:` `fix:`
- 笔记类提交可批处理：`notes: add JS event-loop atomic note`
- 知识库用独立仓库（`./knowledge`），不要把学习笔记混进 Laravel 项目提交；如确需引用，在项目 README 里挂链接
