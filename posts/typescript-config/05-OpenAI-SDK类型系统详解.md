---
title: OpenAI SDK 类型系统详解
date: 2026-04-11
---

# OpenAI SDK 类型系统详解

## 安装

```bash
npm install openai
npm install -D @types/node
```

## 常用类型速查

```typescript
import type OpenAI from "openai"

// 请求参数
type NonStreamParams = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
type StreamParams   = OpenAI.Chat.ChatCompletionCreateParamsStreaming
type Params         = OpenAI.Chat.ChatCompletionCreateParams  // 两者联合

// 响应
type Response = OpenAI.Chat.ChatCompletion          // 非流式响应
type Chunk    = OpenAI.Chat.ChatCompletionChunk     // 流式单个 chunk

// 消息
type Message     = OpenAI.Chat.ChatCompletionMessageParam   // 所有消息类型联合
type AiMessage   = OpenAI.Chat.ChatCompletionMessage        // assistant 回复
type ToolMessage = OpenAI.Chat.ChatCompletionToolMessageParam

// 工具
type Tool     = OpenAI.Chat.ChatCompletionTool
type ToolCall = OpenAI.Chat.ChatCompletionMessageToolCall
```

## 消息类型详解

消息有四种角色，每种结构不同：

```typescript
import type OpenAI from "openai"

type Message = OpenAI.Chat.ChatCompletionMessageParam

// system
const system: Message = {
  role: "system",
  content: "你是一个助手",
}

// user（纯文字）
const user: Message = {
  role: "user",
  content: "你好",
}

// user（图片 + 文字，多模态）
const userWithImage: Message = {
  role: "user",
  content: [
    { type: "text", text: "这张图是什么" },
    { type: "image_url", image_url: { url: "https://..." } },
  ],
}

// assistant（普通回复）
const assistant: Message = {
  role: "assistant",
  content: "你好，有什么可以帮你",
}

// assistant（带工具调用）
const assistantWithTool: Message = {
  role: "assistant",
  content: null,
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "get_weather",
        arguments: JSON.stringify({ city: "北京" }),
      },
    },
  ],
}

// tool（工具结果，必须对应 assistant 的 tool_calls id）
const toolResult: Message = {
  role: "tool",
  tool_call_id: "call_abc123",
  content: "北京：晴天 25°C",
}
```

## 各角色必填字段

| role | 必填 | 说明 |
|------|------|------|
| `system` | `content` | 系统指令 |
| `user` | `content` | 字符串或数组（多模态） |
| `assistant` | `content` 或 `tool_calls` | 两者至少有一个 |
| `tool` | `tool_call_id` + `content` | 必须对应 assistant 的 id |

## 实际使用中不需要手动标注

大多数情况让 TS 自动推断就行：

```typescript
const client = new OpenAI({ apiKey: "sk-..." })

// response 自动推断为 ChatCompletion
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [],
})

// 只有函数参数这种场景才需要手动写类型
function buildMessages(
  history: OpenAI.Chat.ChatCompletionMessageParam[]
) {
  return [
    { role: "system" as const, content: "你是助手" },
    ...history,
  ]
}
```

## 兼容国产模型

```typescript
// DeepSeek / 千问 / Kimi 都走 OpenAI 兼容层，类型完全一样
const client = new OpenAI({
  apiKey: "sk-...",
  baseURL: "https://api.deepseek.com/v1",
})

// 类型用法完全相同
const response: OpenAI.Chat.ChatCompletion = await client.chat.completions.create({
  model: "deepseek-chat",
  messages: [{ role: "user", content: "你好" }],
})
```
