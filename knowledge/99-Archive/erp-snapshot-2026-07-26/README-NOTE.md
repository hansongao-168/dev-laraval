---
type: archive-note
status: archived
created: 2026-07-26
updated: 2026-07-26
tags:
  - archive
  - erp-snapshot
---

# ERP 快照说明（2026-07-26）

## 背景

`./knowledge` 在 2026-07-25 至 2026-07-25 期间用作 **ERP 项目的 Obsidian Vault**（多端 ERP 平台：Laravel 13 + Filament 5 + Next.js + Expo + Taro 小程序 + MySQL + Redis）。

从 2026-07-26 起，仓库定位改为 **Dev 学习 / Playground**，原 ERP 业务版笔记整体归档在本目录，**不再作为权威源**。

## 归档内容

- `00-Home-原ERP索引.md`：旧的 `ERP知识库.md` 副本
- `01-Product/`：原产品愿景、功能地图
- `02-Requirements-original/`：原需求看板与多端占位
- `03-Business-original/`：原业务分区（订单/客户/财务/库存/权限）
- `04-Engineering/`：原系统架构、API规范、数据字典
- `05-Decisions/`：原 ADR-0001 多端技术栈
- `07-Operations-原知识库安全规范.md`：原 ERP 业务版安全规范
- `08-References-original/`：原"已审核外部资料"占位

另：旧 ERP 模板归档在 `90-Templates/_archived-erp/`（`ADR.md` / `API.md` / `Business-Process.md` / `Requirement.md`）。

## 决定

- 不删除：所有内容用 `git mv` 保留，必要时可 `git log` 还原
- 不维护：本目录不再接受新增，bug 不再修复，链接可能断
- 不引用：默认情况下，主入口 [[00-Home/学习地图]] 与 [[00-Home/AI上下文]] 不指向这里
- 例外：[[20-Projects/laravel-dev-laraval/复盘]] 引用本目录做历史对比

## 想"复活"某条规则？

1. 找到归档原文（如 `04-Engineering/系统架构.md`）
2. 复制正文到合适新位置（通常是 `10-Notes/60-PHP-Laravel/`）
3. 在笔记内明示「源自 ERP 快照 @ 2026-07-26」
4. 更新 [[00-Home/学习地图]] 或对应 MOC
