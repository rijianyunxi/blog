---
title: DOM 树遍历 - BFS 与 DFS
date: 2026-03-28
tags: [JavaScript, DOM, 算法, 面试]
---

# DOM 树遍历 - BFS 与 DFS

DOM 树遍历是前端开发的基础技能，本文讲解 BFS 和 DFS 的实现及其应用。

## 1. DOM 树结构

```javascript
document.body
  ├─ div.container
  │    ├─ h1.title
  │    └─ p.content
  └─ footer
```

## 2. 广度优先搜索 (BFS)

### 队列实现

```javascript
function bfs(root, callback) {
  const queue = [root]
  
  while (queue.length) {
    const node = queue.shift()
    callback(node)
    
    for (const child of node.children) {
      queue.push(child)
    }
  }
}

// 使用
bfs(document.body, (node) => {
  console.log(node.tagName)
})
```

### 按层遍历

```javascript
function bfsByLevel(root) {
  const result = []
  const queue = [root]
  
  while (queue.length) {
    const level = []
    const levelSize = queue.length
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()
      level.push(node)
      
      for (const child of node.children) {
        queue.push(child)
      }
    }
    
    result.push(level)
  }
  
  return result
}
```

## 3. 深度优先搜索 (DFS)

### 递归实现

```javascript
function dfsRecursive(node, callback) {
  callback(node)
  
  for (const child of node.children) {
    dfsRecursive(child, callback)
  }
}
```

### 前序/中序/后序

```javascript
// 前序：根 → 左 → 右
function preOrder(node) {
  if (!node) return
  console.log(node.tagName)
  preOrder(node.left)
  preOrder(node.right)
}

// 中序：左 → 根 → 右
function inOrder(node) {
  if (!node) return
  inOrder(node.left)
  console.log(node.tagName)
  inOrder(node.right)
}

// 后序：左 → 右 → 根
function postOrder(node) {
  if (!node) return
  postOrder(node.left)
  postOrder(node.right)
  console.log(node.tagName)
}
```

### 栈实现（避免递归栈溢出）

```javascript
function dfsStack(root) {
  const result = []
  const stack = [root]
  
  while (stack.length) {
    const node = stack.pop()
    result.push(node)
    
    // 注意：逆序入栈保证顺序
    for (const child of [...node.children].reverse()) {
      stack.push(child)
    }
  }
  
  return result
}
```

## 4. 计算元素距离顶部距离

```javascript
function getElementTop(element) {
  let top = 0
  let current = element
  
  while (current) {
    top += current.offsetTop
    current = current.offsetParent
  }
  
  return top
}

// 或者使用 getBoundingClientRect
function getElementTopV2(element) {
  const rect = element.getBoundingClientRect()
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  return rect.top + scrollTop
}
```

## 5. DOM 序列化

```javascript
function serializeDOM(root) {
  const result = {
    tag: root.tagName,
    attrs: {},
    children: []
  }
  
  // 收集属性
  for (const attr of root.attributes) {
    result.attrs[attr.name] = attr.value
  }
  
  // 递归子节点
  for (const child of root.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      result.children.push(serializeDOM(child))
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent.trim()
      if (text) {
        result.children.push({ type: 'text', value: text })
      }
    }
  }
  
  return result
}
```

## 6. 面试高频问题

### Q: BFS 和 DFS 的区别？

- BFS：用队列，先访问近的节点，按层遍历
- DFS：用栈/递归，先访问远的节点，纵向遍历

### Q: 什么时候用 BFS？什么时候用 DFS？

- BFS：最短路径、层级遍历
- DFS：路径查找、拓扑排序、DOM 操作

## 7. 总结

DOM 遍历的核心：
- BFS：队列，按层访问
- DFS：栈/递归，纵向访问
- 选择取决于具体场景
