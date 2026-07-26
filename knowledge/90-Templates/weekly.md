---
type: weekly
topic: meta
tags: [weekly]
difficulty: 1
confidence: 3
reviewed: {{date}}
next-review: {{date+1M}}
created: {{date}}
updated: {{date}}
---

# 第 {{date:ww}} 周（{{date:YYYY}} / {{date:MM}} / {{date:DD}} 所在周）

> Obsidian Templater 用法：`tp.file.title` 默认为空，建议手动填或者用 `tp.date.now("YYYY-[W]WW")`。

## 本周焦点

- 目标 1
- 目标 2

## 本周 Daily Note

```dataview
LIST
FROM "06-Meetings/Daily"
WHERE date >= date({{date-7days}}) AND date <= date({{date}})
SORT date ASC
```

## 原子笔记更新

```dataview
TABLE WITHOUT ID
  file.link AS "笔记",
  topic AS "主题",
  reviewed AS "最近复习"
FROM "10-Notes"
WHERE updated >= date({{date-7days}})
SORT updated DESC
```

## 项目进展

```dataview
LIST
FROM "20-Projects"
WHERE updated >= date({{date-7days}})
```

## 读到 / 学到

- [[]]
- [[]]

## 下周计划

- [ ]
