---
title: 从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理
date: 2026-04-15
---

# 从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理

很多人一提到前端工程化，脑子里先冒出来的是 `webpack`、`vite`、`eslint`、`monorepo`、`CI/CD` 这些词，但真到项目落地时，最容易出的问题不是“没听过这些工具”，而是**知道名词，却不知道它们在工程体系里各自解决什么问题、应该按什么顺序接起来、边界该怎么划**。

这篇不只讲 `monorepo`，而是把一条更完整的链路串起来：

- 为什么前端项目会从“能跑就行”走到工程化
- TypeScript 配置到底在整个工程里扮演什么角色
- `tsx`、`tsc`、`tsup`、`vite`、`pnpm workspace`、`turbo` 分别解决哪一层问题
- 单仓库项目什么时候应该演进到 `monorepo`
- `monorepo` 真正难的不是目录结构，而是依赖边界、任务编排、缓存、测试、发版和 CI

如果你正在搭一个现代前端项目，或者准备把多个前端/Node 项目收拢到一个仓库，这篇可以当总纲看。

## 一、什么叫前端工程化

前端工程化不是“工具越多越高级”，而是把原本靠人肉维持的事情变成一套稳定、可重复、可协作、可演进的机制。

一个没有工程化的前端项目，通常有这些特征：

- 目录结构靠约定俗成，没写下来
- `tsconfig.json` 是抄来的，没人说得清为什么这么配
- 环境变量谁都能加，错了只能线上炸
- `lint`、测试、构建、发布命令散落在各项目里
- 公共代码复制粘贴，不敢抽、不敢改
- 新人接手项目时，要靠口口相传才能跑起来

而工程化要解决的是另一套问题：

- 代码如何组织
- 类型如何约束
- 模块如何解析
- 本地开发如何跑
- 产物如何构建
- 多环境配置如何管理
- 团队怎么共享配置和公共代码
- CI 如何只跑必要步骤
- 发版如何可追踪、可回滚

所以更准确地说，前端工程化是一整套“**代码组织 + 工具链 + 质量保障 + 协作流程**”的设计。

## 二、先建立一个工程化分层视角

如果不先把层次拆开，后面很容易把工具用乱。

我更建议把现代前端工程拆成 8 层：

1. 代码层：业务代码、组件、工具函数、类型定义
2. 类型层：TypeScript、类型声明、类型检查、API 契约
3. 模块层：ESM/CJS、路径别名、模块解析、包边界
4. 运行层：本地开发、热更新、Node 运行、浏览器运行
5. 构建层：打包、产物生成、Tree Shaking、源码映射
6. 质量层：Lint、格式化、测试、类型校验
7. 协作层：工作区、共享包、版本策略、代码规范
8. 交付层：CI/CD、缓存、发布、环境隔离、监控

把工具放回这 8 层去理解，会清楚很多：

- `tsconfig.json` 属于类型层和模块层
- `vite`、`tsx` 属于运行层
- `tsup`、`rollup`、`webpack`、`vite build` 属于构建层
- `eslint`、`prettier`、`vitest`、`playwright` 属于质量层
- `pnpm workspace`、`turbo`、`changesets` 属于协作层和交付层

`monorepo` 不是单独的一层，它更像是把第 7、8 层系统化之后形成的组织方式。

## 三、从单项目开始，前端工程最小闭环是什么

很多人一上来就研究 `monorepo`，其实太早了。你应该先搞清楚**一个单项目最小工程闭环**。

一个现代 TypeScript 前端/Node 项目，至少应该回答这些问题：

- 源码放哪
- 编译和类型检查谁负责
- 本地开发命令是什么
- 环境变量怎么注入和校验
- 模块解析规则是什么
- 路径别名怎么统一
- lint、format、test、build、start 分别怎么跑

一个比较典型的单项目结构会是这样：

```text
project/
  src/
    components/
    pages/
    utils/
    types/
    index.ts
  tests/
  .env.example
  package.json
  tsconfig.json
  eslint.config.js
  vitest.config.ts
```

对于这个项目，最小可用脚本通常应该有：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```

如果是 Node/脚本型项目，通常会变成：

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

这一步非常关键，因为后面 `monorepo` 并不是替代这些脚本，而是把这些脚本统一编排起来。

## 四、TypeScript 在工程化里到底负责什么

很多人把 TypeScript 理解成“给变量加类型”，这太窄了。

在工程体系里，TypeScript 更重要的作用有四个：

- 让代码边界显式化
- 让运行时问题前移到开发阶段
- 让共享包、接口契约、组件 API 可以被稳定消费
- 让多人协作时，改动能被工具自动验证，而不是靠经验兜底

### 1. `tsconfig.json` 本质上是编译策略文件

`tsconfig.json` 不只是“开不开严格模式”，它同时决定：

- 编译输出目标是什么
- 模块语义是什么
- 类型检查严格到什么程度
- 目录边界是什么
- 允许哪些模块解析行为
- 是否产出 JS

一个前端/Node 通用且偏现代的基础配置通常长这样：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

这里最常被误解的是三组配置。

### 2. `target`、`module`、`moduleResolution` 不是一回事

- `target` 决定产出 JS 的语法级别
- `module` 决定模块语义是 `ESM` 还是 `CommonJS`
- `moduleResolution` 决定导入路径怎么找文件

这三个混了，项目通常会出现：

- 编辑器能跳转，运行时报模块找不到
- 本地开发能跑，构建时报错
- ESM 与 CJS 混用，默认导出行为混乱

现代前端项目大多数场景推荐：

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

如果你在做严格 Node ESM 服务，才更可能选：

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### 3. `strict` 不是尽头，真正能提升项目质量的是那些细粒度规则

很多项目只开 `strict`，然后就停了。但真正能在多人协作里兜住问题的，往往是这些：

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitReturns`
- `noImplicitOverride`
- `noUnusedLocals`
- `noUnusedParameters`
- `noFallthroughCasesInSwitch`

比如 `noUncheckedIndexedAccess` 可以把这种潜在 bug 提前暴露：

```ts
const users = [{ name: "A" }]
const first = users[1]

console.log(first.name)
```

不开时，`first` 可能被推成 `{ name: string }`；开了后会变成 `{ name: string } | undefined`，你必须处理空值。

### 4. 前端项目最好把 TS 配置分层，而不是一份大配置走天下

成熟项目通常不会只放一个 `tsconfig.json`，而是按职责拆：

- `tsconfig.base.json`：公共编译规则
- `tsconfig.app.json`：浏览器/React 应用配置
- `tsconfig.node.json`：Node 脚本、构建工具配置
- `tsconfig.test.json`：测试环境额外类型声明

例如：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "skipLibCheck": true,
    "moduleResolution": "Bundler"
  }
}
```

```json
// tsconfig.app.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

```json
// tsconfig.node.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["scripts", "vite.config.ts"]
}
```

这比“一份配置同时兼容浏览器、Node、测试、构建脚本”的可维护性高很多。

## 五、运行、检查、打包三件事不要混

前端工程里一个非常常见的问题是：一个工具承担了太多不该由它承担的职责。

必须先区分这三件事：

- 运行：本地怎么快速启动
- 检查：类型、Lint、测试怎么校验
- 打包：最终产物怎么生成

### 1. `tsc`、`tsx`、`tsup` 的关系

这是原有 TypeScript 工程配置系列里最容易被混淆的一组工具。

- `tsc`：官方编译器，负责类型检查，也可以生成 JS
- `tsx`：运行器，负责快速执行 `.ts` 文件，不做严格类型拦截
- `tsup`：打包器，负责把源码变成可发布产物，常见于 npm 包或 Node 库

如果是 Node 服务：

- 开发时用 `tsx watch`
- 检查时用 `tsc --noEmit`
- 发布 npm 包时才考虑 `tsup`

如果是前端应用：

- 开发时通常用 `vite`
- 类型检查仍然交给 `tsc --noEmit`
- 构建交给 `vite build`

也就是说，`tsc` 不是开发服务器，`tsx` 不是类型守门员，`tsup` 也不是所有项目都必须上。

### 2. 前端应用里，`vite` 实际上承担了运行层和部分构建层

`vite` 的价值不只是“快”，而是它把开发态运行体验和生产构建能力结合得比较均衡：

- 开发时走 ESM + 按需编译
- 构建时走 Rollup 产物管线
- 配合 TS、React、Vue 生态都比较自然

所以现在很多前端应用的组合会是：

- 类型检查：`tsc --noEmit`
- 开发：`vite`
- 构建：`vite build`
- 测试：`vitest`

这套的职责边界是相对清晰的。

## 六、环境变量不是“能读到就行”

很多项目的环境变量管理停留在：

- 建一个 `.env`
- 代码里直接写 `process.env.X`
- 线上报错时再查是不是没配

这不叫工程化，这叫把风险推迟到运行时。

环境变量应该解决三件事：

- 注入：值从哪里来
- 校验：缺了怎么办、格式错了怎么办
- 分层：开发、测试、预发、生产怎么隔离

### 1. 浏览器项目和 Node 项目的环境变量来源不同

Node 项目常见方式：

- `dotenv`
- `tsx --env-file=.env`

前端项目常见方式：

- `vite` 的 `import.meta.env`
- 框架约定的公开变量前缀，例如 `VITE_`、`NEXT_PUBLIC_`

不要把 Node 的 `process.env` 使用习惯直接套到浏览器应用里。

### 2. 类型安全的关键不是声明，而是启动时校验

很多人给 `process.env` 补了类型，就以为安全了。其实只解决了编辑器提示，没有解决“值是否真的存在”。

比较稳的做法是：启动时用 `zod` 或类似工具做一次强校验。

```ts
import { z } from "zod"

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_APP_ENV: z.enum(["local", "test", "prod"]),
})

export const env = envSchema.parse(import.meta.env)
```

这样好处很直接：

- 缺字段时应用启动就失败
- 类型变成可靠的确定值
- 不再到处写 `string | undefined`

### 3. `.env.example` 也属于工程化的一部分

推荐至少维护这些：

- `.env.example`：提交到仓库，作为模板
- `.env.local`：开发者本地私有，不提交
- `.env.production`：按平台注入，不直接存敏感值

以及在 README 或部署文档里明确写出：

- 哪些变量是客户端可暴露的
- 哪些变量只能在服务端使用
- 哪些值由 CI/CD 平台注入

## 七、模块系统和路径别名，决定项目是不是“看上去能跑，实际上脆弱”

前端工程里另一类高频问题，来自模块边界不清。

### 1. 路径别名的目的不是少写 `../../`

`@/components/Button` 的意义不是“看起来高级”，而是：

- 避免目录层级变化导致大面积相对路径重写
- 提高业务代码可读性
- 为后续拆包、抽公共模块做准备

典型写法：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

但要注意一个根本原则：**路径别名只是导入体验优化，不是架构治理本身**。

如果所有东西都还能随便互相 import，那换成别名也只是把混乱写得更好看。

### 2. ESM/CJS 问题，本质上是运行时语义统一问题

现代前端基本都偏向 `ESM`，但 Node 工具链、历史包、测试环境里仍然经常会遇到 `CommonJS`。

这时你要明确三件事：

- 代码希望用 `import/export` 还是 `require/module.exports`
- 运行环境是否真的支持 ESM
- 构建产物是否需要同时兼容 `esm` 和 `cjs`

应用项目通常统一成 ESM 就够了。

库项目如果需要发布到 npm，才常见这种输出：

```bash
tsup src/index.ts --format esm,cjs --dts
```

### 3. 真正危险的是跨边界直连源码

这点在 `monorepo` 里尤其重要。

错误写法：

```ts
import { sum } from "../../../packages/utils/src/index"
```

正确写法：

```ts
import { sum } from "@repo/utils"
```

前者看似省事，实际会导致：

- 依赖关系不被工作区正确识别
- 构建顺序无法自动推导
- 包边界形同虚设
- 未来发包和抽离几乎不可能

## 八、为什么单仓项目最终会走到 Monorepo

`monorepo` 不是因为“大家都这么搞”，而是因为项目在增长时，单仓单应用模式会逐渐暴露出一些结构性问题。

比较典型的是这几类：

- 多个前端应用共享组件和工具函数
- 前端与 Node 服务共享类型定义或 SDK
- 各项目配置重复，升级 ESLint/TS/测试配置很痛苦
- 跨项目改动需要开多个仓库、发多个版本、对齐多个分支

这时如果继续 `polyrepo`，代价会越来越高：

- 公共代码要靠复制或发包同步
- 版本升级变成多仓协调问题
- CI 无法统一优化
- 重构一条链路要跨多个仓库提 PR

`monorepo` 的价值，本质上是把“多个强相关项目”当成一个工程系统来治理。

## 九、Monorepo 到底解决了什么

一个成熟的 `monorepo`，解决的不是“代码放一起”这么简单，而是 5 类问题：

### 1. 共享代码

组件库、工具库、类型定义、SDK、工程配置都可以成为内部包。

### 2. 统一规范

`eslint`、`tsconfig`、测试工具、构建脚本、提交规范都能统一。

### 3. 跨项目重构

一个公共类型改动，可以在一个 PR 里同时修改所有消费方。

### 4. 增量执行

只有受影响的应用和包才需要重新构建、测试、发布。

### 5. CI/CD 优化

缓存、依赖图、任务过滤能力能够显著减少流水线成本。

## 十、Monorepo 的典型目录结构应该怎么设计

不要把 `monorepo` 理解成“把所有目录随便堆一起”。好的目录设计，一开始就要表达职责。

一个常见而且足够稳定的结构是：

```text
repo/
  apps/
    web/
    admin/
    docs/
  packages/
    ui/
    utils/
    api-client/
    types/
    eslint-config/
    tsconfig/
  package.json
  pnpm-workspace.yaml
  turbo.json
```

这里的职责边界通常是：

- `apps/*`：可独立运行、可部署的应用
- `packages/*`：可被复用、可被多个应用消费的内部包
- 根目录：负责工作区声明、任务编排、统一脚本

### 1. 哪些东西适合放到 `packages`

最适合被包化的内容通常是：

- `ui`：共享组件、设计 token、主题能力
- `utils`：纯函数、日期处理、字符串处理、通用逻辑
- `types`：领域模型、DTO、接口返回结构
- `api-client`：请求封装、SDK、鉴权逻辑
- `eslint-config`：共享 lint 规则
- `tsconfig`：共享 TS 配置

### 2. 哪些东西不要过早拆包

不建议一开始就把业务逻辑切成几十个包。经验上更好的做法是：

- 先拆稳定复用的部分
- 不要为了“未来可能复用”提前过度设计
- 不要建立一个什么都往里放的 `shared` 巨型包

公共包的粒度宁可按职责分，也不要按“感觉都像公共代码”分。

## 十一、`pnpm workspace` 负责什么，`turbo` 又负责什么

这是理解 `monorepo` 的关键。

### 1. `pnpm workspace` 解决的是包管理问题

它负责：

- 哪些目录属于 workspace
- 本地包如何互相依赖
- `workspace:*` 如何链接
- 安装依赖时如何复用 store、减少磁盘占用

例如：

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

内部包依赖这样写：

```json
{
  "dependencies": {
    "@repo/utils": "workspace:*"
  }
}
```

这表示：这个依赖来自当前仓库工作区，而不是远程 npm registry。

### 2. `turbo` 解决的是任务编排问题

仅有 `pnpm workspace`，你只是把包放进了一个仓库，但还没有解决：

- 构建顺序怎么排
- 哪些任务要先跑上游依赖
- 哪些任务可以并行
- 哪些任务可以缓存
- CI 里如何只跑受影响部分

这才是 `turbo` 的职责。

也可以简单记：

- `pnpm` 管包
- `turbo` 管任务

## 十二、为什么 Monorepo 里很多团队会用 Turborepo

`turbo` 的核心价值不是“它流行”，而是它刚好补上了 `workspace` 不擅长的部分。

### 1. 它按照依赖图执行任务，而不是无脑递归执行

例如：

- `apps/web` 依赖 `packages/ui`
- `packages/ui` 依赖 `packages/utils`

当你执行 `build` 时，合理顺序应该是：

1. 先构建 `utils`
2. 再构建 `ui`
3. 最后构建 `web`

`turbo` 能根据依赖关系自动推导这条链路。

### 2. 它能做增量执行

如果你这次只改了 `apps/web/src/pages/Home.tsx`，那就没必要重建整个仓库。

理想情况应该是：

- `utils` 没变，不重建
- `ui` 没变，不重建
- `admin` 没受影响，不重建
- 只处理 `web` 相关任务

这就是 `turbo` 的价值。

### 3. 它支持本地和远程缓存

对于 CI 来说，缓存是非常现实的效率收益。

如果同样输入下某个任务已经跑过，那么下一次：

- 本地可以直接复用缓存
- CI 也可以直接命中缓存

项目规模一大，这能明显缩短流水线时间。

### 4. 它对现有项目侵入较小

`turbo` 不要求你重写所有项目结构。通常只要：

- 各包继续保留自己的 `build`、`dev`、`lint`、`test` 脚本
- 根目录增加一个 `turbo.json`
- 根目录统一通过 `turbo run` 调度

这也是它适合中小团队逐步接入的原因。

## 十三、一个最小可用的 Monorepo 配置示例

根目录 `package.json`：

```json
{
  "name": "repo",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

根目录 `pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

根目录 `turbo.json`：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

最关键的是 `dependsOn` 和 `outputs`。

- `dependsOn: ["^build"]` 表示当前包的 `build` 依赖上游包的 `build`
- `outputs` 用来告诉 `turbo` 哪些目录是任务产物，便于缓存命中

## 十四、Monorepo 里共享 TypeScript 配置应该怎么做

这一步是把原本单项目里的 TypeScript 经验，提升到多包场景。

常见做法是在 `packages/tsconfig` 放共享配置：

```text
packages/
  tsconfig/
    base.json
    react-app.json
    node-lib.json
    package.json
```

`packages/tsconfig/package.json`：

```json
{
  "name": "@repo/tsconfig",
  "version": "0.0.0",
  "private": true
}
```

`packages/tsconfig/base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force"
  }
}
```

`packages/tsconfig/react-app.json`：

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true
  }
}
```

然后在 `apps/web/tsconfig.json` 中继承：

```json
{
  "extends": "@repo/tsconfig/react-app.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

这样做的收益是：

- 多个应用共享基础严格规则
- 版本升级时只改一处
- 浏览器、Node、测试场景可以分别维护不同模板

## 十五、Monorepo 里共享 ESLint / Prettier 配置也应该包化

这是很多团队的第二个收益点。

可以建：

- `@repo/eslint-config`
- `@repo/prettier-config`

好处是：

- React 应用和 Node 包使用相同基础规则
- 团队统一 import 顺序、未使用变量、hooks 规则
- 后续升级插件版本时只维护一份

工程化里一个很容易被低估的事实是：**真正让团队协作稳定的，往往不是业务代码，而是这些共享配置包**。

## 十六、Monorepo 里前端应用与共享包的依赖方向应该怎么定

依赖方向不清，仓库很快会变乱。

一个相对稳定的经验规则是：

- `apps/*` 可以依赖 `packages/*`
- `packages/*` 尽量不要依赖 `apps/*`
- 低层包不要反向依赖高层包
- `utils` 这类底层包不要意外引入 React、DOM 或 Node 专属能力

可以粗略理解成下面这个层级：

```text
apps/web, apps/admin
        ↓
packages/ui, packages/api-client
        ↓
packages/types, packages/utils
        ↓
packages/eslint-config, packages/tsconfig
```

如果你发现：

- `utils` 开始依赖 `ui`
- `types` 开始依赖业务应用代码
- `ui` 去 import 某个应用的页面逻辑

那就是边界已经开始失控了。

## 十七、测试在工程化和 Monorepo 里应该放在哪一层

测试不是“最后补一下”，而是工程质量层的一部分。

推荐把测试分成三层：

### 1. 包级单元测试

适合 `packages/utils`、`packages/api-client` 这种稳定逻辑包。

### 2. 应用级集成测试

适合 `apps/web`、`apps/admin` 的页面、路由、状态流、接口联动。

### 3. 端到端测试

适合核心业务链路，例如登录、支付、表单提交流。

在 `monorepo` 中，比较好的思路是：

- 测试文件归属各自的包和应用
- 任务调度由根目录统一控制

例如每个包保留自己的脚本：

```json
{
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

根目录统一：

```bash
pnpm test
pnpm typecheck
```

最终由 `turbo` 按依赖图和变更范围执行。

## 十八、CI/CD 才是检验工程化是否成立的地方

很多本地看起来很漂亮的工程方案，一上 CI 就露馅。

一个成熟的前端工程，不只是开发者电脑上能跑，还要保证流水线层面这些事情成立：

- 安装依赖是稳定且可重复的
- 类型检查是可阻断的
- 测试失败时能明确拦截
- 只改一个子包时，不必全仓库重跑
- 构建结果可缓存
- 发布动作有明确边界

### 1. 最基础的 CI 流程

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### 2. 进一步优化的方向

真正进入 `monorepo` 阶段后，CI 更推荐演进到：

- 受影响范围执行
- 构建缓存
- 按包或按应用区分发布流程
- PR 阶段与主分支阶段分离

比如：

- PR 只校验受影响应用与包
- 主分支补全完整构建与产物归档
- 发布阶段只发有版本变更的包

### 3. 远程缓存的收益

当团队协作人数上来后，远程缓存会变得非常值钱。

因为很多任务的输入其实是重复的：

- 依赖没变
- 代码没变
- 构建脚本没变

那就不该让每个开发者和每次 CI 都重新跑一遍。

## 十九、发版策略：应用和库不一定同一套

`monorepo` 里的“发布”通常有两种对象：

- 应用发布：部署到服务器、CDN、容器平台
- 库发布：发布到 npm 或私有 registry

这两类不要混。

### 1. 应用更关注部署环境

应用通常更关心：

- 哪个分支触发部署
- 环境变量如何注入
- 构建产物落到哪里
- 静态资源与服务端是否同步更新

### 2. 库更关注版本和兼容性

如果仓库里有内部组件库或 npm 包，则要考虑：

- 版本号怎么升
- 哪些包需要发版
- changelog 怎么生成
- 是否要维护 `peerDependencies`

这时 `changesets` 往往会比较合适。

## 二十、前端工程化里最常见的误区

这一部分比“怎么配”更重要，因为很多项目不是死在没有工具，而是死在错误理解上。

### 1. 工具越多，工程化越强

错。工程化的目标是降低协作成本，不是制造配置复杂度。

### 2. 上了 Monorepo 就自动高级

错。没有边界治理、缓存、依赖图、共享配置的 `monorepo`，只是更大的混乱。

### 3. TypeScript 配好了，项目就安全了

错。类型系统兜不住环境变量缺失、接口响应脏数据、运行时权限问题。

### 4. 路径别名等于架构清晰

错。别名只改善导入体验，不会自动替你建立依赖边界。

### 5. 所有公共代码都应该抽成包

错。过早抽象会比复制两次更贵。应该优先抽“稳定复用”的部分，而不是“可能复用”的部分。

### 6. `turbo` 是必须的

也不对。如果你的仓库只有两个小包、构建几秒钟结束，那 `pnpm workspace` 加简单脚本就够了。

`turbo` 的价值建立在仓库复杂度已经足够高这个前提上。

## 二十一、一个比较务实的演进路线

如果你现在准备把项目从单仓应用逐渐演进成完整的前端工程体系，我更建议按这个顺序来。

### 第一阶段：先把单项目工程闭环补齐

- 把 `tsconfig` 配清楚
- 明确 `dev`、`build`、`typecheck`、`lint`、`test` 脚本
- 补上环境变量模板和校验
- 补上基础测试和 lint 规则

### 第二阶段：抽共享配置，而不是先抽业务包

- 抽 `tsconfig`
- 抽 `eslint-config`
- 抽 `prettier-config`

这样做投入小、收益快，而且不容易把业务切碎。

### 第三阶段：再抽稳定复用的功能包

- `ui`
- `utils`
- `types`
- `api-client`

### 第四阶段：最后再引入任务编排和缓存

- `pnpm workspace`
- `turbo`
- 受影响范围执行
- 远程缓存

这是更稳的一条路。很多团队失败，是因为一上来就想把仓库设计成“大厂模板”，结果在尚未稳定的业务上引入了过多治理成本。

## 二十二、给一个完整的认知模型

如果你看完只想带走一个脑图，可以记下面这条主线：

### 1. 单项目阶段先解决“能稳定开发”

- TypeScript 配置
- 模块解析
- 环境变量
- 开发与构建脚本
- lint / test / typecheck

### 2. 多项目阶段再解决“能稳定协作”

- 工作区
- 共享包
- 配置包化
- 依赖边界
- 任务编排

### 3. 工程成熟阶段再解决“能高效交付”

- 增量构建
- 缓存
- CI/CD
- 发布策略
- 环境治理

这三层分别对应：

- 工程可用
- 团队可协作
- 组织可扩展

`monorepo` 其实只是在第二、第三层成熟之后的一种自然结果。

## 二十三、这一篇和本系列其他文章怎么配合看

这篇是总纲，目的是把前端工程化和 `monorepo` 的全链路先串起来。

如果你要继续往下细看，可以按这个顺序读：

1. 先看 [01 - tsconfig.json 全配置详解](/posts/typescript-config/01-tsconfig全配置详解)，补齐 TypeScript 配置细节
2. 再看 [02 - tsx / tsup / tsc 工具链对比](/posts/typescript-config/02-tsx-tsup-tsc工具链对比)，建立运行、检查、打包的职责边界
3. 再看 [03 - 环境变量与 dotenv](/posts/typescript-config/03-环境变量与dotenv)，把配置注入和类型校验补全
4. 接着看 [04 - 模块系统与路径别名](/posts/typescript-config/04-模块系统与路径别名)，把模块语义和路径管理理顺
5. 最后看 [05 - OpenAI SDK 类型系统详解](/posts/typescript-config/05-OpenAI-SDK类型系统详解)，理解复杂 SDK 在 TypeScript 工程里的类型组织方式

如果后面要继续扩这个系列，我更建议往这些方向补：

- `pnpm workspace` 实战搭建
- `turbo.json` 配置逐项解析
- `changesets` 发版流程
- React / Vite 项目在 `monorepo` 下的目录设计
- ESLint Flat Config 与共享配置包实践
- Vitest / Playwright 在 `monorepo` 里的组织方式

## 二十四、最后收束一下

前端工程化真正难的地方，从来不是“会不会装工具”，而是你能不能建立一套**边界清晰、职责明确、能被团队长期维护**的机制。

`TypeScript` 解决的是类型和边界问题，`vite`/`tsx` 解决的是运行体验，`tsup`/构建工具解决的是产物问题，`pnpm workspace` 解决的是包组织，`turbo` 解决的是任务编排，CI/CD 解决的是最终交付。

把这些放回各自的层里理解，你就不会再把 `monorepo` 当成目录结构问题，也不会再把“前端工程化”误解成“装一堆工具”。

真正成熟的工程体系，应该做到三件事：

- 开发者能低成本进入项目
- 团队能低风险做跨项目改动
- 组织能低成本把项目持续交付下去

这才是前端工程化最终要服务的目标。
