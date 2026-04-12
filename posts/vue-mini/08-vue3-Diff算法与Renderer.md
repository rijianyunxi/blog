---
title: Vue3 Diff 算法与 Renderer
date: 2026-03-28
tags: [Vue3, Diff, Renderer, 面试]
---

# Vue3 Diff 算法与 Renderer

Vue3 的 Renderer 负责将虚拟 DOM 渲染到真实 DOM，Diff 算法则负责高效地比较新旧 VNode 的差异并更新视图。

## 1. Renderer 的职责

Renderer 的核心职责：
1. **挂载（Mount）**：将 VNode 转换为真实 DOM
2. **更新（Patch）**：比较新旧 VNode，差异化更新
3. **卸载（Unmount）**：移除不再需要的 DOM

## 2. 挂载流程

```typescript
function mountElement(vnode, container) {
  const { type, props, children } = vnode
  
  // 创建真实 DOM
  const el = document.createElement(type)
  
  // 设置属性
  for (const key in props) {
    patchProp(el, key, null, props[key])
  }
  
  // 处理子节点
  if (children) {
    if (isString(children)) {
      el.textContent = children
    } else {
      children.forEach(child => patch(null, child, el))
    }
  }
  
  container.appendChild(el)
}
```

## 3. patchProp 属性更新

```typescript
function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    el.className = nextValue
  } else if (key === 'style') {
    // 样式处理
    for (const k in nextValue) {
      el.style[k] = nextValue[k]
    }
  } else if (isEvent(key)) {
    // 事件处理
    const eventName = key.slice(2).toLowerCase()
    el.addEventListener(eventName, nextValue)
  } else {
    // 普通属性
    el.setAttribute(key, nextValue)
  }
}
```

## 4. Diff 算法核心

### Vue2 的双端 Diff

Vue2 使用双端指针，从头尾同时比较：

```
旧：[A, B, C, D]
新：[A, B, E, C]

Step 1: 头头比较 A === A，命中
Step 2: 头头比较 B === B，命中
Step 3: 头尾比较 C !== E，不匹配
Step 4: 尾头比较 D !== E，不匹配
```

### Vue3 的优化

1. **最长递增子序列（LIS）**
2. **首尾预设**
3. **patchFlag 静态标记**

## 5. Vue3 Diff 流程

```typescript
function patchKeyedChildren(
  c1: VNode[],
  c2: VNode[],
  container
) {
  let i = 0
  let e1 = c1.length - 1
  let e2 = c2.length - 1
  
  // 1. 从头比较
  while (i <= e1 && i <= e2) {
    if (isSame(c1[i], c2[i])) {
      patch(c1[i], c2[i])
    } else break
    i++
  }
  
  // 2. 从尾比较
  while (i <= e1 && i <= e2) {
    if (isSame(c1[e1], c2[e2])) {
      patch(c1[e1], c2[e2])
    } else break
    e1--
    e2--
  }
  
  // 3. 新增/删除
  if (i > e1) {
    // 新增
    for (let j = i; j <= e2; j++) {
      patch(null, c2[j], container)
    }
  } else if (i > e2) {
    // 删除
    for (let j = i; j <= e1; j++) {
      unmount(c1[j])
    }
  }
  
  // 4. 中间区域：使用 Map + LIS 优化
  // ...
}
```

## 6. 核心函数 patch

```typescript
function patch(n1, n2, container) {
  // 类型不同，直接替换
  if (n1.type !== n2.type) {
    unmount(n1)
    mountElement(n2, container)
    return
  }
  
  // 类型相同，差异化更新
  const { type, patchFlag, children } = n2
  
  if (patchFlag & PatchFlags.ELEMENT) {
    // 元素更新
    patchElement(n1, n2)
  } else if (type === Text) {
    // 文本更新
    patchText(n1, n2)
  } else if (type === Fragment) {
    // Fragment 处理
    patchChildren(n1, n2)
  }
}
```

## 7. patchElement 元素更新

```typescript
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  
  // 更新 props
  patchProps(n1.props, n2.props, el)
  
  // 更新子节点
  if (n2.dynamicChildren) {
    // Vue3 优化：只更新动态子节点
    patchBlockChildren(n1, n2)
  } else {
    // 普通全量比较
    patchChildren(n1, n2)
  }
}
```

## 8. Vue3 的优化策略

### 1. Block Tree

```vue
<div>
  <span>{{ dynamic }}</span>
  <static-content />
</div>
```

编译后只有 dynamic 部分需要更新。

### 2. 静态提升

```vue
<div>
  <h1>静态标题</h1>
  <p>{{ dynamic }}</p>
</div>
```

静态部分只创建一次。

### 3. v-memo 缓存

```vue
<div v-memo="[count]">
  {{ count }}
  {{ other }}
</div>
```

## 9. 面试高频问题

### Q1: Vue3 Diff 和 Vue2 的区别？

| 特性 | Vue2 | Vue3 |
|------|------|------|
| 算法 | 双端比较 | 首尾预设 + LIS |
| 静态优化 | 无 | patchFlag |
| 动态节点 | 全量比较 | block tree |
| 缓存 | 无 | v-memo |

### Q2: key 的作用？

1. 标记节点身份
2. 帮助 Diff 算法复用 DOM
3. 维持列表顺序

### Q3: 为什么不能使用 index 作为 key？

```vue
<!-- 错误用法 -->
<li v-for="(item, index) in list" :key="index">

<!-- 正确用法 -->
<li v-for="item in list" :key="item.id">
```

使用 index 在列表中间插入/删除时，可能导致错误的 DOM 复用。

## 10. 总结

Vue3 的渲染和 Diff 优化：

1. **Renderer**：负责 VNode 到真实 DOM 的转换
2. **patch**：核心差异化更新函数
3. **patchFlag**：标记动态内容
4. **Block Tree**：减少遍历
5. **LIS**：最小化移动次数
