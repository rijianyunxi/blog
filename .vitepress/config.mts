import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "song's blog",
  description: "记录生活，记录学习！",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      { text: "文章", link: "/posts/" },
      { text: "关于", link: "/about" },
    ],

    sidebar: {
      "/posts/": [
        {
          text: "总览",
          items: [{ text: "文章总览", link: "/posts/" }],
        },
        {
          text: "前端杂七杂八",
          collapsed: true,
          items: [
            {
              text: "Axios并发无感刷新 Token 方案",
              link: "/posts/javascript/axios并发无感刷新token",
            },
          ],
        },
        {
          text: "JS 手写实现",
          collapsed: true,
          items: [
            {
              text: "01 - Promise 完整实现",
              link: "/posts/js-手写实现/01-Promise完整实现",
            },
            {
              text: "02 - 深拷贝完整实现",
              link: "/posts/js-手写实现/02-深拷贝完整实现",
            },
            {
              text: "03 - 继承的六种方式",
              link: "/posts/js-手写实现/03-继承的六种方式",
            },
            {
              text: "04 - call / apply / bind 实现",
              link: "/posts/js-手写实现/04-call-apply-bind实现",
            },
            {
              text: "05 - 闭包与作用域链",
              link: "/posts/js-手写实现/05-闭包与作用域链",
            },
            {
              text: "06 - 事件总线 EventBus",
              link: "/posts/js-手写实现/06-事件总线EventBus",
            },
            {
              text: "07 - 防抖与节流",
              link: "/posts/js-手写实现/07-防抖与节流",
            },
            {
              text: "08 - instanceof 实现",
              link: "/posts/js-手写实现/08-instanceof实现",
            },
            {
              text: "09 - reduce 手写实现",
              link: "/posts/js-手写实现/09-reduce手写实现",
            },
            {
              text: "10 - memo 缓存实现",
              link: "/posts/js-手写实现/10-memo缓存实现",
            },
            {
              text: "11 - 数组扁平化去重排序",
              link: "/posts/js-手写实现/11-数组扁平化去重排序",
            },
            {
              text: "12 - 列表与树互转",
              link: "/posts/js-手写实现/12-列表与树互转",
            },
            {
              text: "13 - 压缩字符串与反转字符串",
              link: "/posts/js-手写实现/13-压缩字符串与反转字符串",
            },
          ],
        },
        {
          text: "AI Agent",
          collapsed: true,
          items: [
            {
              text: "01 - Koa 后端服务架构",
              link: "/posts/ai-agent/01-Koa后端服务架构",
            },
            {
              text: "02 - React 前端聊天界面实现",
              link: "/posts/ai-agent/02-React前端-聊天界面实现",
            },
            {
              text: "03 - LangGraph + MCP 工具调度设计",
              link: "/posts/ai-agent/03-LangGraph与MCP工具调度设计",
            },
            {
              text: "04 - 会话持久化、SSE 流式输出与 OpenAI 兼容层",
              link: "/posts/ai-agent/04-会话持久化-SSE与OpenAI兼容层",
            },
          ],
        },
        {
          text: "TypeScript 工程配置",
          collapsed: true,
          items: [
            {
              text: "01 - tsconfig.json 全配置详解",
              link: "/posts/typescript-config/01-tsconfig全配置详解",
            },
            {
              text: "02 - tsx / tsup / tsc 工具链对比",
              link: "/posts/typescript-config/02-tsx-tsup-tsc工具链对比",
            },
            {
              text: "03 - 环境变量与 dotenv",
              link: "/posts/typescript-config/03-环境变量与dotenv",
            },
            {
              text: "04 - 模块系统与路径别名",
              link: "/posts/typescript-config/04-模块系统与路径别名",
            },
            {
              text: "05 - OpenAI SDK 类型系统详解",
              link: "/posts/typescript-config/05-OpenAI-SDK类型系统详解",
            },
          ],
        },
        {
          text: "Vue3 迷你实现",
          collapsed: true,
          items: [
            {
              text: "01 - 项目架构总览",
              link: "/posts/vue-mini/01-vue3-mini-项目架构总览",
            },
            {
              text: "02 - 响应式系统 reactive & proxy",
              link: "/posts/vue-mini/02-vue3-响应式系统-reactive-proxy",
            },
            {
              text: "03 - 依赖收集与触发 effect",
              link: "/posts/vue-mini/03-vue3-依赖收集与触发-effect",
            },
            {
              text: "04 - computed 计算属性实现",
              link: "/posts/vue-mini/04-vue3-computed-计算属性实现",
            },
            {
              text: "05 - watch 侦听器实现",
              link: "/posts/vue-mini/05-vue3-watch-侦听器实现",
            },
            {
              text: "06 - ref 响应式引用",
              link: "/posts/vue-mini/06-vue3-ref-响应式引用",
            },
            {
              text: "07 - 虚拟 DOM 与 VNode",
              link: "/posts/vue-mini/07-vue3-虚拟DOM与VNode",
            },
            {
              text: "08 - Diff 算法与 Renderer",
              link: "/posts/vue-mini/08-vue3-Diff算法与Renderer",
            },
          ],
        },
        {
          text: "React 迷你实现",
          collapsed: true,
          items: [
            {
              text: "01 - 项目架构总览",
              link: "/posts/react-mini/01-react-mini-项目架构总览",
            },
            {
              text: "02 - JSX 与 ReactElement",
              link: "/posts/react-mini/02-React-JSX与ReactElement",
            },
            {
              text: "03 - Fiber 架构详解",
              link: "/posts/react-mini/03-React-Fiber架构详解",
            },
            {
              text: "04 - Reconciler 协调器",
              link: "/posts/react-mini/04-React-Reconciler协调器",
            },
          ],
        },

        {
          text: "工程与实践",
          collapsed: true,
          items: [
            { text: "前端监控 SDK", link: "/posts/monitor-sdk/" },
            { text: "浏览器 API", link: "/posts/浏览器API/" },
            { text: "Webpack", link: "/posts/webpack/" },
          ],
        },
        {
          text: "LeetCode Hot100",
          collapsed: true,
          items: [
            {
              text: "01 - 数组与哈希",
              link: "/posts/leetcode-hot100/01-数组与哈希",
            },
            { text: "02 - 双指针", link: "/posts/leetcode-hot100/02-双指针" },
            {
              text: "03 - 滑动窗口",
              link: "/posts/leetcode-hot100/03-滑动窗口",
            },
            {
              text: "04 - 栈与单调栈",
              link: "/posts/leetcode-hot100/04-栈与单调栈",
            },
            { text: "05 - 链表", link: "/posts/leetcode-hot100/05-链表" },
            {
              text: "06 - 二叉树基础",
              link: "/posts/leetcode-hot100/06-二叉树基础",
            },
            {
              text: "07 - 二叉树进阶与图论",
              link: "/posts/leetcode-hot100/07-二叉树进阶与图论",
            },
            { text: "08 - 回溯", link: "/posts/leetcode-hot100/08-回溯" },
            {
              text: "09 - 二分查找",
              link: "/posts/leetcode-hot100/09-二分查找",
            },
            {
              text: "10 - 动态规划基础",
              link: "/posts/leetcode-hot100/10-动态规划基础",
            },
            {
              text: "11 - 动态规划进阶",
              link: "/posts/leetcode-hot100/11-动态规划进阶",
            },
            {
              text: "12 - 贪心与设计题",
              link: "/posts/leetcode-hot100/12-贪心与设计题",
            },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/rijianyunxi" }],

    search: {
      provider: "local",
    },
  },
});
