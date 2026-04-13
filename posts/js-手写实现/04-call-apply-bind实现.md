---
title: call、apply、bind 三者的完整实现与底层原理
date: 2026-03-28
tags: [JavaScript, this, 手写实现, 面试]
---

# call、apply、bind

`call`、`apply`、`bind` 都是 `Function.prototype` 上的方法，它们的核心作用只有一个：**显式指定函数执行时的 `this` 指向**。

它们三者的区别可以先用一句话概括：

- `call`：立即执行，参数一个个传
- `apply`：立即执行，参数以数组或类数组传
- `bind`：不立即执行，返回一个新的函数

比如下面这个例子：

```js
const person = {
  name: 'Tom'
}

function say(age, city) {
  console.log(this.name, age, city)
}

say.call(person, 20, 'Shanghai')
say.apply(person, [20, 'Shanghai'])

const boundSay = say.bind(person, 20)
boundSay('Shanghai')
```

输出结果都是：

```js
Tom 20 Shanghai
```

这篇文章我们不只写“能跑”的版本，而是尽量按照面试和源码理解的标准，把实现思路讲完整。

---

## 1. 核心原理

为什么可以改变 `this` 指向？

因为在 JavaScript 里，**谁调用函数，函数内部的 `this` 就更偏向指向谁**。

例如：

```js
const obj = {
  name: 'Jack',
  fn() {
    console.log(this.name)
  }
}

obj.fn() // Jack
```

这里的 `fn` 是通过 `obj.fn()` 调用的，所以 `this === obj`。

那我们手写 `call/apply` 时，就可以借助这个特性：

1. 先把要执行的函数临时挂到目标对象上
2. 让目标对象去调用这个函数
3. 调用完成后再删除这个临时属性

伪代码如下：

```js
context.tempFn = fn
context.tempFn()
delete context.tempFn
```

这就是 `call` 和 `apply` 最底层的思路。

---

## 2. 手写 call

### 2.1 基础版本

```js
Function.prototype.myCall = function (context, ...args) {
  context = context || globalThis
  const key = Symbol('fn')
  context[key] = this

  const result = context[key](...args)
  delete context[key]

  return result
}
```

### 2.2 测试

```js
const obj = {
  name: 'Alice'
}

function greet(age, city) {
  return `我是 ${this.name}，今年 ${age} 岁，住在 ${city}`
}

console.log(greet.myCall(obj, 18, 'Beijing'))
// 我是 Alice，今年 18 岁，住在 Beijing
```

### 2.3 存在的问题

上面的版本虽然能跑，但还不够严谨：

- `context = context || globalThis` 会把 `0`、`''`、`false` 这些合法值误判掉
- 如果 `context` 是原始值，需要先装箱成对象
- 如果调用者不是函数，应该抛错
- 临时属性名不能和目标对象已有属性冲突，所以更适合用 `Symbol`

### 2.4 更完整的实现

```js
Function.prototype.myCall = function (context, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall must be called on a function')
  }

  const target = context == null ? globalThis : Object(context)
  const key = Symbol('fn')

  target[key] = this
  const result = target[key](...args)
  delete target[key]

  return result
}
```

### 2.5 实现要点

- `this` 指的是调用 `myCall` 的那个函数本身
- `context == null` 同时覆盖 `null` 和 `undefined`
- `Object(context)` 可以把字符串、数字、布尔值包装成对应对象
- `Symbol` 可以避免临时属性覆盖原对象已有字段

---

## 3. 手写 apply

`apply` 和 `call` 的核心几乎一模一样，唯一的区别就是：

- `call` 接收离散参数
- `apply` 接收数组或类数组参数

### 3.1 实现

```js
Function.prototype.myApply = function (context, args) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply must be called on a function')
  }

  const target = context == null ? globalThis : Object(context)
  const key = Symbol('fn')

  target[key] = this

  let result
  if (args == null) {
    result = target[key]()
  } else {
    result = target[key](...args)
  }

  delete target[key]
  return result
}
```

### 3.2 测试

```js
const obj = {
  name: 'Bob'
}

function introduce(age, city) {
  return `${this.name} - ${age} - ${city}`
}

console.log(introduce.myApply(obj, [20, 'Shenzhen']))
// Bob - 20 - Shenzhen
```

### 3.3 再严谨一点

如果你想更接近原生行为，可以对参数做一次类型校验：

```js
Function.prototype.myApply = function (context, args) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply must be called on a function')
  }

  if (args != null && typeof args[Symbol.iterator] !== 'function' && typeof args !== 'object') {
    throw new TypeError('CreateListFromArrayLike called on non-object')
  }

  const target = context == null ? globalThis : Object(context)
  const key = Symbol('fn')

  target[key] = this
  const result = args == null ? target[key]() : target[key](...args)
  delete target[key]

  return result
}
```

在日常面试里，写到第一版通常就够了；如果你能顺手提一句“`apply` 接收数组或类数组，本质还是展开后执行”，印象会更好。

---

## 4. 手写 bind

`bind` 比 `call` 和 `apply` 更重要，也更容易写漏。

因为它不是立刻执行，而是：

1. 先保存 `this`
2. 预置一部分参数
3. 返回一个新函数
4. 等以后调用这个新函数时再执行原函数

例如：

```js
const obj = { name: 'Rose' }

function say(age, city) {
  console.log(this.name, age, city)
}

const fn = say.bind(obj, 22)
fn('Hangzhou')
// Rose 22 Hangzhou
```

### 4.1 基础版本

```js
Function.prototype.myBind = function (context, ...presetArgs) {
  const self = this

  return function (...laterArgs) {
    return self.apply(context, [...presetArgs, ...laterArgs])
  }
}
```

这个版本已经能实现：

- 绑定 `this`
- 参数柯里化

但它还缺少一个面试里最关键的点：**`bind` 返回的函数可以被 `new` 调用**。

---

## 5. bind 的难点：new 优先级更高

看下面这个例子：

```js
function Person(name) {
  this.name = name
}

const obj = { name: 'outer' }
const BoundPerson = Person.bind(obj)
const p = new BoundPerson('inner')

console.log(p.name) // inner
```

这里明明 `bind(obj)` 已经绑定了 `obj`，但 `new BoundPerson()` 之后，`this` 还是指向新创建的实例对象，而不是 `obj`。

也就是说：

- 普通调用时，用绑定的 `context`
- 构造调用时，用新实例对象

所以完整实现必须判断当前函数是不是通过 `new` 调用的。

---

## 6. bind 完整实现

```js
Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind must be called on a function')
  }

  const self = this

  function boundFn(...laterArgs) {
    const isNewCall = this instanceof boundFn
    const finalThis = isNewCall ? this : context

    return self.apply(finalThis, [...presetArgs, ...laterArgs])
  }

  if (self.prototype) {
    boundFn.prototype = Object.create(self.prototype)
    boundFn.prototype.constructor = boundFn
  }

  return boundFn
}
```

### 6.1 测试普通调用

```js
const obj = {
  name: 'Mike'
}

function info(age, city) {
  return `${this.name} ${age} ${city}`
}

const boundInfo = info.myBind(obj, 25)
console.log(boundInfo('Guangzhou'))
// Mike 25 Guangzhou
```

### 6.2 测试构造调用

```js
function Person(name, age) {
  this.name = name
  this.age = age
}

Person.prototype.sayHi = function () {
  console.log(`Hi, I am ${this.name}`)
}

const obj = { name: 'outside' }
const BoundPerson = Person.myBind(obj, 'Tom')

const p = new BoundPerson(20)

console.log(p.name) // Tom
console.log(p.age) // 20
console.log(p instanceof Person) // true
console.log(p instanceof BoundPerson) // true
p.sayHi() // Hi, I am Tom
```

这里之所以 `p instanceof Person === true`，就是因为我们通过：

```js
boundFn.prototype = Object.create(self.prototype)
```

把原函数的原型链继承过来了。

---

## 7. 三者对比总结

| 方法 | 是否立即执行 | 参数形式 | 返回值 |
| --- | --- | --- | --- |
| `call` | 是 | 逐个传参 | 函数执行结果 |
| `apply` | 是 | 数组 / 类数组 | 函数执行结果 |
| `bind` | 否 | 可先传一部分，后续再传 | 新函数 |

示例：

```js
function sum(a, b, c) {
  return this.base + a + b + c
}

const obj = { base: 10 }

console.log(sum.myCall(obj, 1, 2, 3))
console.log(sum.myApply(obj, [1, 2, 3]))

const boundSum = sum.myBind(obj, 1)
console.log(boundSum(2, 3))
```

输出：

```js
16
16
16
```

---

## 8. 面试常问细节

### 8.1 为什么 `call/apply` 要用 `Symbol`

因为如果直接写：

```js
context.fn = this
```

那目标对象本身可能已经有一个 `fn` 属性，容易发生覆盖。

而 `Symbol()` 生成的属性名几乎不会冲突。

### 8.2 为什么要用 `Object(context)`

因为 `call/apply/bind` 可以传原始值：

```js
function test() {
  console.log(this)
}

test.call('abc')
test.call(123)
test.call(true)
```

这些值在非严格模式下会被装箱成对象：

- `'abc' -> new String('abc')`
- `123 -> new Number(123)`
- `true -> new Boolean(true)`

所以我们手写时通常用 `Object(context)` 来模拟这一步。

### 8.3 `null` 和 `undefined` 为什么指向 `globalThis`

这是非严格模式下的表现：

```js
function test() {
  console.log(this)
}

test.call(null)
test.call(undefined)
```

在浏览器里通常会指向 `window`，在现代通用写法里可以统一写成 `globalThis`。

### 8.4 手写版本和原生版本是否完全一致

不能保证 100% 完全一致。

原因是原生 `call/apply/bind` 涉及 JavaScript 引擎内部对 `this`、严格模式、函数内部槽位等更底层的处理。我们手写版本更多是**模拟核心行为**，用于理解原理和面试表达。

尤其是严格模式下一些边界表现，手写版本通常不会完全等价于原生实现。

---

## 9. 最终完整代码

```js
Function.prototype.myCall = function (context, ...args) {
  if (typeof this !== 'function') {
    throw new TypeError('myCall must be called on a function')
  }

  const target = context == null ? globalThis : Object(context)
  const key = Symbol('fn')

  target[key] = this
  const result = target[key](...args)
  delete target[key]

  return result
}

Function.prototype.myApply = function (context, args) {
  if (typeof this !== 'function') {
    throw new TypeError('myApply must be called on a function')
  }

  const target = context == null ? globalThis : Object(context)
  const key = Symbol('fn')

  target[key] = this
  const result = args == null ? target[key]() : target[key](...args)
  delete target[key]

  return result
}

Function.prototype.myBind = function (context, ...presetArgs) {
  if (typeof this !== 'function') {
    throw new TypeError('myBind must be called on a function')
  }

  const self = this

  function boundFn(...laterArgs) {
    const isNewCall = this instanceof boundFn
    const finalThis = isNewCall ? this : context == null ? globalThis : Object(context)

    return self.apply(finalThis, [...presetArgs, ...laterArgs])
  }

  if (self.prototype) {
    boundFn.prototype = Object.create(self.prototype)
    boundFn.prototype.constructor = boundFn
  }

  return boundFn
}
```

---

## 10. 总结

这三个方法本质上都围绕同一件事：**控制函数执行时的 `this`**。

- `call` 是“立刻调用 + 离散参数”
- `apply` 是“立刻调用 + 数组参数”
- `bind` 是“先绑定，稍后执行”

如果你在面试里要回答这道题，建议至少讲出下面几点：

1. `call/apply` 的底层思路是把函数临时挂到对象上执行
2. 要用 `Symbol` 避免属性冲突
3. `null/undefined` 通常兜底到 `globalThis`
4. 原始值需要通过 `Object()` 装箱
5. `bind` 需要返回新函数，并处理柯里化
6. `bind` 还要处理 `new` 调用和原型继承

能把这 6 点说清楚，基本就不是“会背答案”，而是真的理解了。
