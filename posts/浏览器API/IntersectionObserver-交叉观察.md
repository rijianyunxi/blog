---
title: IntersectionObserver：交叉观察器与懒加载实战
date: 2026-03-28
tags: [浏览器API, 性能优化, 前端面试, 懒加载]
---

# IntersectionObserver：交叉观察器与懒加载实战

## 前言

在前端性能优化的版图中，"懒加载" 是一个永恒的话题。图片懒加载、无限滚动、曝光统计、骨架屏……这些常见功能背后，都有一个共同的技术支撑 —— **IntersectionObserver**。

在 IntersectionObserver 出现之前，实现"元素是否进入视口"的功能需要监听 scroll 事件，通过 `getBoundingClientRect()` 计算元素位置。这种方式存在严重的性能问题：scroll 事件在滚动过程中会频繁触发，而 `getBoundingClientRect()` 会触发强制重排（Reflow），在大页面中简直是性能杀手。

IntersectionObserver 的出现，彻底改变了这一局面。它运行在**浏览器渲染引擎的独立线程**中，不阻塞主线程，用回调的方式优雅地通知开发者元素的可见性变化。

## 基本用法

### 创建观察者

```javascript
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    // entry.isIntersecting: 元素是否与视口相交
    // entry.intersectionRatio: 相交比例 [0, 1]
    if (entry.isIntersecting) {
      console.log('元素进入视口');
    }
  });
}, {
  root: null,          // 视口，null 表示浏览器视口
  rootMargin: '0px',   // 扩展/收缩视口范围
  threshold: 0         // 相交比例阈值
});
```

### 监听元素

```javascript
const target = document.querySelector('.lazy-image');

// 开始观察
observer.observe(target);

// 停止观察
observer.unobserve(target);

// 断开所有观察
observer.disconnect();
```

## IntersectionObserverEntry 对象

每个交叉变化都会生成一个 `IntersectionObserverEntry`，包含丰富的交叉信息：

| 属性 | 描述 |
|------|------|
| `target` | 被观察的目标元素 |
| `isIntersecting` | 元素是否与视口相交 |
| `intersectionRatio` | 相交比例，0 到 1 |
| `boundingClientRect` | 目标元素的 `getBoundingClientRect()` |
| `rootBounds` | 视口的 `getBoundingClientRect()` |
| `intersectionRect` | 实际交叉区域的矩形 |
| `time` | 变化发生的时间戳 |

## 配置项详解

### root：参照容器

```javascript
// 观察元素是否进入浏览器视口
observer.observe(el);

// 观察元素是否进入特定容器视口
const container = document.querySelector('#scroll-container');
const observer = new IntersectionObserver(callback, {
  root: container  // 相对于 container 而非 window 视口
});
observer.observe(el);
```

> 当 `root` 为 `null` 时，默认是浏览器视口（对于滚动在 `window` 上的情况）或最近的可滚动祖先容器。

### rootMargin：视口扩展

```javascript
// 提前 100px 触发（图片在距视口底部 100px 时就开始加载）
const observer = new IntersectionObserver(callback, {
  rootMargin: '100px 0px'  // top/bottom 各扩展 100px
});

// 也可以写负数（收缩）
rootMargin: '-50px 0px'  // 元素完全进入视口后 50px 才触发
```

**实战技巧**：rootMargin 常用于图片懒加载，让图片在距离视口一定距离时就开始加载，避免用户看到空白：

```javascript
// 图片距离视口还有 200px 时就开始加载（预加载）
observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img); // 加载完成，停止观察
    }
  });
}, {
  rootMargin: '200px 0px'
});
```

### threshold：相交阈值

```javascript
// 0: 元素只要有像素进入就触发（默认）
// 1: 元素完全进入才触发
// 0.5: 一半进入时触发
// [0, 0.25, 0.5, 0.75, 1]: 多个阈值都会触发

const observer = new IntersectionObserver(callback, {
  threshold: [0, 0.25, 0.5, 0.75, 1]
});

// 回调中 entry.intersectionRatio 可以判断具体是哪个阈值触发的
```

## 判断元素是否进入视口

```javascript
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
```

但更优雅的方式是用 IntersectionObserver：

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 元素正在视口中
    } else {
      // 元素不在视口中
    }
  });
});
```

## 应用场景

### 场景一：图片懒加载

这是 IntersectionObserver 最经典的应用场景：

```javascript
// HTML
// <img data-src="real-image.jpg" class="lazy" alt="">

const lazyImages = document.querySelectorAll('.lazy');
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      observer.unobserve(img); // 停止观察已加载的图片
    }
  });
}, {
  rootMargin: '200px 0px' // 提前 200px 开始加载
});

lazyImages.forEach(img => imageObserver.observe(img));
```

### 场景二：无限滚动

```javascript
const sentinel = document.querySelector('#sentinel'); // 页面底部的"哨兵"元素
let page = 1;

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadMoreData().then(() => {
        page++;
      });
    }
  });
}, {
  rootMargin: '100px' // 距离底部 100px 就提前加载
});

observer.observe(sentinel);

async function loadMoreData() {
  const data = await fetch(`/api/data?page=${page}`);
  renderList(data);
}
```

### 场景三：曝光统计

```javascript
// 曝光埋点：用户看到某个区域时记录
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
      const bannerId = entry.target.dataset.bannerId;
      // 发送曝光统计请求（同一个 Banner 只统计一次）
      sendExposureLog(bannerId);
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.5 // 至少 50% 可见才统计
});

document.querySelectorAll('.banner').forEach(banner => {
  observer.observe(banner);
});
```

### 场景四：骨架屏显隐控制

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // 内容进入视口，显示真实内容，隐藏骨架屏
      entry.target.querySelector('.skeleton').style.display = 'none';
      entry.target.querySelector('.content').style.display = 'block';
    }
  });
});
```

## 面试高频考点

### 考点一：IntersectionObserver 性能优势

这是面试中最常问的问题。核心在于：IntersectionObserver **运行在独立的渲染线程**，不阻塞主线程。

**传统 scroll 监听的问题**：

```javascript
// ❌ 低性能：滚动时频繁触发，可能导致卡顿
window.addEventListener('scroll', () => {
  const rect = element.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    loadImage(element);
  }
});
```

问题分析：
1. `scroll` 事件在滚动时会**高频触发**（每像素都可能触发）
2. `getBoundingClientRect()` 会触发**强制重排**（虽然某些浏览器做了优化，但仍然有开销）
3. 在主线程中执行，大量计算会**阻塞 UI 渲染**

**IntersectionObserver 的优势**：

```javascript
// ✅ 高性能：由浏览器渲染引擎独立计算，不阻塞主线程
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) loadImage(entry.target);
  });
}, { threshold: 0.1 });
```

1. **独立线程**：浏览器在合成线程（Compositor Thread）中计算交叉状态，结果通过任务队列传递给主线程
2. **节流**：浏览器会自动对同一元素的多次交叉变化做节流，不会每次像素变化都通知
3. **零重排**：`intersectionRect` 等信息由浏览器内部计算，无需调用 `getBoundingClientRect()`，不会触发额外重排

### 考点二：root 和 rootMargin 的配合使用

```javascript
// 实现"提前加载"：元素距离视口底部 200px 时就开始加载
const observer = new IntersectionObserver(callback, {
  root: null,
  rootMargin: '0px 0px 200px 0px' // top right bottom left
});
```

> `rootMargin` 的语法和 CSS `margin` 一致，支持 px 和 %。

### 考点三：disconnect 后重新 observe

```javascript
const observer = new IntersectionObserver(callback);

// 观察多个元素
elements.forEach(el => observer.observe(el));

// 断开所有
observer.disconnect();

// 重新观察（需要重新调用 observe）
observer.observe(newElement);
```

### 考点四：懒加载与预加载的平衡

rootMargin 设置过大或过小都有问题：

```javascript
// rootMargin 过大 → 提前加载过多，浪费带宽
rootMargin: '1000px 0px'  // 可能导致首屏图片还没滚动就开始加载

// rootMargin 过小 → 用户看到空白加载区，体验差
rootMargin: '0px 0px'      // 图片完全进入视口才开始加载

// 推荐值：200px - 300px
rootMargin: '200px 0px'  // 提前一些，但不至于太早
```

## 与 MutationObserver、ResizeObserver 的对比

这三个 Observer API 经常被一起考察：

| API | 监听目标 | 典型场景 |
|-----|---------|---------|
| IntersectionObserver | 元素与祖先/视口交叉 | 懒加载、无限滚动、曝光统计 |
| MutationObserver | DOM 树结构变化 | 响应式框架、水印注入 |
| ResizeObserver | 元素尺寸变化 | 图表自适应、响应式布局 |

## polyfill 与兼容性

IntersectionObserver 的兼容性已经非常好（Chrome 51+、Safari 12+、Firefox 55+），但如果需要兼容 IE，可以引入 polyfill：

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver"></script>
```

## 总结

IntersectionObserver 是现代前端不可或缺的性能利器：

1. **懒加载**：图片、视频、音频的按需加载，减少首屏流量
2. **无限滚动**：用户体验良好的内容流加载
3. **曝光统计**：精准的用户行为数据采集
4. **性能优化**：用独立线程替代 scroll 监听，告别卡顿

它的设计理念体现了现代浏览器 API 的方向：**让开发者声明"想要什么"，而不是"怎么做"**，浏览器在底层用最高效的方式实现这些需求。
