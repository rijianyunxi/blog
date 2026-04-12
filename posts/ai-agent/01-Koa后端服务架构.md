---
title: Koa 后端服务架构
date: 2026-03-28
tags: [Koa, AI, 后端, 面试]
---

# Koa 后端服务架构

本文介绍 AI Agent 的 Koa 后端服务架构，包括路由设计、SSE 推送、MCP 工具注册等核心模块。

## 1. Koa 核心结构

```javascript
const Koa = require('koa')
const Router = require('@koa/router')

const app = new Koa()
const router = new Router()

// 中间件
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  console.log(`${ctx.method} ${ctx.url} - ${Date.now() - start}ms`)
})

// 路由
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' }
})

app.use(router.routes())
app.listen(3000)
```

## 2. Koa 中间件机制

Koa 的中间件采用洋葱模型：

```
请求 → 中间件1 → 中间件2 → 中间件3 → 响应 ← 中间件3 ← 中间件2 ← 中间件1
```

```javascript
app.use(async (ctx, next) => {
  console.log('1. before')
  await next()
  console.log('4. after')
})
```

## 3. SSE 实现

Server-Sent Events 实现服务端推送：

```javascript
router.get('/sse', (ctx) => {
  ctx.type = 'text/event-stream'
  ctx.set('Cache-Control', 'no-cache')
  ctx.set('Connection', 'keep-alive')
  
  const send = (data) => {
    ctx.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }
  
  // 模拟推送
  send({ message: 'Hello' })
  send({ message: 'World' })
  
  // 保持连接
  ctx.req.on('close', () => {
    console.log('Client disconnected')
  })
})
```

### 前端接收

```javascript
const eventSource = new EventSource('/sse')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}
```

## 4. 路由设计

```javascript
// Agent 路由
router.post('/api/agent', async (ctx) => {
  const { message, threadId } = ctx.request.body
  
  // 处理消息
  const response = await agent.process(message, threadId)
  
  ctx.body = response
})

// 线程管理
router.get('/api/threads/:id', getThread)
router.post('/api/threads', createThread)
router.delete('/api/threads/:id', deleteThread)

// OpenAI 兼容接口
router.post('/v1/chat/completions', openAICompatible)
```

## 5. MCP 工具注册

Model Context Protocol 工具注册：

```javascript
class MCPRegistry {
  constructor() {
    this.tools = new Map()
  }
  
  register(name, tool) {
    this.tools.set(name, tool)
  }
  
  async call(name, params) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Tool ${name} not found`)
    return await tool.execute(params)
  }
  
  getManifest() {
    return Array.from(this.tools.values()).map(t => t.manifest)
  }
}
```

## 6. 面试高频问题

### Q: SSE 和 WebSocket 的区别？

| 特性 | SSE | WebSocket |
|------|------|----------|
| 方向 | 单向（服务端→客户端） | 双向 |
| 连接 | HTTP/1 | 独立协议 |
| 重连 | 自动 | 需手动 |
| 跨域 | 支持 | 需要 CORS |

### Q: Koa 中间件机制？

洋葱模型：请求经过所有中间件，然后响应原路返回。

## 7. 总结

Koa 后端核心设计：
- 洋葱模型中间件
- SSE 实时推送
- RESTful 路由
- MCP 工具注册
