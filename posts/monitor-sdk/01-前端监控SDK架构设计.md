---
title: 前端监控 SDK 架构设计
date: 2026-03-28
tags: [前端监控, 工程化, 面试]
---

# 前端监控 SDK 架构设计

前端监控是保障应用稳定性的重要手段，本文讲解如何设计一个前端监控 SDK。

## 1. 监控 SDK 的核心职责

1. **性能监控**：页面加载速度、资源加载
2. **错误监控**：JS 错误、接口错误、资源错误
3. **行为监控**：用户操作、点击、滚动
4. **日志上报**：收集数据、发送到服务端

## 2. SDK 架构

```javascript
class MonitorSDK {
  constructor(options) {
    this.dsn = options.dsn // 数据上报地址
    this.appId = options.appId
    this.beforeSend = options.beforeSend || (data => data)
    
    // 初始化各个模块
    this.integrations = []
    this.setupIntegrations()
  }
  
  setupIntegrations() {
    // 注册插件
    for (const integration of this.options.integrations) {
      integration.setup(this)
    }
  }
  
  captureException(error, extra) {
    const normalized = this.normalizeError(error)
    this.send({
      type: 'exception',
      message: normalized.message,
      stack: normalized.stack,
      ...extra
    })
  }
  
  captureEvent(event) {
    const processed = this.beforeSend(event)
    if (processed) this.send(processed)
  }
  
  send(data) {
    navigator.sendBeacon(this.dsn, JSON.stringify(data))
  }
}
```

## 3. 插件化设计

```javascript
// 插件接口
class Integration {
  name: string
  setup(sdk: MonitorSDK): void
  dispose?(): void
}

// 使用
const monitor = new MonitorSDK({
  dsn: 'https://monitor.example.com/collect',
  integrations: [
    new ErrorIntegration(),
    new PerformanceIntegration(),
    new HttpIntegration(),
  ]
})
```

## 4. 事件模型

```javascript
interface MonitorEvent {
  type: string        // 事件类型
  level: 'info' | 'warn' | 'error'
  message: string      // 消息
  timestamp: number    // 时间戳
  url: string         // 页面 URL
  userId?: string     // 用户 ID
  extra?: object       // 额外数据
}
```

## 5. sendBeacon

页面卸载时发送数据：

```javascript
send(data) {
  const blob = new Blob([JSON.stringify(data)], {
    type: 'application/json'
  })
  
  // sendBeacon 更可靠，异步且不阻塞
  if (navigator.sendBeacon) {
    navigator.sendBeacon(this.dsn, blob)
  } else {
    fetch(this.dsn, {
      method: 'POST',
      body: JSON.stringify(data),
      keepalive: true
    })
  }
}
```

## 6. 面试高频问题

### Q: SDK 如何做到无侵入？

- 自动劫持全局事件（error、unhandledrejection）
- 重写原生 API（fetch、XMLHttpRequest）
- 对业务代码无感知

### Q: 插件化架构的好处？

- 解耦：各功能独立
- 可插拔：按需加载
- 可扩展：方便添加新功能

### Q: sendBeacon 和 fetch 的区别？

- sendBeacon：异步、不阻塞、页面关闭时仍能发送
- fetch：需要等待响应

## 7. 总结

监控 SDK 核心设计：
1. 插件化架构
2. 统一事件模型
3. sendBeacon 上报
4. beforeSend 钩子
