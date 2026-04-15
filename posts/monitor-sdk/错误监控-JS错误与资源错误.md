---
title: 错误监控 - JS 错误与资源错误
date: 2026-03-28
tags: [前端监控, 错误监控, 面试]
---

# 错误监控 - JS 错误与资源错误

错误监控是前端监控的核心部分，帮助开发者快速定位和解决问题。

## 1. JS 错误捕获

### window.onerror

```javascript
window.onerror = function(message, source, lineno, colno, error) {
  console.log('错误:', message)
  console.log('行号:', lineno)
  console.log('列号:', colno)
  console.log('堆栈:', error?.stack)
  
  return false // 返回 true 可阻止浏览器默认行为
}
```

### addEventListener

```javascript
window.addEventListener('error', (event) => {
  const { message, filename, lineno, colno, error } = event
  // 处理错误
})
```

### 区别

| 特性 | onerror | addEventListener |
|------|---------|-----------------|
| 捕获阶段 | 冒泡阶段 | 捕获+冒泡 |
| 返回值 | 可阻止默认 | 无法阻止 |
| 资源错误 | 无法捕获 | 可捕获 |

## 2. 资源加载错误

```javascript
window.addEventListener('error', (event) => {
  const target = event.target
  
  // 只处理资源错误
  if (target instanceof HTMLImageElement ||
      target instanceof HTMLScriptElement ||
      target instanceof HTMLLinkElement) {
    
    monitor.captureEvent({
      type: 'resource_error',
      url: target.src || target.href,
      tag: target.tagName
    })
  }
}, true) // 捕获阶段
```

## 3. Promise 错误

```javascript
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  
  monitor.captureEvent({
    type: 'unhandled_rejection',
    message: reason?.message || String(reason)
  })
})
```

## 4. 错误规范化

```javascript
function normalizeError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  }
  
  if (typeof error === 'string') {
    return {
      message: error,
      stack: null
    }
  }
  
  return {
    message: JSON.stringify(error),
    stack: null
  }
}
```

## 5. 面试高频问题

### Q: 如何监控异步错误？

```javascript
// Promise 错误
window.addEventListener('unhandledrejection', ...)

// 异步回调错误
window.addEventListener('error', ...)

// try-catch
async function fetchData() {
  try {
    await fetch('/api')
  } catch (e) {
    monitor.captureException(e)
  }
}
```

### Q: sendBeacon 的特点？

- 异步发送，不阻塞页面卸载
- 即使页面关闭也能发送
- 适合埋点数据上报

## 6. 总结

错误监控通过劫持各种错误事件，实现全面的错误收集。
