---
title: Vue3 watch 侦听器全面解析：watch vs watchEffect、deep 深度监听与 immediate 立即执行
date: 2026-03-28
tags: [Vue3, watch, watchEffect, 侦听器, 面试]
---

# Vue3 watch 侦听器全面解析：watch vs watchEffect、deep 深度监听与 immediate 立即执行

## 前言

`watch` 和 `watchEffect` 是 Vue3 中用于响应数据变化的两个核心 API。它们看似相似，实则有着本质的区别。理解它们的工作原理对于掌握 Vue3 的响应式系统至关重要，也是面试中的高频考点。

## 一、watch vs watchEffect：核心区别

### watchEffect 的工作方式

`watchEffect` 是一个立即执行的函数，它会自动追踪其回调函数中访问的所有响应式属性：

```javascript
import { ref, watchEffect } from 'vue'

const count = ref(0)

watchEffect(() => {
  // 自动追踪 count.value 的变化
  console.log('count changed:', count.value)
})

count.value++ // 触发回调
count.value++ // 再次触发
```

### watch 的工作方式

`watch` 则需要显式指定要监听的数据源：

```javascript
import { ref, watch } from 'vue'

const count = ref(0)

watch(count, (newValue, oldValue) => {
  console.log(`count changed from ${oldValue} to ${newValue}`)
})

count.value++ // 触发回调，打印 "count changed from 0 to 1"
```

### 关键区别

| 特性 | watchEffect | watch |
|------|------------|-------|
| 数据源 | 自动收集所有依赖 | 需要显式指定 |
| 回调参数 | 无法获取 oldValue | 可以获取 newValue 和 oldValue |
| 初始执行 | 立即执行一次 | 默认懒执行（除非 immediate: true） |
| 停止清理 | 返回 stop 函数 | 同上 |
| 适用场景 | 副作用操作 | 需要旧值的场景 |

### 选择建议

```javascript
// 需要旧值时 → 用 watch
watch(userId, (newId, oldId) => {
  fetchUserData(newId)
})

// 副作用（清理、DOM 操作）→ 用 watchEffect
watchEffect(() => {
  // 访问任意响应式属性
  console.log(state.name)
  console.log(state.age)
})
```

## 二、watch 的源码实现

### doWatch 函数

Vue3 的 `watch` 实际上是对 `doWatch` 的封装：

```javascript
function watch(
  source: any,
  cb: WatchCallback,
  options?: WatchOptions
) {
  return doWatch(source, cb, options)
}
```

`doWatch` 是核心实现：

```javascript
function doWatch(
  source: WatchSource | WatchSource[],
  cb: WatchCallback | undefined,
  { immediate, deep, flush, onTrack, onTrigger } = {}
) {
  // 1. 获取响应式的 getter
  let getter: () => any

  if (isRef(source)) {
    // ref: 直接访问 .value
    getter = () => source.value
  } else if (isReactive(source)) {
    // reactive: 递归追踪所有属性
    getter = () => source
    deep = true // reactive 默认是 deep 的
  } else if (isFunction(source)) {
    // 函数: 直接作为 getter
    getter = source
  }

  // 2. 创建 effect
  const effect = new ReactiveEffect(getter, () => {
    // scheduler: 依赖变化时的回调
    if (cb) {
      // 调度回调执行
      queueJob(job)
    }
  })

  // 3. 立即执行一次（如果设置了 immediate）
  if (immediate) {
    job()
  } else {
    // 记录初始值
    oldValue = effect.run()
  }
}
```

### job 函数

```javascript
const job = () => {
  const newValue = effect.run()
  if (deep || hasChanged(newValue, oldValue)) {
    // 回调函数
    cb(newValue, oldValue)
    // 更新旧值
    oldValue = shallowCopy(newValue)
  }
}
```

job 函数是 watch 回调的实际执行者，它会：
1. 执行 effect 获取新值
2. 比较新旧值（deep 模式下深度比较）
3. 如果值发生变化，调用回调
4. 更新 oldValue

## 三、deep 深度监听

### deep 的实现原理

```javascript
function deepRender(value) {
  if (isObject(value)) {
    // 如果是对象，递归遍历所有属性
    // 并为每个属性调用 track
    for (const key in value) {
      deepRender(value[key])
    }
    return value
  }
  return value
}
```

deep 模式的核心是在初始化时递归访问所有嵌套属性：

```javascript
function doWatch(source, cb, options) {
  let getter = () => {
    if (isReactive(source)) {
      return source // 不需要包装，reactive 本身就是深度响应式
    }
    return source
  }

  // 对于 ref，需要手动深度追踪
  if (isRef(source) && deep) {
    getter = () => deepRender(source.value)
  }

  // ...
}
```

### deep 的典型场景

```javascript
const state = reactive({
  user: {
    profile: {
      name: '张三'
    }
  }
})

// deep: true 才能监听到深层变化
watch(state, (newVal, oldVal) => {
  console.log('state 变化了')
}, { deep: true })

state.user.profile.name = '李四' // 触发回调
```

### deep 的性能考量

deep 监听会有性能开销，因为需要递归访问所有属性来建立依赖关系。对于大型对象，可以考虑：

1. **使用 computed 精确控制依赖**：
```javascript
// 只监听关心的路径
watch(() => state.user.profile.name, (newName) => {
  // 只在 name 变化时触发
})
```

2. **使用 watchEval 延迟深度追踪**：
```javascript
watch(
  () => state.items,
  (items) => { /* 只在 items 整体变化时触发 */ },
  { deep: false }
)
```

## 四、immediate 立即执行

### immediate 的作用

默认情况下，watch 是懒执行的——回调只在依赖变化后触发。设置 `immediate: true` 会让回调在初始化时立即执行一次：

```javascript
const count = ref(0)

watch(count, (newVal, oldVal) => {
  console.log(`变化: ${oldVal} -> ${newVal}`)
}, { immediate: true })

// 立即输出: 变化: undefined -> 0
```

### immediate 的实现

```javascript
function doWatch(source, cb, { immediate }) {
  let oldValue

  const job = () => {
    const newValue = effect.run()
    if (cb) {
      if (hasChanged(newValue, oldValue)) {
        cb(newValue, oldValue)
        oldValue = shallowCopy(newValue)
      }
    }
  }

  // 关键：immediate 为 true 时立即执行
  if (immediate) {
    job()
  } else {
    oldValue = effect.run()
  }
}
```

注意 `oldValue` 的初始值：`undefined`。这意味着在 immediate 模式下，第一次回调的 oldValue 参数是 undefined。

## 五、scheduler 调度机制

### 为什么需要调度？

Vue3 使用微任务队列来批量处理更新，这带来了几个好处：

1. **避免重复更新**：同一 tick 内多次修改只会触发一次回调
2. **异步批处理**：所有同步修改完成后才执行回调
3. **更可预测的更新时机**：统一在 DOM 更新后执行

### flush 选项

```javascript
watch(count, () => {
  console.log('updated')
}, {
  flush: 'pre' // 默认: 'pre'
})
```

`flush` 有三个选项：

| 值 | 时机 | 用途 |
|---|------|------|
| `'pre'` | DOM 更新前（组件更新前） | 默认，模板渲染相关 |
| `'post'` | DOM 更新后 | DOM 操作、$nextTick |
| `'sync'` | 立即同步 | 测试、精确控制 |

### scheduler 实现

```javascript
function doWatch(source, cb, { flush = 'pre' }) {
  const effect = new ReactiveEffect(getter, () => {
    if (cb) {
      switch (flush) {
        case 'sync':
          cb() // 立即执行
          break
        case 'pre':
          queueJob(job) // 放入 pre 队列
          break
        case 'post':
          queuePostRenderEffect(job, 'post') // 放入 post 队列
          break
      }
    }
  })
}
```

## 六、监听多个数据源

### 同时监听多个源

```javascript
watch(
  [ref1, ref2, () => state.value],
  ([new1, new2, new3], [old1, old2, old3]) => {
    console.log('任意一个变化了')
  }
)
```

### 实现原理

```javascript
function doWatch(
  source: WatchSource | WatchSource[],
  cb,
  options
) {
  // 如果是数组，为每个源创建 getter
  let getter: () => any
  if (isArray(source)) {
    getter = () => source.map(s => {
      if (isRef(s)) {
        return s.value
      } else if (isReactive(s)) {
        return traverse(s)
      } else if (isFunction(s)) {
        return s()
      }
    })
  }

  // job 中获取新值数组
  const job = () => {
    if (cb) {
      const newValue = effect.run()
      cb(newValue, oldValue)
    }
  }
}
```

## 七、watch 的停止与清理

### 自动停止

在 `setup` 或 `script setup` 中使用 `watch`，组件卸载时会自动停止：

```javascript
// setup 中
const stop = watch(count, () => {
  console.log('updated')
})

// 手动停止
stop()
```

### onInvalidate 回调

```javascript
watch(id, async (newId, oldId, onInvalidate) => {
  let valid = true
  onInvalidate(() => {
    valid = false
  })

  const response = await fetchData(newId)
  if (valid) {
    // 只有组件还在时才更新
    data.value = response
  }
})
```

`onInvalidate` 在以下时机被调用：
- watch 停止时
- 回调即将重新执行前
- 组件卸载时

### stop 的实现

```javascript
function stop() {
  effect.stop()
  if (cleanup) {
    cleanup()
  }
}
```

## 八、watchEffect 的实现

### 与 watch 的区别

`watchEffect` 是 watch 的简化版本：

```javascript
function watchEffect(effect, options) {
  return doWatch(
    effect, // 既是 source 也是 callback
    null,
    options
  )
}
```

### 隐式依赖收集

```javascript
function watchEffect(effect, options) {
  let cleanup

  const onInvalidate = (fn) => {
    cleanup = effect.onStop = () => {
      fn()
    }
  }

  const getter = () => {
    cleanup = effect.onStop = undefined
    if (onInvalidate) {
      effect(onInvalidate)
    }
  }

  const job = () => {
    if (effect.dirty) {
      effect.run()
    }
  }

  doWatch(getter, null, options)
}
```

## 九、watchPostEffect 与 watchSyncEffect

```javascript
// 等价于 watch(source, cb, { flush: 'post' })
const watchPostEffect = (cb) => watch(source, cb, { flush: 'post' })

// 等价于 watch(source, cb, { flush: 'sync' })
const watchSyncEffect = (cb) => watch(source, cb, { flush: 'sync' })
```

## 十、常见面试问题

### Q1: watch 和 watchEffect 的区别是什么？

- `watchEffect` 自动追踪所有依赖，无需指定数据源；`watch` 需要显式指定
- `watchEffect` 默认立即执行一次；`watch` 默认懒执行（除非 `immediate: true`）
- `watchEffect` 无法获取旧值；`watch` 可以通过回调参数获取新值和旧值

### Q2: watch 的 deep 选项有什么性能影响？如何优化？

deep 会在初始化时递归访问所有嵌套属性来建立依赖关系。对于大型对象，可以考虑：
1. 使用 `computed` 精确监听特定路径
2. 使用 `watch` 配合 getter 函数只监听需要的属性
3. 使用 `unwatch` 及时停止不需要的监听

### Q3: watch 的 immediate 和 post 一起用会发生什么？

`immediate: true` 会让回调在初始化时**同步**执行一次（在 effect.run() 中）。`flush: 'post'` 只影响后续的依赖变化触发的执行时机。

### Q4: watch 的回调是同步还是异步的？

默认情况下（`flush: 'pre'`），watch 回调是**异步**的，通过微任务队列调度执行。这允许多次修改在一次渲染中完成。`flush: 'sync'` 可以让回调同步执行。

### Q5: 如何监听 reactive 对象中的某个特定属性变化？

```javascript
const state = reactive({
  user: { name: '张三', age: 20 }
})

// 使用 getter 函数
watch(
  () => state.user.name,
  (newName, oldName) => {
    console.log(`name changed: ${oldName} -> ${newName}`)
  }
)
```

## 十一、实际应用场景

### 搜索输入防抖

```javascript
const searchQuery = ref('')

watch(
  searchQuery,
  (query) => {
    // 防抖处理
    debouncedSearch(query)
  },
  { debounce: 250 } // VueUse 提供的选项
)
```

### 数据预取

```javascript
const userId = ref(1)

watch(
  userId,
  async (id) => {
    const user = await fetchUser(id)
    userData.value = user
  },
  { immediate: true }
)
```

### 依赖外部 API

```javascript
watch(
  () => state.config,
  async (config) => {
    const api = new ExternalAPI(config)
    await api.initialize()
    onInvalidate(() => api.dispose())
  },
  { deep: true }
)
```

## 总结

Vue3 的 watch 系统是一个功能完善的响应式监听方案：

1. **watch vs watchEffect**：显式 vs 隐式依赖、懒执行 vs 即时执行、旧值可用 vs 不可用
2. **deep 深度监听**：递归追踪嵌套属性，但需要注意性能
3. **immediate 立即执行**：让回调在初始化时就运行一次
4. **scheduler 调度**：通过 flush 选项控制执行时机（pre/post/sync）
5. **停止与清理**：通过 onInvalidate 处理异步清理

理解这些机制，你不仅能回答面试问题，更能在实际项目中灵活运用这两个强大的 API。
