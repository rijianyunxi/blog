---
title: React Fiber 架构详解
date: 2026-03-28
tags: [React, Fiber, 架构, 面试]
---

# React Fiber 架构详解

Fiber 是 React 16 引入的新协调引擎，解决了旧版协调器无法中断和恢复工作的问题。

## 1. 什么是 Fiber？

Fiber 是一种数据结构，用于表示 React 元素的 Work（工作单元）：

```typescript
export class FirberNode {
  type: any              // 元素类型
  tag: WorkTag           // 节点类型
  key: Key               // key
  stateNode: any         // 真实 DOM 节点或组件实例
  
  // 树结构
  return: FirberNode | null  // 父节点
  child: FirberNode | null  // 第一个子节点
  sibling: FirberNode | null // 兄弟节点
  index: number              // 在父节点中的位置
  
  // Props
  pendingProps: Props     // 待处理的 props
  memoizedProps: Props | null  // 上次渲染的 props
  
  // 状态
  alternate: FirberNode | null  // 另一棵树上的对应节点
  
  // 标记
  flags: Flags            // 更新标记
}
```

## 2. WorkTag 节点类型

```typescript
export const FunctionComponent = 0   // 函数组件
export const HostRoot = 3           // 根节点
export const HostComponent = 5      // 原生 DOM 元素
export const HostText = 6           // 文本节点
export const HostPortal = 7         // Portal
```

## 3. FiberFlags 位运算标记

```typescript
export const NoFlags = 0b00000000000000000000000000000000
export const Placement = 0b00000000000000000000000000000001  // 新增
export const Update = 0b00000000000000000000000000000010    // 更新
export const ChildDeletion = 0b00000000000000000000000000000100  // 删除
export const Passive = 0b00000000000000000000000000001000  // 副作用
```

使用位运算可以在一个数字中存储多个标记。

## 4. Fiber 树双缓冲

React 维护两棵 Fiber 树：

```
current tree (已渲染)
    ↓ 切换
workInProgress tree (正在工作)
```

```typescript
// 创建 workInProgress 节点
function createWorkInProgress(current: FirberNode): FirberNode {
  const workInProgress = current.alternate || new FirberNode()
  // 复制属性
  workInProgress.alternate = current
  current.alternate = workInProgress
  return workInProgress
}
```

## 5. 为什么需要 Fiber？

### 旧版协调器的问题

- 同步更新，无法中断
- 大型应用卡顿
- 无法优先级更新

### Fiber 的解决方案

```typescript
// Fiber 可以将工作分成小单元
function workLoop() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

// 可以中断和恢复
function performUnitOfWork(fiber) {
  // 处理当前节点
  // ...
  
  // 如果有更高优先级的任务，可以中断
  if (shouldYield()) {
    // 让出控制权
    return
  }
  
  // 继续处理下一个节点
  workInProgress = nextFiber
}
```

## 6. Fiber 的工作阶段

### 1. Render 阶段（可中断）

- beginWork：计算 props，决定更新内容
- completeWork：完成当前节点工作

### 2. Commit 阶段（不可中断）

- 插入、更新、删除 DOM
- 执行副作用（useEffect）

## 7. 面试高频问题

### Q1: 什么是 Fiber？

Fiber 是一种数据结构，存储了组件的 UI 信息和工作状态，是 React 16 引入的新协调引擎。

### Q2: Fiber 解决了什么问题？

- 可中断渲染
- 优先级调度
- 更快响应用户交互

### Q3: alternate 的作用？

alternate 指向另一棵 Fiber 树上的对应节点，用于双缓冲，提高性能。

## 8. 总结

Fiber 架构的核心：

1. **FiberNode 数据结构**：存储工作单元信息
2. **双缓冲**：current 和 workInProgress 两棵树
3. **可中断**：将渲染工作分成小单元
4. **位运算标记**：高效存储更新类型
