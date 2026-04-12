---
title: tsconfig.json 全配置详解
date: 2026-04-11
---

# tsconfig.json 全配置详解

这篇整理 Node.js / AI 项目中 `tsconfig.json` 每一项配置的含义，配合中文注释方便查阅。

## 完整配置

```json
{
  "compilerOptions": {
    // TS 源码根目录
    "rootDir": "./src",
    // 编译输出目录（noEmit 为 true 时不生效）
    "outDir": "./dist",

    // 模块系统：esnext = 使用最新 ESM 模块（import/export）
    "module": "esnext",
    // 编译目标：esnext = 输出最新 JS 语法，不降级
    "target": "esnext",
    // 内置类型库：esnext = 包含最新 JS 内置对象（Promise、Map、Array.flat 等）
    "lib": ["esnext"],
    // 只加载指定的 @types 包，这里只加载 @types/node（process、fs、Buffer 等）
    "types": ["node"],
    // 模块解析策略：bundler = 适配 tsx/tsup 等打包工具，导入可省略后缀
    "moduleResolution": "bundler",
    // 只做类型检查，不生成任何 .js 文件
    "noEmit": true,
    // 允许导入时写 .ts 后缀，如 import x from "./utils/index.ts"
    "allowImportingTsExtensions": true,

    // 路径别名：@ 指向 src 目录，如 import x from "@/utils/index"
    "paths": {
      "@/*": ["./src/*"]
    },

    // 严格类型检查
    // 数组/对象索引访问返回 T | undefined，防止越界不报错
    "noUncheckedIndexedAccess": true,
    // 可选属性不能赋值 undefined（比默认 strict 更严格）
    "exactOptionalPropertyTypes": true,

    // 代码风格
    // 函数所有分支必须有返回值
    "noImplicitReturns": true,
    // 子类 override 父类方法必须加 override 关键字
    "noImplicitOverride": true,
    // 声明了但未使用的局部变量报错
    "noUnusedLocals": true,
    // 声明了但未使用的函数参数报错
    "noUnusedParameters": true,
    // switch 语句 case 必须有 break/return，防止意外穿透
    "noFallthroughCasesInSwitch": true,
    // 索引签名的属性必须用 [] 访问，不能用 . 访问
    "noPropertyAccessFromIndexSignature": true,

    // 推荐选项
    // 开启所有严格模式（strictNullChecks、noImplicitAny 等）
    "strict": true,
    // import type 只用于类型导入，运行时不保留，避免副作用
    "verbatimModuleSyntax": true,
    // 每个文件独立编译，不依赖其他文件的类型信息（兼容 esbuild/tsx）
    "isolatedModules": true,
    // 有副作用的 import（如 import "./setup"）也要检查模块是否存在
    "noUncheckedSideEffectImports": true,
    // 强制每个文件都被当作模块处理（即使没有 import/export）
    "moduleDetection": "force",
    // 跳过 node_modules 里 .d.ts 文件的类型检查，加快速度
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

## 关键配置解析

### module vs moduleResolution

这两个经常搞混：

| 配置 | 作用 |
|------|------|
| `module` | 输出的模块格式（esnext / commonjs / nodenext） |
| `moduleResolution` | 如何查找模块文件（bundler / node / nodenext） |

用 `tsx` / `tsup` 跑的项目，推荐组合：

```json
"module": "esnext",
"moduleResolution": "bundler"
```

### noEmit

只做类型检查，不生成 `.js` 文件。配合 `tsx` 使用时，编译和运行都交给 `tsx`，`tsc` 只负责类型检查：

```bash
npx tsc --noEmit   # 只检查类型，不产出文件
```

### lib vs types

两个管不同的东西：

- `lib` → JS 语言本身的内置类型（Array、Promise、Map...）
- `types` → 运行环境/第三方库的类型（Node.js、Jest...）

Node.js 项目标配：

```json
"lib": ["esnext"],   // JS 新语法，不要 dom（后端没有 window）
"types": ["node"]    // Node.js 的 fs/process 等类型
```

### paths 路径别名

TS 6.0 起 `baseUrl` 已弃用，直接用 `paths` 配绝对路径：

```json
"paths": {
  "@/*": ["./src/*"]
}
```

```typescript
import { helper } from "@/utils/helper"  // 等价于 ./src/utils/helper
```

> 注意：`tsx` 4.x 会自动读取 `tsconfig.json` 的 `paths`，不需要额外配置。
