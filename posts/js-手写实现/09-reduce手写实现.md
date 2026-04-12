---
title: reduce 手写实现
date: 2026-03-28
tags: [JavaScript, 数组方法, 面试]
---

# reduce 手写实现

reduce 是 JavaScript 数组方法中最强大的一个，可以实现求和、扁平化、统计等各种功能。

## 1. reduce 基本用法

```javascript
const arr = [1, 2, 3, 4, 5]

// 求和
const sum = arr.reduce((acc, cur) => acc + cur, 0)
// 15

// 最大值
const max = arr.reduce((acc, cur) => Math.max(acc, cur), arr[0])
// 5
```

## 2. reduce 实现

```javascript
Array.prototype.myReduce = function(callback, initialValue) {
  let accumulator = initialValue
  let i = 0
  
  // 如果没有初始值，取第一个元素
  if (arguments.length < 2) {
    if (this.length === 0) {
      throw new TypeError('Reduce of empty array with no initial value')
    }
    accumulator = this[0]
    i = 1
  }
  
  for (; i < this.length; i++) {
    accumulator = callback(accumulator, this[i], i, this)
  }
  
  return accumulator
}
```

## 3. 常见用法

### 求和

```javascript
const sum = arr.reduce((acc, cur) => acc + cur, 0)
```

### 计数

```javascript
const count = arr.reduce((acc, cur) => {
  acc[cur] = (acc[cur] || 0) + 1
  return acc
}, {})
```

### 扁平化

```javascript
const flat = arr.reduce((acc, cur) => {
  return acc.concat(Array.isArray(cur) ? myReduce(cur, []) : cur)
}, [])
```

### 分组

```javascript
const group = arr.reduce((acc, cur) => {
  const key = cur.type
  if (!acc[key]) acc[key] = []
  acc[key].push(cur)
  return acc
}, {})
```

## 4. 面试高频问题

### Q: reduce 第二个参数不传会怎样？

- 空数组 + 无初始值 → 报错
- 非空数组无初始值 → 第一个元素作为初始值，遍历从第二个开始

### Q: reduce 能做哪些事？

- 求和、最大最小值
- 计数、分组
- 扁平化
- 过滤+转换
- compose/pipe

## 5. 总结

reduce 是数组方法中最灵活的，可以实现 map、filter、flat 等所有其他方法。
