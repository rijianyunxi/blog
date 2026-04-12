---
title: React Reconciler 协调器
date: 2026-03-28
tags: [React, Reconciler, 面试]
---

# React Reconciler 协调器

Reconciler 是 React 的核心，负责计算需要进行的最小更新操作。

## 1. Reconciler 的职责

1. **计算差异**：比较新旧 Fiber 树
2. **标记更新**：给需要更新的节点打标记
3. **协调渲染**：与 Renderer 配合完成更新

## 2. beginWork - 递阶段

```typescript
// 递阶段：自顶向下，处理当前 FiberNode
function beginWork(current, workInProgress, renderLanes): null | FirberNode {
  // 根据 tag 处理不同类型的节点
  switch (workInProgress.tag) {
    case HostRoot:
      return updateHostRoot(current, workInProgress)
    case HostComponent:
      return updateHostComponent(current, workInProgress)
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress)
    // ...
  }
  return null
}
```

## 3. completeWork - 归阶段

```typescript
// 归阶段：自底向上，完成当前节点工作
function completeWork(current, workInProgress): null | FirberNode {
  switch (workInProgress.tag) {
    case HostComponent:
      return completeHostComponent(current, workInProgress)
    case HostText:
      return completeHostText(current, workInProgress)
    // ...
  }
  return null
}
```

## 4. workLoop - 工作循环

```typescript
let workInProgress: FirberNode | null = null

function workLoop() {
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FirberNode) {
  // 1. beginWork：处理当前节点
  const next = beginWork(fiber)
  
  // 2. 如果还有子节点，继续处理子节点
  if (next !== null) {
    return next
  }
  
  // 3. 否则 completeWork 并处理兄弟
  let completedWork = fiber
  while (completedWork !== null) {
    completeWork(completedWork)
    if (completedWork.sibling !== null) {
      return completedWork.sibling
    }
    completedWork = completedWork.return
  }
  
  return null
}
```

## 5. prepareFreshStack - 初始化

```typescript
function prepareFreshStack(fiber: FirberNode) {
  // 创建 workInProgress 树
  workInProgress = fiber
}
```

## 6. 协调过程图解

```
           Root
           /  \
         A     B
        / \     \
       C   D     E

beginWork (递): Root → A → C
completeWork (归): C → A → D → A → B → E → B → Root
```

## 7. 面试高频问题

### Q: Render 和 Commit 阶段的区别？

- **Render 阶段**：可中断，计算需要更新的内容
- **Commit 阶段**：不可中断，执行 DOM 操作

### Q: performUnitOfWork 如何遍历树？

深度优先遍历：
1. 先处理当前节点（beginWork）
2. 有子节点就继续向下
3. 没有子节点就完成当前节点（completeWork）
4. 处理兄弟节点
5. 没有兄弟就返回父节点

## 8. 总结

Reconciler 通过 beginWork/completeWork 的双阶段工作，实现高效的树遍历和更新计算。
