---
type: mocs
topic: algorithms
status: active
created: 2026-07-26
updated: 2026-07-26
tags:
  - moc
  - algorithms
---

# MOC · 算法

> 算法与数据结构主题。每道题做一份原子笔记：思路 → 代码 → 复杂度 → 复盘，挂在 [[10-Notes/90-Algorithms/MOC]] 下面。

## 推荐路线

1. **数据结构基础**：数组、链表、栈、队列
2. **树与图**：二叉树、BST、DFS/BFS、并查集
3. **排序与查找**：二分、双指针、滑动窗口
4. **动态规划**：状态、转移方程、空间压缩
5. **高级**：回溯、贪心、单调栈、线段树、字典树

## 题型分类索引

- **数组 / 哈希**：两数之和、字母异位词分组、最长连续序列
- **双指针**：盛最多水的容器、三数之和
- **滑动窗口**：最小覆盖子串、无重复字符的最长子串
- **链表**：反转链表、环形链表、相交链表
- **二叉树**：遍历（前后中序）、最大深度、是否对称、最近公共祖先
- **图**：岛屿数量、单词接龙、课程表
- **动态规划**：爬楼梯、零钱兑换、最长回文子序列
- **回溯**：组合、子集、排列、括号生成
- **贪心**：跳跃游戏、分发糖果
- **堆 / 优先队列**：前 K 个高频元素、数据流的中位数

## 子主题入口

- [[10-Notes/90-Algorithms/MOC]]

## 算法相关原子笔记

```dataview
TABLE WITHOUT ID
  file.link AS "题目",
  subtopic AS "题型",
  difficulty AS "难度",
  confidence AS "掌握",
  next-review AS "下次复习"
FROM "10-Notes/90-Algorithms"
WHERE type = "atomic"
SORT difficulty ASC, confidence ASC
```

## 复习节奏建议

- 掌握度 = 1：连续 3 天每天复习
- 掌握度 = 2：间隔 1 周
- 掌握度 = 3：间隔 2 周
- 掌握度 = 4：间隔 1 月
- 掌握度 = 5：进终身复习列表，每季度一次

具体由 `next-review` 字段 + Dataview 控制，详见 [[00-Home/学习地图]]。
