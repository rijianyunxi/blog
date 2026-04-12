---
title: requestAnimationFrame：动画帧的深度指南
date: 2026-03-28
tags: [浏览器API, requestAnimationFrame, 动画, 性能优化, 前端面试]
---

# requestAnimationFrame：动画帧的深度指南

## 前言

在前端动画开发中，`requestAnimationFrame`（简称 rAF）是最核心的 API 之一。相比 `setTimeout` 和 `setInterval`，rAF 能够与浏览器的刷新频率完美同步，避免丢帧和卡顿，实现流畅的动画效果。

很多前端工程师知道用 rAF 做动画，但并不清楚它的**执行时机**、**回调参数**以及为什么它比 setTimeout 性能更好。理解这些底层原理，是进阶为性能优化高手的必经之路。

> 参考演示源码：`/Users/song/study/mianshizhunbei/html/rAF执行时机深度演示.html`

## 基本用法

### 简单示例

```javascript
const box = document.getElementById('box');
let x = 0;

function animate() {
  x += 2;
  box.style.left = x + 'px';
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

### 取消动画

```javascript
const animationId = requestAnimationFrame(animate);
cancelAnimationFrame(animationId);
```

## 执行时机：下一帧重绘前

这是理解 rAF 最关键的概念。rAF 的回调函数会在**浏览器下一次重绘之前**执行。

### 浏览器渲染流水线

```
JS 执行 → Style → Layout → Paint → Composite
                                ↑
                        rAF 回调在这里执行
                        （下一次重绘之前）
```

### rAF vs setTimeout 的执行时机对比

参考演示源码中的深度演示：

```javascript
// 参考 /Users/song/study/mianshizhunbei/html/rAF执行时机深度演示.html
let lastTime = performance.now();

function startNormal() {
  let count = 0;
  const trace = (timestamp) => {
    const gap = (timestamp - lastTime).toFixed(2);
    addLog(`rAF 触发，间隔: ${gap}ms`);
    lastTime = timestamp;
    if (++count < 5) requestAnimationFrame(trace);
  };
  requestAnimationFrame(trace);
}

function startHeavyTask() {
  requestAnimationFrame((timestamp) => {
    const gap = (timestamp - lastTime).toFixed(2);
    addLog(`主线程阻塞 ${gap}ms 后才执行此帧回调`);
    lastTime = timestamp;
  });

  setTimeout(() => {
    // 死循环阻塞 500ms
    const start = performance.now();
    while (performance.now() - start < 500) {}
  }, 100);
}
```

**核心发现**：正常情况下约 16.67ms 一帧（60fps），主线程阻塞时 rAF 延迟但不会丢帧。

## 回调参数：DOMHighResTimeStamp

```javascript
requestAnimationFrame((timestamp) => {
  if (lastTimestamp) {
    const delta = timestamp - lastTimestamp;
    console.log(`帧间隔: ${delta.toFixed(2)}ms, FPS: ${(1000 / delta).toFixed(1)}`);
  }
  lastTimestamp = timestamp;
});
```

## 取消动画：cancelAnimationFrame

```javascript
let animationId = requestAnimationFrame(step);

function step() {
  // 动画逻辑...
  animationId = requestAnimationFrame(step);
}

function stop() {
  cancelAnimationFrame(animationId);
}
```

## vs setTimeout / setInterval

| 对比项 | setInterval | requestAnimationFrame |
|-------|------------|----------------------|
| 执行时机 | 定时放入任务队列 | 下一帧重绘前 |
| 屏幕同步 | 不同步，可能丢帧 | 完美同步 |
| 页面隐藏 | 继续运行（浪费资源） | 自动暂停（节省资源） |
| 回调参数 | 无 | 高精度时间戳 |
| 取消方式 | clearInterval | cancelAnimationFrame |

### setTimeout 的问题

```javascript
// ❌ 不推荐：无法保证精确的帧同步
setTimeout(() => {
  update();
  setTimeout(badAnimation, 16);
}, 16);

// ✅ 推荐：与浏览器刷新率完美同步
function goodAnimation() {
  requestAnimationFrame((timestamp) => {
    update();
    requestAnimationFrame(goodAnimation);
  });
}
```

## 动画性能优化

### 避免布局抖动（Layout Thrashing）

```javascript
// ❌ 错误：每次循环都触发重排
for (let i = 0; i < 100; i++) {
  el.style.left = i + 'px';
  console.log(el.offsetWidth); // 触发重排
}

// ✅ 正确：分离读写操作
const width = el.offsetWidth; // 读（触发一次重排）
for (let i = 0; i < 100; i++) {
  el.style.left = i + 'px'; // 写
}
```

### 使用 transform 而非 top/left

```javascript
// ❌ top/left 触发重排
box.style.top = x + 'px';

// ✅ transform 只触发合成，不触发重排
box.style.transform = `translateX(${x}px)`;
```

### 帧率控制（基于时间的动画）

```javascript
let lastTime = 0;
const FPS = 60;
const interval = 1000 / FPS;

function animate(timestamp) {
  if (timestamp - lastTime >= interval) {
    lastTime = timestamp - (timestamp - lastTime) % interval;
    update(); // 更新动画状态
  }
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

### will-change 提示 GPU 加速

```javascript
// 提前告知浏览器元素会变化，让 GPU 提前准备
el.style.will-change = 'transform';
// 动画结束后移除，释放 GPU 资源
el.style.willChange = 'auto';
```

## requestIdleCallback：空余时间回调

rAF 的"兄弟"API，当浏览器有空闲时间时执行低优先级任务：

```javascript
requestIdleCallback((deadline) => {
  console.log('剩余时间:', deadline.timeRemaining(), 'ms');

  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    processTask(tasks.shift());
  }

  // 如果还有任务未完成，调度下一次
  if (tasks.length > 0) {
    requestIdleCallback(processRemainingTasks);
  }
}, { timeout: 2000 });
```

## 面试高频考点

### 考点一：为什么动画推荐用 rAF 而不是 setTimeout？

**核心答案**：rAF 与浏览器刷新率完美同步，setTimeout 不能。

**详细解释**：
1. **时序保证**：显示器以固定频率刷新（通常 60Hz，即每秒 60 帧）。rAF 会在每次刷新周期开始时执行回调，确保每帧只绘制一次。setTimeout 只是"延迟执行"，无法保证与屏幕刷新同步
2. **丢帧保护**：当页面跳帧时（如切换标签页省电模式），rAF 会自动暂停并适配新帧率。setTimeout 会继续执行，造成资源浪费
3. **后台优化**：页面不可见时，rAF 自动暂停，节省 CPU 和电池
4. **主线程阻塞时**：setTimeout 会被无限推迟，rAF 会在主线程空闲后立即执行，不会彻底"消失"

### 考点二：rAF 和浏览器重排/重绘的关系

```
事件触发 → JavaScript → requestAnimationFrame回调 → Style → Layout → Paint → Composite
                                                              ↑
                                                         rAF 回调在此执行
```

重要结论：**在 rAF 回调中修改 DOM，下一帧就会渲染**，这保证了动画的流畅性。

### 考点三：如何实现一个 60fps 的匀速动画？

```javascript
function linearAnimation(element, startX, endX, duration) {
  const startTime = performance.now();

  function step(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 匀速插值
    const currentX = startX + (endX - startX) * progress;
    element.style.transform = `translateX(${currentX}px)`;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
```

> **注意**：必须用 `timestamp`（rAF 传入的时间）来计算进度，而不是用计数器，这样才能保证不同帧率下动画速度一致。

### 考点四：rAF 的 FPS 限制可以突破吗？

答案是**不能也不应该**。60fps 是大多数显示器的物理限制。即使你在一秒内调用了 1000 次 rAF 回调，也只有约 60 帧被真正渲染到屏幕上。不过在 120Hz 的 ProMotion 显示器上，rAF 会自动提升到 120fps。

## 总结

`requestAnimationFrame` 是现代前端动画的基石：

1. **执行时机**：下一帧重绘前调用，与显示器刷新率完美同步
2. **性能优势**：避免丢帧、后台暂停、帧同步
3. **应用广泛**：动画、游戏、实时图表、滚动优化
4. **最佳实践**：用 `transform` 代替 `top/left`，分离读写操作，用 timestamp 保证动画一致性

掌握 rAF，就掌握了前端动画性能的半壁江山。

---

**相关面试题**：

> 1. rAF 回调函数中的 `timestamp` 和 `performance.now()` 有什么区别？
> 2. 如果在 rAF 回调中修改了元素的 `width`，会不会立即触发重排？
> 3. 如何在 rAF 中实现一个暂停/继续功能？
> 4. `requestIdleCallback` 和 `requestAnimationFrame` 的区别是什么？
