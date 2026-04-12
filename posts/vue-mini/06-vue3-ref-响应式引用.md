---
title: Vue3 ref 响应式引用深度剖析：.value 拦截、ref vs reactive 与 toRef/toRefs 工具函数
date: 2026-03-28
tags: [Vue3, ref, reactive, toRef, toRefs, 面试]
---

# Vue3 ref 响应式引用深度剖析：.value 拦截、ref vs reactive 与 toRef/toRefs 工具函数

## 前言

`ref` 是 Vue3 中用于创建**单一响应式引用**的核心 API。虽然它的概念很简单——就是一个带有 `.value` 属性的响应式对象——但实现细节却蕴含了巧妙的 Proxy 拦截、类型系统和工具函数设计。本文将全面剖析 ref 的实现原理及其与 reactive 的关系。

## 一、ref 的基本概念

### 什么是 ref？

`ref` 用于将一个**原始值**（primitive value）转换为响应式引用：

```javascript
import { ref } from 'vue'

const count = ref(0)

console.log(count.value) // 0
count.value++
console.log(count.value) // 1
```

在模板中使用时，Vue 会自动解包 `.value`：

```vue
<template>
  <!-- 不需要 count.value，Vue 自动解包 -->
  <span>{{ count }}</span>
</template>
```

### ref 可以包装任何值

```javascript
const number = ref(1)           // 数字
const string = ref('hello')      // 字符串
const boolean = ref(true)        // 布尔值
const object = ref({ name: '张三' })  // 对象（会递归代理）
const array = ref([1, 2, 3])    // 数组（会递归代理）
```

## 二、ref 的实现原理

### RefImpl 类

```javascript
class RefImpl<T> {
  private _value: T
  private _rawValue: T
  public dep?: Dep
  public readonly __v_isRef = true

  constructor(
    value: T,
    public readonly _shallow = false
  ) {
    // _rawValue 保存原始值，用于比较是否变化
    this._rawValue = _shallow ? value : toRaw(value)
    // _value 保存响应式值（如果是对象会递归代理）
    this._value = _shallow ? value : convert(value)
  }

  get value() {
    // 依赖收集
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    // 如果新值和旧值不同，才触发更新
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = toRaw(newVal)
      this._value = this._shallow ? newVal : convert(newVal)
      // 触发更新
      triggerRefValue(this)
    }
  }
}
```

### convert 函数

```javascript
function convert(value: any) {
  return isObject(value) ? reactive(value) : value
}
```

关键点：如果 ref 的值是对象，会递归调用 `reactive` 进行代理。这意味着 ref 包装的对象也会变成响应式的。

## 三、.value 拦截机制

### 为什么需要 .value？

JavaScript 的原始类型（number、string、boolean）不是对象，无法直接用 Proxy 包装。因此需要用 `.value` 包装：

```javascript
// 原始类型无法直接代理
const a = 1  // 无法追踪变化

// ref 用对象包装
const a = ref(1)  // RefImpl 是一个对象，可以被代理
a.value = 2       // 触发 set 拦截 → 触发更新
```

### 自动解包机制

在以下场景中，Vue 会自动解包 `.value`：

```javascript
const count = ref(0)

// 1. 模板中自动解包
// <span>{{ count }}</span>  等价于 count.value

// 2. reactive 中自动解包
const state = reactive({ count })  // count.value 会自动解包

// 3. computed 中自动解包
const double = computed(() => count.value * 2)

// 4. watch 参数中自动解包
watch(count, (newVal) => { /* newVal 是 0，不是 RefImpl */ })
```

### 模板中的自动解包

Vue 在模板编译阶段，会将 `{{ count }}` 转换为类似以下的代码：

```javascript
// 伪代码
_withProxy(__returns__.count)
```

实际上，Vue 使用 `PublicInstanceProxyHandlers` 来处理模板中的属性访问：

```javascript
const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const result = instance.setupState[key]
    if (result && result.__v_isRef) {
      return result.value
    }
    return result
  }
}
```

### reactive 中的自动解包

```javascript
const count = ref(0)
const state = reactive({ count })

// state.count 自动解包为 count.value
// state.count === count.value // true
```

这是通过 reactive 的 get 拦截器实现的：

```javascript
function createGetter() {
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver)

    // 如果是 ref，自动解包
    if (isRef(res)) {
      return res.value
    }

    // 深层响应式...
    if (isObject(res)) {
      return reactive(res)
    }

    return res
  }
}
```

## 四、ref vs reactive：如何选择？

### 基本对比

| 特性 | ref | reactive |
|------|-----|----------|
| 适用类型 | 任意值（原始类型优先） | 仅对象 |
| 访问方式 | `.value` | 直接属性访问 |
| 重新赋值 | `obj.value = newValue` | `Object.assign(obj, {...})` |
| 解构丢失响应式 | 不会 | 会（需用 toRefs） |
| TypeScript 支持 | 更好 | 需要类型断言 |

### 使用场景

```javascript
// 原始类型 → 用 ref
const count = ref(0)
const name = ref('张三')

// 对象 → 可以用 ref 也可以用 reactive
const user1 = ref({ name: '张三', age: 20 })  // user1.value.name
const user2 = reactive({ name: '张三', age: 20 })  // user2.name

// 多个相关值 → 用 reactive 更简洁
const state = reactive({
  count: 0,
  name: '张三',
  isActive: true
})
```

### 重新赋值场景

```javascript
// ref：直接重新赋值
const obj = ref({ a: 1 })
obj.value = { a: 2 }  // 整个对象替换，响应式保持

// reactive：需要 Object.assign 或解构
const state = reactive({ a: 1 })
// state = { a: 2 }  // ❌ 错误：不能重新赋值整个对象
Object.assign(state, { a: 2 })  // ✅ 正确
```

## 五、toRef 与 toRefs

### toRef：创建响应式属性的引用

```javascript
import { reactive, toRef } from 'vue'

const state = reactive({
  count: 0,
  name: '张三'
})

// 创建一个到 state.count 的响应式引用
const countRef = toRef(state, 'count')

// countRef.value 和 state.count 保持同步
state.count++     // countRef.value === 1
countRef.value = 2 // state.count === 2
```

### toRef 的实现

```javascript
class ObjectRefImpl {
  constructor(
    public readonly target: object,
    public readonly key: string
  ) {}

  get value() {
    return this.target[this.key]
  }

  set value(newVal) {
    this.target[this.key] = newVal
  }
}

function toRef(target, key) {
  return new ObjectRefImpl(target, key)
}
```

`toRef` 返回的其实是一个**简单对象**，它没有自己的 dep，而是直接代理到原对象的属性。这意味着：

1. 它不会创建新的依赖关系
2. 它只是原对象属性的一个引用

### toRefs：批量转换

```javascript
import { reactive, toRefs } from 'vue'

const state = reactive({
  count: 0,
  name: '张三'
})

// 转换为多个 ref
const { count, name } = toRefs(state)

// count.value === state.count
// name.value === state.name
```

### toRefs 的实现

```javascript
function toRefs(object) {
  const ret = {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}
```

### 使用场景：解构 reactive

```javascript
// ❌ 解构会丢失响应式
const { count, name } = reactive({
  count: 0,
  name: '张三'
})

// ✅ toRefs 保持响应式
const { count, name } = toRefs(reactive({
  count: 0,
  name: '张三'
}))

// 在 setup 中常用
export default {
  setup() {
    const state = reactive({ count: 0, name: '张三' })
    
    return {
      ...toRefs(state)
    }
  }
}
```

## 六、shallowRef 与 triggerRef

### shallowRef

`shallowRef` 创建一个只跟踪**顶层** `.value` 变化的 ref：

```javascript
import { shallowRef, triggerRef } from 'vue'

const state = shallowRef({
  count: 0,
  nested: { value: 1 }
})

// 不会触发更新（嵌套对象变化没被追踪）
state.value.nested.value = 2

// 需要这样触发
state.value = { ...state.value, nested: { value: 2 } }

// 或者使用 triggerRef 强制更新
triggerRef(state)
```

### triggerRef

手动触发更新，用于某些框架无法自动追踪的场景：

```javascript
const state = shallowRef({ items: [] })

// 外部修改了数据（如 Vuex/Mutation）
externalModify(state.value.items)

// 强制触发更新
triggerRef(state)
```

### customRef 工厂函数

```javascript
function useDebouncedRef(value, delay = 200) {
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

const text = useDebouncedRef('hello')
```

## 七、isRef 类型守卫

### 类型检查

```javascript
import { isRef, ref } from 'vue'

const count = ref(0)
console.log(isRef(count)) // true

const rawNumber = 0
console.log(isRef(rawNumber)) // false

// 在函数参数中使用
function useValue(value) {
  if (isRef(value)) {
    return value.value
  }
  return value
}
```

### unref 工具函数

```javascript
function unref(ref) {
  return isRef(ref) ? ref.value : ref
}

// 使用
const value = unref(maybeRef) // 自动解包
```

## 八、ref 在模板中的解包机制

### 解包条件

Vue 在模板里会对 **顶层 ref** 做自动解包，但这个规则经常被说得过于绝对。

更稳妥的理解是：

- `\{\{ count \}\}`：`count` 是 ref，模板中会自动取 `.value`
- `\{\{ count + 1 \}\}`：`count` 依然会先被解包，再参与表达式计算
- `\{\{ user.name \}\}`：如果 `user` 是普通对象且 `user.name` 本身不是 ref，这里只是正常取属性，不属于 ref 自动解包的重点场景
- `v-for` 遍历出来的 `item` 是否是 ref，要看数据本身；不能一概而论地说“v-for 中不解包”
- `slot props`、函数返回值、对象深层属性等场景，行为更依赖实际上下文，面试里不要背成僵硬规则

### 解包规则

1. **模板会自动读取顶层 ref 的 `.value`**，这是最常见的场景
2. **在模板表达式里使用 ref 时，通常也会先完成解包**，如 `\{\{ count + 1 \}\}`
3. **不要把“任何嵌套场景都不解包”当成固定口诀**，更准确的说法是：是否自动解包与模板编译上下文有关
4. **面试回答时建议抓住本质**：`ref` 在 JavaScript 中要靠 `.value` 访问，但在模板里 Vue 帮我们做了一层便捷处理

## 九、ref 与 reactive 的互操作

### ref(reactive(...))

```javascript
const state = reactive({ count: 0 })

// 返回一个自动解包的 ref
const countRef = ref(state.count)

// 两种方式都能访问到相同的值
console.log(state.count)   // 0
console.log(countRef.value) // 0

// 修改其中一个，另一个也会变化
state.count = 1
console.log(countRef.value) // 1

countRef.value = 2
console.log(state.count)   // 2
```

### toRef(reactive, key)

```javascript
const state = reactive({ count: 0 })

// toRef 创建的引用与原始对象共享响应式依赖
const countRef = toRef(state, 'count')

// 修改原始对象，ref 也变化
state.count = 1
console.log(countRef.value) // 1
```

## 十、面试高频问题

### Q1: 为什么 ref 需要 .value 而 reactive 不需要？

因为 JavaScript 原始类型不是对象，无法直接被 Proxy 代理。ref 用一个对象包装原始值，`.value` 属性可以被 Proxy 拦截，从而实现响应式。reactive 只能用于对象，因为只有对象才能被 Proxy 代理。

### Q2: ref 和 reactive 哪个性能更好？

两者性能差异不大。ref 的 `.value` 访问会有轻微的 Proxy 查找开销，但对于实际应用来说可以忽略不计。选择的标准应该是**语义**：原始类型用 ref，对象用 reactive。

### Q3: toRef 和 toRefs 的区别是什么？

- `toRef(obj, key)`：为对象的单个属性创建响应式引用
- `toRefs(obj)`：为对象的所有属性创建响应式引用（返回一个新对象）

两者都创建的是原始对象属性的引用，不会创建新的依赖关系。

### Q4: shallowRef 和 ref 的区别？

- `ref` 会深度追踪嵌套对象/数组的变化
- `shallowRef` 只追踪 `.value` 的替换，不追踪嵌套属性的变化

### Q5: 为什么解构 reactive 需要 toRefs？

解构时，原始类型会丢失响应式能力。`toRefs` 将 reactive 对象的每个属性转换为独立的 ref，这些 ref 与原对象保持响应式连接，因此解构后仍能保持响应式。

### Q6: customRef 的使用场景？

`customRef` 允许自定义 ref 的 get/set 逻辑，适用于：
- 防抖/节流
- 异步更新
- 外部状态集成（如 localStorage、URL params）
- 实现特殊的响应式行为

## 十一、实践建议

### 组合式函数中的 ref

```javascript
function useCounter() {
  const count = ref(0)
  
  function increment() {
    count.value++
  }
  
  // 返回 ref，而非 .value
  // 这样调用方仍能保持响应式
  return {
    count,
    increment
  }
}

// 使用
const { count, increment } = useCounter()
watch(count, (newVal) => {
  console.log('count changed:', newVal)
})
```

### 最佳实践

1. **原始类型用 ref，对象用 reactive**
2. **setup 返回时优先使用 toRefs 保持响应式**
3. **避免在模板中访问 ref.value**
4. **需要精确控制更新时使用 shallowRef + triggerRef**

## 总结

Vue3 的 ref 系统是一个设计精巧的响应式方案：

1. **RefImpl 类**：通过 `.value` getter/setter 实现响应式追踪
2. **自动解包**：模板、reactive、computed 等场景自动解包 `.value`
3. **ref vs reactive**：按语义选择，原始类型用 ref，对象用 reactive
4. **toRef/toRefs**：保持解构后与原对象的响应式连接
5. **shallowRef + triggerRef**：提供细粒度的更新控制

理解 ref 的实现，你不仅能在面试中回答相关问题，更能在实际项目中游刃有余地使用它来管理响应式状态。
