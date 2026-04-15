---
title: 前端工程化与 TypeScript / Monorepo
date: 2026-04-11
---

# 前端工程化与 TypeScript / Monorepo

这个系列不再只看 `tsconfig.json` 本身，而是把 TypeScript、模块系统、环境变量、工具链、共享配置、Monorepo、任务编排、测试与 CI 放进同一条前端工程化主线里。

如果你只想先抓主线，建议先看总纲，再回头按专题逐篇细看。

## 阅读顺序

### 0. 工程总纲

- [00 - 从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理](/posts/typescript-config/00-前端工程化与Monorepo全链路梳理)

这一篇负责把整个认知框架先搭起来：

- 单项目工程化到底要补哪些能力
- `tsconfig`、工具链、环境变量、模块系统分别在工程里管什么
- 为什么项目会走到 `monorepo`
- `pnpm workspace` 和 `turbo` 分别解决什么问题
- 测试、CI/CD、发版策略为什么是工程化不可缺的一环

## 文章列表

- [00 - 从 TypeScript 配置到 Monorepo 的前端工程化全链路梳理](/posts/typescript-config/00-前端工程化与Monorepo全链路梳理)
- [01 - tsconfig.json 全配置详解](/posts/typescript-config/01-tsconfig全配置详解)
- [02 - tsx / tsup / tsc 工具链对比](/posts/typescript-config/02-tsx-tsup-tsc工具链对比)
- [03 - 环境变量与 dotenv](/posts/typescript-config/03-环境变量与dotenv)
- [04 - 模块系统与路径别名](/posts/typescript-config/04-模块系统与路径别名)
- [05 - OpenAI SDK 类型系统详解](/posts/typescript-config/05-OpenAI-SDK类型系统详解)
- [06 - pnpm workspace 与 Monorepo 实战](/posts/typescript-config/06-pnpm-workspace与Monorepo实战)
- [07 - ESLint、Prettier、tsconfig 与 Husky 的边界和冲突处理](/posts/typescript-config/07-eslint-prettier-tsconfig与husky边界)

## 这组文章分别解决什么问题

### 01 - `tsconfig.json` 全配置详解

解决的是 TypeScript 编译与类型检查边界问题，重点看：

- `target`、`module`、`moduleResolution`
- 严格模式和细粒度规则
- `paths`、`types`、`lib`
- `noEmit`、`isolatedModules`、`verbatimModuleSyntax`

### 02 - `tsx / tsup / tsc` 工具链对比

解决的是“运行、检查、打包”职责混乱的问题，重点看：

- `tsc` 为什么更像类型守门员
- `tsx` 为什么适合开发态运行
- `tsup` 为什么更偏向库打包与产物输出

### 03 - 环境变量与 `dotenv`

解决的是配置注入和运行时安全问题，重点看：

- `dotenv` 与 `@types/node` 的区别
- `tsx --env-file` 的用法
- 为什么要用 `zod` 做启动时校验
- `.env`、`.env.local`、`.env.example` 的边界

### 04 - 模块系统与路径别名

解决的是模块语义和导入路径组织问题，重点看：

- `bundler`、`node16`、`nodenext` 的差异
- 路径别名的正确目的
- `type: module` 与 ESM 的关系

### 05 - OpenAI SDK 类型系统详解

这篇更偏复杂 SDK 场景，适合你已经掌握基础配置后，继续看大型类型系统如何在实际项目中落地。

### 06 - `pnpm workspace` 与 Monorepo 实战

解决的是 `monorepo` 在包管理和目录组织层面的落地问题，重点看：

- `apps/*` 与 `packages/*` 的结构设计
- `pnpm-workspace.yaml` 的作用
- `workspace:*` 如何声明内部依赖
- 共享配置包为什么值得先抽
- 从单仓项目迁移到 workspace 的稳妥顺序

### 07 - `ESLint`、`Prettier`、`tsconfig` 与 `Husky` 的边界和冲突处理

解决的是前端质量体系里最常见的边界混乱问题，重点看：

- `ESLint` 和 `Prettier` 为什么会冲突
- `tsconfig` 与 ESLint 的重叠项应该怎么取舍
- `Husky` 和 `lint-staged` 在流程里该承担什么角色
- `Biome` 这类现代工具为什么会出现
- Monorepo 下共享 lint / format / ts 配置该怎么组织

## 这个系列适合谁

- 正在搭建 `React` / `Vite` / `TypeScript` 项目的人
- 准备把多个前端项目收敛成 `monorepo` 的人
- 已经有项目，但配置长期靠复制粘贴、缺少体系化梳理的人
- 想把“会配工具”提升成“理解前端工程结构”的人
