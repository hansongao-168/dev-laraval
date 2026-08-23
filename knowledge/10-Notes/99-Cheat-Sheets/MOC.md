---
type: mocs
topic: tools
subtopic: cheatsheet
status: active
created: 2026-07-26
updated: 2026-07-26
tags:
  - moc
  - cheatsheet
---

# MOC · 速查表

> 开发过程中的速查卡片：常用命令、API、配置片段。原子笔记形式存放。

## 子主题

- SQL 速查（MySQL/Postgres）
- HTTP 速查（状态码 / Header）
- Shell 速查（zsh/bash 常用组合）
- Git 速查（合流 / 急救 / 工作流）
- Docker 速查（compose / network）
- Vim/Nvim 速查
- [[dev-laraval-core-schema]] —— `dev-laraval` 仓库默认库 `dev_laravel` 的核心表速查（`users` / `cache` / `jobs` / `personal_access_tokens` 等）

## 内容

```dataview
TABLE WITHOUT ID
  file.link AS "速查",
  subtopic AS "子主题",
  confidence AS "掌握"
FROM "10-Notes/99-Cheat-Sheets"
WHERE type = "atomic"
SORT subtopic ASC
```

## 与资料的关系

- `30-Resources/tools/` 收集**外部**文章与链接
- 本目录（`10-Notes/99-Cheat-Sheets/`）维护**自己写**的速查卡
