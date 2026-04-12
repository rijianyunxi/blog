---
title: MutationObserver：掌握 DOM 变化的艺术
date: 2026-03-28
tags: [浏览器API, DOM, 前端面试, 性能优化]
---

# MutationObserver：掌握 DOM 变化的艺术

## 前言

在前端开发中，DOM 变化监听是一个常见但又容易踩坑的场景。传统的 `Mutation Events`（如 `DOMNodeInserted`、`DOMNodeRemoved`）由于性能问题早已被废弃，取而代之的是 **MutationObserver API**。它是现代浏览器提供的、专门用于监听 DOM 变化的高性能 API，被广泛应用于 Vue 响应式系统、水印注入、虚拟列表等场景。

本文将从 MutationObserver 的基本用法出发，结合源码演示，深入剖析其工作原理、性能优化策略，以及在面试中的高频考点。

## 基本用法

MutationObserver 的使用非常简洁，分三步走：

### 1. 创建观察者

```javascript
const observer = new MutationObserver((mutations, observer) => {
  mutations.forEach(mutation => {
    console.log('变化类型:', mutation.type);
    console.log('变化目标:', mutation.target);
  });
});
```

构造函数接收一个回调函数，当监听的 DOM 变化发生时，该回调会被调用。回调接收两个参数：
- `mutations`：变化记录数组
- `observer`：观察者实例本身

### 2. 关联目标节点

```javascript
const targetNode = document.querySelector('h1');

observer.observe(targetNode, {
  attributes: true,      // 监听属性变化
  childList: true,      // 监听子节点增删
  characterData: true,  // 监听文本节点变化
  subtree: true,        // 监听所有后代节点
  attributeOldValue: true,  // 记录变化前的属性值
  characterDataOldValue: true // 记录变化前的文本
});
```

### 3. 断开与停止

```javascript
// 暂停观察（但观察者对象不销毁）
observer.disconnect();

// 手动取出尚未触发回调的变化记录
const records = observer.takeRecords();
```

### 完整示例

```javascript
// 参考 /Users/song/study/mianshizhunbei/html/MutationObserver.html
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log(mutation);
  });
});

observer.observe(document.querySelector('h1'), {
  attributes: true,
  childList: true,
  characterData: true,
});

setTimeout(() => {
  document.querySelector('h1').style.color = 'red'; // 触发 attributes 变化
}, 3000);
```

## 配置项详解

MutationObserver 提供了丰富的配置项来精确控制监听范围：

### childList

```javascript
// 监听直接子节点的增删
observer.observe(el, { childList: true });

// 添加节点
el.appendChild(document.createElement('span')); // 触发

// 删除节点
el.removeChild(el.lastChild); // 触发
```

### attributes

```javascript
// 监听 HTML 属性和内联 style 变化
observer.observe(el, {
  attributes: true,
  attributeFilter: ['class', 'style'] // 可选：只监听特定属性
});

// class 变化
el.className = 'active'; // 触发

// style 变化
el.style.color = 'red'; // 触发
```

### characterData

```javascript
// 监听文本节点内容变化
observer.observe(textNode, { characterData: true });

// 修改文本
textNode.textContent = 'hello'; // 触发
```

### subtree

```javascript
// 监听目标节点及其所有后代
observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

> ⚠️ **注意**：`subtree` 会监听整个子树，开销较大，谨慎使用。

## MutationRecord 对象

每次 DOM 变化都会生成一个 `MutationRecord`，包含以下属性：

| 属性 | 描述 |
|------|------|
| `type` | 变化类型：`'attributes'`、`'characterData'` 或 `'childList'` |
| `target` | 变化发生的节点 |
| `addedNodes` | 新增的节点集合 |
| `removedNodes` | 删除的节点集合 |
| `previousSibling` | 被删除/修改节点的前一个兄弟节点 |
| `nextSibling` | 被删除/修改节点的后一个兄弟节点 |
| `attributeName` | 变化的属性名 |
| `oldValue` | 变化前的属性值/文本值（需设置 `attributeOldValue` 或 `characterDataOldValue`） |

## 性能优化：批量处理

MutationObserver 的核心优势之一是**异步触发**：DOM 变化不会立即触发回调，而是会等待当前执行栈清空后，**批量**通知观察者。这意味着即使短时间内发生多次 DOM 变化，也只会触发一次回调。

### 批量处理示例

```javascript
const observer = new MutationObserver((mutations) => {
  // 一次性处理所有变化，而不是每变一次处理一次
  console.log(`共发生 ${mutations.length} 次变化`);

  const allAdded = mutations.flatMap(m => [...m.addedNodes]);
  const allRemoved = mutations.flatMap(m => [...m.removedNodes]);

  console.log('新增节点:', allAdded);
  console.log('删除节点:', allRemoved);
});

observer.observe(container, { childList: true, subtree: true });

// 即使短时间内插入 100 个节点，回调也只触发一次
for (let i = 0; i < 100; i++) {
  container.appendChild(document.createElement('div'));
}
```

### takeRecords 的妙用

`takeRecords()` 可以取出队列中尚未触发回调的记录，常用于在 `disconnect` 之前获取所有待处理的记录：

```javascript
const observer = new MutationObserver((mutations) => {
  // 处理中...
});

// 某时刻需要停止监听
observer.disconnect();
const pendingRecords = observer.takeRecords(); // 获取未处理的记录
```

## 应用场景

### 场景一：Vue v-model 双向绑定

Vue 2 的响应式原理就用到了 MutationObserver。当表单输入时，Observer 捕获到 `characterData` 变化，然后更新 data 中的响应式属性，进而触发视图更新。

```javascript
// Vue 内部简化逻辑
function defineReactive(obj, key, val) {
  const dep = new Dep();

  Object.defineProperty(obj, key, {
    get() {
      if (Dep.target) {
        dep.addSub(Dep.target);
      }
      return val;
    },
    set(newVal) {
      if (val !== newVal) {
        val = newVal;
        dep.notify(); // 通知所有依赖更新
      }
    }
  });
}
```

> Vue 3 改用 Proxy 替代了 MutationObserver + Object.defineProperty 的组合。

### 场景二：动态水印注入

```javascript
function injectWatermark(container) {
  const observer = new MutationObserver(() => {
    // 检测容器是否被清空重建，若是则重新注入水印
    if (!container.querySelector('.watermark')) {
      createWatermark();
    }
  });

  observer.observe(container, { childList: true });

  function createWatermark() {
    const wm = document.createElement('div');
    wm.className = 'watermark';
    wm.textContent = 'CONFIDENTIAL';
    container.appendChild(wm);
  }
}
```

### 场景三：虚拟列表高度动态更新

```javascript
// 监听列表项高度变化，动态调整虚拟滚动高度
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      // 重新计算 phantom 高度
      phantomHeight = listData.length * estimateItemHeight;
      phantom.style.height = phantomHeight + 'px';
      render(); // 触发重新渲染
    }
  });
});

observer.observe(listContainer, {
  childList: true,
  subtree: true,
  characterData: true
});
```

## vs ResizeObserver / IntersectionObserver

| 对比项 | MutationObserver | ResizeObserver | IntersectionObserver |
|--------|------------------|----------------|---------------------|
| 监听目标 | DOM 树结构变化 | 元素尺寸变化 | 元素与视口交叉状态 |
| 触发时机 | DOM 增删、属性修改 | 宽高改变 | 进入/离开视口 |
| 典型场景 | 响应式框架、水印 | 图表自适应 | 懒加载、曝光统计 |
| 性能特点 | 异步批量，MicroTask 级别 | 微任务调度 | 独立线程计算 |

## 面试高频考点

### 考点一：MutationObserver 和 DOM 事件监听器的区别

这是面试中关于 MutationObserver 最常见的问题，很多候选人分不清两者界限。

**核心区别**：

1. **监听目标不同**
   - 传统事件监听器（如 `addEventListener`）监听的是**用户交互或浏览器行为**（click、scroll、focus）
   - MutationObserver 专门监听 **DOM 树结构变化**

2. **触发时机不同**
   - 传统事件是**同步**的，行为发生立即触发
   - MutationObserver 是**异步批量**的，等待当前执行栈完成后才触发

3. **性能影响不同**
   - 大量 DOM 变化触发传统事件可能导致严重的性能问题（古老的 `DOMNodeInserted` 就因此被废弃）
   - MutationObserver 经过优化，变化记录在微任务中批量交付

4. **是否冒泡**
   - 传统事件会冒泡
   - MutationObserver 不冒泡，只监听指定节点（除非设置 `subtree`）

```javascript
// 传统方式监听子节点变化（已废弃 ❌）
element.addEventListener('DOMNodeInserted', callback);

// MutationObserver 方式（推荐 ✅）
const observer = new MutationObserver(callback);
observer.observe(element, { childList: true });
```

### 考点二：MutationObserver 的异步机制

MutationObserver 的回调是**异步**的，它利用了浏览器的微任务队列（MicroTask）。这带来一个关键问题：

```javascript
const observer = new MutationObserver((mutations) => {
  console.log('回调触发，队列中还有:', observer.takeRecords().length, '条待处理');
});

observer.observe(el, { childList: true });

// 同步修改
el.appendChild(document.createElement('div'));

// 此时回调还没触发！
console.log('同步代码执行完毕'); // 先输出
// 然后微任务队列触发，回调才执行
```

### 考点三：如何只监听特定类型的子节点变化

```javascript
// 只监听 div 子节点的增删
observer.observe(container, {
  childList: true,
  subtree: true
});

const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1 && node.tagName === 'DIV') {
        console.log('添加了 div 节点:', node);
      }
    });
  });
});
```

## 总结

MutationObserver 是现代浏览器处理 DOM 变化的标准方案，相比废弃的 Mutation Events，它具有以下特点：

1. **异步批量**：DOM 变化合并到微任务中一次性通知，避免频繁触发
2. **精确配置**：通过配置项可以精确控制监听范围（属性/子节点/文本）
3. **高性能**：专为大量 DOM 操作设计，不阻塞主线程
4. **应用广泛**：Vue 响应式、水印、虚拟列表等核心功能都依赖它

掌握 MutationObserver 的原理和最佳实践，不仅能写出更高质量的代码，也是前端面试中的重要加分项。

---

**相关面试题**：

> 1. MutationObserver 的回调是同步还是异步？为什么这样设计？
> 2. 如何用 MutationObserver 实现一个简易的响应式系统？
> 3. MutationObserver 能监听 CSS 样式变化吗（如背景色通过外部 CSS 改变）？
> 4. `observer.takeRecords()` 在什么场景下需要使用？
