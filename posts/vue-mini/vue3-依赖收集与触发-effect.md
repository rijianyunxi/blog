---
title: Vue3 依赖收集与触发机制：effect、track 与 trigger 源码解读
date: 2026-03-28
tags: [Vue3, effect, track, trigger, 依赖收集, 面试]
---

# Vue3 依赖收集与触发机制：effect、track 与 trigger 源码解读

## 前言

如果说响应式系统是 Vue3 的心脏，那么依赖收集与触发机制就是心脏里跳动的血液。当我们修改一个响应式数据时，Vue 是怎么知道该通知哪些地方更新的？答案就藏在 `effect`、`track`、`trigger` 这三个核心函数中。

## 一、effect 到底是什么？

### effect 的本质

`effect` 是 Vue3 响应式系统的核心执行单元。简单来说，effect 就是一个**会自动追踪其内部访问的所有响应式数据**的函数。当这些响应式数据发生变化时，effect 会自动重新执行。

```javascript
import { reactive, effect } from 'vue'

const state = reactive({ count: 0 })

effect(() => {
  console.log('count changed:', state.count)
})
// 输出: count changed: 0

state.count++
// 输出: count changed: 1
```

### ReactiveEffect 类的设计

Vue3 中 effect 的实现封装在 `ReactiveEffect` 类中：

```javascript
class ReactiveEffect {
  active = true
  deps = []
  parent = undefined

  constructor(
    public fn: Function,
    public scheduler: Function | null = null,
    scope?: EffectScope
  ) {
    // 记录 effect 所在的 scope，用于批量销毁
  }

  run() {
    // 1. 保存当前 activeEffect
    // 2. 将自己设置为 activeEffect
    // 3. 执行 fn
    // 4. 恢复之前的 activeEffect
    // 5. 返回 fn 的返回值
  }

  stop() {
    // 清除所有依赖，停止响应
  }
}
```

`fn` 是用户传入的副作用函数，`scheduler` 是一个可选的调度器，用于控制更新时机。`deps` 数组存储该 effect 依赖的所有响应式属性（实际上是响应式属性的 `dep` 集合）。

### 嵌套 effect 与依赖收集栈

effect 可以嵌套吗？当然可以！

```javascript
effect(() => {
  console.log('outer effect')
  effect(() => {
    console.log('inner effect')
    console.log(state.a)
  })
  console.log(state.b)
})
```

这里涉及到**依赖收集栈**的设计：

```javascript
// 全局变量
let activeEffect = undefined
const effectStack: ReactiveEffect[] = []

function effect(fn, options) {
  const effect = new ReactiveEffect(fn, options)
  effect.run() // 立即执行一次
}

// 在 get 拦截器中收集依赖
function track(target, type, key) {
  if (activeEffect) {
    // 收集到当前正在执行的 effect
    activeEffect.deps.push(dep)
    dep.add(activeEffect)
  }
}
```

当 effect 嵌套时，`activeEffect` 会被层层压栈和出栈，确保内层 effect 只收集内层访问到的依赖。

### effectScope 作用域

Vue3 引入了 `effectScope` 概念，用于批量管理多个 effect：

```javascript
const scope = effectScope()

scope.run(() => {
  effect(() => { /* ... */ })
  effect(() => { /* ... */ })
})

// 批量停止所有 scope 内的 effect
scope.stop()
```

这在组件场景下非常有用——组件卸载时，一次性停止所有相关 effect，而不是逐个手动清理。

## 二、targetMap — 三层嵌套 Map 结构

### 数据结构设计

Vue3 使用一个全局的 `targetMap`（WeakMap）来存储所有响应式对象的依赖关系：

```javascript
const targetMap = new WeakMap()

// 结构示意：
// targetMap
//   └── target (原始对象)
//       └── key (属性名)
//           └── Set<ReactiveEffect> (依赖该属性的所有 effect)
```

这是一个**三层嵌套结构**：

- **第一层**：WeakMap，以原始对象为 key
- **第二层**：Map，以属性名为 key
- **第三层**：Set，存储所有依赖该属性的 effect

### Dep 集合

每一层 Map 中的 Set 实际上是一个 `dep` 对象（类似 Set）：

```javascript
class Dep {
  subscribers = new Set()
  static target?: ReactiveEffect

  depend() {
    if (Dep.target) {
      this.subscribers.add(Dep.target)
      Dep.target.deps.push(this)
    }
  }

  notify() {
    this.subscribers.forEach(effect => {
      effect.run()
    })
  }
}
```

dep 的核心思想是：**一个属性对应一个 dep，所有依赖于这个属性的 effect 都存储在这个 dep 的 subscribers 中**。

## 三、track — 依赖收集

### track 的调用时机

`track` 函数在响应式对象的 **get 拦截器**中被调用：

```javascript
function createGetter() {
  return function get(target, key, receiver) {
    // ...
    // 关键：非 readonly 时进行依赖收集
    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }
    // ...
  }
}
```

### track 的实现

```javascript
let shouldTrack = true
const trackStack: boolean[] = []

function track(target, type, key) {
  if (!shouldTrack || !activeEffect) {
    return
  }

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }

  // 核心：建立 effect 和 dep 的双向关联
  trackEffects(dep)
}

function trackEffects(dep) {
  if (dep.target !== activeEffect) {
    dep.addSub(activeEffect)
    activeEffect.deps.push(dep)
  }
}
```

### track 的关键点

1. **shouldTrack 标志**：用于在某些场景下临时禁止收集（比如在 getter 中访问其他属性时）
2. **双向存储**：
   - `dep.subscribers.add(effect)` — 方便后续触发时遍历
   - `effect.deps.push(dep)` — 方便清理时反向遍历
3. **幂等性检查**：`dep.target !== activeEffect` 防止同一个 effect 对同一个 dep 重复添加

### 手动 stop 和清理

当 effect 不再需要时，需要清理依赖：

```javascript
class ReactiveEffect {
  stop() {
    // 从所有 dep 中移除自己
    cleanup(this)
  }
}

function cleanup(effect) {
  const { deps } = effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].subscribers.delete(effect)
  }
  effect.deps = []
}
```

## 四、trigger — 批量触发更新

### trigger 的调用时机

`trigger` 在响应式对象的 **set/delete 拦截器**中被调用：

```javascript
function createSetter() {
  return function set(target, key, value, receiver) {
    // ...
    const result = Reflect.set(target, key, value, receiver)

    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    // ...
  }
}

function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key)
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key)
  }
  return result
}
```

### trigger 的实现

```javascript
function trigger(
  target,
  type,
  key,
  newValue?,
  oldValue?,
  oldTarget?
) {
  // 1. 获取 target 对应的 depsMap
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return // 没有收集过依赖，直接返回
  }

  const effects: ReactiveEffect[] = []

  // 2. 根据操作类型收集需要触发的 effect
  if (key !== null) {
    // 收集与该 key 相关的 effect
    const effectsForKey = depsMap.get(key)
    if (effectsForKey) {
      effects.push(...effectsForKey)
    }
  }

  // 3. ADD 和 DELETE 还需要检查长度相关的 effect（如数组的 forEach）
  if (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) {
    const iterationKey = Array.isArray(target) ? 'length' : ITERATE_KEY
    const effectsForIterationKey = depsMap.get(iterationKey)
    if (effectsForIterationKey) {
      effects.push(...effectsForIterationKey)
    }
  }

  // 4. 排序：cleanup 的 effect 优先
  effects.push(...computedRunners)

  // 5. 遍历执行（注意去重）
  const run = (effect: ReactiveEffect) => {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }

  // 遍历执行所有 effect
  effects.forEach(run)
}
```

### trigger 的关键点

1. **按类型收集**：
   - SET 操作只触发该 key 的 effect
   - ADD 操作额外触发 `length` 相关的 effect（数组新增元素时，依赖 length 的代码也需要更新）
   - DELETE 操作额外触发 `ITERATE_KEY` 相关的 effect

2. **批量执行**：`effects.forEach(run)` 将所有相关 effect 一次性执行完，而不是逐个执行

3. **去重**：同一个 effect 可能在多个 dep 中（比如同时依赖 count 和 total），需要去重

### 批量更新与 nextTick

多个同步的响应式更新会被批量处理：

```javascript
let currentFlushPromise = null

function flushPostFlushCue() {
  queueFlush()
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}

function flushJobs() {
  // 执行队列中的所有 job
  queue.forEach(job => job())
  // ...
}
```

这意味着连续多次修改同一个值，只会触发一次视图更新。

## 五、computed 中的 dirty 机制

### computed 的特殊行为

computed 在依赖收集和触发上有自己的特殊逻辑：

```javascript
class ComputedRefImpl {
  dirty = true // 初始为 true，表示需要重新计算
  value = undefined

  get value() {
    // 收集依赖
    if (this.dirty) {
      this._dirty = false
      this.value = this.effect.run()
    }
    return this.value
  }

  // 依赖变化时调用
  notify() {
    if (!this.dirty) {
      this.dirty = true
      // 通知依赖于这个 computed 的上层 effect
      triggerRefValue(this, TriggerOpTypes.SET, 'value')
    }
  }
}
```

### dirty 标记的作用

`dirty` 标记是 computed 懒计算的核心：

1. **初始化**：dirty = true，首次访问时立即计算
2. **缓存**：计算后 dirty = false，后续访问直接返回缓存值
3. **失效**：依赖变化时 dirty = true，下一次访问重新计算
4. **避免重复计算**：如果一个 computed 被多个 effect 依赖，依赖变化后不会立即重新计算，而是等到第一次被访问时才计算

### scheduler 调度器

computed 内部使用 `scheduler` 来实现惰性更新：

```javascript
const effect = new ReactiveEffect(
  getter, // 用户传入的 getter
  () => {
    // scheduler：当依赖变化时，只标记 dirty，不立即重新计算
    if (!this._dirty) {
      this._dirty = true
      triggerRefValue(this)
    }
  }
)
```

## 六、完整流程图解

### 依赖收集流程

```
用户代码：
  effect(() => console.log(state.count))

1. effect.run()
   ↓
2. activeEffect = 当前 ReactiveEffect
   ↓
3. 执行 fn → 访问 state.count
   ↓
4. 进入 proxy.get 拦截器
   ↓
5. track(target, 'get', 'count')
   ↓
6. targetMap.get(target).get('count').add(activeEffect)
   ↓
7. activeEffect.deps.push(dep)
   ↓
8. 收集完成，返回 count 值
```

### 触发更新流程

```
用户代码：
  state.count = 2

1. 进入 proxy.set 拦截器
   ↓
2. Reflect.set(target, 'count', 2)
   ↓
3. trigger(target, 'set', 'count')
   ↓
4. 查找 targetMap.get(target).get('count')
   ↓
5. 遍历所有订阅的 ReactiveEffect
   ↓
6. 执行 effect.run() 或 effect.scheduler()
```

## 七、面试高频问题

### Q1: effect 和 watchEffect 有什么区别？

`effect` 是底层的响应式原语，直接对应 ReactiveEffect 类。`watchEffect` 是 Vue3 提供的更高级 API，它会自动收集依赖，并且支持配置 `flush` 时机（pre/post/sync）和 `onStop` 回调。

### Q2: 为什么需要双向存储（effect.deps 和 dep.subscribers）？

为了高效的清理。当 effect 停止时，需要从所有订阅的 dep 中移除自己；如果只知道 effect.deps，可以通过遍历 deps 来反向清理。如果只知道 dep.subscribers，可以正向遍历来触发更新。两者结合既支持高效触发，又支持高效清理。

### Q3: 依赖收集是在编译时还是运行时完成的？

Vue3 的响应式系统是**运行时**完成的，只有在 effect 执行过程中访问响应式属性时，才会进行依赖收集。这也是为什么 Vue3 不需要在编译时分析模板中的依赖关系。

### Q4: trigger 时为什么要按操作类型分别收集 effect？

因为不同的操作类型影响的范围不同。ADD 操作可能改变数组的 length，所以依赖 length 的 effect 也需要重新执行；DELETE 操作可能改变对象的 keys，所以依赖 for...in 或 Object.keys 的 effect 也需要更新。

### Q5: dirty 机制和直接重新计算的区别？

dirty 机制是**懒更新**：依赖变化时只标记 dirty，不立即重新计算，等到下次读取 computed 值时才重新计算。这避免了不必要的计算开销，特别是当 computed 被多个地方依赖但只有部分地方被访问时。

## 总结

Vue3 的依赖收集与触发机制是一个精心设计的系统：

1. **effect** 作为执行单元，自动追踪依赖
2. **targetMap** 三层结构存储完整的依赖图
3. **track** 在 get 时建立 effect 和属性的双向关联
4. **trigger** 在 set/delete 时找到所有相关 effect 并批量执行
5. **dirty 标记** 实现了 computed 的惰性计算优化

理解这套机制，你不仅能回答面试问题，更能理解 Vue3 响应式系统的设计哲学——用最小化的工作量，实现最大化的效率。
