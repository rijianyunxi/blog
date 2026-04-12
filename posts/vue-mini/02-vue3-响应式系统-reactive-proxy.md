---
title: Vue3 响应式系统 - reactive & Proxy
date: 2026-03-28
tags: [Vue3, 响应式, 面试]
---

# Vue3 响应式系统 - reactive & Proxy

Vue3 的响应式系统是其核心特性之一，相比 Vue2 的 `Object.defineProperty`，Vue3 采用 `Proxy` 实现了更强大、更完善的响应式追踪机制。本文深入剖析 Vue3 响应式系统的核心实现。

## 1. 为什么需要响应式？

前端框架的核心职责之一就是保持视图与数据的同步。Vue 通过响应式系统，当数据发生变化时，自动更新对应的 DOM，无需开发者手动操作。

```javascript
const data = { name: 'Alice' }
// 在 Vue2 中，如果直接修改 data.name = 'Bob'
// 需要手动触发视图更新
```

Vue3 的响应式系统让这一切变得透明：

```javascript
import { reactive } from 'vue'

const state = reactive({ name: 'Alice' })
state.name = 'Bob' // 自动触发视图更新
```

## 2. Proxy  vs Object.defineProperty

### Vue2 的问题

Vue2 使用 `Object.defineProperty` 实现响应式，存在以下缺陷：

1. **无法监听新增属性**：需要使用 `Vue.set` 或 `this.$set`
2. **无法监听删除属性**：需要使用 `Vue.delete` 或 `this.$delete`
3. **数组索引变化无法监听**：直接通过索引赋值不会触发更新
4. **需要递归遍历**：每个属性都需要单独设置

```javascript
// Vue2 中的问题
const obj = {}

// 初始响应式
new Vue({ data: { obj } })

// 新增属性 - 不会触发响应式
obj.newProp = 'value' // 需要 this.$set(obj, 'newProp', 'value')
```

### Proxy 的优势

```javascript
const target = { name: 'Alice' }
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    console.log(`获取 ${key}`)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log(`设置 ${key} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  }
})

proxy.name = 'Bob' // 打印: 设置 name = Bob
console.log(proxy.name) // 打印: 获取 name
```

Proxy 可以：
- 代理整个对象，无需递归遍历
- 监听任何属性的新增、删除
- 监听数组索引变化
- 更好的性能（Proxy 本身更快）

## 3. Vue3 reactive 实现详解

### 核心源码

```typescript
// 响应式对象的缓存
const reactiveMap = new WeakMap<object, object>()

export function reactive<T extends object>(target: T): T {
  return createReactiveObject(target) as T
}

function createReactiveObject(target: object) {
  // 非对象直接返回
  if (!isObject(target)) {
    return target
  }
  
  // 避免重复代理
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)!
  }
  
  // 避免对已经代理过的对象再次代理
  if ((target as any)[ReactiveFlags.IS_REACTIVE]) {
    return target
  }
  
  // 创建代理
  const proxy = new Proxy(target, baseHandler)
  
  // 缓存代理对象
  reactiveMap.set(target, proxy)
  
  return proxy
}
```

### WeakMap 的选择

使用 `WeakMap` 而非 `Map` 的关键原因：

```javascript
// WeakMap 的特点：
// 1. key 必须是对象
// 2. key 没有强引用，可以被垃圾回收
// 3. 当对象没有任何引用时，会自动从 WeakMap 中移除

const map = new WeakMap()
let obj = { name: 'test' }
map.set(obj, 'value')

// 当 obj 没有其他引用时，会被垃圾回收
// map 会自动清理这个条目
obj = null // 原来的对象可以被回收
```

如果使用 `Map`：
```javascript
const map = new Map()
let obj = { name: 'test' }
map.set(obj, 'value')

obj = null // obj 引用断了，但 Map 中的条目依然存在
// 造成内存泄漏
```

### baseHandler 的 get/set 拦截

```typescript
export const baseHandler: ProxyHandler<object> = {
  get(target, key, receiver) {
    // 标记为已代理对象
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    
    // 依赖收集：追踪谁在读取这个属性
    track(target, key)
    
    const res = Reflect.get(target, key, receiver)
    
    // 深层响应式：如果是对象，继续代理
    if (isObject(res)) {
      return reactive(res)
    }
    
    return res
  },
  
  set(target, key, value, receiver) {
    const oldValue = Reflect.get(target, key, receiver)
    
    const res = Reflect.set(target, key, value, receiver)
    
    // 只有值真正变化才触发更新
    if (oldValue !== value) {
      trigger(target, key, value, oldValue)
    }
    
    return res
  }
}
```

## 4. 深层响应式

Vue3 的响应式是深层的（deep reactive），即嵌套对象也会被代理：

```javascript
const state = reactive({
  user: {
    name: 'Alice',
    address: {
      city: 'Beijing'
    }
  }
})

// user 和 address.city 变化都会触发更新
state.user.address.city = 'Shanghai'
```

实现方式：在 `get` 中递归代理：

```javascript
if (isObject(res)) {
  return reactive(res)
}
```

## 5. 响应式标记

### ReactiveFlags

```javascript
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw'
}
```

用于在 get 中判断当前对象的状态，避免无限递归。

### 区分响应式对象

```javascript
import { reactive, isReactive } from 'vue'

const state = reactive({ name: 'Alice' })
console.log(isReactive(state)) // true

// reactive 返回的对象有 __v_isReactive 标记
// 所以 get 时会返回 true
```

## 6. 其他响应式 API

### shallowReactive

只代理第一层属性：

```javascript
import { shallowReactive } from 'vue'

const state = shallowReactive({
  deep: {
    nested: 'value' // 这个对象不会被代理
  }
})
```

### readonly

创建只读代理：

```javascript
import { readonly, isReadonly } from 'vue'

const state = readonly({
  name: 'Alice'
})

state.name = 'Bob' // 警告：Cannot set on readonly object
```

## 7. 面试高频问题

### Q1: Vue3 为什么用 Proxy 替代 Object.defineProperty？

| 特性 | Vue2 (defineProperty) | Vue3 (Proxy) |
|------|----------------------|--------------|
| 新增属性 | 需要 $set | 自动监听 |
| 删除属性 | 需要 $delete | 自动监听 |
| 数组索引 | 不能直接监听 | 自动监听 |
| 性能 | 需要递归遍历 | 代理整个对象 |
| 浏览器支持 | IE9+ | 不支持 IE |

### Q2: WeakMap 和 Map 的区别？

- **Map**：key 可以是任意类型，有强引用，会导致内存泄漏
- **WeakMap**：key 必须是对象，没有强引用，对象回收时自动清理

### Q3: 深层响应式的性能问题？

深层代理有性能开销，但 Vue3 通过以下方式优化：
- 懒代理：只在访问时才递归代理
- 缓存：同一对象只代理一次
- 合理使用：不需要响应式的对象不要包在 reactive 里

### Q4: 如何判断一个对象是响应式的？

```javascript
import { isReactive, isProxy } from 'vue'

const state = reactive({ name: 'Alice' })

console.log(isReactive(state)) // true
console.log(isProxy(state)) // true（reactive 和 readonly 都是 proxy）
```

## 8. 实际应用场景

### 避免响应式开销

对于大型数据，不需要响应式的部分：

```javascript
import { shallowReactive, markNonReactive } from 'vue'

// 使用 markNonReactive 标记不会被代理的对象
const hugeData = markNonReactive(hugeArray)
```

### 响应式表单

```javascript
import { reactive } from 'vue'

const form = reactive({
  username: '',
  password: '',
  remember: false
})

// 双向绑定
// <input v-model="form.username">
```

## 9. 原理总结

```
reactive(obj)
    ↓
createReactiveObject(obj)
    ↓
检查缓存 (WeakMap)
    ↓
创建 Proxy(target, baseHandler)
    ↓
返回代理对象

代理对象访问属性时：
    ↓
get trap
    ↓
track() 收集依赖
    ↓
返回 Reflect.get() 结果
    ↓
如果是对象 → 递归 reactive()

代理对象修改属性时：
    ↓
set trap
    ↓
Reflect.set()
    ↓
值变化了？
    ↓
trigger() 触发更新
```

## 10. 总结

Vue3 的响应式系统基于 Proxy 实现了：

1. **更完善**：支持新增/删除属性、数组索引
2. **更高效**：无需递归遍历，懒代理
3. **更安全**：使用 WeakMap 避免内存泄漏
4. **更强大**：支持 readonly、shallowReactive 等变体

理解响应式原理对于深入 Vue3 开发、排查问题、性能优化都至关重要。

---

**相关面试知识点**：
- `reactive` vs `ref`
- `shallowReactive` vs `reactive`
- `readonly` 的实现
- 依赖收集与触发机制
- Effect 和 Scheduler
