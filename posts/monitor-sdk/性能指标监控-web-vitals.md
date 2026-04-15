---
title: 性能指标监控 - web-vitals
date: 2026-03-28
tags: [前端监控, 性能, 面试]
---

# 性能指标监控 - web-vitals

Core Web Vitals 是 Google 定义的衡量用户体验的关键指标。

## 1. Core Web Vitals

| 指标 | 名称 | 目标 |
|------|------|------|
| LCP | 最大内容绘制 | < 2.5s |
| FID/INP | 首次输入延迟/交互到下一绘 | < 100ms |
| CLS | 累计布局偏移 | < 0.1 |

## 2. LCP - 最大内容绘制

```javascript
import { onLCP } from 'web-vitals'

onLCP((metric) => {
  console.log('LCP:', metric.value)
  
  // 评分
  if (metric.rating === 'good') {
    console.log('用户体验好')
  } else if (metric.rating === 'needs-improvement') {
    console.log('需要优化')
  } else {
    console.log('体验差')
  }
})
```

### LCP 优化

1. 优化服务器响应时间
2. 使用 CDN
3. 优化图片（格式、WebP）
4. 预加载关键资源

## 3. CLS - 累计布局偏移

```javascript
import { onCLS } from 'web-vitals'

onCLS((metric) => {
  console.log('CLS:', metric.value)
})
```

### CLS 优化

1. 给图片和视频设置尺寸
2. 不在内容上方插入动态内容
3. 使用 transform 而非动画

## 4. INP - 交互到下一绘

```javascript
import { onINP } from 'web-vitals'

onINP((metric) => {
  console.log('INP:', metric.value)
})
```

### INP 优化

1. 分解长任务
2. 使用 requestIdleCallback
3. 优化主线程

## 5. FCP - 首次内容绘制

```javascript
import { onFCP } from 'web-vitals'

onFCP((metric) => {
  console.log('FCP:', metric.value)
})
```

## 6. TTFB - 首字节时间

```javascript
import { onTTFB } from 'web-vitals'

onTTFB((metric) => {
  console.log('TTFB:', metric.value)
})
```

## 7. 面试高频问题

### Q: 什么是 Core Web Vitals？

Google 定义的用户体验指标：LCP、INP/FCP、CLS。

### Q: 如何优化 LCP？

- 使用 CDN
- 图片优化
- 预加载资源
- 服务器优化

### Q: 如何避免 CLS？

- 设置图片尺寸
- 避免动态插入内容
- 使用 transform 动画

## 8. 总结

Core Web Vitals 是衡量用户体验的重要指标，通过 web-vitals 库可以方便地收集这些数据。
