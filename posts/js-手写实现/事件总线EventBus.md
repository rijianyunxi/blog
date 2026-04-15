---
title: 事件总线 EventBus
date: 2026-03-28
tags: [JavaScript, 设计模式, 面试]
---

# 事件总线 EventBus

事件总线是一种常用的组件间通信模式，基于发布-订阅模式实现。

## 1. 发布-订阅模式

```javascript
class EventEmitter {
  constructor() {
    this.events = {} // 事件中心
  }
  
  // 订阅
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }
  
  // 发布
  emit(event, ...args) {
    const callbacks = this.events[event]
    if (callbacks) {
      callbacks.forEach(cb => cb(...args))
    }
  }
  
  // 取消订阅
  off(event, callback) {
    const callbacks = this.events[event]
    if (callbacks) {
      this.events[event] = callbacks.filter(cb => cb !== callback)
    }
  }
  
  // 只订阅一次
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }
}
```

## 2. EventBus 应用

```javascript
// 创建全局事件总线
const eventBus = new EventEmitter()

// 组件 A 发布事件
eventBus.emit('user-login', { id: 1, name: 'Alice' })

// 组件 B 订阅事件
eventBus.on('user-login', (user) => {
  console.log('用户登录:', user.name)
})

// 组件 C 也可以订阅
eventBus.on('user-login', (user) => {
  updateNotification(user)
})
```

## 3. 事件总线 vs 观察者模式

| 特性 | 事件总线 | 观察者模式 |
|------|---------|-----------|
| 耦合度 | 低 | 低 |
| 发布者 | 不知道订阅者 | 知道订阅者 |
| 通信范围 | 全局/跨组件 | 通常同组件 |

## 4. Vue 中的事件总线

```javascript
// Vue 2
const bus = new Vue()

// A 组件
bus.$emit('message', 'Hello')

// B 组件
bus.$on('message', (msg) => console.log(msg))

// Vue 3 使用 mitt 或自定义事件总线
```

## 5. 面试高频问题

### Q: 为什么需要发布-订阅模式？

- 解耦：发布者和订阅者不需要直接交互
- 异步通信：适合异步场景
- 灵活性：可以动态添加/移除订阅者

### Q: 和观察者模式的区别？

- 观察者模式：Subject 和 Observer 直接交互
- 发布-订阅模式：通过事件中心中介

## 6. 总结

事件总线通过事件机制实现组件解耦，是前端常用的通信模式。
