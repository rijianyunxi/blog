---
title: Web Worker：浏览器多线程与前端性能突破
date: 2026-03-28
tags: [浏览器API, Web Worker, 多线程, 前端面试, 性能优化]
---

# Web Worker：浏览器多线程与前端性能突破

## 前言

JavaScript 从诞生起就是**单线程**的语言，这一点让前端开发者在处理 CPU 密集型任务时头疼不已。想象一下：前端要处理一个大 JSON 文件的解析、一个复杂算法的计算、一张图片的滤镜处理……这些任务一旦执行，就会阻塞主线程，导致页面卡顿甚至无响应。

**Web Worker** 的出现彻底改变了这一局面。它允许 JavaScript 在后台线程中运行，不会阻塞主线程的 UI 渲染。本文将深入剖析 Web Worker 的工作原理、通信机制，以及在面试中的高频考点。

> 参考演示源码：`/Users/song/study/mianshizhunbei/html/worker测试.html`

## 基本概念

Web Worker 是在浏览器中运行的**独立线程**。它有以下特点：

1. **独立上下文**：Worker 有自己的全局作用域和事件循环，与主线程隔离
2. **不阻塞 UI**：Worker 中的计算不会影响页面渲染
3. **无法操作 DOM**：Worker 不能访问页面 DOM
4. **通信通过消息**：主线程和 Worker 通过 `postMessage` 进行双向通信

## Worker 创建与通信

### 创建 Worker

```javascript
// 方式一：外部文件
const worker = new Worker('worker.js');

// 方式二：Blob URL（无需额外文件，参考演示源码中的用法）
const workerCode = `
  self.onmessage = function(e) {
    const result = e.data * 2;
    self.postMessage(result);
  };
`;
const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);
```

### 主线程 → Worker：发送消息

```javascript
// 主线程发送数据到 Worker
worker.postMessage({ type: 'compute', data: 1000 });
```

### Worker → 主线程：接收消息

```javascript
// Worker 线程
self.onmessage = function(e) {
  const { type, data } = e.data;
  if (type === 'compute') {
    // 执行计算
    const result = heavyComputation(data);
    // 返回结果
    self.postMessage({ success: true, result });
  }
};
```

### 主线程接收 Worker 消息

```javascript
// 主线程
worker.onmessage = function(e) {
  console.log('收到 Worker 消息:', e.data);
};

worker.onerror = function(error) {
  console.error('Worker 错误:', error);
};
```

### 关闭 Worker

```javascript
// 主线程关闭
worker.terminate();

// Worker 内部关闭
self.close();
```

## 完整示例：多线程压测

参考演示源码中的性能对比实验：

```javascript
// 参考 /Users/song/study/mianshizhunbei/html/worker测试.html
const workerCode = `
  self.onmessage = function(e) {
    const { id, count } = e.data;
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += i;
    }
    const end = performance.now();
    self.postMessage({ id, time: end - start, sum });
  };
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

// 单线程顺序执行
async function runSingleThread() {
  for (let i = 1; i <= 4; i++) {
    // 同步计算，阻塞 UI
    let sum = 0;
    for (let j = 0; j < 2000000000; j++) { sum += j; }
    console.log(`任务 ${i} 完成`);
  }
}

// 多线程并行
function runMultiThread() {
  for (let i = 1; i <= 4; i++) {
    const worker = new Worker(workerUrl);
    worker.onmessage = function(e) {
      console.log(`Worker ${e.data.id} 完成，耗时: ${e.data.time}ms`);
    };
    worker.postMessage({ id: i, count: 2000000000 });
  }
}
```

演示效果：**单线程顺序执行时总耗时是各任务耗时之和（约 4T），而 4 个 Worker 并行执行时总耗时约等于最慢那个任务的耗时（T）**。

## 数据传递：结构化克隆

主线程和 Worker 之间传递数据时，浏览器使用**结构化克隆算法（Structured Clone）**复制数据。

### 支持的类型

- 基本类型：string、number、boolean、null、undefined、Symbol
- 复杂类型：Object、Array、Map、Set、Date、RegExp、Blob、File、ImageData、ArrayBuffer、TypedArray
- 可序列化对象

### 不可复制的对象

```javascript
// ❌ 这些无法通过 postMessage 传递
worker.postMessage({ el: document.querySelector('div') }); // DOM 节点
worker.postMessage({ fn: function() {} }); // 函数

// ✅ 可以传递（但要注意性能）
worker.postMessage({ data: 'string' });
worker.postMessage({ arr: new Int32Array([1, 2, 3]) });
```

### Transferable 对象（转移所有权）

对于大型数据，使用**可转移对象（Transferable）**可以避免复制开销，数据的所有权直接从主线程转移到 Worker：

```javascript
// 不带 transfer：数据被复制（主线程和 Worker 各有一份）
const buffer = new ArrayBuffer(1024 * 1024 * 100); // 100MB
worker.postMessage({ buffer }, [buffer]); // 数据被复制

// 带 transfer：数据被转移（主线程失去所有权）
worker.postMessage({ buffer }, [buffer]); // 数据转移给 Worker，主线程中的 buffer 变为 0 字节
```

```javascript
// Worker 端接收
self.onmessage = function(e) {
  const buffer = e.data.buffer;
  console.log(buffer.byteLength); // 100MB
};
```

> **注意**：转移是"move"而非"copy"，转移后主线程中对应的 ArrayBuffer 变为无效。

## SharedArrayBuffer：真正的共享内存

在 SharedArrayBuffer 出现之前，即使使用 Worker，数据也只能通过复制传递。SharedArrayBuffer 允许主线程和多个 Worker **共享同一块内存**。

### 基本用法

```javascript
// 主线程
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);

// 创建 Worker 并传递 buffer
const worker = new Worker('worker.js');
worker.postMessage({ buffer: sharedBuffer }, [sharedBuffer]);

// 多个 Worker 共享同一块内存
const worker2 = new Worker('worker2.js');
worker2.postMessage({ buffer: sharedBuffer }, [sharedBuffer]);
```

```javascript
// Worker.js
self.onmessage = function(e) {
  const sharedArray = new Int32Array(e.data.buffer);
  sharedArray[0] = 123; // 修改会立即反映到主线程和其他 Worker
};
```

### Atomics：线程安全的操作

SharedArrayBuffer 允许多个线程同时读写同一内存，这带来了**竞态条件**问题。`Atomics` 对象提供了一系列线程安全的原子操作：

```javascript
// Worker 等待某个位置的值变为预期值
Atomics.wait(sharedArray, index, expectedValue);

// 唤醒等待的 Worker
Atomics.notify(sharedArray, index, count);

// 安全地增加共享数组中的值
Atomics.add(sharedArray, index, delta);
```

> ⚠️ SharedArrayBuffer 需要页面在 **COOP/COEP** 安全头下运行才能启用。

## 大文件分片上传场景

Web Worker 的一个重要应用场景是**大文件分片上传**，结合 `File` API 和 Worker 可以实现不阻塞 UI 的断点续传：

```javascript
// 主线程
const worker = new Worker('uploadWorker.js');

document.querySelector('input[type=file]').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const CHUNK_SIZE = 1024 * 1024; // 1MB 每片
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    // 把分片交给 Worker 处理上传
    worker.postMessage({
      chunk,
      chunkIndex: i,
      totalChunks,
      uploadId: file.name + '_' + Date.now()
    }, [chunk]); // 使用 transfer 避免复制大文件
  }
});
```

```javascript
// uploadWorker.js
self.onmessage = async function(e) {
  const { chunk, chunkIndex, totalChunks, uploadId } = e.data;

  const formData = new FormData();
  formData.append('chunk', chunk);
  formData.append('index', chunkIndex);
  formData.append('uploadId', uploadId);

  try {
    const res = await fetch('/api/upload-chunk', {
      method: 'POST',
      body: formData
    });
    self.postMessage({ success: true, chunkIndex, totalChunks });
  } catch (err) {
    self.postMessage({ success: false, chunkIndex, error: err.message });
  }
};
```

## Worker 类型

### Dedicated Worker（专用 Worker）

最常见的 Worker 类型，一个 Worker 只能被创建它的脚本使用：

```javascript
const worker = new Worker('worker.js'); // 专用 Worker
```

### Shared Worker（共享 Worker）

可以被同源页面中的多个脚本共享：

```javascript
const sharedWorker = new SharedWorker('sharedWorker.js');

sharedWorker.port.onmessage = function(e) {
  console.log('收到共享 Worker 消息:', e.data);
};

sharedWorker.port.postMessage('hello');
```

### Service Worker

特殊类型的 Worker，主要用于离线缓存、拦截网络请求、PWA 等场景：

```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
```

## 面试高频考点

### 考点一：Worker 和主线程如何通信？

**答案**：通过 `postMessage` API 进行双向消息传递。数据使用**结构化克隆算法**复制（不共享内存）。大文件可以使用 **Transferable 接口**转移所有权（避免复制开销）。

```javascript
// 主线程 → Worker
worker.postMessage({ type: 'task', data: bigArray }, [bigArray.buffer]);

// Worker → 主线程
self.postMessage({ result: computedData }, [computedData.buffer]);
```

### 考点二：为什么 Worker 不能操作 DOM？

这是面试中理解 Worker 架构的关键问题。

**根本原因**：DOM API（如 `document.createElement`、`querySelector`）并不是"纯计算"，它们的内部实现依赖浏览器的**布局树（Layout Tree）**和**渲染引擎**，这些都在主线程中运行。Worker 运行在独立的 JavaScript 上下文中，根本无法访问这些状态。

**更深层的原因**：
1. **线程安全**：DOM 可以被多个 JavaScript 上下文同时访问，如果 Worker 能操作 DOM，就需要处理复杂的线程同步问题
2. **性能**：渲染引擎本身就很复杂，复制整个渲染状态到 Worker 得不偿失
3. **设计哲学**：Worker 专注于**计算**，主线程专注于**渲染和交互**，职责分离

### 考点三：Worker 的适用场景 vs 不适用场景

**适合 Worker 的场景**：
- CPU 密集型计算（排序、搜索、加密、压缩）
- 大文件处理（JSON 解析、CSV 解析、图片处理）
- 轮询和长连接（WebSocket 心跳）
- 预取和数据处理

**不适合 Worker 的场景**：
- 简单的 DOM 操作（放到 Worker 没意义）
- 频繁的小消息通信（复制开销大于计算收益）
- 需要直接操作 DOM/BOM 的逻辑

### 考点四：Worker 中可以使用哪些全局对象？

```javascript
// Worker 中可用的全局对象
self.console          // 日志
self.fetch           // 网络请求
self.setTimeout       // 定时器
self.XMLHttpRequest   // AJAX
self.WebSocket        // WebSocket
self.indexedDB        // 客户端存储
self.Worker           // Nested Worker

// Worker 中不可用的
self.window           // ❌ Worker 没有 window
self.document         // ❌ 不能操作 DOM
self.location         // ❌ 但 WorkerLocation 部分可用
```

## 总结

Web Worker 是浏览器提供的多线程能力，它打破了 JavaScript 单线程的限制，为前端性能优化开辟了新的道路：

1. **通信机制**：通过 `postMessage` + 结构化克隆实现线程间通信，大数据用 Transferable 转移所有权
2. **适用场景**：CPU 密集型计算、大文件处理、预加载
3. **局限性**：无法操作 DOM，只能通过消息传递数据
4. **进阶**：SharedArrayBuffer 实现真正的共享内存（需 COOP/COEP），但使用场景较窄

掌握 Web Worker，是前端工程师迈向"性能优化专家"的关键一步。

---

**相关面试题**：

> 1. Worker 中能不能 `new Worker()` 创建嵌套 Worker？
> 2. 使用 Worker 处理 JSON 大文件时，如何避免主线程收到消息时再次阻塞？
> 3. SharedArrayBuffer 为什么需要 COOP/COEP 头？
> 4. Worker 中如何加载外部脚本？（importScripts）
