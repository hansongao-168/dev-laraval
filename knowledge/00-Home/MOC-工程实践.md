---
type: mocs
topic: tools
status: active
created: 2026-07-26
updated: 2026-07-26
tags:
  - moc
  - tools
  - engineering
---

# MOC · 工程实践

> 工具链与工程素养：Git、Shell、Docker、CI、测试、调试、性能、可观测性。属于"练得更扎实、跑得更快"的部分。

## 学习路径

```mermaid
flowchart LR
    Shell[Shell & 编辑器] --> Git[Git 与协作]
    Git --> Docker[容器与部署]
    Docker --> CI[CI 与自动化]
    CI --> Test[测试金字塔]
    Test --> Perf[性能与可观测性]
```

## 推荐路线

1. **Shell & 编辑器**：zsh、bash 脚本、ripgrep/fd、Neovim/Vim、IDE 快捷键
2. **Git**：分支模型、rebase vs merge、bisect、stash、子模块
3. **Docker**：镜像、layer、Compose、网络与卷、多阶段构建
4. **CI**：GitHub Actions、cache、矩阵任务、Secret 管理
5. **测试**：单元 / 集成 / E2E、Mock、覆盖率、快照
6. **调试与性能**：`strace`、pprof、`perf`、火焰图、`EXPLAIN`
7. **可观测性**：结构化日志、metrics、tracing、SLO

## 子主题入口

- [[10-Notes/99-Cheat-Sheets/MOC]]

## 工程实践相关原子笔记

```dataview
TABLE WITHOUT ID
  file.link AS "笔记",
  topic AS "主题",
  subtopic AS "子主题",
  confidence AS "掌握",
  next-review AS "下次复习"
FROM "10-Notes"
WHERE topic = "tools" OR topic = "shell" OR topic = "git" OR topic = "docker" OR topic = "ci"
SORT confidence ASC
LIMIT 30
```

## 关联项目

- [[20-Projects/laravel-dev-laraval/复盘]]：本仓库的 Laravel 13 项目复盘
- 任何做过的项目，都应该在 `20-Projects/<项目名>/` 下写一份 retro
