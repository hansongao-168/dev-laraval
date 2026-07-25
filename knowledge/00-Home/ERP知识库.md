---
type: index
status: active
owner:
market:
  - global
  - china
platform:
  - backend
  - admin
  - web
  - mobile
  - wechat
created: 2026-07-25
updated: 2026-07-25
tags:
  - erp
  - index
---

# ERP 知识库

> [!important]
> 这里保存业务知识、产品需求、架构决策和流程说明，不保存密码、密钥、客户资料、财务明细或生产数据。

## 快速入口

- [[01-Product/产品愿景]]
- [[01-Product/功能地图]]
- [[04-Engineering/系统架构]]
- [[04-Engineering/API规范]]
- [[04-Engineering/数据字典]]
- [[07-Operations/知识库安全规范]]
- [[00-Home/AI上下文]]

## 工作视图

- [[02-Requirements/需求看板.base]]
- [[05-Decisions/架构决策.base]]

## 内容分区

| 分区 | 用途 |
| --- | --- |
| `00-Inbox` | 尚未归档的临时记录 |
| `01-Product` | 产品愿景、路线图和功能地图 |
| `02-Requirements` | 多端需求与验收标准 |
| `03-Business` | 订单、库存、财务、客户和权限规则 |
| `04-Engineering` | 架构、API、数据字典和部署 |
| `05-Decisions` | ADR 架构决策记录 |
| `06-Meetings` | 会议纪要和每日记录 |
| `07-Operations` | 运营、发布和安全规范 |
| `08-References` | 已审核的外部参考资料 |
| `90-Templates` | 标准文档模板 |
| `91-Attachments` | 图片和附件 |
| `99-Archive` | 已废弃或历史内容 |

## 维护规则

1. 新内容先进入 `00-Inbox`，确认分类后再移动。
2. 一个概念只保留一个权威页面，其他页面使用内部链接。
3. 需求状态只能使用 `draft`、`review`、`approved`、`in-progress`、`done`、`deprecated`。
4. 重要技术选择必须创建 ADR。
5. 每次业务规则变化都要同步更新相关需求和数据字典。
