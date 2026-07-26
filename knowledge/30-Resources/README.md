---
type: mocs
topic: meta
status: active
created: 2026-07-26
updated: 2026-07-26
tags:
  - moc
  - resources
---

# MOC · 外部资料

> 书籍、文章、视频、工具等外部资料的索引。**资料本身不进 Vault**，只进链接与摘要。

## 子目录

- `30-Resources/books/`  —— 书摘（每本一文件夹，内含 `书评.md` + `章节/`）
- `30-Resources/articles/` —— 文章（每篇一个 md，正文放在 frontmatter 的 `source.url`）
- `30-Resources/videos/`  —— 视频课程笔记
- `30-Resources/tools/`   —— 工具 / CLI 速查（与 `10-Notes/99-Cheat-Sheets/` 互补）

## 收录规则

1. **可重定向到原文**：能链回原文不要复制粘贴整段
2. **写自己的话**：每条资料必须有一段"用自己的话说"
3. **可追溯**：必须带 `source`（书 / 视频名 / URL）
4. **脱敏**：截图必须脱敏后再放

## 模板

- 书摘：`90-Templates/book-note.md`
- 文章：复用 `90-Templates/note.md`，`type=article`，`source` 填 URL
- 视频：`90-Templates/note.md`，`type=article`，`source` 填 `video: <name>`

## 资料列表

```dataview
TABLE WITHOUT ID
  file.link AS "笔记",
  topic AS "主题",
  source AS "来源",
  confidence AS "掌握"
FROM "30-Resources"
WHERE type = "article" OR type = "book"
SORT confidence ASC
```
