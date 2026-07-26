---
type: atomic
topic: javascript
subtopic: async
tags: [js, async, promise]
difficulty: 3
confidence: 3
reviewed: 2026-07-26
next-review: 2026-08-02
created: 2026-07-26
updated: 2026-07-26
---

# Promise

## 一句话

> Promise 是异步操作的占位对象，三种状态：`pending` → `fulfilled` / `rejected`，状态一旦不可再变。

## 状态机

```
       resolve → fulfilled
pending ─┤
       reject  → rejected
```

> 状态变化只能由微任务队列触发；不会"先 fulfilled 又 reject"。

## 常用方法

- `Promise.all` ：全成功才成功，任一失败即失败
- `Promise.race` ：以第一个 settle 的结果为准
- `Promise.allSettled` ：全部 settle，等待返回
- `Promise.any` ：第一个 fulfilled 即成功，全部 reject 才失败
- `Promise.resolve` / `Promise.reject`

## 代码

```js
async function load() {
  const [u, a] = await Promise.all([fetchUser(), fetchArticles()]);
  return { u, a };
}
```

## 易错

- `Promise` 嵌套（应 flatten 后加 `await`）
- `try/catch` 漏掉 `async` 函数整体
- `forEach` 里 `await` ≠ 顺序 (`for...of` / `Promise.all` 才是顺序)

## 关联

- [[事件循环]]
- [[async-await]]
