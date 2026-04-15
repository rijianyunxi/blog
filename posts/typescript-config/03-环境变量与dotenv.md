---
title: 环境变量与 dotenv
date: 2026-04-11
---

# 环境变量与 dotenv

环境变量几乎是所有工程项目都会碰到的东西，但也是最容易被低估的一环。

很多项目的环境变量现状是这样的：

- 本地放一个 `.env`
- 代码里直接写 `process.env.API_KEY`
- 缺了就线上报错
- 新同学接手时不知道哪些变量必须配
- 浏览器项目和 Node 项目混着用，客户端把本不该暴露的配置也打进去了

这不叫工程化，只能算“能读到值”。

真正成熟的环境变量治理，至少要解决四件事：

1. 值从哪里来
2. 值何时注入
3. 值如何校验
4. 不同环境如何隔离

这篇会把 `dotenv`、`tsx --env-file`、浏览器环境变量、类型安全和多环境管理一起讲清楚。

## 一、先分清：类型声明和运行时注入是两回事

这是最常见的混淆点。

### 1. `@types/node` 做的是类型声明

它告诉 TypeScript：

- `process` 存在
- `process.env` 是一个对象
- 这个对象的值通常是 `string | undefined`

也就是说，它解决的是**编辑器和类型系统认识不认识这个 API**。

### 2. `dotenv` 做的是运行时注入

它会把 `.env` 文件中的内容读出来，挂到 `process.env` 上。

也就是说，它解决的是**运行时有没有值**。

可以直接这样理解：

```text
@types/node  ->  杯子（容器、类型）
dotenv       ->  倒进去的水（真实数据）
```

有杯子不代表有水。

所以即使你装了 `@types/node`，下面这段也依然可能是 `undefined`：

```ts
console.log(process.env.API_KEY)
```

## 二、环境变量问题，不只是“怎么加载 .env”

很多教程都只教你：

```ts
import "dotenv/config"
```

这当然没错，但它只解决“读取文件”这一步。

真正要建立的认知是，环境变量链路有四层：

1. 来源层：值写在哪，`.env`、部署平台、CI Secret、容器环境
2. 注入层：什么时候把值放进进程
3. 校验层：缺值、空值、格式错误怎么处理
4. 消费层：业务代码怎么以安全方式使用

只有四层都想清楚，环境变量才算被工程化。

## 三、Node 项目里最常见的两种方式

### 1. 方案一：`dotenv`

安装：

```bash
npm install dotenv
npm install -D @types/node
```

入口文件顶部引入：

```ts
import "dotenv/config"

console.log(process.env.API_KEY)
```

这会在程序启动时自动读取当前目录下的 `.env`。

优点：

- 兼容性高
- 大多数 Node 项目都认识这套写法
- 对运行环境要求低

缺点：

- 代码里要显式引入
- 如果入口顺序处理不好，可能出现在读取前尚未完成注入的情况

### 2. 方案二：`tsx --env-file`

如果你本来就用 `tsx` 运行项目，这通常更简单。

```bash
npx tsx --env-file=.env src/index.ts
```

监听模式：

```bash
npx tsx watch --env-file=.env src/index.ts
```

脚本通常会写成：

```json
{
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "start": "tsx --env-file=.env src/index.ts"
  }
}
```

优点：

- 不用额外装 `dotenv`
- 不用在代码里加导入
- 对用 `tsx` 的 Node 项目很顺手

### 3. 怎么选

如果你的项目开发运行就是 `tsx`，优先考虑 `--env-file`，链路更短。

如果你需要更通用、和运行器解耦的方案，`dotenv` 更中性。

## 四、真正的关键不是加载，而是校验

大多数环境变量事故，不是因为“不会加载”，而是因为：

- 配置缺了
- 值是空字符串
- 数字写成了非法字符串
- 枚举值拼错了
- 某个变量只在生产需要，但本地默认逻辑把它掩盖掉了

### 1. 为什么直接写 `process.env.X` 不够

在 TypeScript 里，`process.env.X` 通常是：

```ts
string | undefined
```

于是你会看到大量代码开始出现：

```ts
process.env.API_KEY!
```

或者：

```ts
const apiKey = process.env.API_KEY || ""
```

这本质上是在绕开问题，而不是解决问题。

### 2. 更好的做法：启动时集中校验

推荐用 `zod` 这类工具，在应用启动时一次性解析环境变量。

```ts
import { z } from "zod"

const envSchema = z.object({
  API_KEY: z.string().min(1),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
})

export const env = envSchema.parse(process.env)
```

这一步做完之后：

- 缺失字段会在启动阶段直接报错
- `DB_PORT` 直接变成 `number`
- 业务层拿到的是可靠值，而不是 `string | undefined`

### 3. 为什么叫“启动失败优于运行中崩溃”

环境变量是系统前提条件。如果前提条件不成立，越早失败越好。

与其让应用跑到一半才在某个深层调用里发现 `API_KEY` 为空，不如在启动的第一秒就明确报错。

## 五、前端应用里的环境变量，和 Node 项目不是一套语义

这点必须单独强调。

### 1. 浏览器环境变量本质上是构建时注入

在前端应用中，环境变量往往不是“运行中的真实系统环境”，而是构建工具在构建阶段替换进去的值。

例如 Vite 中常见的是：

```ts
console.log(import.meta.env.VITE_API_BASE_URL)
```

而不是：

```ts
console.log(process.env.API_BASE_URL)
```

### 2. 浏览器项目必须区分“可暴露”和“不可暴露”变量

这是安全边界问题。

以 Vite 为例，只有以 `VITE_` 开头的变量才应该被暴露给客户端：

```bash
VITE_API_BASE_URL=https://api.example.com
```

如果你把服务端私密配置也按前端环境变量打进去，本质上就是把 secret 发给了所有用户。

### 3. 前端项目也应该做启动时校验

虽然它是构建时注入，但仍然可以在应用初始化阶段做解析。

```ts
import { z } from "zod"

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
  VITE_APP_ENV: z.enum(["local", "test", "prod"]),
})

export const env = envSchema.parse(import.meta.env)
```

这样做的收益一样成立：

- 缺字段立刻暴露
- 类型从不确定变成确定
- 配置边界更清晰

## 六、推荐建立一个 `env.ts` 统一出口

不要在业务代码里到处直接访问：

- `process.env`
- `import.meta.env`

更推荐的方式是封装成单一模块出口。

### 1. Node 项目示例

```ts
import { z } from "zod"

const envSchema = z.object({
  API_KEY: z.string().min(1),
  PORT: z.coerce.number().default(3000),
})

export const env = envSchema.parse(process.env)
```

业务代码中：

```ts
import { env } from "./env"

console.log(env.PORT)
```

### 2. 前端项目示例

```ts
import { z } from "zod"

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
})

export const env = envSchema.parse(import.meta.env)
```

这样可以保证：

- 环境变量读取逻辑集中
- 校验逻辑集中
- 业务代码只消费“合法配置对象”

## 七、多环境管理怎么做才不乱

很多项目真正乱的地方，不是单个 `.env`，而是环境越来越多之后没人知道该怎么管。

常见环境通常有：

- `local`
- `test`
- `staging`
- `production`

### 1. 至少维护这些文件或概念

- `.env.example`：模板，提交到仓库
- `.env.local`：本地私有，不提交
- `.env.test` / `.env.staging`：非生产环境模板或平台注入说明
- 生产环境变量：交给部署平台或 CI Secret 管理

### 2. `.env.example` 的价值很高

它不仅是“给别人抄一份”，更是：

- 变量清单
- 环境契约
- 新同学快速启动文档的一部分

例如：

```bash
API_KEY=
DB_HOST=
DB_PORT=
NODE_ENV=
```

### 3. `.gitignore` 应该明确拦住私有环境文件

至少建议：

```gitignore
.env
.env.local
.env.*.local
```

不要把真实 secret 交给仓库兜底。

## 八、Node 和前端项目的典型脚本配置

### 1. Node 项目

如果用 `tsx`：

```json
{
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "start": "tsx --env-file=.env src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2. Vite 前端项目

通常开发和构建时工具会自动读取环境变量文件，但仍建议把校验逻辑放进代码，并在 README 或部署文档中明确变量说明。

## 九、在 Monorepo 里，环境变量还要多考虑一层边界

这也是很多团队后期才踩到的坑。

### 1. 不同应用的变量不要混在一起

例如：

- `apps/web` 需要 `VITE_WEB_API_URL`
- `apps/admin` 需要 `VITE_ADMIN_API_URL`
- `services/api` 需要 `DB_URL`

它们应该按应用或服务边界拆开，而不是全仓库共享一个巨大的 `.env`。

### 2. 公共包尽量不要直接读取环境变量

例如 `packages/utils`、`packages/ui` 这类共享包，不应该自己去读 `process.env`。更稳的做法是：

- 由应用层读取环境变量
- 再把配置显式传给共享包

这样包才更可复用，也更容易测试。

### 3. 文档要写清楚变量归属

在 `monorepo` 中，最好明确：

- 哪些变量属于哪个应用
- 哪些变量会暴露到浏览器
- 哪些变量只能在服务端存在

## 十、最常见的错误写法

### 1. 到处直接访问 `process.env`

问题：

- 逻辑分散
- 类型不稳定
- 缺值排查困难

### 2. 通过非空断言掩盖问题

例如：

```ts
const apiKey = process.env.API_KEY!
```

这不会让变量更安全，只是让编辑器闭嘴。

### 3. 客户端暴露了服务端 secret

这是前端环境变量最危险的错误之一。

### 4. 把 `.env` 当文档

真正应该作为文档的是 `.env.example` 与 README 中的变量说明，而不是让每个人自己猜。

## 十一、一个比较务实的推荐方案

如果你不想一开始搞太复杂，可以直接用这套：

### 1. Node 项目

- 用 `tsx --env-file=.env`
- 建一个 `src/env.ts`
- 用 `zod` 在启动时解析 `process.env`
- 维护 `.env.example`

### 2. 前端项目

- 使用框架约定的公开环境变量前缀
- 建一个 `src/env.ts`
- 用 `zod` 解析 `import.meta.env`
- 在部署文档里明确变量来源和边界

### 3. Monorepo 项目

- 不同应用独立维护自己的变量清单
- 公共包不直接依赖环境变量
- 在根目录或文档中明确变量归属

## 十二、和本系列其他文章怎么配合看

这篇解决的是配置注入与运行时前提条件治理问题。

相关上下文可以继续看：

- [00 - 从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理](/posts/typescript-config/00-前端工程化与Monorepo全链路梳理)
- [01 - tsconfig.json 全配置详解](/posts/typescript-config/01-tsconfig全配置详解)
- [02 - tsx / tsup / tsc 工具链对比](/posts/typescript-config/02-tsx-tsup-tsc工具链对比)
- [04 - 模块系统与路径别名](/posts/typescript-config/04-模块系统与路径别名)

如果只记一句：

环境变量真正要解决的，不是“代码里能不能读到值”，而是“系统前提条件能不能被明确、验证、隔离和可靠消费”。
