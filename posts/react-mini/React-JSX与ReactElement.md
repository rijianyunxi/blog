---
title: React JSX 与 ReactElement
date: 2026-03-28
tags: [React, JSX, ReactElement, 面试]
---

# React JSX 与 ReactElement

JSX 是 React 的语法扩展，最终被编译为 `createElement` 调用，创建 ReactElement 对象。

## 1. JSX 转换

```jsx
// JSX 语法
const element = <div className="container">Hello</div>

// 编译后
const element = jsx('div', { className: 'container' }, 'Hello')
```

## 2. ReactElement 数据结构

```typescript
export interface ReactElement {
  $$typeof: symbol | number  // 元素类型标记
  type: any                   // 元素类型：标签名或组件
  key: any                   // 列表渲染时的 key
  ref: any                   // ref 引用
  props: Props               // 属性和子节点
  __mark: string             // 标记（React Mini 用）
}
```

### $$typeof

```typescript
// shared/ReactSymbols.ts
export const REACT_ELEMENT_TYPE = Symbol.for('react.element')
```

使用 Symbol 确保不会与普通对象混淆。

## 3. jsx 函数实现

```typescript
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'

const ReactElement = function(type, key, ref, props) {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __mark: 'react.element'
  }
}

export const jsx = (type, config, ...children) => {
  let key = null
  let ref = null
  const props = {}
  
  // 提取 key 和 ref
  for (const k in config) {
    if (k === 'key') {
      key = '' + config[k]
    } else if (k === 'ref') {
      ref = config[k]
    } else {
      props[k] = config[k]
    }
  }
  
  // 处理 children
  if (children.length === 1) {
    props.children = children[0]
  } else if (children.length > 1) {
    props.children = children
  }
  
  return ReactElement(type, key, ref, props)
}
```

## 4. key 的作用

```jsx
// key 帮助 React 识别列表中的元素
const list = items.map(item => (
  <li key={item.id}>{item.name}</li>
))
```

没有 key 时，React 只能逐位置比较，可能导致错误更新。

## 5. ref 的处理

```jsx
// ref 用于获取 DOM 元素或组件实例
<input ref={inputRef} />
```

## 6. 面试高频问题

### Q: JSX 转换原理？

JSX 通过 Babel 插件转换为 `jsx()` 函数调用。

### Q: ReactElement 和 DOM 节点的区别？

ReactElement 是纯 JS 对象，描述 UI 结构，不包含 DOM API。

## 7. 总结

- JSX 是语法糖
- ReactElement 是 UI 的虚拟描述
- key 和 ref 是特殊属性
