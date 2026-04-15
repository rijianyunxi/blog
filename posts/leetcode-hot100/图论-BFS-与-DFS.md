---
title: 图论、BFS 与 DFS（10 题）
date: 2026-03-28
description: 岛屿、课程表、克隆图、最短扩散类问题都在这里。
---

# 图论、BFS 与 DFS（10 题）

图论题先别慌，先判断三件事：**图是显式给的还是隐式给的、要遍历全部还是只求可达、是 DFS 合适还是 BFS 合适。**

## 51. 岛屿数量

- **标签**：DFS / 矩阵

### 思路

碰到陆地就做一次 DFS，把整块陆地都淹没掉。

### 代码（JavaScript）

```js
function numIslands(grid) {
  const m = grid.length, n = grid[0].length;
  function dfs(i, j) {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== '1') return;
    grid[i][j] = '0';
    dfs(i + 1, j);
    dfs(i - 1, j);
    dfs(i, j + 1);
    dfs(i, j - 1);
  }
  let count = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === '1') {
        count++;
        dfs(i, j);
      }
    }
  }
  return count;
}
```

## 52. 腐烂的橘子

- **标签**：BFS

### 思路

所有腐烂橘子同时作为 BFS 起点，一层代表一分钟。

### 代码（JavaScript）

```js
function orangesRotting(grid) {
  const m = grid.length, n = grid[0].length;
  const queue = [];
  let fresh = 0, minutes = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 2) queue.push([i, j]);
      if (grid[i][j] === 1) fresh++;
    }
  }
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (queue.length && fresh) {
    let size = queue.length;
    minutes++;
    while (size--) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx>=0 && nx<m && ny>=0 && ny<n && grid[nx][ny] === 1) {
          grid[nx][ny] = 2;
          fresh--;
          queue.push([nx, ny]);
        }
      }
    }
  }
  return fresh ? -1 : minutes;
}
```

## 53. 课程表

- **标签**：图 / 拓扑排序

### 思路

统计入度，入度为 0 的课程先学，最后看是否能处理完所有课程。

### 代码（JavaScript）

```js
function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) {
    graph[b].push(a);
    indegree[a]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) queue.push(i);
  }
  let count = 0;
  while (queue.length) {
    const cur = queue.shift();
    count++;
    for (const next of graph[cur]) {
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  return count === numCourses;
}
```

## 54. 课程表 II

- **标签**：图 / 拓扑排序

### 思路

和课程表一样，只是把弹出顺序记录下来作为一种合法学习路径。

### 代码（JavaScript）

```js
function findOrder(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) {
    graph[b].push(a);
    indegree[a]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indegree[i] === 0) queue.push(i);
  const res = [];
  while (queue.length) {
    const cur = queue.shift();
    res.push(cur);
    for (const next of graph[cur]) {
      if (--indegree[next] === 0) queue.push(next);
    }
  }
  return res.length === numCourses ? res : [];
}
```

## 55. 克隆图

- **标签**：图 / DFS

### 思路

克隆一个节点时，递归克隆它的邻居，并用 Map 避免重复创建。

### 代码（JavaScript）

```js
function cloneGraph(node) {
  if (!node) return null;
  const map = new Map();
  function dfs(cur) {
    if (map.has(cur)) return map.get(cur);
    const copy = new Node(cur.val);
    map.set(cur, copy);
    for (const next of cur.neighbors) {
      copy.neighbors.push(dfs(next));
    }
    return copy;
  }
  return dfs(node);
}
```

## 56. 被围绕的区域

- **标签**：DFS

### 思路

从边界上的 `O` 出发标记安全区域，最后把没标记到的 `O` 全改成 `X`。

### 代码（JavaScript）

```js
function solve(board) {
  const m = board.length, n = board[0].length;
  function dfs(i, j) {
    if (i < 0 || i >= m || j < 0 || j >= n || board[i][j] !== 'O') return;
    board[i][j] = '#';
    dfs(i + 1, j); dfs(i - 1, j); dfs(i, j + 1); dfs(i, j - 1);
  }
  for (let i = 0; i < m; i++) {
    dfs(i, 0); dfs(i, n - 1);
  }
  for (let j = 0; j < n; j++) {
    dfs(0, j); dfs(m - 1, j);
  }
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (board[i][j] === 'O') board[i][j] = 'X';
      if (board[i][j] === '#') board[i][j] = 'O';
    }
  }
}
```

## 57. 太平洋大西洋水流问题

- **标签**：DFS / 矩阵

### 思路

不是从每个点往海里流，而是反着从海岸线往内陆搜。能同时到两边海岸的点就是答案。

### 代码（JavaScript）

```js
function pacificAtlantic(heights) {
  const m = heights.length, n = heights[0].length;
  const pac = Array.from({ length: m }, () => Array(n).fill(false));
  const atl = Array.from({ length: m }, () => Array(n).fill(false));
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  function dfs(i, j, visited) {
    visited[i][j] = true;
    for (const [dx, dy] of dirs) {
      const x = i + dx, y = j + dy;
      if (x<0 || x>=m || y<0 || y>=n || visited[x][y]) continue;
      if (heights[x][y] < heights[i][j]) continue;
      dfs(x, y, visited);
    }
  }
  for (let i = 0; i < m; i++) {
    dfs(i, 0, pac); dfs(i, n - 1, atl);
  }
  for (let j = 0; j < n; j++) {
    dfs(0, j, pac); dfs(m - 1, j, atl);
  }
  const res = [];
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (pac[i][j] && atl[i][j]) res.push([i, j]);
    }
  }
  return res;
}
```

## 58. 矩阵中的最长递增路径

- **标签**：DFS / 记忆化搜索

### 思路

每个格子都去找四个方向更大的点，结果缓存后避免重复搜索。

### 代码（JavaScript）

```js
function longestIncreasingPath(matrix) {
  const m = matrix.length, n = matrix[0].length;
  const memo = Array.from({ length: m }, () => Array(n).fill(0));
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  function dfs(i, j) {
    if (memo[i][j]) return memo[i][j];
    let best = 1;
    for (const [dx, dy] of dirs) {
      const x = i + dx, y = j + dy;
      if (x>=0 && x<m && y>=0 && y<n && matrix[x][y] > matrix[i][j]) {
        best = Math.max(best, 1 + dfs(x, y));
      }
    }
    memo[i][j] = best;
    return best;
  }
  let ans = 0;
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) ans = Math.max(ans, dfs(i, j));
  }
  return ans;
}
```

## 59. 搜索二维矩阵 II

- **标签**：矩阵 / 搜索

### 思路

从右上角开始，小了往下，大了往左，每次都能排除一行或一列。

### 代码（JavaScript）

```js
function searchMatrix(matrix, target) {
  let i = 0, j = matrix[0].length - 1;
  while (i < matrix.length && j >= 0) {
    if (matrix[i][j] === target) return true;
    if (matrix[i][j] > target) j--;
    else i++;
  }
  return false;
}
```

## 60. 单词搜索

- **标签**：DFS / 回溯

### 思路

从每个格子出发 DFS，当前格子匹配后临时标记为已访问，回溯时恢复。

### 代码（JavaScript）

```js
function exist(board, word) {
  const m = board.length, n = board[0].length;
  function dfs(i, j, k) {
    if (k === word.length) return true;
    if (i<0 || i>=m || j<0 || j>=n || board[i][j] !== word[k]) return false;
    const tmp = board[i][j];
    board[i][j] = '#';
    const found = dfs(i + 1, j, k + 1) || dfs(i - 1, j, k + 1) ||
      dfs(i, j + 1, k + 1) || dfs(i, j - 1, k + 1);
    board[i][j] = tmp;
    return found;
  }
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }
  return false;
}
```

---

下一篇：[回溯（10 题）](/posts/leetcode-hot100/回溯-10题)