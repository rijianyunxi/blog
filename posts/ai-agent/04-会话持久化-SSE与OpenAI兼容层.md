---
title: 会话持久化、SSE 与 OpenAI 兼容层
date: 2026-03-28
tags: [AI Agent, Koa, SSE, SQLite, OpenAI Compatible, 面试]
---

# 会话持久化、SSE 与 OpenAI 兼容层

一个 Agent 项目从“能跑 demo”到“像一个真正可接入的服务”，中间通常隔着三件事：

1. **会话能不能持久化**
2. **回答能不能流式返回**
3. **接口能不能兼容已有前端或 SDK**

`agent-koa` 这套代码，刚好把这三件事都做了，而且不是随手拼一下，而是形成了比较完整的链路。

本文继续结合真实代码拆解。

---

## 一、为什么 Agent 后端不能只靠内存存状态

如果只是本地 demo，你当然可以把消息数组放在内存里：

```js
const sessions = new Map()
```

但真实一点的场景，很快会遇到这些问题：

- 服务重启后上下文全丢
- 多个会话难管理
- 无法查看历史线程
- Agent 中间状态无法恢复

所以这个项目做了两层持久化：

### 第一层：LangGraph Checkpoint

用于保存 Agent 执行状态。

### 第二层：Conversation Store

用于保存会话列表、标题、消息、最后更新时间这些更偏产品层的数据。

这两个层次不要混。

> 一个偏“运行时状态”，一个偏“聊天产品数据”。

---

## 二、Checkpoint：为什么它对 Agent 比普通聊天更重要

在 `checkpointer.js` 里，项目使用了：

```js
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite'
```

并把 SQLite 文件路径统一收敛到：

```js
export const sqlitePath = resolve(process.cwd(), env.SQLITE_PATH)
```

然后通过 `SqliteSaver.fromConnString(sqlitePath)` 创建持久化存储。

这一步的意义在于：

- Agent 每轮执行不是简单字符串拼接
- 它中间可能经历“模型推理 → 工具调用 → 再推理”
- 如果过程中状态损坏或服务重启，没有 checkpoint 很难恢复

所以 checkpoint 更像是 **Agent 工作流的存档机制**。

---

## 三、为什么项目里还专门写了 clearThreadCheckpoints

在 `checkpointer.js` 里还有这段逻辑：

```js
const deleteWritesByThreadStmt = maintenanceDb.prepare('DELETE FROM writes WHERE thread_id = ?')
const deleteCheckpointsByThreadStmt = maintenanceDb.prepare('DELETE FROM checkpoints WHERE thread_id = ?')
```

也就是说，这个项目不只是“会存”，还考虑了“坏状态如何清理”。

在 `smartConstructionAgent.js` 中，如果发现消息角色异常，还会：

- 打 warning
- 清理 thread 对应 checkpoint
- 重建运行时再试一次

这就是很典型的**有限自愈**设计。

很多 demo 项目只会在报错时直接抛异常，而这套代码已经在考虑：

> 状态污染之后，系统能不能自动恢复一次。

这个点其实很适合面试聊，因为它很能体现工程意识。

---

## 四、Conversation Store：它解决的是“聊天产品层”的问题

如果 checkpoint 是给 Agent 引擎用的，那 `conversations.js` 就是给“聊天界面”用的。

从代码里能看到它维护了：

- `thread_id`
- `title`
- `last_message`
- `updated_at`
- 消息记录

它还做了一些细节处理：

- 自动生成默认标题
- 用首行文本派生标题
- 限制标题和最后一条消息长度
- 维护最近更新时间

这意味着后端不是只为模型服务，而是已经开始为 UI 服务。

所以前端的会话侧边栏、最近对话列表，其实都能从这层拿数据。

---

## 五、thread 相关接口为什么很关键

在 `threads.js` 里，项目提供了：

- `GET /agent/threads`
- `POST /agent/threads`
- 线程消息查询等接口

这带来的变化是：

### 1. 前端不需要自己瞎拼本地会话状态

后端直接管理线程列表。

### 2. 一个 thread 对应一条完整对话链路

它不仅能拿历史消息，还能和 checkpoint 对应起来。

### 3. 更容易做会话恢复

比如刷新页面后重新拉线程列表，再进入某个 thread，就能继续聊。

这一点对“像一个产品”特别重要。

---

## 六、SSE 为什么是这里比 WebSocket 更自然的选择

很多 AI 聊天项目默认会想到 WebSocket，但这个项目选的是 SSE。

在 `utils/sse.js` 里，核心实现很直接：

```js
res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
res.setHeader('Cache-Control', 'no-cache, no-transform')
res.setHeader('Connection', 'keep-alive')
```

发送数据时：

```js
res.write(`data: ${JSON.stringify(data)}\n\n`)
```

### 为什么 SSE 很适合这里？

因为这里的通信模式本质上是：

> **客户端发起一次请求，服务端持续往回推结果。**

这是典型的一对多段式响应，不一定非要上双向通信。

SSE 的优点：

- 浏览器原生支持好
- 实现简单
- 非常适合文本流式输出
- 服务器资源模型更容易控制

当然，如果你要做协同编辑、实时多人互动，那 WebSocket 更合适。  
但对于 AI 对话返回 token 流，SSE 往往更轻。

---

## 七、这个项目的 SSE 不只是推文本，还能推事件

这点挺关键。

在 Agent 系统里，用户不只关心“最后回答是什么”，还常常关心：

- 现在是不是在调用工具
- 调用了哪个工具
- 工具执行完没有
- 有没有报错

所以 SSE 不应该只是纯文本 token 通道，它更像一个**事件流协议层**。

这个项目的设计方向也是这样：

- 文本输出是一类事件
- 工具开始 / 工具结束是另一类事件
- 结束信号又是一类事件

这样前端 UI 才能做出更像样的体验，比如：

- “正在查询天气工具...”
- “正在读取现场设备数据...”
- “工具执行完成，开始总结...”

这会比干巴巴地刷字自然很多。

---

## 八、OpenAI Compatible 层解决了什么问题

如果你只暴露自定义接口，比如：

- `/agent/chat`

那当然够用，但会有一个问题：

> 很多现成前端、SDK、调试工具、网关，默认都更熟悉 OpenAI 风格接口。

所以项目里还实现了：

- `/v1/chat/completions`

这一层的价值非常实际：

### 1. 降低接入成本

已有的前端聊天组件、测试脚本、代理层更容易复用。

### 2. 统一调用协议

外部系统不需要理解你内部的 Agent 细节，只要按照 OpenAI 的 messages 格式来调。

### 3. 方便以后替换前端

今天你用自己写的前端，明天你想接别的聊天 UI，不需要大改后端协议。

所以这个兼容层本质上是一个：

> **对外稳定接口 + 对内自定义运行时**

这是一种很健康的边界设计。

---

## 九、OpenAI Compatible 层不是简单转发，它还做了 thread 适配

看 `openaiCompatible.js`，它不是把请求原封不动丢给模型，而是会：

- 解析 `messages`
- 提取最新用户消息
- 如果带了 `thread_id`，只选择当前轮必要消息输入
- 同时继续走内部的 Agent 和会话存储逻辑

这说明兼容层并不是一个薄薄的反向代理，而是：

- **对外长得像 OpenAI**
- **对内仍然是你的 Agent Runtime**

这是非常重要的区别。

否则很多人做兼容层时，会不小心绕开自己原本的线程机制和工具系统，最后出现“两套接口两套行为”的问题。

这个项目在结构上是尽量避免这种分叉的。

---

## 十、从前端视角看，这套后端为什么更容易接

如果你是前端来对接这套服务，会发现它至少提供了三种稳定能力：

### 1. 聊天能力

- 自定义 `/agent/chat`
- OpenAI 风格 `/v1/chat/completions`

### 2. 会话能力

- 拉线程列表
- 创建线程
- 查线程消息

### 3. 管理能力

- 看 MCP Server 列表
- 启停插件
- 直接 RPC 调工具

这意味着前端不仅能做一个聊天框，还能做：

- 会话侧边栏
- 工具状态面板
- 管理后台
- 调试面板

所以这个项目比一般 AI demo 更接近“平台后端”，而不是“单接口服务”。

---

## 十一、这一层在面试里怎么表达

如果面试官问：**“你怎么保证 Agent 服务能被前端稳定接入？”**

可以从这几个点答：

### 1. 会话层和运行时层分开

- checkpoint 负责 Agent 状态
- conversation store 负责聊天产品数据

### 2. 用 thread_id 统一串联上下文

- 多轮会话
- 恢复能力
- 会话列表
- 消息查询

### 3. 流式返回采用 SSE

- 更适合单向 token 推送
- 实现简单
- 前端接入成本低

### 4. 提供 OpenAI Compatible 接口

- 降低外部接入门槛
- 兼容更多前端和 SDK

### 5. 对异常状态做有限自愈

- 发现坏 checkpoint 时支持清理和重试

这一套讲下来，面试官会觉得你是在做“服务化 Agent”，而不是写个试玩 demo。

---

## 十二、这套设计还有哪些可以继续升级

虽然现在已经不错了，但如果继续往工程化走，我会考虑再做这些：

### 1. 统一事件协议

把 SSE 事件进一步标准化，比如固定：

- `message_delta`
- `tool_start`
- `tool_end`
- `done`
- `error`

这样前后端联调会更清晰。

### 2. 会话归档与删除策略

现在有 thread 维度的数据管理，但还可以增加：

- 归档
- 软删除
- 收藏
- 搜索

### 3. 可观测性

增加：

- 每轮耗时
- 工具命中率
- 工具失败率
- token 使用量

这样后期调优会轻松很多。

### 4. 多模型切换能力

把模型参数、温度、模型供应商也收进统一配置层。

---

## 总结

`agent-koa` 这部分代码最让我觉得“已经不像 demo”的地方，是它把下面几件事真正串起来了：

- 用 SQLite 保存 Agent checkpoint
- 用 Conversation Store 管理聊天线程和消息
- 用 SSE 做流式事件返回
- 用 OpenAI Compatible 层做外部协议适配

这样一来，它就不只是“模型能答”，而是开始具备一个后端服务该有的样子：

- 可恢复
- 可接入
- 可扩展
- 可维护

如果你也在做 AI 应用，建议别一上来只盯着 prompt 和模型参数。  
很多时候，真正决定系统体验上限的，反而是这些看起来没那么“AI”的基础设施层。
