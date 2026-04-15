---
title: instanceof 实现
date: 2026-03-28
tags: [JavaScript, 原型链, 面试]
---

# instanceof 实现

`instanceof` 用于判断构造函数的 `prototype` 是否出现在某个对象的原型链上。

注意：左侧如果是原始值（如字符串字面量、数字、布尔值），结果通常是 `false`。

## 1. instanceof 原理

```javascript
function myInstanceof(left, right) {
  // instanceof 左侧如果不是对象（或函数），直接返回 false
  if (left === null || (typeof left !== 'object' && typeof left !== 'function')) {
    return false
  }

  // 更推荐用 Object.getPrototypeOf，而不是直接访问 __proto__
  const prototype = right.prototype
  let proto = Object.getPrototypeOf(left)

  while (proto !== null) {
    if (proto === prototype) {
      return true
    }
    proto = Object.getPrototypeOf(proto)
  }

  return false
}

// 测试
console.log(myInstanceof([], Array)) // true
console.log(myInstanceof({}, Object)) // true
console.log(myInstanceof('hello', String)) // false
```

## 2. 详细图解

```
instanceof([], Array)

proto = [].__proto__ = Array.prototype
proto === Array.prototype → true ✓

return true
```

## 3. Symbol.hasInstance

自定义 instanceof 行为：

```javascript
class MyArray {
  static [Symbol.hasInstance](instance) {
    return Array.isArray(instance)
  }
}

console.log([] instanceof MyArray) // true
```

## 4. 判断各种类型

```javascript
function getType(obj) {
  return Object.prototype.toString.call(obj)
}

function isArray(obj) {
  return myInstanceof(obj, Array)
}

function isFunction(obj) {
  return myInstanceof(obj, Function)
}
```

## 5. 面试高频问题

### Q: instanceof 实现原理？

沿着对象的 __proto__ 向上查找，直到找到构造函数的 prototype 或到达 null。

### Q: 如何判断一个对象是不是数组？

```javascript
// 方法1: instanceof
[] instanceof Array // true

// 方法2: Array.isArray
Array.isArray([]) // true

// 方法3: Object.prototype.toString
Object.prototype.toString.call([]) === '[object Array]' // true

// 方法4: constructor
[].constructor === Array // true
```

## 6. 总结

instanceof 通过原型链向上查找实现类型判断，是 JavaScript 原型继承机制的直接应用。
