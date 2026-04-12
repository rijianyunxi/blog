---
title: Vue3 迷你实现
---

# 🔥 Vue3 迷你实现

从零手写 Vue3 核心模块，深入理解响应式原理、虚拟 DOM、Diff 算法。

## 📁 项目结构

```
vue-next-mini/
├── packages/
│   ├── reactivity/        # 响应式系统
│   │   ├── reactive.ts    # reactive() 实现
│   │   ├── effect.ts      # 依赖收集与触发
│   │   ├── computed.ts    # 计算属性
│   │   ├── ref.ts         # ref 实现
│   │   └── apiWatch.ts    # watch 实现
│   ├── runtime-core/      # 运行时核心
│   │   ├── vnode.ts       # 虚拟 DOM
│   │   ├── renderer.ts    # 渲染器
│   │   └── createVNode.ts # h() 函数
│   ├── runtime-dom/       # DOM 平台实现
│   │   ├── patchProp.ts   # DOM 属性操作
│   │   └── nodeOps.ts     # DOM 节点操作
│   ├── compiler-core/     # 编译器核心
│   ├── compiler-dom/      # DOM 编译器
│   ├── shared/            # 共享工具
│   └── vue/               # 整合入口
└── rollup.config.js       # 构建配置
```

## 🎯 知识点

| 模块 | 核心知识点 | 面试考点 |
|------|-----------|---------|
| reactivity | Proxy + WeakMap + effect | Vue3 vs Vue2 响应式区别 |
| computed | 懒计算 + 缓存 + dirty | computed 缓存原理 |
| watch | deep + immediate + scheduler | watch vs watchEffect |
| ref | .value 拦截 + toRef/toRefs | 为什么 ref 需要 .value |
| VNode | ShapeFlags + PatchFlags | 虚拟 DOM 的意义 |
| Renderer | Diff + patchKeyedChildren | Vue3 Diff 算法优化 |

## 📚 系列文章

<div class="vp-doc">

1. [项目架构总览](./01-vue3-mini-项目架构总览) - monorepo 结构与模块划分
2. [响应式系统 reactive & proxy](./02-vue3-响应式系统-reactive-proxy) - Proxy 拦截与深层代理
3. [依赖收集与触发 effect](./03-vue3-依赖收集与触发-effect) - targetMap + track + trigger
4. [computed 计算属性实现](./04-vue3-computed-计算属性实现) - 懒计算与缓存
5. [watch 侦听器实现](./05-vue3-watch-侦听器实现) - scheduler + deep + immediate
6. [ref 响应式引用](./06-vue3-ref-响应式引用) - ref vs reactive
7. [虚拟 DOM 与 VNode](./07-vue3-虚拟DOM与VNode) - VNode 结构与 h() 函数
8. [Diff 算法与 Renderer](./08-vue3-Diff算法与Renderer) - 渲染器与 patch 流程

</div>

## 💡 面试高频问题

**Q: Vue3 为什么用 Proxy 替代 Object.defineProperty？**

::: details 答案
1. **性能更好**：Proxy 拦截整个对象，不需要遍历每个属性
2. **支持数组**：Proxy 天然支持数组索引变化和 length 变化
3. **支持新增属性**：不需要 $set
4. **支持 Map/Set**：可以代理集合类型
5. **缺点**：Proxy 无法 polyfill，不支持 IE11
:::

**Q: computed 缓存原理？**

::: details 答案
computed 返回一个 ComputedRefImpl 对象：
- `_dirty` 标记：true 时重新计算，计算后设为 false
- `effect` 关联：依赖变化时，将 `_dirty` 重置为 true
- get 拦截：`_dirty` 为 true 时才执行 getter，否则返回缓存值
:::

**Q: Vue3 Diff 算法和 Vue2 的区别？**

::: details 答案
Vue2：双端比较（4 次比较）
Vue3：
1. **首尾预设**：先比较首尾，快速处理简单情况
2. **最长递增子序列**：LIS 算法减少移动次数
3. **PatchFlags**：编译时标记，运行时跳过静态节点
:::
