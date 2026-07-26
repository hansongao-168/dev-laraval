---
type: mocs
topic: meta
status: active
created: 2026-07-26
updated: 2026-07-26
tags:
  - moc
  - project
---

# MOC · Projects

> 个人 / 团队项目的复盘清单。每个项目一个子目录，内部含 `复盘.md`。

## 子目录约定

```
20-Projects/
├── README.md                       (本页)
├── _retro-template.md              占位，可选
├── <project-name>/
│   └── 复盘.md                     使用 90-Templates/project-retro
```

> 建议一个项目一次 retro；项目做完可以再开一版 v2 retro。

## 当前清单

- [[laravel-dev-laraval/复盘]] — Dev 学习主仓库

## 完成的项目复盘

```dataview
TABLE WITHOUT ID
  file.link AS "项目",
  status AS "状态",
  reviewed AS "上次复盘",
  next-review AS "下次复盘"
FROM "20-Projects"
WHERE type = "project-retro"
SORT updated DESC
```
