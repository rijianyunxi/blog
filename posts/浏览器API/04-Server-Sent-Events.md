---
title: Server-Sent Events：服务端推送的轻量级方案
date: 2026-03-28
tags: [浏览器API, SSE, WebSocket, 前端面试, 实时通信]
---

# Server-Sent Events：服务端推送的轻量级方案

## 前言

在实时通信领域，**Server-Sent Events（SSE）**是一个经常被忽视但却非常实用的技术。相比 WebSocket 的"双向通信"，SSE 专注于**服务端向客户端的单向推送**，实现简单、兼容性好、开销低。本文将全面解析 SSE 的工作原理、实现方式，以及与 WebSocket 的核心区别。

> 参考演示源码：`/Users/song/study/mianshizhunbei/html/sse.html`

## 什么是 Server-Sent Events

SSE 是一种让服务器能够通过 HTTP 协议向浏览器**主动推送数据**的技术。它基于 HTTP 协议，使用 `text/event-stream` 内容类型，建立一个从服务器到客户端的**持久化连接**。

### 核心特点

1. **单向通信**：只有服务器能向客户端推送数据
2. **基于 HTTP**：无需特殊的 WebSocket 协议，普通 HTTP 服务器即可支持
3. **自动重连**：浏览器内置自动重连机制，断开后自动重连
4. **Event ID 支持**：可配合 Last-Event-ID 实现断点续传

## EventSource API

### 基本用法

```javascript
// 创建 SSE 连接
const eventSource = new EventSource('/api/stream');

// 监听默认事件（message）
eventSource.onmessage = function(event) {
  console.log('收到消息:', event.data);
};

// 也可以用 addEventListener
eventSource.addEventListener('message', function(event) {
  console.log('收到消息:', event.data);
});
```

### 监听自定义事件

```javascript
// 服务端发送事件时带上 event 字段
// event: notification
// data: {"title": "新消息", "content": "你好"}

const notificationSource = new EventSource('/api/stream');

notificationSource.addEventListener('notification', function(event) {
  const data = JSON.parse(event.data);
  showNotification(data.title, data.content);
});
```

### 连接状态

```javascript
const eventSource = new EventSource('/api/stream');

eventSource.onopen = function() {
  console.log('连接已建立');
};

eventSource.onerror = function(error) {
  if (eventSource.readyState === EventSource.CLOSED) {
    console.log('连接已关闭');
  } else {
    console.log('连接错误，尝试重连...');
  }
};

// readyState
// 0: CONNECTING - 连接中
// 1: OPEN - 已连接
// 2: CLOSED - 已关闭
```

### 关闭连接

```javascript
eventSource.close(); // 主动关闭，浏览器不会自动重连
```

## 服务端实现

### Node.js + Express 实现

```javascript
const express = require('express');
const app = express();

app.get('/api/stream', (req, res) => {
  // 关键：设置正确的 Content-Type
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 禁止 Node.js 自动关闭连接
  res.flushHeaders();

  let count = 0;
  const intervalId = setInterval(() => {
    count++;

    // 发送消息格式
    res.write(`data: 服务器时间 ${new Date().toLocaleTimeString()}\n\n`);

    // 每10条消息后关闭连接
    if (count >= 10) {
      clearInterval(intervalId);
      res.end();
    }
  }, 1000);

  // 客户端断开连接时清理
  req.on('close', () => {
    clearInterval(intervalId);
  });
});

app.listen(3000);
```

### Python Flask 实现

```python
from flask import Response, stream_with_context
import time

@app.route('/api/stream')
def stream():
    @stream_with_context
    def generate():
        for i in range(10):
            yield f"data: 第 {i+1} 条消息 - {time.strftime('%H:%M:%S')}\n\n"
            time.sleep(1)

    return Response(generate(), mimetype='text/event-stream')
```

## 消息格式详解

SSE 的消息格式非常简洁，以连续的"字段: 值"行组成，以**两个换行符 `\n\n`**结束：

```
event: message
id: 1
retry: 5000
data: {"text": "Hello"}

data: 第二行消息

data: {"line1": "a",
data:  "line2": "b"}
```

### data: 数据内容

```javascript
// 单行数据
data: simple message

// 多行数据（用空行分隔）
data: {"title": "新消息",
data: "body": "内容在这里"}

// 数组数据
data: ["item1", "item2", "item3"]
```

### event: 事件类型

```javascript
// 服务端
res.write('event: customEvent\n');
res.write('data: {"key": "value"}\n\n');
```

```javascript
// 客户端监听
eventSource.addEventListener('customEvent', function(e) {
  console.log(JSON.parse(e.data));
});
```

### id: 事件 ID

```javascript
// 服务端带上 id，浏览器自动记录最后一条的 ID
res.write('id: 100\n');
res.write('data: some data\n\n');
```

### retry: 重连间隔

```javascript
// 告诉浏览器断开后多少毫秒重连（默认 3000ms）
res.write('retry: 10000\n\n');
```

### : 注释行

```javascript
// 注释行，用于保持连接活跃（心跳）
res.write(': heartbeat\n\n');
```

## SSE vs WebSocket vs 长轮询

这是面试中最常被问到的问题，理解三者的区别和适用场景至关重要。

| 对比维度 | SSE | WebSocket | 长轮询 |
|---------|-----|-----------|--------|
| 通信方向 | 单向（服务端→客户端） | 双向 | 轮询（客户端发起请求） |
| 协议 | HTTP/1.1 或 HTTP/2 | WebSocket (ws://) | HTTP |
| 连接数限制 | 同一域名 6 个 | 同一域名 6 个 | 无限制（每次请求新建） |
| 自动重连 | 支持 | 不支持（需手动处理） | 支持 |
| IE/Edge 兼容 | IE 不支持（需 polyfill） | IE 10+ 支持 | 全兼容 |
| 实现复杂度 | 低（普通 HTTP 服务器） | 中（需要 WebSocket 服务器） | 中 |
| HTTP/2 多路复用 | 支持 | 不支持（需升级到 HTTP/2） | N/A |
| 二进制数据 | 不支持（仅文本） | 支持 | 支持 |

### 选择建议

**使用 SSE 的场景**：
- 实时通知、提醒系统
- 股票/货币价格实时更新
- 社交媒体动态推送
- 地图位置实时更新
- 只需服务端推送、不需要客户端频繁发数据的场景

**使用 WebSocket 的场景**：
- 聊天应用（需要双向通信）
- 多人协作编辑
- 在线游戏
- 需要频繁双向数据交换的应用

**使用长轮询的场景**：
- 需要兼容老旧浏览器
- 无法升级服务器支持 WebSocket/SSE
- 低频数据更新场景

## 应用场景

### 场景一：AI 流式对话（SSE 经典应用）

参考演示源码中展示的 OpenAI 兼容格式流式响应：

```javascript
// 参考 /Users/song/study/mianshizhunbei/html/sse.html
async function fetchQwenNormal(prompt) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true, // 开启流式响应
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 处理 SSE 粘包和半包
    while (true) {
      const boundary = /\r?\n\r?\n/.exec(buffer);
      if (!boundary) break;

      const rawEvent = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary[0].length);

      const dataStr = rawEvent.replace(/^data:\s*/, '').trim();

      if (dataStr === '[DONE]') return;
      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        const content = parsed.choices[0]?.delta?.content || '';
        process.stdout.write(content); // 流式输出
      } catch (err) {
        console.error('解析失败:', err);
      }
    }
  }
}
```

### 场景二：股票行情推送

```javascript
const stockSource = new EventSource('/api/stocks?symbols=AAPL,GOOGL');

stockSource.addEventListener('priceUpdate', function(e) {
  const { symbol, price, change } = JSON.parse(e.data);
  updateStockUI(symbol, price, change);
});

stockSource.addEventListener('marketStatus', function(e) {
  const { isOpen, nextOpen } = JSON.parse(e.data);
  updateMarketStatus(isOpen, nextOpen);
});
```

### 场景三：任务进度推送

```javascript
// 后端 Node.js
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');

  async function exportTask(progressCallback) {
    const total = 10000;
    for (let i = 0; i < total; i++) {
      // 处理数据...
      await processItem(i);

      // 推送进度
      const progress = Math.round((i / total) * 100);
      res.write(`data: ${JSON.stringify({ progress, current: i })}\n\n`);
    }
    res.end();
  }

  exportTask();
});
```

```javascript
// 前端
const source = new EventSource('/api/export');
source.onmessage = function(e) {
  const { progress, current } = JSON.parse(e.data);
  updateProgressBar(progress);
  if (progress === 100) {
    source.close();
    showDownloadButton();
  }
};
```

## 面试高频考点

### 考点一：SSE 和 WebSocket 的核心区别

这是最常被问到的问题。

**通信模式**：
- WebSocket：**全双工**通信，客户端和服务端可以同时发送消息
- SSE：**半双工**（单工）通信，只有服务端能主动推送

**协议层**：
- WebSocket 有独立的协议（`ws://` / `wss://`），握手后升级协议
- SSE 基于 HTTP/1.1 长连接，不改变协议

**兼容性**：
- WebSocket 兼容性更好（IE 10+）
- SSE 在 Safari 和 Edge 中有小问题，IE 完全不支持

**实际选择**：
- 需要双向通信 → WebSocket
- 只需要服务端推送 → SSE（更简单、更轻量）

### 考点二：SSE 为什么可以复用 HTTP 连接

SSE 使用 HTTP/1.1 的 **keep-alive** 长连接。服务端发送完一条消息后，连接保持不断开，等待下一条消息。浏览器收到消息后不关闭连接，服务端可以继续发送。

```javascript
// HTTP/1.1 keep-alive 机制
res.setHeader('Connection', 'keep-alive');
```

> 注意：HTTP/1.1 单个域名最多 6 个并发连接，如果 SSE 连接数超过 6 个，会被阻塞。

### 考点三：SSE 如何处理断线重连

SSE 内置了自动重连机制：

1. 服务端可以设置 `retry` 字段指定重连间隔
2. 服务端可以设置 `id` 字段，浏览器会自动记录最后一条消息的 ID
3. 重连时，浏览器会自动发送 `Last-Event-ID` 头，服务端可以从断点继续

```javascript
// 服务端识别断点续传
app.get('/api/stream', (req, res) => {
  const lastEventId = req.headers['last-event-id'];
  console.log('上次断开位置:', lastEventId);

  // 从 lastEventId 之后开始发送
  sendFromId(lastEventId || 0, res);
});
```

### 考点四：SSE 与 HTTP/2

SSE 在 HTTP/2 下有额外优势：**多路复用（Multiplexing）**。多个 SSE 流可以共用一个 TCP 连接，避免了 HTTP/1.1 的 6 连接数限制：

```javascript
// HTTP/2 下，同一域名的 SSE 连接数限制基本不存在
const sse1 = new EventSource('/api/stream1');
const sse2 = new EventSource('/api/stream2');
const sse3 = new EventSource('/api/stream3');
// ... 不再有 6 个连接的限制
```

## 浏览器兼容性

| 浏览器 | 支持情况 |
|-------|---------|
| Chrome | ✅ 完全支持 |
| Firefox | ✅ 完全支持 |
| Safari | ✅ 支持（但有 BUG，某些版本不会自动重连） |
| Edge | ✅ 支持 |
| IE | ❌ 不支持（需 polyfill：event-source-polyfill） |

```html
<!-- 兼容 IE -->
<script src="https://cdn.jsdelivr.net/npm/event-source-polyfill@1.0.31/src/event_source.js"></script>
```

## 总结

SSE 是服务端向客户端推送数据的**轻量级、标准化**方案：

1. **单向推送**：服务端主动发送，客户端被动接收
2. **简单可靠**：基于 HTTP，无需特殊协议，自动重连
3. **适合场景**：通知、实时数据更新、进度推送、AI 流式对话
4. **局限**：IE 不支持，单向通信，大并发下需要更多连接数

当你的场景只需要服务端推送时，SSE 往往比 WebSocket 更合适——实现更简单、基础设施要求更低。
