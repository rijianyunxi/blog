---
title: Promise 完整实现：从状态机到 Promise.all 的全链路手写
date: 2026-03-28
tags: [JavaScript, Promise, 手写实现, 异步编程, 面试]
---

## 前言

Promise 是 JavaScript 异步编程的基石，也是前端面试中考察频率最高的手写题之一。它看似简单——`new Promise`、`.then`、`.catch`——但背后涉及状态机、微任务队列、链式调用、错误冒泡等核心机制。本文将按照 Promise A+ 规范，从零实现一个完整的 MyPromise，覆盖所有常见面试考点。

---

## 一、Promise 核心概念回顾

Promise 有三种状态：

- **pending**：初始状态，既没有被兑现，也没有被拒绝
- **fulfilled**：操作成功完成（也叫 resolved）
- **rejected**：操作失败

状态转换规则只有两条：`pending → fulfilled` 和 `pending → rejected`，一旦变更不可逆。

```js
const p = new Promise((resolve, reject) => {
  // 异步操作...
  resolve('成功')  // pending → fulfilled
  // reject('失败')  // pending → rejected
})
```

---

## 二、基础结构：构造函数与状态机

我们从最基础的构造函数开始，实现状态管理：

```js
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MyPromise {
  constructor(executor) {
    // 初始状态
    this.status = PENDING
    this.value = undefined    // 成功的值
    this.reason = undefined   // 失败的原因

    // 存储成功/失败的回调
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []

    const resolve = (value) => {
      if (this.status === PENDING) {
        this.status = FULFILLED
        this.value = value
        // 状态变更后，依次执行成功回调
        this.onFulfilledCallbacks.forEach(fn => fn())
      }
    }

    const reject = (reason) => {
      if (this.status === PENDING) {
        this.status = REJECTED
        this.reason = reason
        // 状态变更后，依次执行失败回调
        this.onRejectedCallbacks.forEach(fn => fn())
      }
    }

    // executor 立即执行，传入 resolve 和 reject
    try {
      executor(resolve, reject)
    } catch (e) {
      reject(e)  // executor 执行出错直接 reject
    }
  }
}
```

**关键点：**

1. 状态只能从 `pending` 变为 `fulfilled` 或 `rejected`，通过 `if (this.status === PENDING)` 保证
2. `onFulfilledCallbacks` 和 `onRejectedCallbacks` 用于处理异步场景——当 `then` 先于 `resolve` 调用时暂存回调
3. `executor` 中抛出的异常会被 `try/catch` 捕获并转为 `reject`

---

## 三、then 链式调用（核心难点）

`then` 是 Promise 的灵魂，它返回一个新的 Promise，从而实现链式调用。根据 Promise A+ 规范：

- `onFulfilled` 和 `onRejected` 都是可选参数
- 如果不是函数，必须被忽略（值穿透）
- 回调必须异步执行（微任务）

```js
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  // 值穿透：如果不是函数，包装为透传函数
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
  onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

  const promise2 = new MyPromise((resolve, reject) => {
    const fulfilledTask = () => {
      queueMicrotask(() => {
        try {
          const x = onFulfilled(this.value)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    }

    const rejectedTask = () => {
      queueMicrotask(() => {
        try {
          const x = onRejected(this.reason)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    }

    if (this.status === FULFILLED) {
      fulfilledTask()
    } else if (this.status === REJECTED) {
      rejectedTask()
    } else if (this.status === PENDING) {
      // 异步场景：暂存回调
      this.onFulfilledCallbacks.push(fulfilledTask)
      this.onRejectedCallbacks.push(rejectedTask)
    }
  })

  return promise2
}
```

### resolvePromise 的实现

这是规范中最复杂的部分——处理 `then` 回调返回值的各种情况：

```js
function resolvePromise(promise2, x, resolve, reject) {
  // 1. 循环引用检测：x 不能等于 promise2
  if (promise2 === x) {
    return reject(new TypeError('Chaining cycle detected for promise'))
  }

  // 2. 如果 x 是 MyPromise 实例，递归处理
  if (x instanceof MyPromise) {
    x.then(resolve, reject)
    return
  }

  // 3. 如果 x 是对象或函数，尝试取出 then 方法（thenable）
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false  // 防止多次调用

    try {
      const then = x.then
      if (typeof then === 'function') {
        then.call(
          x,
          (y) => {
            if (called) return
            called = true
            // y 可能还是一个 Promise，递归解析
            resolvePromise(promise2, y, resolve, reject)
          },
          (r) => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } else {
        // 有 then 属性但不是函数，直接 resolve
        resolve(x)
      }
    } catch (e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    // 4. 基本类型值，直接 resolve
    resolve(x)
  }
}
```

**面试高频考点：**

- **值穿透**：`.then()` 不传回调时，值会原样传递给下一个 `then`
- **循环引用**：`then` 返回的 `promise2` 等于回调返回值 `x` 时，必须抛出 `TypeError`
- **`called` 标志位**：防止 `thenable` 对象的 `resolvePromise` 和 `rejectPromise` 被多次调用
- **微任务**：使用 `queueMicrotask`（或 `setTimeout` 模拟）确保回调异步执行

---

## 四、静态方法实现

### 4.1 Promise.resolve / Promise.reject

```js
MyPromise.resolve = function (value) {
  if (value instanceof MyPromise) return value
  return new MyPromise(resolve => resolve(value))
}

MyPromise.reject = function (reason) {
  return new MyPromise((_, reject) => reject(reason))
}
```

### 4.2 Promise.all

等待所有 Promise 完成，任一失败则整体失败：

```js
MyPromise.all = function (promises) {
  return new MyPromise((resolve, reject) => {
    const arr = []
    let count = 0
    const len = promises.length

    if (len === 0) return resolve(arr)

    promises.forEach((p, i) => {
      // 用 resolve 包裹，处理非 Promise 值
      MyPromise.resolve(p).then(
        (value) => {
          arr[i] = value
          count++
          if (count === len) resolve(arr)
        },
        (reason) => reject(reason)
      )
    })
  })
}
```

**注意点：** 结果数组保持输入顺序，用 `arr[i] = value` 而非 `arr.push`，因为异步完成的顺序不确定。

### 4.3 Promise.race

返回最先完成（成功或失败）的 Promise：

```js
MyPromise.race = function (promises) {
  return new MyPromise((resolve, reject) => {
    if (promises.length === 0) return

    promises.forEach((p) => {
      MyPromise.resolve(p).then(resolve, reject)
    })
  })
}
```

### 4.4 Promise.allSettled

等待所有 Promise 完成（无论成功失败），返回每个的结果描述：

```js
MyPromise.allSettled = function (promises) {
  return new MyPromise((resolve) => {
    const arr = []
    let count = 0
    const len = promises.length

    if (len === 0) return resolve(arr)

    promises.forEach((p, i) => {
      MyPromise.resolve(p).then(
        (value) => {
          arr[i] = { status: 'fulfilled', value }
          count++
          if (count === len) resolve(arr)
        },
        (reason) => {
          arr[i] = { status: 'rejected', reason }
          count++
          if (count === len) resolve(arr)
        }
      )
    })
  })
}
```

### 4.5 Promise.any

返回最先成功的 Promise，全部失败才返回 `AggregateError`：

```js
MyPromise.any = function (promises) {
  return new MyPromise((resolve, reject) => {
    const errors = []
    let count = 0
    const len = promises.length

    if (len === 0) {
      return reject(new AggregateError([], 'All promises were rejected'))
    }

    promises.forEach((p, i) => {
      MyPromise.resolve(p).then(
        (value) => resolve(value),  // 第一个成功就直接 resolve
        (reason) => {
          errors[i] = reason
          count++
          if (count === len) {
            reject(new AggregateError(errors, 'All promises were rejected'))
          }
        }
      )
    })
  })
}
```

---

## 五、catch 与 finally

```js
MyPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

MyPromise.prototype.finally = function (callback) {
  return this.then(
    (value) => MyPromise.resolve(callback()).then(() => value),
    (reason) => MyPromise.resolve(callback()).then(() => { throw reason })
  )
}
```

`finally` 的要点：无论成功失败都执行，但**不改变** Promise 的最终结果。`callback()` 可能返回一个 Promise，需要等待它完成。

---

## 六、微任务机制说明

在浏览器环境中，Promise 的回调通过微任务队列执行。在我们的实现中使用 `queueMicrotask` 来模拟：

```js
// 等价于
Promise.resolve().then(() => { /* 回调 */ })
```

如果环境不支持 `queueMicrotask`，可以用 `MutationObserver`（浏览器）或 `process.nextTick`（Node.js）模拟。面试时用 `setTimeout` 也行，但要说明这会退化为宏任务，只是简化实现。

---

## 七、错误处理总结

Promise 的错误处理遵循**冒泡机制**——错误会沿着 then 链向下传递，直到被最近的 `catch` 捕获：

```js
doSomething()
  .then(step1)
  .then(step2)          // step1 抛出的错误会跳到这里
  .catch(handleError)   // 在这里被捕获
  .then(step3)          // catch 后可以继续链式调用
```

关键原则：

1. **`executor` 中抛错** → 被 `try/catch` 捕获 → `reject`
2. **`onFulfilled` / `onRejected` 回调抛错** → 被 `then` 内部的 `try/catch` 捕获 → `promise2` 变为 `rejected`
3. **未处理的 rejection** → 在 Node.js 中触发 `unhandledRejection` 事件

---

## 八、面试真题演练

**Q：如何实现一个带超时的 Promise？**

```js
function promiseWithTimeout(promise, ms) {
  const timeout = new MyPromise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  })
  return MyPromise.race([promise, timeout])
}
```

**Q：实现一个支持重试的 Promise？**

```js
function retry(fn, times = 3, delay = 1000) {
  return new MyPromise((resolve, reject) => {
    const attempt = (remaining) => {
      fn()
        .then(resolve)
        .catch((err) => {
          if (remaining <= 1) return reject(err)
          setTimeout(() => attempt(remaining - 1), delay)
        })
    }
    attempt(times)
  })
}
```

---

## 总结

手写 Promise 的核心在于理解以下几点：

| 机制 | 核心要点 |
|------|---------|
| 状态机 | 三种状态、单向流转、不可逆 |
| then 链式调用 | 返回新 Promise、resolvePromise 解析返回值 |
| 值穿透 | 非函数回调包装为透传 |
| 微任务 | queueMicrotask 保证异步执行 |
| 错误冒泡 | 错误沿链向下传递，直到被 catch 捕获 |
| 静态方法 | all/race/allSettled/any 的差异在于失败处理策略 |

掌握这些，Promise 相关的面试题基本稳了。建议在写完后用 [promises-aplus-tests](https://github.com/promises-aplus/promises-aplus-tests) 验证你的实现是否符合 A+ 规范。
