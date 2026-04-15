---
title: tsx / tsup / tsc 工具链对比
date: 2026-04-11
---

# tsx / tsup / tsc 工具链对比

很多 TypeScript 项目一开始就会遇到一个问题：

- 为什么有的项目用 `tsc`
- 有的项目用 `tsx`
- 有的项目又用 `tsup`
- 前端应用明明都用 `vite`，为什么还要跑 `tsc --noEmit`

如果你只是记“哪个工具更快”，很容易越用越乱。真正应该先建立的是一个职责模型。

一句话先说结论：

- `tsc` 主要负责类型检查，也可以负责编译
- `tsx` 主要负责运行 `.ts` 文件
- `tsup` 主要负责打包可发布产物

这三者不是互斥关系，更像是分别站在 **检查层、运行层、构建层**。

## 一、先别急着背命令，先分清三类任务

一个现代 TypeScript 项目，通常至少有三类任务：

1. 运行：本地怎么把项目启动起来
2. 检查：类型、Lint、测试怎么把问题拦住
3. 构建：最终产物怎么打出来给部署或发布使用

很多项目的问题，本质上不是“工具选错”，而是把这三类任务混到一起了。

例如：

- 拿 `tsx` 当类型守门员
- 拿 `tsc` 当开发服务器
- 对不需要发包的项目强上 `tsup`
- 以为 `vite` 已经做了类型检查

所以先记住这句话：

> 运行、检查、构建是三种不同职责，不应该由一个工具粗暴兜底。

## 二、三者一句话区别

| 工具 | 主要职责 | 适合什么场景 |
|------|------|------|
| `tsc` | 类型检查，必要时编译输出 | 所有 TypeScript 项目 |
| `tsx` | 直接运行 `.ts` 文件 | Node 服务、脚本、CLI、开发态快速启动 |
| `tsup` | 打包产物、输出声明文件 | npm 包、共享库、可发布工具包 |

如果非要打个很粗略的比喻：

- `tsc` 像质检员
- `tsx` 像运行器
- `tsup` 像打包机

## 三、`tsc` 到底在项目里负责什么

### 1. `tsc` 是 TypeScript 官方编译器

它最核心的价值是：**理解 TypeScript 语义，并做完整类型检查**。

常见两种用法。

### 2. 用法一：只做类型检查

现代项目里最常见的是：

```bash
npx tsc --noEmit
```

也就是：

- 做完整类型检查
- 不生成任何 JS 文件

这非常适合：

- React / Vite 应用
- 使用 `tsx` 跑开发态的 Node 项目
- 由其他工具负责构建的项目

这时候 `tsc` 的职责很纯粹：**当类型守门员**。

### 3. 用法二：直接编译输出 JS

也可以直接：

```bash
npx tsc
```

按 `tsconfig.json` 输出 JS 到 `outDir`。这种方式在这些场景仍然常见：

- 较简单的 Node 项目
- 不依赖复杂打包能力的后端服务
- 一些对构建速度要求不高的内部工具

### 4. `tsc` 的优点和限制

优点：

- 官方语义最完整
- 类型检查最可靠
- 适合作为 CI 的类型守门员

限制：

- 相比 `esbuild` / `swc` 体系更慢
- 不适合做现代前端开发服务器
- 对库打包、多格式输出、压缩等能力不强

所以现代项目常见的现实分工是：

- `tsc --noEmit` 做检查
- 其他工具负责运行和构建

## 四、`tsx` 负责的是“直接跑 TypeScript”

### 1. `tsx` 本质是什么

`tsx` 可以理解成一个非常适合开发体验的 TypeScript 运行器。它基于现代快速转译能力，让 Node 直接执行 `.ts` 文件。

典型用法：

```bash
npx tsx src/index.ts
```

监听模式：

```bash
npx tsx watch src/index.ts
```

带环境变量文件：

```bash
npx tsx --env-file=.env src/index.ts
```

### 2. `tsx` 为什么开发体验好

因为它解决的是“我想立刻把 TypeScript 跑起来”的问题：

- 不需要先 `tsc` 编译一遍
- 不需要手动产出 `dist/`
- 监听文件变化体验好
- 对现代 ESM、路径别名支持相对友好

这非常适合：

- Node 服务开发
- 命令行工具开发
- 本地脚本
- AI 项目、爬虫、任务调度脚本

### 3. 但 `tsx` 不应该替代 `tsc`

这是最关键的一点。

`tsx` 的重点是“能快速运行”，不是“严格拦住所有类型错误”。

也就是说：

- 它非常适合开发态运行
- 但它不该单独承担 CI 里的类型质量兜底

所以一个更合理的组合是：

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

## 五、`tsup` 真正适合的是“库打包”

### 1. `tsup` 是什么

`tsup` 是一个很务实的打包工具，尤其适合 TypeScript 库项目。它可以比较方便地做这些事：

- 输出 `esm` / `cjs`
- 生成 `.d.ts`
- 压缩产物
- 统一输出到 `dist/`

典型命令：

```bash
npx tsup src/index.ts --format esm,cjs --dts --clean
```

### 2. 为什么它适合库，不一定适合应用

前端应用的构建通常更关心：

- HTML 入口
- 静态资源处理
- 代码分割
- 路由和页面资源加载
- 开发服务器体验

这些通常是 `vite`、`webpack`、`rspack` 这类应用构建工具更擅长的。

而 `tsup` 更像是在做：

- 一个工具函数库
- 一个 Node SDK
- 一个共享组件库的产物输出
- 一个 CLI 包

### 3. 什么时候值得用 `tsup`

比较适合：

- 你要发布 npm 包
- 你要输出库产物给别的项目消费
- 你需要 `.d.ts`、`esm`、`cjs` 一起产出

不一定适合：

- 单纯的前端应用
- 只在自己项目里运行的脚本
- 不需要产出 `dist/` 的内部服务

## 六、前端应用为什么常见“`vite + tsc --noEmit`”

这是一个很典型的现代组合。

### 1. 为什么开发不是 `tsc`

因为前端应用开发更需要：

- 快速启动
- HMR
- 静态资源处理
- JSX/TSX 支持
- 插件生态

这些不是 `tsc` 擅长的。

所以开发态通常用：

```bash
vite
```

### 2. 为什么还要单独跑 `tsc --noEmit`

因为 `vite` 主要关注的是“让应用运行起来”，而不是像 `tsc` 一样承担完整类型守门职责。

所以应用项目常见脚本是：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

这套分工很清楚：

- `vite` 负责开发体验和应用构建
- `tsc` 负责类型质量

## 七、Node 项目里三者怎么搭配最合理

### 1. 场景一：普通 Node 服务

如果是一个后端服务，不需要发 npm 包，通常不必引入 `tsup`。

更务实的脚本是：

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

这套已经够用了。

### 2. 场景二：可发布的 Node SDK / 工具库

如果你要给别人消费，就应该考虑产物。

这时更常见的组合是：

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsup src/index.ts --format esm,cjs --dts --clean"
  }
}
```

### 3. 场景三：简单到不需要 `tsup`

有些 Node 项目其实直接 `tsc` 编译也够：

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  }
}
```

这不是“落后”，而是取决于项目需求是否真的值得引入额外构建工具。

## 八、库项目里 `tsc` 和 `tsup` 的关系

很多人会问：既然 `tsup` 能出 `.d.ts`，为什么还要 `tsc --noEmit`？

答案很现实：

- `tsup` 负责产物
- `tsc` 负责更稳的类型检查

所以更稳的做法通常是：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsup src/index.ts --format esm,cjs --dts --clean"
  }
}
```

不要把“能构建成功”误认为“类型就一定完全正确”。

## 九、怎么根据项目类型做选择

### 1. React / Vite 应用

推荐组合：

- 开发：`vite`
- 类型检查：`tsc --noEmit`
- 构建：`vite build`

通常不需要 `tsx`，也不需要 `tsup`。

### 2. Node 服务 / 脚本 / AI 项目

推荐组合：

- 开发：`tsx watch`
- 运行：`tsx`
- 类型检查：`tsc --noEmit`

通常不需要 `tsup`，除非要做产物输出。

### 3. npm 库 / SDK / 共享包

推荐组合：

- 类型检查：`tsc --noEmit`
- 构建：`tsup --dts --format esm,cjs`
- 如果本地调试需要直接运行源码，再加 `tsx`

### 4. Monorepo 场景

在 `monorepo` 中，这些脚本仍然写在各自包里，只是由根目录统一编排。

例如：

- 每个包保留自己的 `build` / `typecheck` / `test`
- 根目录通过 `turbo run build`、`turbo run typecheck` 调度

也就是说，`monorepo` 不会取代这些工具，只是把它们组织起来。

## 十、这些常见误解一定要避开

### 1. “用了 `tsx` 就不用 `tsc` 了”

错。`tsx` 解决的是运行体验，不是完整类型守门。

### 2. “所有 TypeScript 项目都该上 `tsup`”

错。只有需要产出可发布构建物时，`tsup` 才明显有价值。

### 3. “`tsc` 慢，所以没必要跑”

错。它是最可靠的类型守门员之一，尤其适合 CI。

### 4. “前端应用用 `vite` 就够了，不用做类型检查”

错。`vite` 不是类型安全兜底工具。

## 十一、给一个最务实的决策法

如果你现在还在纠结怎么选，直接按这个判断：

### 1. 你是不是前端应用

如果是：

- 用 `vite`
- 再加 `tsc --noEmit`

### 2. 你是不是 Node 服务或脚本

如果是：

- 用 `tsx` 跑开发和运行
- 用 `tsc --noEmit` 做检查

### 3. 你是不是要发布库或 SDK

如果是：

- 用 `tsup` 负责产物输出
- 用 `tsc --noEmit` 保证类型质量

这个判断方式比背一堆“热门工具推荐清单”更可靠。

## 十二、和本系列其他文章怎么串起来

这篇解决的是工具职责边界问题。

继续往下看，建议按这个顺序：

- [从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理](/posts/工程化/前端工程化与Monorepo全链路梳理)
- [tsconfig.json 全配置详解](/posts/工程化/tsconfig全配置详解)
- [环境变量与 dotenv](/posts/工程化/环境变量与dotenv)
- [模块系统与路径别名](/posts/工程化/模块系统与路径别名)

如果只记一句：

`tsc`、`tsx`、`tsup` 不是谁替代谁的问题，而是你有没有把“运行、检查、构建”三件事拆清楚的问题。
