---
title: Vue3 虚拟 DOM 与 VNode：理解 VNode 结构、ShapeFlags 与 h() 函数
date: 2026-03-28
tags: [Vue3, 虚拟DOM, VNode, ShapeFlags, h函数, 面试]
---

# Vue3 虚拟 DOM 与 VNode：理解 VNode 结构、ShapeFlags 与 h() 函数

## 前言

虚拟 DOM（Virtual DOM）是现代前端框架的核心概念之一。Vue3 虽然在运行时性能上做了大量优化（通过 Proxy 响应式系统和编译时优化），但虚拟 DOM 仍然是组件渲染和更新流程中不可或缺的一环。理解 VNode 的结构和 ShapeFlags 的设计，对于理解 Vue 的渲染机制和回答面试问题都至关重要。

## 一、什么是虚拟 DOM？

### 概念解释

虚拟 DOM 是真实 DOM 的 JavaScript 对象表示。它不是直接操作浏览器 DOM，而是先在内存中构建虚拟 DOM 树，然后通过 diff 算法找出最小更新，最后批量应用到真实 DOM。

```
真实 DOM：
<div class="container">
  <h1>Hello</h1>
  <p>World</p>
</div>

虚拟 DOM（简化）：
{
  type: 'div',
  props: { class: 'container' },
  children: [
    { type: 'h1', children: ['Hello'] },
    { type: 'p', children: ['World'] }
  ]
}
```

### 为什么要虚拟 DOM？

1. **声明式编程**：开发者只需描述 UI 状态，框架处理具体更新
2. **跨平台能力**：虚拟 DOM 不依赖浏览器，可以用于 SSR、Native 渲染
3. **批量更新优化**：减少直接 DOM 操作次数
4. **开发体验**：组件化的开发模式更易于维护

## 二、VNode 的数据结构

### 完整 VNode 结构

```javascript
interface VNode {
  // 标识符
  __v_isVNode: true
  type: VNodeTypes  // 'div' | Component | string | ... | null
  
  // 唯一标识，用于 diff 算法
  key: string | number | null
  
  // 元素引用
  el: Element | ComponentPublicInstance | null
  
  // 组件状态
  component: ComponentInternalInstance | null
  scopeId: string | null
  slotsProps: Record<string, any> | null
  
  // VNode 数据
  props: VNodeProps | null
  
  // 子节点
  children: VNodeNormalizedChildren
  
  // DOM 相关
  target: string | null  // teleport target
  targetAnchor: Anchor | null
  
  // 动态子节点（suspense）
  suspenseAnchor: Anchor | null
  fallback: VNode | null
  
  // normalize 后的子节点
  normalized: VNode[] | null
  
  // ShapeFlags
  shapeFlag: number
  
  // patchFlags（编译时优化）
  patchFlag: string | number
  
  // dynamicProps
  dynamicProps: string[] | null
  
  // dynamicChildren
  dynamicChildren: VNode[] | null
  
  // 原始 props（用于获取用户传入的 attrs）
  attrs: Record<string, string>
  
  // 事件监听
  listeners: Record<string, Function | Function[]>
  
  // transition
  transition: TransitionHooks | null
}
```

### 简化版 VNode

对于日常理解，我们可以把它简化为：

```javascript
const vnode = {
  type: 'div',           // 元素类型
  props: {               // 元素属性
    id: 'app',
    class: 'container',
    onClick: () => {}
  },
  children: [            // 子节点
    { type: 'h1', children: ['Hello'] },
    { type: 'p', children: ['World'] }
  ],
  el: divElement,        // 对应的真实 DOM 元素
  key: 'unique-key',    // 唯一标识
  shapeFlag: 7,          // 形状标志
  patchFlag: 0           // 补丁标志
}
```

## 三、ShapeFlags 形状标志

### 为什么需要 ShapeFlags？

JavaScript 没有类型系统，VNode 可能表示：
- HTML 元素
- 组件
- Fragment
- 文本节点
- Portal
- Suspense
- ...

ShapeFlags 用**位运算**高效地标记 VNode 的多种属性：

```javascript
export const ShapeFlags = {
  ELEMENT: 1,                    // 0000000001 - 普通元素
  TEXT: 2,                       // 0000000010 - 文本节点
  FRAGMENT: 4,                   // 0000000100 - Fragment
  COMPONENT: 8,                  // 0000001000 - 组件
  TELEPORT: 16,                  // 0000010000 - Teleport
  SUSPENSE: 32,                  // 0000100000 - Suspense
  COMPONENT_SHOULD_KEEP_ALIVE: 64,   // 0001000000
  COMPONENT_KEPT_ALIVE: 128,     // 0010000000
  SHALLOW: 256,                  // 0100000000
  TEXT_CHILDREN: 512,            // 1000000000 - children 是文本
  ARRAY_CHILDREN: 1024,          // 10000000000 - children 是数组
  CHILDREN: 2048,                // 100000000000 - 有子节点
  SLOT_CHILDREN: 4096,          // 1000000000000 - slot 子节点
}
```

### 位运算的优势

```javascript
// 组合标志
const shapeFlag = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
// = 1 | 1024 = 1025 (0000010000000001)

// 检查标志
if (shapeFlag & ShapeFlags.ELEMENT) {
  // 是元素
}

if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  // children 是数组
}
```

位运算的优势：
- **一个数字存储多个布尔值**：节省内存
- **检查效率高**：`&` 运算比 `includes` 快
- **组合灵活**：可以自由组合多个标志

### VNode 创建时的 ShapeFlags

```javascript
function createVNode(type, props, children, ...) {
  const vnode = {
    type,
    props,
    children,
    // ...
    shapeFlag: isElement
      ? ShapeFlags.ELEMENT
      : isComponent
        ? ShapeFlags.COMPONENT
        : ...
  }

  // 根据 children 类型补充 flags
  if (isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (isString(children)) {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }

  return vnode
}
```

## 四、h() 函数

### 基本用法

`h` 函数用于创建 VNode：

```javascript
import { h } from 'vue'

// 创建元素
h('div', { class: 'container' }, 'Hello')

// 创建带子元素
h('div', { class: 'container' }, [
  h('h1', 'Title'),
  h('p', 'Content')
])

// 事件处理
h('button', {
  class: 'btn',
  onClick: () => console.log('clicked')
}, 'Click me')

// 插槽
h('MyComponent', null, {
  default: () => h('span', 'slot content')
})
```

### h 函数的重载

```javascript
// 重载 1: h(type, text)
h('div', 'Hello')

// 重载 2: h(type, children)
h('div', [h('span'), h('span')])

// 重载 3: h(type, props, children)
h('div', { id: 'app' }, 'Hello')
h('div', { id: 'app' }, [h('span')])

// 重载 4: h(type, null, children)
h('div', null, 'Hello')
```

### h 的类型定义

```javascript
function h(
  type: VNodeTypes,           // 元素类型或组件
  propsOrChildren?: object | string | VNode[],  // 属性或子节点
  children?: VNodeChildren     // 子节点
): VNode
```

### VNodeChildren 的类型

```javascript
type VNodeChildren = 
  | string
  | number
  | boolean
  | VNode
  | VNode[]
  | null
  | Slots
  | (() => VNodeChildren)
```

## 五、VNode 的类型

### 1. 元素 VNode

```javascript
{
  type: 'div',
  props: { class: 'container', onClick: handleClick },
  children: ['Hello'],
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
}
```

### 2. 组件 VNode

```javascript
{
  type: MyComponent,  // 组件定义
  props: { title: 'Hello' },
  children: null,
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.COMPONENT
}
```

### 3. 文本 VNode

```javascript
{
  type: Text,
  children: 'Hello',
  shapeFlag: ShapeFlags.TEXT_CHILDREN
}
```

### 4. Fragment VNode

```javascript
{
  type: Fragment,
  children: [vnode1, vnode2],
  shapeFlag: ShapeFlags.FRAGMENT | ShapeFlags.ARRAY_CHILDREN
}
```

### 5. Portal VNode

```javascript
{
  type: Portal,
  props: { target: '#modal-root' },
  children: [modalContent],
  shapeFlag: ShapeFlags.TELEPORT | ShapeFlags.ARRAY_CHILDREN
}
```

## 六、patchFlag 动态节点标记

### 编译时优化

Vue3 的编译器会分析模板，标记哪些节点是动态的：

```vue
<template>
  <!-- 动态 class -->
  <div :class="cls">Static</div>
  
  <!-- 动态文本 -->
  <span>{{ name }}</span>
  
  <!-- 仅文本变化 -->
  <span :key="id">{{ text }}</span>
</template>
```

生成的代码会标记 patchFlag：

```javascript
[
  h('div', { class: cls, patchFlag: 2 /* CLASS */ }, 'Static'),
  h('span', null, [createTextVNode(name)]),  // patchFlag: 1 /* TEXT */
  h('span', { key: id }, [createTextVNode(text)], TEXT)
]
```

### patchFlag 常量

```javascript
export const PatchFlags = {
  TEXT: 1,           // 动态文本
  CLASS: 2,          // 动态 class
  STYLE: 4,          // 动态 style
  PROPS: 8,          // 动态 props（除 class、style）
  FULL_PROPS: 16,    // 需要完整 diff props
  HYDRATION_EVENTS: 32,  // 绑定事件
  STABLE_FRAGMENT: 64,   // 稳定的 fragment
  KEYED_FRAGMENT: 128,   // 有 key 的 fragment
  UNKEYED_FRAGMENT: 256, // 无 key 的 fragment
  NEED_PATCH: 512,       // 需要额外 patch
  DYNAMIC_SLOTS: 1024,   // 动态插槽
  DEV_ROOT_FRAGMENT: 2048
}
```

### hoistStatic 静态提升

编译时还会识别静态内容，提升到函数外部：

```javascript
// 模板
<div>
  <span>Static</span>
  <span>{{ dynamic }}</span>
</div>

// 编译后
const _hoisted_1 = createVNode('span', null, 'Static')  // 提升

function render(ctx) {
  return (
    h('div', null, [
      _hoisted_1,  // 复用静态 VNode
      h('span', null, [toDisplayString(ctx.dynamic), 1])
    ])
  )
}
```

## 七、Vue3 的渲染流程

### 完整流程

```
组件定义 (setup)
    ↓
编译模板 (template → render function)
    ↓
执行 render function → 生成 VNode 树
    ↓
创建/更新 DOM (patch)
    ↓
挂载到容器 (mount)
```

### createApp 的流程

```javascript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

// 等价于
const app = createApp(App)
const vnode = createVNode(App)
render(vnode, document.getElementById('app'))
```

### render 函数

```javascript
function render(vnode, container) {
  if (vnode === null) {
    // 卸载
    unmount(vnode, container)
  } else {
    // 挂载或更新
    patch(container._vnode, vnode, container)
  }
  container._vnode = vnode
}
```

## 八、dynamicChildren 动态子树

### 静态提升的补充

除了静态提升，Vue3 还维护了 `dynamicChildren` 数组，只包含动态节点：

```javascript
const vnode = {
  type: 'div',
  children: [
    { type: 'span', dynamicProps: ['class'], patchFlag: 2 },  // 动态
    { type: 'p', children: ['static text'] },                  // 静态
    { type: 'i', patchFlag: 1 },                               // 动态
  ],
  dynamicChildren: [
    { type: 'span', dynamicProps: ['class'], patchFlag: 2 },
    { type: 'i', patchFlag: 1 }
  ]
}
```

### 块级 VNode

```javascript
function createBaseVNode(
  type,
  props,
  children,
  flag = 0,
  patchFlag = 0
) {
  const vnode = {
    type,
    props,
    children,
    patchFlag,
    // ...
    shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.CHILDREN,
    // ...
  }

  // 如果有动态子节点，标记为 BLOCK
  if (patchFlag > 0) {
    vnode.patchFlag = patchFlag
  }

  return vnode
}
```

### 块的作用

1. **跳过静态节点**：在 diff 过程中，优先处理 dynamicChildren
2. **精确追踪**：只更新需要更新的节点
3. **缓存优化**：静态子树可以被缓存

## 九、VNode 与 Diff 算法

### 为什么需要 diff？

```javascript
// 旧 VNode
{ type: 'ul', children: [
  { type: 'li', key: 1, children: ['A'] },
  { type: 'li', key: 2, children: ['B'] },
  { type: 'li', key: 3, children: ['C'] }
]}

// 新 VNode
{ type: 'ul', children: [
  { type: 'li', key: 1, children: ['A'] },
  { type: 'li', key: 3, children: ['C'] },  // B 被移除了
  { type: 'li', key: 2, children: ['B'] },  // 位置变化了
]}
```

diff 算法需要找出：
- B 被删除
- C 从位置 2 移到位置 1
- B 从位置 3 移到位置 2

### Vue3 的 diff 优化

1. **首尾指针法**：从两端向中间比较
2. **最长递增子序列**：用于最小化移动
3. **key 的作用**：帮助精确匹配和复用节点

## 十、面试高频问题

### Q1: 虚拟 DOM 相比直接操作 DOM 有什么优势？

1. **声明式**：开发者只关心状态，不用关心如何更新 DOM
2. **批量更新**：减少 DOM 操作次数
3. **跨平台**：不依赖浏览器环境，可用于 SSR、Native
4. **开发体验**：更易于组件化和维护

### Q2: ShapeFlags 的作用是什么？

ShapeFlags 用位运算标记 VNode 的多种属性（是元素还是组件、children 是什么类型等），可以高效地检查类型，同时节省内存。

### Q3: patchFlag 和 dynamicChildren 的作用？

patchFlag 标记 VNode 中哪些部分是动态的，dynamicChildren 数组只包含动态子节点。这两个机制让 Vue3 在 diff 时可以跳过静态节点，只处理动态部分，大幅提升性能。

### Q4: key 在 diff 算法中的作用？

1. **精确匹配**：有 key 时，diff 算法可以通过 key 精确找到对应节点
2. **复用元素**：没有 key 时，只能通过类型和位置匹配，可能导致错误复用
3. **状态保留**：有 key 时，组件状态会随 key 保留；没有 key 时可能被错误复用

### Q5: Vue3 比 Vue2 在虚拟 DOM 上有哪些优化？

1. **编译时优化**：patchFlag、dynamicChildren、静态提升
2. **块级 VNode**：不再强制所有节点都在同一个数组中
3. **事件缓存**：函数引用变化时才更新
4. **SSR 优化**： hydration 性能提升

### Q6: h() 函数返回的是什么？

`h()` 函数返回 VNode（虚拟 DOM 节点），不是真实 DOM。VNode 是 JavaScript 对象，描述了要创建的 DOM 结构。

## 十一、手写简易 VNode

```javascript
function h(type, props, children) {
  return {
    type,
    props: props || {},
    children: children || null,
    key: props?.key || null,
    el: null
  }
}

// 使用
const vnode = h('div', { class: 'container' }, [
  h('h1', null, 'Hello'),
  h('p', { class: 'text' }, 'World')
])
```

## 总结

Vue3 的虚拟 DOM 系统是一个精心优化的渲染方案：

1. **VNode 结构**：完整描述了 DOM 节点的类型、属性、子节点等信息
2. **ShapeFlags**：用位运算高效标记节点类型
3. **h() 函数**：声明式创建 VNode 的工具函数
4. **patchFlag + dynamicChildren**：编译时优化的关键
5. **diff 算法**：通过 key 和优化策略实现高效的最小更新

理解虚拟 DOM，你不仅能回答面试问题，更能理解 Vue 响应式系统与渲染系统如何协同工作。
