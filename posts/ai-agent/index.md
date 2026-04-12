---
title: AI Agent
---

# 🤖 AI Agent

这部分不只写“做了一个聊天页面”，而是围绕真实项目 `agent-koa` 去拆：

- Koa 服务怎么搭
- LangGraph 怎么驱动 Agent 执行流
- MCP 工具怎么接入和筛选
- 会话如何持久化
- SSE 流式输出怎么落地
- 怎么兼容 OpenAI 风格接口

## 推荐阅读顺序

1. [Koa 后端服务架构](/posts/ai-agent/01-Koa后端服务架构)
2. [React 前端聊天界面实现](/posts/ai-agent/02-React前端-聊天界面实现)
3. [LangGraph 与 MCP 工具调度设计](/posts/ai-agent/03-LangGraph与MCP工具调度设计)
4. [会话持久化、SSE 与 OpenAI 兼容层](/posts/ai-agent/04-会话持久化-SSE与OpenAI兼容层)
5. [MCP 管理后台与热插拔设计](/posts/ai-agent/05-MCP管理后台与热插拔设计)

## 这个专题会持续补的方向

- 工具路由的召回策略优化
- 前端如何消费工具事件流
- Agent 项目怎么包装成面试可讲的亮点
