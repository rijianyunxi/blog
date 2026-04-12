---
title: Vue3 Mini 项目架构总览：从原理理解 Vue3 的模块化设计
date: 2026-03-28
tags: [Vue3, 源码解析, 架构设计]
---

# Vue3 Mini 项目架构总览：从原理理解 Vue3 的模块化设计

## 一、引言

在学习 Vue3 源码的漫漫长路上，很多人一头扎进 `reactive.ts` 或 `effect.ts`，却忽略了一个至关重要的问题：**为什么 Vue3 要把整个框架拆成这么多独立的包？** 这种拆分的背后，不仅仅是代码组织的问题，更体现了前端工程化、渲染性能、跨平台能力等一系列深层次的思考。

今天，我们从 vue-next-mini 项目入手，从零理解 Vue3 的整体架构设计。无论你是准备面试还是想深入理解框架原理，这篇文章都会给你一个清晰的全局视角。

## 二、Monorepo 结构：pnpm workspace 的威力

### 2.1 什么是 Monorepo？

传统的多仓库（Multi-repo）模式下，每个包都是独立的 Git 仓库。这带来的问题是：跨包调试困难、版本同步繁琐、CI/CD 配置重复。而 Monorepo（单体仓库）将所有相关模块放在同一个仓库中，通过 workspace 机制统一管理依赖和构建。

vue-next-mini 使用 **pnpm workspace** 来管理 Monorepo 结构，核心配置文件是根目录下的 `pnpm-workspace.yaml`：

```yaml
packages:
  - 'packages/*'
```

这行配置告诉 pnpm：`packages/` 目录下的每一个子目录都是一个独立的工作空间（包）。

### 2.2 项目根目录结构一览

```
vue-next-mini/
├── pnpm-workspace.yaml      # pnpm workspace 配置
├── pnpm-lock.yaml          # 锁定文件
├── package.json             # 根目录 package.json
├── rollup.config.js         # 全局 rollup 构建配置
├── tsconfig.json            # TypeScript 基础配置
└── packages/
    ├── reactivity/           # 响应式系统
    ├── runtime-core/         # 运行时核心（平台无关）
    ├── runtime-dom/          # 浏览器 DOM 运行时
    ├── compiler-core/        # 编译核心（平台无关）
    ├── compiler-dom/         # DOM 专属编译器
    ├── shared/               # 跨包共享工具
    └── vue/                  # 面向用户的完整 Vue 包
```

### 2.3 根 package.json 的秘密

根目录的 `package.json` 不仅仅定义了项目元信息，更重要的是通过 **workspace 协议** 来引用本地包：

```json
{
  "name": "vue-next-mini",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w"
  },
  "devDependencies": {
    "rollup": "^4.x",
    "typescript": "^5.x"
  },
  "dependencies": {
    // 本地包的引用通过 workspace 协议
    "@vue/runtime-core": "workspace:*",
    "@vue/runtime-dom": "workspace:*"
  }
}
```

`workspace:*` 协议是 pnpm 的强大特性，它指向本地工作空间中的包。在构建时，pnpm 会自动将 `workspace:*` 解析为实际的包路径。这带来的一个直接好处是：**本地包之间的引用始终指向源码，而不是 node_modules 中的 snapshot**，这让跨包调试变得无比自然。

## 三、Packages 划分：每个包的职责

这是 Vue3 架构最核心的部分。理解每个包的职责和它们之间的依赖关系，是理解整个框架的钥匙。

### 3.1 reactivity — 独立于框架的响应式引擎

`reactivity` 包是 Vue3 最耀眼的设计决策之一：**响应式系统与框架解耦**。

```
packages/reactivity/
├── src/
│   ├── reactive.ts        # reactive() 和 shallowReactive()
│   ├── ref.ts             # ref() 和 shallowRef()
│   ├── computed.ts        # computed()
│   ├── effect.ts          # effect() 和 watchEffect()
│   ├── baseHandlers.ts    # Proxy 的 get/set 拦截器
│   ├── reactiveEffect.ts  # ReactiveEffect 类 + targetMap
│   ├── dep.ts             # Dep 集合类型定义
│   ├── effectScope.ts     # effect 作用域
│   └── index.ts           # 导出入口
├── package.json
└── tsconfig.json
```

这个包完全独立于 Vue，甚至可以在 React 或 Node.js 中使用。它的 API 非常纯粹：

```typescript
// 任何 JavaScript 环境都可以使用
import { reactive, effect } from '@vue/reactivity'

const state = reactive({ count: 0 })
effect(() => console.log(state.count))
state.count++ // 打印 1
```

**这是面试中经常被问到的问题**：Vue3 的响应式系统为什么能独立出来？因为它的设计从一开始就是 **数据结构的映射**：只要你在 get 时收集依赖、在 set 时触发更新，任何响应式系统都可以用这套机制。Vue3 的 reactivity 包就是这个抽象的具体实现。

### 3.2 runtime-core — 跨平台的运行时核心

```
packages/runtime-core/
├── src/
│   ├── renderer.ts         # 渲染器核心
│   ├── component.ts        # 组件实例
│   ├── componentRenderUtils.ts
│   ├── apiWatch.ts         # watch() 和 watchEffect()
│   ├── apiComputed.ts      # 面向用户的 computed 封装
│   ├── apiRef.ts           # 面向用户的 ref 封装
│   ├── h.ts                # h() 虚拟 DOM 创建函数
│   ├── vnode.ts            # VNode 类型定义
│   ├── createVNode.ts      # createVNode 实现
│   ├── normalizeProps.ts
│   ├── updateScheduler.ts  # 批量更新调度器
│   ├── scheduler.ts        # 调度器
│   ├── watch.ts            # watch 实现
│   └── index.ts
```

`runtime-core` 是**渲染层的抽象层**，定义了组件化、渲染器、vnode 等核心概念，但不包含任何 DOM 相关的代码。这意味着它的逻辑可以被任何渲染目标复用——浏览器、Weex、SSR 服务端，甚至 canvas。

核心概念：
- **Renderer（渲染器）**：接收 vnode 并将其渲染到具体的渲染目标上
- **Component（组件）**：包含状态（state）、渲染函数（render）、生命周期钩子
- **VNode（虚拟节点）**：用 JavaScript 对象描述 UI 结构

### 3.3 runtime-dom — 浏览器专属运行时

```
packages/runtime-dom/
├── src/
│   ├── nodeOps.ts          # DOM 操作抽象（createElement 等）
│   ├── patchAttrs.ts       # 属性更新
│   ├── patchClass.ts       # class 更新
│   ├── patchStyle.ts       # style 更新
│   ├── patchEvents.ts      # 事件处理
│   ├── patchProp.ts        # patchProp 入口
│   ├── index.ts            # 浏览器环境 patchFlattening
│   └── directives.ts       # 自定义指令
├── index.ts
└── package.json
```

`runtime-dom` 的核心职责是：**将 platform-agnostic（平台无关）的渲染逻辑，翻译成具体的 DOM 操作**。

关键数据结构 `nodeOps` 封装了所有 DOM 操作：

```typescript
// packages/runtime-dom/src/nodeOps.ts
export const nodeOps = {
  createElement: (tag) => document.createElement(tag),
  remove: (child) => child.parentNode?.removeChild(child),
  insert: (child, parent, anchor) => parent.insertBefore(child, anchor || null),
  querySelector: (selector) => document.querySelector(selector),
  // ...
}
```

而 `patchProp` 则根据不同的 prop 类型，调用不同的 patch 函数：

```typescript
// 伪代码
function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') patchClass(el, nextValue)
  else if (key === 'style') patchStyle(el, prevValue, nextValue)
  else if (isOn(key)) patchEvent(el, key, prevValue, nextValue)
  else patchAttr(el, key, nextValue)
}
```

### 3.4 compiler-core — 平台无关的编译器

```
packages/compiler-core/
├── src/
│   ├── parse.ts            # 模板解析（AST 生成）
│   ├── transform.ts         # AST 转换
│   ├── codegen.ts           # 代码生成
│   ├── ast.ts               # AST 节点类型定义
│   ├── utils.ts
│   └── errors.ts
```

`compiler-core` 负责将模板字符串编译成渲染函数。核心流程：

```
模板字符串 → 解析（parse） → AST → 转换（transform） → 生成（codegen） → JavaScript 代码
```

这个包本身不包含 DOM 相关知识，只知道 vnode 的结构，所以可以被任何渲染目标使用。

### 3.5 compiler-dom — DOM 专属编译规则

```
packages/compiler-dom/
├── src/
  ├── index.ts  # 包含 DOM 专属的编译选项和转换规则
```

比如 `style` 属性的处理，在浏览器中需要用 `cssText`，但在 SSR 中不需要。这个包定义了浏览器环境下的编译规则。

### 3.6 shared — 全局共享工具

```
packages/shared/
├── src/
│   ├── shapeFlags.ts       # ShapeFlags 常量
│   ├── patchFlags.ts       # PatchFlags 常量
│   ├── toDisplayString.ts  # 值转字符串
│   ├── normalizeProp.ts
│   ├── typeUtils.ts
│   └── index.ts
```

这个包的特点是：**可以在 Node.js（SSR）和浏览器端共享**，不包含任何环境特定的代码。里面放的是各个包都需要用到的常量、工具函数、类型定义。

### 3.7 vue — 面向用户的完整包

```
packages/vue/
├── src/
│   ├── index.ts   # 导出所有用户 API
```

这个包的作用很简单：**把 reactivity、runtime-core、runtime-dom、compiler-dom 打包在一起**，对外暴露一个统一的 API 入口。用户安装 `vue` 时，得到的是一个完整的响应式 + 渲染 + 编译的系统。

## 四、模块依赖关系图

理解了每个包的职责后，它们的依赖关系就非常清晰了：

```
                          ┌─────────────────────┐
                          │       shared        │
                          │ (常量/工具/类型)    │
                          └─────────┬───────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│     reactivity      │   │    compiler-core    │   │    runtime-core     │
│  (响应式核心系统)   │   │   (平台无关编译)   │   │   (跨平台运行时)   │
└─────────────────────┘   └─────────┬───────────┘   └─────────┬───────────┘
                                    │                         │
                                    ▼                         │
                        ┌─────────────────────┐                │
                        │    compiler-dom     │                │
                        │    (DOM 专属编译)   │                │
                        └─────────────────────┘                │
                                                                 │
                                                                 ▼
                                                ┌─────────────────────┐
                                                │    runtime-dom      │
                                                │   (浏览器 DOM 运行时)│
                                                └─────────┬───────────┘
                                                          │
                                                          ▼
                                                ┌─────────────────────┐
                                                │        vue          │
                                                │  (用户完整包)       │
                                                └─────────────────────┘
```

**依赖规则**：
- `shared` 不依赖任何其他包，被所有包依赖
- `reactivity` 不依赖其他包，是最底层的基础
- `compiler-core` 独立，不依赖 runtime 包
- `runtime-core` 依赖 `reactivity`（组件的响应式能力）
- `runtime-dom` 依赖 `runtime-core`（在其基础上添加 DOM 操作）
- `compiler-dom` 依赖 `compiler-core`（在其基础上添加 DOM 规则）
- `vue` 依赖上面所有包，做统一导出

## 五、构建配置：Rollup 的角色

Vue3 使用 **Rollup** 作为打包工具，每个包都有自己的 `package.json` 指定入口文件和构建格式：

```json
// packages/reactivity/package.json
{
  "name": "@vue/reactivity",
  "main": "index.cjs.js",    // CommonJS 格式
  "module": "index.esm-bundler.js",  // ES Module 格式
  "buildOptions": {
    "formats": ["cjs", "esm-bundler"]  // 两种构建格式
  }
}
```

为什么选择 Rollup？
1. **Tree-shaking 友好**：Rollup 基于 ES Module，天然支持按需导入
2. **输出格式丰富**：可以同时输出 CJS、ESM、UMD 等多种格式
3. **代码体积小**：Rollup 的 scope hoisting 减少了冗余代码

## 六、面试核心问题解析

### 问题 1：为什么 Vue3 要拆这么多包？

这道题考察的是对框架设计的深层理解，标准答案应该包含以下几个维度：

**① 响应式系统独立化**
Vue3 的响应式系统（reactivity 包）是完全独立的，可以在任何 JavaScript 环境中使用。这意味着：
- 可以单独更新 reactivity 而不需要升级整个 Vue
- 可以在 React 中使用 Vue 的响应式系统（确实有这样的实验项目）
- 符合"关注点分离"（Separation of Concerns）的设计原则

**② 跨平台能力的根本保障**
```
runtime-core (纯逻辑) + runtime-dom (DOM) = 浏览器 Vue
runtime-core (纯逻辑) + runtime-weex (Native) = Weex Vue
```
通过替换"渲染层"实现跨平台，而不需要重写整个框架。这是经典的**依赖反转**（Dependency Inversion）设计模式。

**③ 编译时优化**
compiler-core 和 compiler-dom 的分离，使得 Vue3 在编译阶段就能做静态分析（模板中的动态/静态节点），从而生成更高效的渲染代码。Vue3 的 `patchFlag` 优化就来源于此。

**④ Tree-shaking 优化**
如果你只用了 `reactive` 和 `ref`，打包时不会包含任何 DOM 相关的代码。每个包都按需导入，大幅减少最终包体积。

### 问题 2：模块化设计的好处有哪些？

| 维度 | 具体好处 |
|------|----------|
| **代码复用** | reactivity 包可被任何框架使用 |
| **独立维护** | 各包可独立发布版本，互不影响 |
| **按需加载** | Tree-shaking 按需打包，减小体积 |
| **跨平台** | 替换渲染层即可支持新平台 |
| **测试友好** | 每个包可独立测试，降低测试复杂度 |
| **团队协作** | 不同团队可以独立维护不同包 |

### 问题 3：Vue3 的架构对你的日常开发有什么启发？

- **设计 API 时考虑抽象层**：Vue 的 API 分层（reactive/ref → runtime-core → runtime-dom）启示我们设计 API 时应该考虑"什么是不变的，什么是易变的"
- **依赖管理清晰**：每个包的 `package.json` 明确定义了对外暴露的 API，形成清晰的公共接口
- **配置驱动构建**：通过 `buildOptions.formats` 配置不同的输出格式，适配不同的使用场景

## 七、总结

Vue3 的 Monorepo 架构不是炫技，而是深思熟虑后的产物：

1. **pnpm workspace** 提供了高效的包管理体验
2. **reactivity 独立** 是最有远见的设计决策
3. **runtime-core 抽象** 为跨平台渲染奠定了基础
4. **compiler 分离** 让编译时优化成为可能
5. **shared 共享** 避免了跨包的代码重复

理解了这套架构，你就理解了 Vue3 的设计哲学：**用抽象换取灵活，用分层换取可维护性，用独立换取复用性**。这些思想不仅适用于框架开发，也同样适用于我们的日常工程实践。
