---
type: ai-context
status: active
created: 2026-07-25
updated: 2026-07-25
tags:
  - ai
  - context
---

# AI 上下文

## 项目技术栈

- Laravel 13 API
- Filament 5 管理后台
- Next.js 16 全球网站
- Expo SDK 57 iOS/Android APP
- Taro React 4 微信小程序
- MySQL 8
- Redis 8

## 不可破坏的规则

1. 超级管理员不得通过应用修改或删除。
2. 初始化命令必须保持幂等。
3. Laravel API 是跨端业务数据的唯一事实来源。
4. 海外市场优先，同时兼容中国支付、登录、地图、推送和小程序渠道。
5. 知识库与 AI 对话中不得出现密码、Token、客户资料、财务明细或生产数据。

## AI 阅读顺序

1. [[01-Product/产品愿景]]
2. [[01-Product/功能地图]]
3. [[04-Engineering/系统架构]]
4. 当前任务对应的需求文档
5. 相关 ADR、业务规则与数据字典

代码规范以项目根目录的 `AGENTS.md` 和 `docs/AI_DEVELOPMENT.md` 为准。
