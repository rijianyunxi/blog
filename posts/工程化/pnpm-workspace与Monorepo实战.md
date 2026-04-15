---
title: pnpm workspace 与 Monorepo 实战
date: 2026-04-15
---

# pnpm workspace 与 Monorepo 实战

讲 `monorepo` 很容易停留在概念层：

- 多个项目放一个仓库
- 共享代码更方便
- 配合 `turbo` 很高效

这些都没错，但真到落地时，很多人第一步就开始卡住：

- 目录到底怎么摆
- `pnpm-workspace.yaml` 怎么写
- 内部包怎么互相依赖
- 共享配置是不是也该抽成包
- 旧项目怎么迁进来不至于一上来就全仓爆炸

这篇就不再讲抽象定义，而是直接讲 `pnpm workspace` 在前端工程和 `monorepo` 里的实际落地方式。

## 一、先明确：`pnpm workspace` 解决的不是“任务编排”

这个认知必须先立住。

`pnpm workspace` 负责的是：

- 声明哪些目录属于同一个工作区
- 让工作区内部包可以互相依赖
- 在安装依赖时复用 store、减少磁盘占用
- 用 `workspace:*` 显式声明内部依赖关系

它不主要解决这些事：

- 任务按依赖图怎么排
- 哪些任务可以缓存
- CI 如何只跑受影响项目

这些是 `turbo`、`nx` 之类工具更擅长的。

所以可以先记成一句：

- `pnpm workspace` 管包
- `turbo` 管任务

## 二、为什么 Monorepo 通常会从 `pnpm workspace` 开始

因为 `monorepo` 的第一步，不是先上任务编排，而是先把**包的组织关系**理顺。

如果连这些都还没稳定：

- 哪些目录是应用
- 哪些目录是共享包
- 包之间怎么依赖
- 哪些配置是公共基础设施

那你即使先上 `turbo`，也只是在自动调度一团混乱。

所以一个相对稳妥的顺序通常是：

1. 先建立 `workspace`
2. 再稳定目录结构和内部依赖
3. 最后再接任务编排、缓存、发版和 CI 优化

## 三、一个最常见也最稳的目录结构

现代前端/全栈项目里，一个很常见的目录结构是：

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

这里可以先把职责看清：

- `apps/*`：独立运行、独立部署的应用
- `packages/*`：被多个应用复用的内部包
- 根目录：负责统一声明工作区和顶层脚本

### 1. 为什么建议分 `apps` 和 `packages`

因为这能直接表达两个最核心的工程概念：

- 哪些东西是最终产品或站点
- 哪些东西是共享基础设施

如果一开始所有目录都平铺，仓库稍微大一点就很难从结构上看出职责。

### 2. `packages` 里最值得先抽的是什么

通常不是业务包，而是这些：

- `ui`
- `utils`
- `types`
- `eslint-config`
- `tsconfig`

原因很现实：

- 它们更稳定
- 复用收益高
- 抽出来不容易把业务切碎

## 四、怎么配置 `pnpm-workspace.yaml`

最基础的配置通常很简单：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

这表示：

- `apps` 目录下一层的每个子目录都视为一个 workspace package
- `packages` 目录下一层的每个子目录也视为一个 workspace package

这一步做完后，`pnpm` 就会把这些目录当成同一个工作区中的包统一管理。

### 1. 什么目录会被认成 workspace package

前提是目录下要有自己的 `package.json`。

例如：

```text
apps/web/package.json
packages/ui/package.json
packages/utils/package.json
```

如果只是普通目录，没有 `package.json`，它不会成为独立 package。

## 五、根目录 `package.json` 应该承担什么职责

根目录通常不放业务代码，主要负责：

- 声明仓库私有性
- 声明包管理器版本
- 放统一脚本入口
- 放顶层开发依赖

一个典型示例：

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

就算你暂时还没接 `turbo`，根目录也应该逐渐成为统一脚本入口，而不是让每个应用完全各跑各的。

## 六、内部包怎么声明依赖关系

这是 `workspace` 最关键的一步。

例如 `apps/web` 想使用 `packages/utils`，那就应该在 `apps/web/package.json` 中明确声明：

```json
{
  "name": "web",
  "private": true,
  "dependencies": {
    "@repo/utils": "workspace:*"
  }
}
```

这里的 `workspace:*` 表示：

- 这个依赖来自当前工作区
- 优先链接本地包，而不是去远程 registry 安装

### 1. 为什么一定要显式声明

因为 `monorepo` 的核心不是“反正都在一个仓库里”，而是**依赖关系可被工具理解**。

如果你不在 `package.json` 里声明，而只是代码里跨目录 import 源码，那包图对工具来说就是不完整的。

### 2. 为什么不要直接这样写

错误示例：

```ts
import { sum } from "../../../packages/utils/src/index"
```

这种方式的问题是：

- 依赖关系不会体现在 `package.json`
- 工作区工具无法正确理解包边界
- 后续任务编排和缓存都会受影响

正确方式应该永远是：

```ts
import { sum } from "@repo/utils"
```

## 七、一个最小可用示例

我们用一个简单结构演示。

```text
repo/
  apps/
    web/
  packages/
    utils/
  package.json
  pnpm-workspace.yaml
```

### 1. `packages/utils/package.json`

```json
{
  "name": "@repo/utils",
  "version": "0.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2. `packages/utils/src/index.ts`

```ts
export function sum(a: number, b: number) {
  return a + b
}
```

### 3. `apps/web/package.json`

```json
{
  "name": "web",
  "private": true,
  "dependencies": {
    "@repo/utils": "workspace:*"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4. `apps/web/src/main.ts`

```ts
import { sum } from "@repo/utils"

console.log(sum(1, 2))
```

这就形成了一个最小闭环：

- `web` 是应用
- `utils` 是共享包
- 依赖通过 `workspace:*` 显式声明

## 八、共享配置为什么也应该做成包

这是很多团队真正开始感觉到 `monorepo` 有收益的地方。

与其每个项目复制一份配置，不如直接把配置包化。

### 1. `tsconfig` 包

例如：

```text
packages/
  tsconfig/
    base.json
    react-app.json
    node-lib.json
    package.json
```

然后各应用继承：

```json
{
  "extends": "@repo/tsconfig/react-app.json"
}
```

### 2. `eslint-config` 包

例如：

```text
packages/
  eslint-config/
    index.js
    react.js
    package.json
```

其他包统一使用：

```js
export { default } from "@repo/eslint-config/react"
```

### 3. 为什么这类包优先级很高

因为它们：

- 改动频率低
- 复用范围广
- 一旦统一，整个仓库都受益

相比之下，业务包往往变化更快，过早拆分可能会让复杂度先上来。

## 九、Monorepo 里的依赖方向怎么控制

只把目录分出来还不够，依赖方向如果不控制，仓库很快会烂掉。

比较稳的经验规则是：

- `apps/*` 可以依赖 `packages/*`
- `packages/*` 尽量不要依赖 `apps/*`
- 底层 `utils` / `types` 不要依赖高层 `ui` 或某个业务应用

可以粗略理解成：

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

- `utils` 开始 import React
- `types` 去依赖某个业务页面
- `ui` 反向依赖 `apps/web`

那说明边界已经开始塌了。

## 十、工作区里的依赖安装该怎么理解

`pnpm` 相比 `npm` / `yarn`，一个很大的特点是它的依赖安装更严格，也更节省空间。

### 1. 为什么它适合 monorepo

因为 `monorepo` 非常依赖这两件事：

- 依赖复用
- 显式依赖

`pnpm` 对“你没声明但偷偷能用”的隐式依赖更不宽容，这反而有助于尽早暴露问题。

### 2. 这会带来什么收益

- 工作区包之间依赖更清晰
- 磁盘占用更可控
- 新包接入时更容易发现漏声明依赖

## 十一、怎么从单仓项目迁移到 workspace

这是最实用的一段。很多人不是从零搭，而是把已有项目慢慢收进来。

### 1. 不要第一步就拆几十个包

最稳的路线是：

1. 先把现有主应用挪到 `apps/web`
2. 新建 `packages/utils` 或 `packages/ui` 这种最稳定的共享包
3. 把原来复制粘贴的公共代码迁进去
4. 用 `workspace:*` 接回应用
5. 最后再慢慢抽配置包、API 包、类型包

### 2. 为什么这比“大爆炸重构”更稳

因为 `monorepo` 的难点不在目录移动，而在：

- 导入路径是否稳定
- 构建链路是否仍然成立
- 测试是否仍然能跑
- 团队是否能理解新的边界

一次性把项目切成二十个包，几乎总会带来过高的回归风险。

### 3. 一个典型迁移顺序

可以按这个顺序做：

1. 建立 `apps/` 和 `packages/` 目录
2. 增加 `pnpm-workspace.yaml`
3. 把现有应用迁到 `apps/web`
4. 修复路径、脚本和根目录入口
5. 抽 `utils`、`types`、`ui`
6. 抽 `tsconfig` 和 `eslint-config`
7. 最后再接 `turbo`、缓存、发版工具

## 十二、在 workspace 里写脚本的推荐方式

一个常见误区是：

- 根目录脚本写一大堆复杂 shell
- 各包自己又写一套完全不同的命令

更稳的做法是：

### 1. 各包负责本地职责

例如每个包自己有：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

或者库包：

```json
{
  "scripts": {
    "build": "tsup src/index.ts --dts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2. 根目录负责统一入口

例如：

```json
{
  "scripts": {
    "build": "turbo run build",
    "typecheck": "turbo run typecheck"
  }
}
```

这样分工更清楚：

- 包定义自己的能力
- 根目录决定如何统一调度

## 十三、Monorepo 里最常见的坑

### 1. 只建了目录，没有真正建立包边界

表现就是：

- 还在跨目录 import 源码
- `package.json` 依赖关系不完整
- 看上去是 monorepo，实际上只是大仓库

### 2. 过早过细拆包

一开始就拆几十个包，往往会让：

- 包之间耦合更多
- 维护成本更高
- 团队心智负担更重

### 3. 公共包职责不清

如果你建了一个 `shared` 或 `common`，然后什么都往里扔，最后它会成为公共垃圾桶。

### 4. 把应用内路径别名当成跨包方案

例如试图用 `@/*` 去绕开包依赖声明，这会直接破坏工作区边界。

### 5. 一上来就把所有问题都交给 `turbo`

`turbo` 解决的是任务编排，不会替你建立包边界。

## 十四、什么时候说明你的 workspace 已经用对了

一个工作区用得比较稳，通常会有这些信号：

- 应用和共享包职责清晰
- 内部依赖都通过 `workspace:*` 显式声明
- 跨包导入按包名而不是目录路径
- 共享配置已经开始包化
- 根目录可以统一执行构建、测试、类型检查

这时再往上接 `turbo`、`changesets`、远程缓存，收益会比较大。

## 十五、一个比较务实的落地建议

如果你现在就要开始动手，不要试图第一天把仓库做成“大厂模板”。

更稳的顺序是：

1. 先建立 `pnpm workspace`
2. 先收拢目录和内部依赖
3. 先抽最稳定的共享包和配置包
4. 然后再引入 `turbo`
5. 最后再考虑发版、缓存、CI 精细优化

这样演进的风险更低，也更符合大多数前端团队的实际节奏。

## 十六、和本系列其他文章怎么接起来

这篇解决的是 `monorepo` 在包管理和目录组织层面的落地问题。

建议配合这些一起看：

- [从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理](/posts/工程化/前端工程化与Monorepo全链路梳理)
- [tsconfig.json 全配置详解](/posts/工程化/tsconfig全配置详解)
- [tsx / tsup / tsc 工具链对比](/posts/工程化/tsx-tsup-tsc工具链对比)
- [模块系统与路径别名](/posts/工程化/模块系统与路径别名)

如果只记一句：

`pnpm workspace` 真正建立的是“包边界和依赖关系的正式声明”，而不是简单地把多个项目放进同一个仓库。
