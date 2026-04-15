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
          text: "前端基础",
          collapsed: true,
          items: [
            {
              text: "Axios并发无感刷新 Token 方案",
              link: "/posts/前端基础/axios并发无感刷新token",
            },
            {
              text: "Promise 完整实现",
              link: "/posts/前端基础/Promise完整实现",
            },
            {
              text: "深拷贝完整实现",
              link: "/posts/前端基础/深拷贝完整实现",
            },
            {
              text: "继承的六种方式",
              link: "/posts/前端基础/继承的六种方式",
            },
            {
              text: "call / apply / bind 实现",
              link: "/posts/前端基础/call-apply-bind实现",
            },
            {
              text: "闭包与作用域链",
              link: "/posts/前端基础/闭包与作用域链",
            },
            {
              text: "事件总线 EventBus",
              link: "/posts/前端基础/事件总线EventBus",
            },
            {
              text: "防抖与节流",
              link: "/posts/前端基础/防抖与节流",
            },
            {
              text: "instanceof 实现",
              link: "/posts/前端基础/instanceof实现",
            },
            {
              text: "reduce 手写实现",
              link: "/posts/前端基础/reduce手写实现",
            },
            {
              text: "数组扁平化去重排序",
              link: "/posts/前端基础/数组扁平化去重排序",
            },
            {
              text: "列表与树互转",
              link: "/posts/前端基础/列表与树互转",
            },
            {
              text: "MutationObserver 变化监听",
              link: "/posts/前端基础/MutationObserver-变化监听",
            },
            {
              text: "IntersectionObserver 交叉观察",
              link: "/posts/前端基础/IntersectionObserver-交叉观察",
            },
            {
              text: "Web Worker 多线程",
              link: "/posts/前端基础/Web-Worker-多线程",
            },
            {
              text: "Server-Sent Events",
              link: "/posts/前端基础/Server-Sent-Events",
            },
            {
              text: "requestAnimationFrame 动画帧",
              link: "/posts/前端基础/requestAnimationFrame-动画帧",
            },
            {
              text: "CSS transform 对定位的影响",
              link: "/posts/前端基础/CSS-transform对定位的影响",
            },
            {
              text: "虚拟滚动实现",
              link: "/posts/前端基础/虚拟滚动实现",
            },
            {
              text: "DOM 树遍历 BFS",
              link: "/posts/前端基础/DOM树遍历-BFS",
            },
          ],
        },
        {
          text: "前端工程化",
          collapsed: true,
          items: [
            {
              text: "前端工程化全链路梳理",
              link: "/posts/工程化/前端工程化与Monorepo全链路梳理",
            },
            {
              text: "tsconfig.json 全配置详解",
              link: "/posts/工程化/tsconfig全配置详解",
            },
            {
              text: "tsx / tsup / tsc 工具链对比",
              link: "/posts/工程化/tsx-tsup-tsc工具链对比",
            },
            {
              text: "环境变量与 dotenv",
              link: "/posts/工程化/环境变量与dotenv",
            },
            {
              text: "模块系统与路径别名",
              link: "/posts/工程化/模块系统与路径别名",
            },
            {
              text: "OpenAI SDK 类型系统详解",
              link: "/posts/工程化/OpenAI-SDK类型系统详解",
            },
            {
              text: "pnpm workspace 与 Monorepo 实战",
              link: "/posts/工程化/pnpm-workspace与Monorepo实战",
            },
            {
              text: "ESLint / Prettier / tsconfig / Husky",
              link: "/posts/工程化/eslint-prettier-tsconfig与husky边界",
            },
            {
              text:"webpack配置解析",
              link:"/posts/工程化/webpack配置解析.md",
            },
            {
              text:"webpack自定义Loader实现.md",
              link:"/posts/工程化/webpack自定义Loader实现.md",
            }
          ],
        },
        {
          text: "Vue3迷你实现-ing",
          collapsed: true,
          items: [
            {
              text: "项目架构总览",
              link: "/posts/vue-mini/vue3-mini-项目架构总览",
            },
            {
              text: "响应式系统 reactive & proxy",
              link: "/posts/vue-mini/vue3-响应式系统-reactive-proxy",
            },
            {
              text: "依赖收集与触发 effect",
              link: "/posts/vue-mini/vue3-依赖收集与触发-effect",
            },
            {
              text: "computed 计算属性实现",
              link: "/posts/vue-mini/vue3-computed-计算属性实现",
            },
            {
              text: "watch 侦听器实现",
              link: "/posts/vue-mini/vue3-watch-侦听器实现",
            },
            {
              text: "ref 响应式引用",
              link: "/posts/vue-mini/vue3-ref-响应式引用",
            },
            {
              text: "虚拟 DOM 与 VNode",
              link: "/posts/vue-mini/vue3-虚拟DOM与VNode",
            },
            {
              text: "Diff 算法与 Renderer",
              link: "/posts/vue-mini/vue3-Diff算法与Renderer",
            },
          ],
        },
        {
          text: "React迷你实现-ing",
          collapsed: true,
          items: [
            {
              text: "项目架构总览",
              link: "/posts/react-mini/react-mini-项目架构总览",
            },
            {
              text: "JSX 与 ReactElement",
              link: "/posts/react-mini/React-JSX与ReactElement",
            },
            {
              text: "Fiber 架构详解",
              link: "/posts/react-mini/React-Fiber架构详解",
            },
            {
              text: "Reconciler 协调器",
              link: "/posts/react-mini/React-Reconciler协调器",
            },
          ],
        },

        {
          text: "实践",
          collapsed: true,
          items: [
            { text: "前端监控 SDK", link: "/posts/monitor-sdk/" },
          ],
        },
         {
          text: "ai",
          collapsed: true,
          items: [
            { text: "OpenAIChat参数", link: "/posts/ai/OpenAIChat参数.md" },
          ],
        },
        {
          text: "LeetCode Hot100",
          collapsed: true,
          items: [
            {
              text: "数组与哈希",
              link: "/posts/leetcode-hot100/数组与哈希",
            },
            { text: "双指针", link: "/posts/leetcode-hot100/双指针" },
            {
              text: "滑动窗口",
              link: "/posts/leetcode-hot100/滑动窗口",
            },
            {
              text: "栈与单调栈",
              link: "/posts/leetcode-hot100/栈与单调栈",
            },
            { text: "链表", link: "/posts/leetcode-hot100/链表" },
            {
              text: "二叉树基础",
              link: "/posts/leetcode-hot100/二叉树基础",
            },
            {
              text: "二叉树进阶与图论",
              link: "/posts/leetcode-hot100/二叉树进阶与图论",
            },
            { text: "回溯", link: "/posts/leetcode-hot100/回溯" },
            {
              text: "二分查找",
              link: "/posts/leetcode-hot100/二分查找",
            },
            {
              text: "动态规划基础",
              link: "/posts/leetcode-hot100/动态规划基础",
            },
            {
              text: "动态规划进阶",
              link: "/posts/leetcode-hot100/动态规划进阶",
            },
            {
              text: "贪心与设计题",
              link: "/posts/leetcode-hot100/贪心与设计题",
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
