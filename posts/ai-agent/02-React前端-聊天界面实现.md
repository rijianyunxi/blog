---
title: React 前端 - 聊天界面实现
date: 2026-03-28
tags: [React, AI, 聊天界面, 面试]
---

# React 前端 - 聊天界面实现

本文介绍 AI Agent 的 React 前端实现，包括聊天界面、MCP 面板等功能。

## 1. 核心组件

```tsx
// App.tsx
function App() {
  return (
    <div className="app">
      <ConversationSidebar />
      <div className="main">
        <ChatHeader />
        <MessageList />
        <ChatComposer />
      </div>
      <McpPanel />
    </div>
  )
}
```

## 2. ChatComposer - 输入框

```tsx
function ChatComposer({ onSend }) {
  const [message, setMessage] = useState('')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim()) return
    
    onSend(message)
    setMessage('')
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="输入消息..."
      />
      <button type="submit">发送</button>
    </form>
  )
}
```

## 3. MessageList - 消息列表

```tsx
function MessageList({ messages }) {
  const listRef = useRef(null)
  
  useEffect(() => {
    // 滚动到底部
    listRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  return (
    <div className="message-list">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={listRef} />
    </div>
  )
}
```

## 4. MarkdownRenderer

```tsx
function MarkdownRenderer({ content }) {
  const html = useMemo(() => {
    return marked.parse(content)
  }, [content])
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
```

## 5. MCP Tools 面板

```tsx
function McpPanel({ tools, onCallTool }) {
  return (
    <div className="mcp-panel">
      <h3>Tools</h3>
      {tools.map((tool) => (
        <button
          key={tool.name}
          onClick={() => onCallTool(tool)}
        >
          {tool.name}
        </button>
      ))}
    </div>
  )
}
```

## 6. Provider 注册表

```tsx
// 支持多 AI 模型
const providers = {
  openai: new OpenAIProvider(),
  claude: new ClaudeProvider(),
  gemini: new GeminiProvider(),
}

// 切换 provider
function App() {
  const [currentProvider, setCurrentProvider] = useState('openai')
  
  const sendMessage = async (message) => {
    const provider = providers[currentProvider]
    const response = await provider.chat(message)
    // 处理响应
  }
}
```

## 7. 面试高频问题

### Q: 如何实现 Markdown 实时渲染？

使用 marked 或 markdown-it 等库将 Markdown 转为 HTML，然后通过 dangerouslySetInnerHTML 渲染。

### Q: WebSocket/SSE 在前端如何处理？

```javascript
// SSE
const source = new EventSource('/sse')
source.onmessage = (event) => {
  appendMessage(JSON.parse(event.data))
}

// WebSocket
const ws = new WebSocket('ws://localhost:3000')
ws.onmessage = (event) => {
  appendMessage(JSON.parse(event.data))
}
```

## 8. 总结

React 聊天界面核心组件：
- ChatComposer：消息输入
- MessageList：消息列表
- MarkdownRenderer：Markdown 渲染
- MCP Panel：工具面板
