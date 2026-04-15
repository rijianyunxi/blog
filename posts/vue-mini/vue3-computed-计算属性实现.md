---
title: Vue3 computed 计算属性深度剖析：懒计算、缓存与 dirty 标记的秘密
date: 2026-03-28
tags: [Vue3, computed, dirty, 缓存, 面试]
---

# Vue3 computed 计算属性深度剖析：懒计算、缓存与 dirty 标记的秘密

## 前言

`computed` 是 Vue 中用于创建派生值的强大工具。表面上看，它只是一个能自动追踪依赖的响应式属性；但在 Vue3 的实现中，它蕴含了精心设计的懒计算、缓存优化和嵌套依赖追踪等高级特性。理解 computed 的实现，对面试和深入理解 Vue3 响应式系统都至关重要。

## 一、computed 的基本用法回顾

在深入源码之前，先回顾一下 computed 的典型用法：

```javascript
import { reactive, computed } from 'vue'

const state = reactive({
  firstName: '张',
  lastName: '三'
})

// 函数式
const fullName = computed(() => {
  return state.firstName + state.lastName
})

// 对象式（可读可写）
const fullName2 = computed({
  get() {
    return state.firstName + state.lastName
  },
  set(value) {
    const [first, last] = value.split('')
    state.firstName = first
    state.lastName = last
  }
})
```

## 二、computed 的数据结构

### ComputedRefImpl 类

```javascript
class ComputedRefImpl {
  public dep
  private effect
  public _value
  private _dirty = true // 核心：脏标记

  constructor(
    public getter: ComputedGetter,
    public setter: ComputedSetter,
    isReadonly: boolean
  ) {
    // 创建 ReactiveEffect，scheduler 用于依赖变化时的处理
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
    this.dep = createDep()
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    // 如果是脏的，重新计算
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    return this._value
  }

  set value(newValue) {
    this.setter(newValue)
  }
}
```

## 三、懒计算 — 核心设计理念

### 什么是懒计算？

"懒计算"（Lazy Evaluation）是一种计算策略：**不立即计算结果，而是在真正需要结果时才进行计算**。

```javascript
const a = computed(() => {
  console.log('computing...')
  return expensiveOperation()
})

// 此时不会打印 "computing..."
// 只有访问 a.value 时才会计算
console.log(a.value) // 打印 "computing..." 并返回结果
console.log(a.value) // 不打印，直接返回缓存结果
```

### 为什么需要懒计算？

考虑这样一个场景：

```javascript
const state = reactive({ a: 1, b: 2 })

const derived = computed(() => {
  // 这个计算可能很昂贵
  return slowFunction(state.a)
})

// 如果依赖变化就立即重新计算：
state.a = 10  // 立即计算 derived
state.a = 20  // 又立即计算一次
state.a = 30  // 再计算一次

// 但如果 derived 从来没有被访问呢？
// 这些计算全都浪费了！

// 懒计算的优势：
state.a = 10  // 只标记 dirty
state.a = 20  // 再次标记 dirty
state.a = 30  // 再次标记 dirty
// 只有当真正访问 derived.value 时才计算一次
console.log(derived.value) // 只计算一次
```

### _dirty 标记的工作原理

```javascript
get value() {
  // 1. 通知依赖这个 computed 的上层 effect
  //    （比如模板中使用了 {{ fullName }}）
  trackRefValue(this)

  // 2. 检查是否需要重新计算
  if (this._dirty) {
    // 重新计算
    this._value = this.effect.run()
    this._dirty = false
  }

  // 3. 返回缓存值
  return this._value
}
```

## 四、缓存机制的实现

### 缓存的价值

computed 的缓存机制避免了不必要的重复计算：

```javascript
const x = computed(() => {
  console.log('计算 x')
  return state.count * 2
})

// 多次访问，只计算一次
console.log(x.value) // 计算并打印 "计算 x"
console.log(x.value) // 直接返回缓存，不打印
console.log(x.value) // 直接返回缓存，不打印

state.count++ // 标记 x 为 dirty

console.log(x.value) // 重新计算，打印 "计算 x"
console.log(x.value) // 缓存，不打印
```

### 缓存清除时机

当 computed 的依赖发生变化时，缓存被清除：

```javascript
// 在 ReactiveEffect 的 scheduler 中
const effect = new ReactiveEffect(getter, () => {
  // 依赖变化时调用
  if (!this._dirty) {
    this._dirty = true
    // 通知依赖于这个 computed 的上层 effect
    triggerRefValue(this)
  }
})
```

这里有两个关键点：
1. **scheduler 懒标记 dirty**：依赖变化时不立即重新计算，只标记 dirty
2. **triggerRefValue**：通知上层依赖（比如模板），使其在下一次渲染时获取新值

## 五、依赖收集的精细化

### 访问时收集

computed 的依赖收集发生在 `get value` 中：

```javascript
get value() {
  // 关键：收集依赖
  trackRefValue(this)
  
  if (this._dirty) {
    this._value = this.effect.run()
    this._dirty = false
  }
  return this._value
}
```

`trackRefValue` 将当前 computed 的订阅者（可能是模板渲染 effect）添加到 computed 自己的 dep 中。

### effect.run() 中收集内部依赖

当 `_dirty` 为 true 时，会执行 `this.effect.run()`：

```javascript
get value() {
  trackRefValue(this)
  
  if (this._dirty) {
    // effect.run() 会执行 getter 函数
    // 在 getter 中访问的所有响应式属性都会被 track
    this._value = this.effect.run()
    this._dirty = false
  }
  return this._value
}
```

这意味着 computed 的依赖是在**计算时动态收集**的，而不是在初始化时固定的。

### computed 依赖变化时的通知链

```
state.count 变化
    ↓
trigger(state, 'set', 'count')
    ↓
触发 ComputedRefImpl.effect 的 scheduler
    ↓
scheduler: this._dirty = true, triggerRefValue(this)
    ↓
触发依赖于这个 computed 的 effect（比如渲染 effect）
    ↓
模板重新渲染，访问 {{ fullName }}
    ↓
ComputedRefImpl.get value() 被调用
    ↓
发现 _dirty = true，重新计算
```

## 六、嵌套 computed 的依赖追踪

### 实际场景

```javascript
const firstName = computed(() => state.firstName)
const lastName = computed(() => state.lastName)
const fullName = computed(() => firstName.value + lastName.value)

effect(() => {
  console.log(fullName.value)
})

state.firstName = '李'
// 链式通知：firstName → fullName → effect
```

### 实现机制

Vue3 通过 dep 的嵌套来支持这种场景：

1. `firstName` 变化 → 触发 `fullName` 的 effect 的 scheduler
2. `fullName` 的 scheduler 标记 `fullName._dirty = true` 并通知其订阅者
3. `effect` 被触发，重新访问 `fullName.value`
4. `fullName` 发现 `_dirty = true`，重新计算（同时会重新收集 `firstName` 和 `lastName` 的依赖）

## 七、readonly computed

### isReadonly 的处理

```javascript
class ComputedRefImpl {
  constructor(
    getter: ComputedGetter,
    public setter: ComputedSetter,
    isReadonly: boolean
  ) {
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    }, isReadonly ? doNothing : this.update)
  }
}
```

对于只读的 computed（没有 setter），Vue3 进行了优化，不注册 update scheduler。

## 八、computed 与 watchEffect 的对比

### 行为差异

| 特性 | computed | watchEffect |
|------|----------|-------------|
| 缓存 | ✅ 有缓存 | ❌ 无缓存 |
| 懒更新 | ✅ 依赖变化只标记 dirty | ❌ 依赖变化立即执行 |
| 返回值 | ✅ 返回响应式值 | ❌ 无返回值 |
| 初始执行 | ❌ 不自动执行 | ✅ 立即执行一次 |
| 适用场景 | 派生状态 | 副作用 |

### 选择建议

```javascript
// 派生状态 → 用 computed
const fullName = computed(() => firstName.value + lastName.value)
const isAdult = computed(() => age.value >= 18)

// 副作用 → 用 watchEffect
watchEffect(() => {
  document.title = `${firstName.value} ${lastName.value}`
})

// 异步副作用 → 用 watch
watch(state.query, async (query) => {
  const results = await searchAPI(query)
  this.results = results
})
```

## 九、性能优化：同时设置 shouldTrack

### 避免重复 track

```javascript
let shouldTrack = true
const trackStack: boolean[] = []

function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

function enableTracking() {
  shouldTrack = false
  trackStack.push(shouldTrack)
}

function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last !== undefined ? last : true
}
```

在某些情况下需要在依赖收集期间临时禁止 track，比如在 computed 的 getter 执行期间。

## 十、调试工具：computed 和 effect 的元信息

### onTrack 钩子

```javascript
const result = computed(() => obj.foo, {
  onTrack(e) {
    console.log('跟踪依赖:', e)
  },
  onTrigger(e) {
    console.log('触发更新:', e)
  }
})
```

这对于调试复杂的依赖关系非常有用。

### DevTools 集成

Vue3 DevTools 能够显示：
- 每个 computed 的依赖列表
- 最后一次计算的时间戳
- 缓存命中/未命中的统计

## 十一、面试高频问题

### Q1: computed 是同步还是异步更新的？

computed 本身是同步读取的，但它的"脏值"标记是异步的。依赖变化时，scheduler 只是标记 `_dirty = true` 和触发上层更新，真正的重新计算发生在下一次访问 `value` 时。

### Q2: 为什么 computed 能缓存结果？

因为 `_dirty` 标记。第一次访问时计算并缓存结果；后续访问如果 `_dirty` 为 false，直接返回 `_value`。

### Q3: computed 依赖变化后会立即重新计算吗？

**不会**。Vue3 采用懒计算策略：依赖变化只标记 dirty，等到下一次真正访问 value 时才重新计算。这避免了不必要的计算开销。

### Q4: computed 和 method 有什么区别？

```javascript
// method：每次调用都会重新执行
const fullName = () => firstName + lastName

// computed：有缓存，只在依赖变化时才重新计算
const fullName = computed(() => firstName + lastName)

// template 中：
// {{ fullName() }}  → 每次渲染都调用，可能多次计算
// {{ fullName }}    → 访问响应式值，有缓存优化
```

### Q5: computed 的 setter 有什么用？

```javascript
const fullName = computed({
  get() {
    return `${state.firstName} ${state.lastName}`
  },
  set(value) {
    const [first, last] = value.split(' ')
    state.firstName = first
    state.lastName = last
  }
})

// 可以直接赋值
fullName.value = '李 四'
```

setter 允许双向绑定的场景，比如表单组件。

### Q6: 多个 computed 依赖同一个响应式值，变化一次会触发多少次计算？

**零次**。依赖变化只标记 dirty，不立即计算。只有当每个 computed 被实际访问时才会计算。

## 十二、实现一个简易版 computed

```javascript
function computed(getter) {
  let value
  let dirty = true

  const effect = new ReactiveEffect(getter, () => {
    if (!dirty) {
      dirty = true
      triggerRefValue(computedRef)
    }
  })

  const computedRef = {
    get value() {
      trackRefValue(computedRef)
      if (dirty) {
        dirty = false
        value = effect.run()
      }
      return value
    }
  }

  return computedRef
}
```

这个简化版本体现了 computed 的核心：dirty 标记 + 懒计算 + 依赖追踪。

## 总结

Vue3 的 computed 实现是一个精心设计的性能优化方案：

1. **懒计算**：依赖变化不立即重算，只标记 dirty，按需计算
2. **缓存机制**：dirty 标记控制缓存生命周期，避免重复计算
3. **双向依赖链**：computed 既订阅它的依赖，又通知它的订阅者
4. **effect 调度**：通过 scheduler 实现更新调度

理解 computed 的实现，你不仅能在面试中回答相关问题，更能理解 Vue3 响应式系统的设计哲学——最小化不必要的工作，最大化运行效率。
