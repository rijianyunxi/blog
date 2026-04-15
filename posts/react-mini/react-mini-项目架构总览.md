---
title: React 迷你实现 - 项目架构总览
date: 2026-03-28
tags: [React, Fiber, 架构, 面试]
---

# React 迷你实现 - 项目架构总览

本文介绍 React Mini 项目的整体架构，理解 React 源码的组织方式和核心模块划分。

## 1. 项目结构

```
react-mini/
├── packages/
│   ├── react/              # React 核心 API
│   │   ├── src/
│   │   │   └── jsx.ts     # JSX 转换
│   │   └── index.ts       # 导出
│   ├── react-reconciler/   # 协调器（核心）
│   │   └── src/
│   │       ├── fiber.ts       # FiberNode
│   │       ├── fiberFlags.ts  # Fiber 标记
│   │       ├── workTags.ts    # 节点类型
│   │       ├── beginWork.ts   # 递阶段
│   │       ├── completeWork.ts # 归阶段
│   │       └── workLoop.ts    # 工作循环
│   └── shared/            # 共享类型
│       ├── ReactSymbols.ts
│       └── ReactTypes.ts
├── pnpm-workspace.yaml    # monorepo 配置
└── tsconfig.json
```

## 2. Monorepo 架构

使用 pnpm workspace 管理多包：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

优势：
- 代码复用
- 独立版本管理
- 统一构建

## 3. 模块职责划分

### react 包

提供公共 API：

```typescript
// react/index.ts
export { jsx } from './jsx'
export { createElement } from './jsx'
```

### react-reconciler 包

核心渲染协调逻辑：

```typescript
// 导出核心类型和函数
export { FirberNode } from './fiber'
export { beginWork } from './beginWork'
export { completeWork } from './completeWork'
```

### shared 包

共享类型定义：

```typescript
// ReactTypes.ts
export interface ReactElement {
  $$typeof: symbol | number
  type: any
  key: any
  ref: any
  props: any
}
```

## 4. 面试考察

### Q: React 为什么采用可插拔架构？

1. **灵活性**：可以替换协调器实现不同渲染目标
2. **可测试性**：每个模块独立测试
3. **跨平台**：Web (DOM)、Native (React Native)、Test Renderer 等

### Q: Reconciler 的作用？

Reconciler 负责：
- 计算最小更新
- 协调渲染
- 管理 Fiber 树

## 5. 总结

React Mini 项目展示了 React 的核心架构设计，通过模块化实现灵活性和可维护性。
