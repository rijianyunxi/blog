---
title: 环境变量与 dotenv
date: 2026-04-11
---

# 环境变量与 dotenv

## @types/node 与 dotenv 的区别

这两个经常搞混，但干的完全不是一件事：

```
@types/node  →  告诉 TS「process.env 这个东西存在，类型是这样」（类型声明）
dotenv       →  真正把 .env 文件的值装进 process.env（运行时注入）
```

类比：
```
@types/node  →  杯子（容器/类型）
dotenv       →  往杯子里倒水（真实数据）
```

杯子有了但没水，`process.env.API_KEY` 还是 `undefined`。

## 方案一：dotenv（通用）

```bash
npm install dotenv
npm install -D @types/node
```

```typescript
import "dotenv/config"  // 顶部引入，自动加载 .env

console.log(process.env.API_KEY)  // "sk-abc123"
```

## 方案二：tsx --env-file（推荐，不用装 dotenv）

tsx 4.x 内置支持，不需要额外依赖：

```bash
npx tsx --env-file=.env src/index.ts
```

```typescript
// 代码里直接用，不需要 import dotenv
console.log(process.env.API_KEY)  // "sk-abc123"
```

`package.json`：

```json
{
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts"
  }
}
```

## 类型安全（推荐加上）

`process.env` 默认类型是 `string | undefined`，用 zod 做一次性校验：

```typescript
import { z } from "zod"

const envSchema = z.object({
  API_KEY: z.string().min(1),
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),  // 字符串转数字
  NODE_ENV: z.enum(["development", "production"]).default("development"),
})

export const env = envSchema.parse(process.env)
// 缺少任何变量 → 启动时直接报错，不会运行到一半才崩

// 使用
console.log(env.API_KEY)   // string，不是 string | undefined
console.log(env.DB_PORT)   // number
```

## .env 文件规范

```bash
# .env（本地开发，不提交 git）
API_KEY=sk-abc123
DB_HOST=localhost
DB_PORT=5432
NODE_ENV=development

# .env.example（提交 git，作为模板）
API_KEY=
DB_HOST=
DB_PORT=
NODE_ENV=
```

`.gitignore` 里加上：

```
.env
.env.local
```
