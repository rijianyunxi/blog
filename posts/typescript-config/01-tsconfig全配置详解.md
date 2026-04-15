---
title: tsconfig.json 全配置详解
date: 2026-04-11
---

# tsconfig.json 全配置详解

很多团队的 `tsconfig.json` 都是“从别的项目抄一个过来先跑起来”，然后几年都不动。结果就是：

- 编辑器里看起来没问题，构建时突然炸
- 本地能跑，CI 里找不到模块
- 浏览器应用和 Node 脚本共用一份配置，类型环境互相污染
- `strict` 开了，但该拦住的问题还是没拦住

`tsconfig.json` 不是一个“填空文件”，它本质上是 **TypeScript 项目的编译与类型检查策略文件**。它决定的不只是“语法报不报错”，还包括：

- 你的源码按什么模块语义理解
- 你的代码最终面向什么运行时
- 哪些类型系统规则被启用
- 哪些文件属于项目范围
- 构建工具和编辑器如何理解你的目录结构

这篇会把 `tsconfig.json` 放回工程化语境里讲清楚，不只解释单个配置项，也解释它们彼此之间的关系。

## 一、先建立认知：`tsconfig.json` 到底管什么

可以先把 `tsconfig.json` 拆成 5 类职责：

1. 编译目标：产物面向什么 JS 环境
2. 模块语义：`import/export` 怎么解释、模块怎么查找
3. 类型检查：严格模式和细粒度规则怎么开
4. 项目边界：哪些文件被纳入类型系统
5. 产物策略：是否输出 JS、声明文件、源码映射

所以你看一份 `tsconfig.json` 时，不应该只是逐项记配置，而应该先问：

- 这是浏览器项目、Node 服务、还是库项目
- 运行时是 ESM 还是 CommonJS
- `tsc` 负责产出 JS，还是只负责类型检查
- 是否需要路径别名
- 是否需要多份配置分层继承

## 二、一份现代前端/Node 项目可参考的基础配置

先给一份“偏现代、偏严格”的基础模板，后面再逐段拆。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": [],
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

    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "skipLibCheck": true,

    "noEmit": true,

    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"],
  "exclude": ["dist", "node_modules"]
}
```

这不是所有项目都应该直接照抄的“标准答案”，但它可以作为理解现代工程配置的起点。

## 三、最重要的三个字段：`target`、`module`、`moduleResolution`

这三个字段最容易被混淆。

### 1. `target`：产出 JS 的语法级别

它决定 TypeScript 编译后输出什么语法级别的 JavaScript，例如：

- `ES2018`
- `ES2020`
- `ES2022`
- `ESNext`

例如：

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

如果你的运行环境本身比较新，例如现代浏览器、Node 18+、Node 20+，一般没必要把 `target` 降得很低。

经验建议：

- 现代前端项目：`ES2020` / `ES2022`
- 现代 Node 项目：`ES2022`
- 如果构建工具会二次处理，也常见用 `ESNext`

### 2. `module`：模块语义是什么

它决定 TypeScript 如何理解和输出模块系统。

常见值：

- `ESNext`
- `CommonJS`
- `NodeNext`

现代前端项目通常用：

```json
{
  "compilerOptions": {
    "module": "ESNext"
  }
}
```

如果你在做严格 Node ESM 项目，常见会用：

```json
{
  "compilerOptions": {
    "module": "NodeNext"
  }
}
```

### 3. `moduleResolution`：模块路径怎么找

这和 `module` 不是一回事。

- `module` 管的是模块语义
- `moduleResolution` 管的是解析规则

常见值：

- `Bundler`
- `NodeNext`
- `Node16`
- `Node`

前端项目和使用 `vite`、`tsx`、`tsup` 这类工具的项目，通常更推荐：

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler"
  }
}
```

因为这更接近现代打包器和运行器的行为，也减少了 import 后缀问题。

### 4. 为什么这三者经常一起出问题

很多项目报错并不是某个字段“写错”，而是组合不一致。

例如：

- `module` 走 ESM，但运行时按 CommonJS 执行
- `moduleResolution` 用 `NodeNext`，代码里却省略了 Node ESM 需要的后缀
- `target` 太低，导致工具额外做大量转译

所以一个配置不要孤立看，要看整套组合是否符合你的运行环境。

## 四、`lib` 和 `types` 控制的是两种完全不同的类型来源

这是第二个高频混淆点。

### 1. `lib`：JavaScript 和宿主环境的内置类型库

例如：

- `ES2022`
- `DOM`
- `DOM.Iterable`

它决定编辑器是否认识这些内置对象：

- `Promise`
- `Map`
- `Window`
- `fetch`
- `document`

浏览器前端项目常见：

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

Node 项目则通常不需要 `DOM`：

```json
{
  "compilerOptions": {
    "lib": ["ES2022"]
  }
}
```

### 2. `types`：显式加载哪些 `@types/*` 包

这控制的是额外的环境/库类型声明。

例如：

```json
{
  "compilerOptions": {
    "types": ["node", "vitest/globals"]
  }
}
```

这表示：

- 加载 Node 的类型声明
- 加载 Vitest 全局测试 API 的类型声明

### 3. 为什么浏览器项目和 Node 项目最好拆开

如果你让浏览器应用和 Node 构建脚本共用一份 `lib/types`，很容易出现：

- 浏览器代码里误用 Node API
- Node 脚本里误以为有 DOM 环境
- 测试环境全局类型污染应用环境

所以更成熟的做法是分层配置，而不是“一份配置走天下”。

## 五、严格模式不够，真正值得开的细粒度规则有哪些

很多人只开：

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

这当然比不开强，但还不够。

### 1. `noUncheckedIndexedAccess`

推荐强烈开启。

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true
  }
}
```

它会把数组和对象索引访问结果变得更真实：

```ts
const arr = [1, 2, 3]
const value = arr[10]
```

不开时，`value` 可能还是 `number`。开了后会是 `number | undefined`。

这在前端处理接口数据、表单数据、配置表映射时很有价值。

### 2. `exactOptionalPropertyTypes`

```json
{
  "compilerOptions": {
    "exactOptionalPropertyTypes": true
  }
}
```

它会让可选属性的语义更精确。

例如：

```ts
type User = {
  name?: string
}
```

这个类型更接近“属性可以不存在”，而不是“属性一定存在，只不过值可能是 `undefined`”。

这对接口 DTO、组件 props、配置对象很重要。

### 3. `noImplicitReturns`

```json
{
  "compilerOptions": {
    "noImplicitReturns": true
  }
}
```

能防止函数某些分支漏返回。

这在前端 reducer、switch 分支、服务端 handler 里很常见。

### 4. `noImplicitOverride`

```json
{
  "compilerOptions": {
    "noImplicitOverride": true
  }
}
```

如果你在 class 场景里覆盖父类方法，必须明确写 `override`。这能减少继承体系里“误重名”的问题。

### 5. `noUnusedLocals` 和 `noUnusedParameters`

```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

这两个配置对多人协作项目很有帮助，能尽早清理无效代码和过期参数。

### 6. `noFallthroughCasesInSwitch`

```json
{
  "compilerOptions": {
    "noFallthroughCasesInSwitch": true
  }
}
```

用于防止 `switch` 漏写 `break` 或 `return` 导致意外穿透。

### 7. `noPropertyAccessFromIndexSignature`

```json
{
  "compilerOptions": {
    "noPropertyAccessFromIndexSignature": true
  }
}
```

如果对象本质上是索引签名类型，那么就要求你用 `[]` 访问，而不是 `.`。这个规则能显式提醒你：这里访问的是“动态键”，不是一个稳定结构。

## 六、这些配置是现代工具链里非常值得开的

### 1. `isolatedModules`

```json
{
  "compilerOptions": {
    "isolatedModules": true
  }
}
```

它要求每个文件都能被独立编译，不依赖别的文件的类型信息。这和 `esbuild`、`swc`、`tsx`、`vite` 这类工具的工作方式更一致。

如果你在现代前端/Node 工具链里开发，建议开启。

### 2. `verbatimModuleSyntax`

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

它会让 TypeScript 更忠实地保留你的 import/export 语义，尤其适合你明确区分 `import type` 和普通 import 的项目。

### 3. `moduleDetection: "force"`

```json
{
  "compilerOptions": {
    "moduleDetection": "force"
  }
}
```

它会强制每个文件都按模块处理，而不是脚本文件。这样能减少一些隐式全局污染问题。

### 4. `skipLibCheck`

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

这个选项常被拿来争论，但对于大多数业务项目来说，开启是务实选择。

原因很简单：

- `node_modules` 里的类型问题通常不是你能立即修的
- 全量检查第三方声明会明显拖慢编译速度

除非你在做基础设施或类型库开发，否则一般建议开。

## 七、`noEmit`、`declaration`、`sourceMap` 这组决定产物策略

### 1. `noEmit`

```json
{
  "compilerOptions": {
    "noEmit": true
  }
}
```

表示 `tsc` 只做类型检查，不产出 JS。

这在现代前端应用里非常常见，因为：

- 开发运行由 `vite` 负责
- 生产构建由 `vite build` 负责
- `tsc` 只担任类型守门员

Node 项目如果开发运行交给 `tsx`，也常见这样配。

### 2. `declaration`

如果你在做库项目，要输出 `.d.ts` 声明文件，就会用到：

```json
{
  "compilerOptions": {
    "declaration": true
  }
}
```

这对 npm 包、共享工具库、组件库很重要。

### 3. `sourceMap`

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

用于保留源码映射，方便调试构建后代码。

对于打包工具主导的项目，是否生成通常也可以交给打包器统一控制。

## 八、路径别名 `paths` 应该怎么理解

### 1. 路径别名的意义

很多人把它理解成“少写几个 `../../`”。这只是表层。

更重要的价值是：

- 让导入语义更稳定
- 降低目录重构成本
- 为后续拆包和边界治理打基础

典型配置：

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

### 2. 路径别名不是边界治理本身

即使你用了：

```ts
import { Button } from "@/components/Button"
```

也不代表你的架构就清晰了。如果任何模块仍然可以随意跨层 import，路径别名只是把混乱写得更漂亮。

### 3. 在 `monorepo` 里尤其不要用路径别名替代包边界

在单项目里，`@/*` 这种别名问题不大。但在 `monorepo` 中，不要用某个应用的别名去直接跨目录引用另一个包的源码。

错误示例：

```ts
import { sum } from "@/../../packages/utils/src"
```

正确做法应该是声明工作区依赖，然后按包名导入：

```ts
import { sum } from "@repo/utils"
```

## 九、`include`、`exclude`、`files` 决定项目边界

### 1. `include`

表示哪些文件或目录会被纳入 TypeScript 项目。

例如：

```json
{
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

### 2. `exclude`

一般用于排除：

- `dist`
- `node_modules`
- 临时生成文件

例如：

```json
{
  "exclude": ["dist", "node_modules"]
}
```

### 3. `files`

只有在非常精确控制项目范围时才常用。业务项目里更多使用 `include`。

## 十、为什么成熟项目通常会拆多份 tsconfig

这一步是从“能用”走向“可维护”的关键。

### 1. 推荐的拆分方式

- `tsconfig.base.json`：公共规则
- `tsconfig.app.json`：浏览器/React 应用
- `tsconfig.node.json`：Node 脚本和构建工具
- `tsconfig.test.json`：测试配置
- `tsconfig.json`：作为入口文件，按项目需要继承

### 2. 一个常见示例

```json
// tsconfig.base.json
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

```json
// tsconfig.app.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true,
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

### 3. 这样做的价值

- 浏览器代码不会误拿到 Node 全局类型
- Node 脚本不会误以为自己有 DOM
- 测试环境的全局类型更容易隔离
- 多项目和 `monorepo` 场景下更容易抽成共享配置包

## 十一、按项目类型给出配置建议

### 1. React / Vite 前端应用

推荐方向：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 2. Node 服务 / 脚本项目

如果使用 `tsx` 运行：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noEmit": true
  }
}
```

如果是严格 Node ESM 项目，则根据运行方式考虑 `NodeNext`。

### 3. 可发布 npm 库

这类项目除了类型检查外，还要考虑：

- 是否输出 `.d.ts`
- 是否输出 `esm` / `cjs` 双格式
- 产物目录是 `dist`

如果构建交给 `tsup`，则常见是：

- `tsc --noEmit` 做类型检查
- `tsup --dts` 负责打包与声明输出

## 十二、常见误区和坑

### 1. 把 `tsconfig.json` 当成所有工具的唯一真相

不是所有工具都完全按 `tsc` 的语义执行。`vite`、`esbuild`、`swc`、`tsx`、`jest`、`vitest` 都有自己的解析和运行逻辑。

所以你要验证的不是“编辑器有没有红线”，而是：

- 本地能否运行
- 构建是否成功
- CI 是否稳定

### 2. 浏览器项目里误配了 Node 类型

这会让 `process`、`Buffer` 等 API 在前端代码里看起来“合法”，但运行时并不存在。

### 3. 只开 `strict`，却不开更有价值的细粒度规则

这会让很多接口边界和数组访问问题继续悄悄漏过去。

### 4. 单份配置硬兼容应用、测试、Node 脚本

短期省事，长期很难维护。

### 5. 在 `monorepo` 里继续跨目录 import 源码

这会让工作区依赖图和包边界直接失效。

## 十三、给一个比较务实的建议

如果你现在想把项目的 `tsconfig.json` 从“能跑”升级到“可维护”，建议按这个顺序做：

1. 先明确项目类型，是前端应用、Node 服务还是库
2. 再统一 `target`、`module`、`moduleResolution` 这组三件事
3. 开启 `strict` 以及关键细粒度规则
4. 明确 `lib` 与 `types` 的环境边界
5. 把 `noEmit`、声明输出、源码映射策略理顺
6. 最后再做路径别名和多配置分层

顺序不要反。很多项目上来先配别名、先搞 fancy 目录，结果最基础的运行时语义都没统一。

## 十四、和本系列其他文章的关系

这篇解决的是 TypeScript 的底层配置问题，但它只覆盖工程化的一部分。

接着看更顺：

- [00 - 从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理](/posts/typescript-config/00-前端工程化与Monorepo全链路梳理)
- [02 - tsx / tsup / tsc 工具链对比](/posts/typescript-config/02-tsx-tsup-tsc工具链对比)
- [03 - 环境变量与 dotenv](/posts/typescript-config/03-环境变量与dotenv)
- [04 - 模块系统与路径别名](/posts/typescript-config/04-模块系统与路径别名)

如果只记一句话：

`tsconfig.json` 不是“抄完就结束”的模板文件，而是你整个 TypeScript 工程对运行时、模块系统、类型边界和产物策略的正式声明。
