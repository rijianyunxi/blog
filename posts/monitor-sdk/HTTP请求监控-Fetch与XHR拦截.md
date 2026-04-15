---
title: HTTP 请求监控 - Fetch 与 XHR 拦截
date: 2026-03-28
tags: [前端监控, HTTP监控, 面试]
---

# HTTP 请求监控 - Fetch 与 XHR 拦截

HTTP 请求监控帮助我们了解接口性能和错误情况。

## 1. Fetch 拦截

```javascript
const originalFetch = window.fetch

window.fetch = async function(input, init) {
  const start = performance.now()
  
  try {
    const response = await originalFetch(input, init)
    const duration = performance.now() - start
    
    // 只监控错误请求
    if (!response.ok) {
      monitor.captureEvent({
        type: 'http_error',
        url: typeof input === 'string' ? input : input.url,
        status: response.status,
        duration
      })
    }
    
    return response
  } catch (error) {
    const duration = performance.now() - start
    
    monitor.captureEvent({
      type: 'http_error',
      url: typeof input === 'string' ? input : input.url,
      error: error.message,
      duration
    })
    
    throw error
  }
}
```

## 2. XHR 拦截

```javascript
const originalOpen = XMLHttpRequest.prototype.open
const originalSend = XMLHttpRequest.prototype.send

XMLHttpRequest.prototype.open = function(method, url, ...args) {
  this._request = { method, url, start: performance.now() }
  return originalOpen.apply(this, [method, url, ...args])
}

XMLHttpRequest.prototype.send = function(body) {
  this.addEventListener('loadend', () => {
    const { method, url, start } = this._request
    const duration = performance.now() - start
    
    if (this.status >= 400) {
      monitor.captureEvent({
        type: 'xhr_error',
        method,
        url,
        status: this.status,
        duration
      })
    }
  })
  
  return originalSend.apply(this, [body])
}
```

## 3. 避免循环上报

```javascript
// 请求中添加标记
window.fetch = async function(input, init) {
  // 避免 SDK 自身请求被监控
  if (init?.headers?.['X-SDK-Injected']) {
    return originalFetch(input, init)
  }
  
  return originalFetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      'X-SDK-Injected': 'true'
    }
  })
}
```

## 4. 面试高频问题

### Q: 如何区分 SDK 请求和业务请求？

通过添加自定义 header（如 X-SDK-Injected）来识别。

### Q: 跨域错误能被监控吗？

通常不能，因为跨域错误会被浏览器拦截。但如果使用 XHR 或 fetch，可以通过响应状态码判断。

## 5. 总结

通过劫持 fetch 和 XHR，可以全面监控接口请求的成功率和性能。
