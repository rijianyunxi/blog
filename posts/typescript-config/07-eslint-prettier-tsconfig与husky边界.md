---
title: ESLint、Prettier、tsconfig 与 Husky 的边界和冲突处理
date: 2026-04-15
---

# ESLint、Prettier、tsconfig 与 Husky 的边界和冲突处理

前端工程里最容易被配乱的一组工具，不是构建工具，而是这四个：

- `ESLint`
- `Prettier`
- `tsconfig.json`
- `Husky`

很多项目一开始只是想做三件事：

- 统一代码风格
- 避免低级错误
- 提交前自动检查

结果最后却变成这样：

- 保存一次文件，编辑器改两遍
- `eslint --fix` 改完，`prettier --write` 又改回来
- TypeScript 已经报过一次未使用变量，ESLint 再报一次
- 本地能过，CI 里又因为解析配置不一致挂掉
- Monorepo 里每个包都各有一套 lint 配置，仓库越大越乱

这不是因为工具本身难，而是因为很多人没有先把它们的职责边界讲清楚。

这篇就专门把这件事讲透：

- `ESLint` 到底该管什么，不该管什么
- `Prettier` 为什么最好只管格式
- `tsconfig.json` 和 `ESLint` 哪些地方会重叠
- `Husky` 在整条工程链路里到底是什么角色
- 现代项目有没有更省事的整合方案，比如 `Biome`
- 在 `Monorepo` 里应该怎么统一这些配置

如果你后面准备写 `turbo`、`changesets`、测试和 CI，这篇可以看作质量体系这一段的基础篇。

## 一、先建立一个最重要的认知：这四个工具不在同一层

很多冲突，其实不是参数问题，而是层次混了。

这四个工具分别处在不同的工程层面。

### 1. `tsconfig.json` 是 TypeScript 编译器配置

它负责的是：

- 类型检查严格度
- 模块解析方式
- 编译目标语法版本
- JSX 转换方式
- 路径别名和类型环境
- 是否生成产物

换句话说，`tsconfig.json` 决定的是：

- TypeScript 怎样理解你的源码
- TypeScript 是否允许某些不安全写法通过
- TypeScript 输出什么样的 JS

它更像编译器和类型系统的行为开关。

### 2. `ESLint` 是静态分析与工程规范工具

它负责的是：

- 发现可疑代码模式
- 发现常见错误
- 执行团队约束
- 对部分规则做自动修复

比如这些问题就适合让 `ESLint` 管：

- 变量定义了但没用
- `Promise` 创建后没处理
- React Hooks 依赖漏了
- `import` 顺序混乱
- 禁止直接使用某些危险 API
- 限制 `any`、限制 `console`

它关注的是“这段代码写法是否危险、是否违背团队约束、是否降低可维护性”。

### 3. `Prettier` 是格式化工具

它负责的是：

- 缩进
- 引号
- 分号
- 换行
- 尾随逗号
- JSX 属性折行
- 对象、数组、函数参数的排版

它不关心你的业务逻辑对不对，也不关心类型严不严，它只关心一件事：

代码最终长什么样。

### 4. `Husky` 是 Git Hook 接入层

它本身不检查代码，也不格式化代码。它只是把命令挂到 Git 的生命周期上。

比如：

- `pre-commit` 提交前
- `commit-msg` 提交信息校验时
- `pre-push` 推送前

所以它解决的是：

- 这些检查什么时候自动执行
- 如何把本地协作流程接进 Git

可以把这四者的关系记成一句：

- `tsconfig` 管类型和编译语义
- `ESLint` 管代码质量和工程规则
- `Prettier` 管代码格式
- `Husky` 管执行时机

只要这个分层不乱，后面很多冲突会自动消失一半。

## 二、为什么 `ESLint` 和 `Prettier` 最容易冲突

它们冲突的根因很简单：

`ESLint` 既能做质量检查，也能做一部分格式检查；而 `Prettier` 又专门做格式。

如果两个工具同时决定“代码应该长什么样”，那就一定会打架。

### 1. 典型冲突规则有哪些

老项目里最常见的冲突规则包括：

- `indent`
- `quotes`
- `semi`
- `comma-dangle`
- `object-curly-spacing`
- `arrow-parens`
- `max-len`
- `operator-linebreak`
- `jsx-quotes`

例如：

- ESLint 要求双引号
- Prettier 配成单引号

那你每次保存，`Prettier` 会改成单引号；每次跑 `ESLint`，又提示应该用双引号。

再例如：

- ESLint 要求固定缩进策略
- Prettier 对复杂表达式有自己的打印算法

那你就会遇到“一个工具修完，另一个工具再修回去”。

### 2. 冲突本质上不是 bug，而是职责重叠

很多人一看到冲突，就开始继续加规则、调插件、改编辑器保存顺序。

这通常不是根本解法。

根本解法是先承认一件事：

格式这件事只能有一个工具说了算。

现代项目里最稳的选择通常是：

- `Prettier` 全权负责格式
- `ESLint` 不再负责格式，只负责质量与规范

这才是大多数团队后来都会收敛到的边界。

## 三、现代主流实践：让 `Prettier` 只管格式，让 `ESLint` 只管质量

这是今天最值得优先采用的方案。

### 1. 推荐职责划分

把规则按三类划分：

交给 `Prettier` 的：

- 单引号还是双引号
- 要不要分号
- 一行太长如何换行
- JSX 属性怎么折行
- 对象、数组、参数列表如何排版

交给 `ESLint` 的：

- 是否存在未使用变量
- 是否出现未处理的异步逻辑
- Hooks 依赖是否缺失
- 是否引入危险 API
- import 顺序是否符合团队规范
- 是否允许显式 `any`

交给 `tsconfig` 的：

- 是否启用严格模式
- 是否允许隐式 `any`
- 模块解析策略是什么
- 路径别名如何解析
- 是否生成编译产物

### 2. 为什么这种划分最稳

因为三类问题本来就不是一个层次：

- 格式问题应该自动化，不该变成讨论题
- 质量问题需要团队显式设规则
- 类型和模块问题必须由编译器掌握最终解释权

当三层职责分开后：

- 本地保存体验会更稳定
- CI 行为更容易预测
- Monorepo 更容易共享配置
- 新人更容易理解工具边界

## 四、`eslint-config-prettier` 和 `eslint-plugin-prettier` 到底有什么区别

这两个名字太像，很多人第一次接触都会混。

### 1. `eslint-config-prettier`

它的作用是：

- 关闭那些会和 `Prettier` 冲突的 ESLint 规则

注意，它不负责格式化，也不负责执行 `Prettier`。

它只是让 `ESLint` 不要继续碰那些格式规则。

这是 `ESLint + Prettier` 组合里最关键的兼容层之一。

如果你继续走经典方案，这个包几乎可以看成必备项。

### 2. `eslint-plugin-prettier`

它的作用是：

- 把 `Prettier` 的格式检查包装成一条 ESLint 规则

也就是说，你跑 `eslint` 时，它顺便用 `Prettier` 检查格式，格式不对就报 ESLint 错。

### 3. 为什么现代项目越来越少默认推荐 `eslint-plugin-prettier`

因为它虽然看起来“统一出口”，但实际副作用不少：

- 运行更慢
- 报错噪音更大
- 概念边界更模糊
- 编辑器和 CLI 的行为不一定一致

对于大多数现代项目，更稳的做法通常是：

- 单独运行 `prettier --write`
- 单独运行 `eslint --fix`
- 用 `eslint-config-prettier` 关闭冲突规则

换句话说：

不是把 `Prettier` 塞进 `ESLint`，而是让它们并行协作，但各司其职。

## 五、`tsconfig.json` 和 `ESLint` 的冲突，很多时候不是“打架”，而是“重叠”

`tsconfig` 和 `ESLint` 的关系，比 `Prettier` 那组更容易被误解。

因为它们都能对源码提出约束，但出发点完全不同。

- `tsconfig` 是编译器视角
- `ESLint` 是工程规则视角

所以很多所谓“冲突”，更准确说是：

- 重复检查
- 严格度不一致
- 解析配置没有对齐

### 1. 最常见的重叠：未使用变量

`tsconfig` 里有：

- `noUnusedLocals`
- `noUnusedParameters`

`ESLint` 里有：

- `@typescript-eslint/no-unused-vars`

这两边都开时，最常见结果就是同一个问题报两遍。

这时候你要做的不是继续加忽略，而是选边界。

现代项目里，很多团队更倾向于：

- 关闭 `tsconfig` 的未使用变量类检查
- 保留 `ESLint` 的 `no-unused-vars`

原因是 `ESLint` 通常更灵活，比如你可以配置：

- 以 `_` 开头的参数允许未使用
- 某些解构场景不报错
- 只对源码目录生效，不对脚本目录生效

当然，这不是唯一正确答案。库项目里，也有团队更信编译器检查。

关键是：

不要两边都当主裁判。

### 2. `noImplicitAny` 和 `no-explicit-any` 不是一回事

这是另一个高频误区。

`tsconfig` 里的：

- `noImplicitAny`

管的是：

- 编译器推断出隐式 `any`

`ESLint` 里的：

- `@typescript-eslint/no-explicit-any`

管的是：

- 你是否手写了显式 `any`

所以这两个不是冲突关系，而是互补关系。

一个项目完全可以：

- 开启 `noImplicitAny`
- 同时允许少量显式 `any`

也可以反过来：

- 编译器不够严格
- 但团队不允许显式 `any`

这要看团队治理目标，而不是机械地“一律都开”。

### 3. 模块解析问题常被误判成规则冲突

比如你在 `tsconfig.json` 里配了：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

TypeScript 可以正常识别：

```ts
import { foo } from "@/utils/foo"
```

但 `ESLint` 却报：

- `import/no-unresolved`

这并不是 `tsconfig` 和 `ESLint` 真正冲突，而是 ESLint 的模块解析器没有和 TypeScript 对齐。

换句话说，是解析配置不统一，不是语义冲突。

### 4. 真正该让 TypeScript 负责的事，不要试图用 ESLint 替代

例如这些问题，应该优先交给编译器：

- `strictNullChecks`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `moduleResolution`
- `verbatimModuleSyntax`

这些属于类型系统和模块语义，ESLint 只能补充，不适合当主逻辑来源。

## 六、一个很实用的划分原则：谁更接近“最终解释权”，谁就负责这层约束

如果你总觉得某些规则不知道该放哪里，可以用这个判断方法。

### 1. 类型系统和模块语义

谁有最终解释权：

- TypeScript 编译器

所以应该交给：

- `tsconfig.json`

### 2. 代码质量和团队工程规则

谁更适合表达：

- `ESLint`

所以应该交给：

- `ESLint` 及其插件体系

### 3. 纯格式问题

谁更擅长自动统一：

- `Prettier`

所以应该交给：

- `Prettier`

### 4. 执行时机

谁控制 Git 流程：

- `Husky`

所以应该交给：

- `Husky + lint-staged`

这套判断法的价值在于，它能帮你避免“同一个约束同时在三层都开”。

## 七、`Husky` 的真正价值，不是多一个工具，而是把规范接进协作流程

很多人会把 `Husky` 理解成“提交前自动 lint 一下”。

这个理解太窄。

`Husky` 的核心价值，是把原本停留在 README 里的人工约定，变成真实会执行的团队流程。

### 1. 它本身不是检查器，而是调度入口

例如你完全可以在 `pre-commit` 里执行：

- `prettier --write`
- `eslint --fix`
- `vitest related`
- `tsc --noEmit`

但一般不建议什么都往 `pre-commit` 塞，因为：

- 提交动作应该快
- 过重的检查会显著降低开发体验

### 2. 现代项目里更常见的组合是 `Husky + lint-staged`

分工通常是：

- `Husky` 负责接入 Git hooks
- `lint-staged` 负责只处理这次提交涉及的文件

这比每次都 lint 整个仓库更现实，尤其在 Monorepo 里差别很大。

一个典型思路会是：

- 对 `*.ts`、`*.tsx`、`*.js`、`*.jsx` 先跑 `prettier --write`
- 再跑 `eslint --fix`
- 对 `*.md`、`*.json` 只跑格式化

### 3. 为什么不建议在 `pre-commit` 里跑全量 `tsc`

因为在大型仓库或 Monorepo 中：

- 全量类型检查很慢
- 与暂存文件维度不一致
- 开发者每次提交都被重型任务阻塞

更稳的实践通常是：

- `pre-commit` 处理格式化和轻量 lint
- 完整 `typecheck` 放到 CI 或 `pre-push`

当然，仓库足够小的时候，本地前置更多检查也没问题。关键不是教条，而是成本是否合理。

## 八、现代化整合工具有没有？有，而且很值得关注：`Biome`

前几年大家一提“前端规范工具链”，几乎默认就是：

- `ESLint`
- `Prettier`
- 各种插件
- 一堆配套 resolver 和兼容层

这套方案依然主流，但也确实存在两个问题：

- 配置复杂
- 工具边界需要人为维护

所以这几年才会出现一类更现代的思路：

- 尽量把格式化和 lint 统一到一套工具里

`Biome` 就是目前最值得关注的代表之一。

### 1. `Biome` 试图解决什么问题

它试图做的是：

- 提供统一的 formatter
- 提供统一的 linter
- 提供更快的执行性能
- 提供更简单的配置体验

也就是说，它本质上是在减少 `Prettier + ESLint` 双工具协作带来的复杂度。

### 2. `Biome` 适合什么项目

更适合：

- 新项目
- 中小型团队
- 想降低配置复杂度的项目
- 对 ESLint 生态插件没有强依赖的项目

### 3. `Biome` 不是什么都能替代

它的边界也要看清：

- ESLint 生态仍然更丰富
- 某些框架专用规则和社区插件仍然依赖 ESLint
- 老项目迁移到 `Biome` 可能会遇到规则断层

所以它不是一句“更现代就全部换掉”这么简单。

如果你在做新项目，它是一个非常值得考虑的默认候选；如果你在做老项目，更现实的顺序通常是：

1. 先把 `ESLint` 和 `Prettier` 的边界理顺
2. 再评估是否迁到 `Biome`

## 九、除了 `Biome`，还有哪些现代化方向值得知道

### 1. `ESLint Flat Config`

即使你还不打算换掉 `ESLint`，也建议尽量往 `Flat Config` 迁移。

因为旧的 `.eslintrc` 体系在以下方面越来越笨重：

- 继承链复杂
- 解析行为不够直观
- 在 Monorepo 中分包组合容易绕

`Flat Config` 的价值，不只是“语法新一点”，而是配置关系更显式，更适合现代项目和工作区组织。

### 2. `Oxlint`

如果你做的是大型仓库，对 lint 性能非常敏感，也可以关注 `Oxlint`。

它更像高性能 lint 补充层，而不是 `Prettier` 的替代品。

常见思路是：

- 用 `Oxlint` 跑一部分高频规则，追求速度
- 用 `ESLint` 跑生态依赖更强的规则

这更像性能优化路线，不是简化路线。

### 3. `dprint`

它也是格式化工具，通常作为 `Prettier` 的替代选项出现。

但从前端主流生态心智看：

- 想要稳妥生态，一般还是 `Prettier`
- 想要更现代整合，优先看 `Biome`

## 十、Monorepo 里为什么更需要把这些边界讲清楚

单项目里规则打架，最多是一两个开发者烦；Monorepo 里规则打架，会被成倍放大。

因为 Monorepo 往往有这些特征：

- 多个应用和多个共享包
- 根配置和包内配置并存
- 不同运行环境混在一个仓库里
- CI 需要做按影响范围执行

这时候如果边界不清楚，很容易出现：

- A 包用一套 ESLint 规则
- B 包又覆盖一套格式规则
- 根目录 Prettier 和子包 Prettier 配置不一致
- 提交一个包，另一个包的格式也被误改

### 1. 更推荐的 Monorepo 做法

在 Monorepo 中，一般更推荐：

- 根目录统一 `prettier` 配置
- 根目录统一 ESLint 基础配置
- 各子包只做少量差异化扩展
- Git hooks 在根目录统一接入
- CI 在根目录统一触发 lint、typecheck、test

### 2. 共享配置本身也应该成为 workspace package

例如：

- `packages/eslint-config`
- `packages/prettier-config`
- `packages/tsconfig`

这类包的价值不只是“少复制一份配置”，更重要的是：

- 配置版本可追踪
- 多项目升级更一致
- 可以显式表达继承关系

这和上一篇 `pnpm workspace` 的主题是完全接得上的。

## 十一、一个现代前端项目的推荐搭配

如果你今天要搭一个 React / Node / TypeScript 项目，通常可以从下面两条主路线里选。

### 方案 A：生态最稳妥

- `TypeScript`
- `ESLint Flat Config`
- `typescript-eslint`
- `Prettier`
- `eslint-config-prettier`
- `Husky`
- `lint-staged`

适合：

- 老项目迁移
- React / Next / Vue / Node 插件依赖较多
- Monorepo 中包类型差异较大

优点：

- 兼容性最好
- 社区资料最多
- 迁移成本可控

代价：

- 工具还是比较多
- 需要你主动维护边界

### 方案 B：更现代、更轻量

- `TypeScript`
- `Biome`
- `Husky`
- `lint-staged`

适合：

- 新项目
- 中小型团队
- 想降低配置复杂度

优点：

- 配置更少
- 运行更快
- 格式与 lint 一体化，冲突更少

代价：

- ESLint 生态替代度不是百分之百
- 老项目迁移不一定顺滑

## 十二、一个非常实用的配置取舍建议

如果你已经遇到混乱，不要立刻想着“要不要全部迁到新工具”。

更稳的顺序通常是：

1. 先明确格式、质量、类型、执行时机四层边界
2. 关闭 ESLint 中的格式类规则
3. 让 `Prettier` 接管格式输出
4. 清理 `tsconfig` 与 ESLint 的重复检查项
5. 再决定是否迁移到 `Biome` 或更现代方案

这套顺序之所以重要，是因为很多项目的问题根本不在工具老，而在边界乱。

边界没理顺时：

- 你从 `ESLint + Prettier` 换到 `Biome`，仍然会乱
- 你从旧 `.eslintrc` 迁到 Flat Config，仍然会乱
- 你把 `pre-commit` 挂更多命令，也只是更慢，不会更清晰

## 十三、写给实际工程的几个经验判断

### 1. 不要让同一个问题在三层都报

如果某条规则已经由编译器稳定负责，就不要再让 ESLint 和提交钩子都重复放大。

### 2. 不要把提交钩子当 CI 全量替代品

本地钩子负责快速兜底，CI 负责完整兜底。

### 3. 不要为了“统一出口”把所有东西都塞进 ESLint

统一入口不等于统一职责。很多团队后来又拆回来，就是因为一开始塞得太多。

### 4. 不要一上来就在 Monorepo 每个包里各配一套

能在根目录统一的，尽量统一；能抽成共享配置包的，尽量抽。

### 5. 真正的现代化，不只是换工具，而是换边界思维

所谓现代前端工程，不是工具名更新了，而是你能明确回答：

- 哪一层负责什么
- 哪些规则属于格式
- 哪些规则属于质量
- 哪些规则属于类型系统
- 哪些检查在本地执行，哪些放到 CI

## 十四、和本系列其他文章怎么配合看

如果你是按工程链路学习，这篇建议这样衔接：

- 先看 [01 - tsconfig.json 全配置详解](/posts/typescript-config/01-tsconfig全配置详解)，建立 TypeScript 编译与类型边界
- 再看 [04 - 模块系统与路径别名](/posts/typescript-config/04-模块系统与路径别名)，理解模块解析为什么会影响 ESLint 报错
- 再看 [06 - pnpm workspace 与 Monorepo 实战](/posts/typescript-config/06-pnpm-workspace与Monorepo实战)，理解共享配置包为什么值得抽出来
- 后面再接 `turbo`、测试、CI、发版策略，会更容易理解为什么这些检查最终都要进入统一任务编排

## 十五、最后收束成一句话

前端工程里，最怕的不是工具多，而是同一个问题没有清晰主责。

把这条线记住就够了：

- `tsconfig` 决定类型和编译语义
- `ESLint` 决定代码质量和工程规范
- `Prettier` 决定代码格式
- `Husky` 决定这些事情在 Git 协作流程里的执行时机

当这四层边界清楚后，不管你继续用经典工具链，还是迁到 `Biome` 这样的新方案，工程都会稳得多。
