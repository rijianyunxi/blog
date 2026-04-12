---
title: React.memo 与 useMemo 缓存实现
date: 2026-03-28
tags: [React, Hooks, 性能优化, 面试]
---

# React.memo 与 useMemo 缓存实现

React 提供了多种缓存机制来避免不必要的渲染和计算。

## 1. React.memo

memo 用于缓存组件，只有 props 变化时才重新渲染：

```javascript
import { memo } from 'react'

const MyComponent = memo(function MyComponent({ name }) {
  return <div>{name}</div>
})
```

### 原理

```javascript
function memo(Component) {
  return {
    $$typeof: Symbol.for('react.memo'),
    type: Component,
    compare: compare || Object.is
  }
}
```

### 浅比较 vs 深比较

```javascript
// 默认浅比较
const A = memo(Component)

// 自定义比较
const B = memo(Component, (prev, next) => {
  return prev.id === next.id
})
```

## 2. useMemo

useMemo 用于缓存计算结果：

```javascript
import { useMemo } from 'react'

function ExpensiveComponent({ data }) {
  const sortedData = useMemo(() => {
    return data.sort((a, b) => a.id - b.id)
  }, [data])
  
  return <List data={sortedData} />
}
```

### 实现

```javascript
function useMemo(fn, deps) {
  const hook = currentHook()
  const prevValue = hook.memoizedValue
  
  if (prevValue && depsAreSame(prevValue.deps, deps)) {
    return prevValue.value
  }
  
  const value = fn()
  hook.memoizedValue = { value, deps }
  return value
}
```

## 3. useCallback

useCallback 是 useMemo 的特例：

```javascript
const handleClick = useCallback(() => {
  doSomething(a, b)
}, [a, b])

// 等价于
const handleClick = useMemo(() => () => doSomething(a, b), [a, b])
```

## 4. 面试高频问题

### Q: React.memo 和 useMemo 的区别？

| API | 作用 | 缓存内容 |
|-----|------|---------|
| memo | 避免组件重新渲染 | 组件 |
| useMemo | 避免重复计算 | 计算结果 |
| useCallback | 避免函数重建 | 函数引用 |

### Q: 什么时候用 memo？

- 组件渲染频繁但 props 变化少
- 组件计算量大
- 纯展示组件

### Q: 不要滥用 memo

memo 有比较成本，如果组件本来就很快，memo 可能反而更慢。

## 5. 总结

React 的缓存机制帮助避免不必要的渲染和计算，提升应用性能。
