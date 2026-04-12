---
title: tsx / tsup / tsc 工具链对比
date: 2026-04-11
---

# tsx / tsup / tsc 工具链对比

Node.js TypeScript 项目常见三个工具，职责完全不同。

## 一句话区别

| 工具 | 职责 | 类比 |
|------|------|------|
| `tsc` | 类型检查 + 编译 | 质检员 |
| `tsx` | 直接运行 .ts 文件 | 快递员 |
| `tsup` | 打包成可发布产物 | 打包机 |

## tsc — 官方编译器

TypeScript 官方出品，两个用途：

**1. 类型检查（推荐用法）**

```bash
npx tsc --noEmit
# 只检查类型，不生成文件
# 有错误 → 报错；没错误 → 静默通过
```

**2. 编译输出**

```bash
npx tsc
# 按 tsconfig.json 编译，输出 dist/
```

特点：**慢**（做完整类型检查），但**严格**（类型错误会拦截）。

## tsx — 运行器

本质是对 `esbuild` 的封装，让 Node.js 直接执行 `.ts` 文件：

```bash
# 直接运行
npx tsx src/index.ts

# 监听文件变化（热重启）
npx tsx watch src/index.ts

# 加载 .env 文件
npx tsx --env-file=.env src/index.ts
```

特点：**极快**（跳过类型检查），**不产生文件**，类型错误也照跑。

## tsup — 打包器

基于 `esbuild`，把代码打包成可发布/部署的产物：

```bash
npx tsup src/index.ts \
  --format cjs,esm   # 输出 CJS 和 ESM 格式
  --dts              # 生成 .d.ts 类型文件
  --minify           # 压缩
  --clean            # 先清空 dist/
```

特点：**输出 dist/**，适合发布 npm 包。

## 推荐配置

```json
// package.json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",      // 开发
    "typecheck": "tsc --noEmit",          // 类型检查
    "build": "tsup src/index.ts --clean", // 打包（发布 npm 包时用）
    "start": "node dist/index.js"         // 生产运行打包产物
  }
}
```

## 大多数项目只需要 tsx

后端服务、AI 项目、命令行脚本，生产环境直接用 `tsx` 跑即可，不需要打包：

```bash
npx tsx src/index.ts  # 生产环境也可以这样跑
```

**只有发布 npm 包**才需要 `tsup` 打出 `dist/`。
