# Axios 并发无感刷新 Token 方案

在处理 Token 过期时，如果页面同时发起了多个请求，我们需要确保：
1. **只发起一次**刷新 Token 的请求。
2. 将其余请求**挂起**，等待新 Token 获取后再重新发起。
3. 如果刷新失败，则清理状态并引导用户重新登录。

## 核心实现逻辑

使用 **发布订阅模式（Queue）** 配合 **状态锁（isRefreshing）**。

### TypeScript 实现代码

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// 1. 状态标志与请求队列
let isRefreshing = false; // 是否正在刷新 Token 的锁
let requests: ((token: string) => void)[] = []; // 挂起的请求队列

// 2. 创建 Axios 实例
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

/**
 * 刷新 Token 的具体实现
 * 注意：建议使用独立的 axios 实例或 fetch，避免触发当前实例的拦截器导致死循环
 */
async function refreshTokenApi(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  // 模拟请求新 Token
  const res = await axios.post('/auth/refresh', { refreshToken });
  return res.data.accessToken; 
}

// 3. 请求拦截器：注入 Token
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4. 响应拦截器：处理 401 逻辑
http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const { config, response } = error;

    // 状态码为 401 说明 Token 失效
    if (response?.status === 401 && config) {
      
      // --- 情况 A：当前没有在刷新 Token ---
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          // 发起刷新请求
          const newToken = await refreshTokenApi();
          
          // 更新本地存储
          localStorage.setItem('access_token', newToken);

          // 执行队列中的请求
          requests.forEach((cb) => cb(newToken));
          requests = [];

          // 重新发起当前触发 401 的请求
          config.headers.Authorization = `Bearer ${newToken}`;
          return http(config);
          
        } catch (refreshError) {
          // 刷新失败（如 Refresh Token 也过期了）
          requests = [];
          handleLogout(); // 具体的清理状态并跳转登录页逻辑
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false; // 无论结果如何，释放锁
        }
      }

      // --- 情况 B：已经在刷新 Token 中，将当前请求挂起 ---
      // 返回一个未决（Pending）的 Promise，其 resolve 将在刷新成功后被调用
      return new Promise((resolve) => {
        requests.push((token: string) => {
          config.headers.Authorization = `Bearer ${token}`;
          resolve(http(config));
        });
      });
    }

    return Promise.reject(error);
  }
);

/**
 * 登出逻辑
 */
function handleLogout() {
  localStorage.clear();
  window.location.href = '/login';
}

export default http;
```

## 方案优势

1.  **并发安全**：通过 `isRefreshing` 锁确保了全局只会发起一次 `refreshTokenApi` 调用。
2.  **无感体验**：处于 Pending 状态的请求会在新 Token 到位后自动完成，用户端不会感知到网络异常或报错。
3.  **闭包解耦**：利用 `requests` 数组存储回调函数，将“请求重发”的逻辑封装在拦截器内部，业务代码（如 Vue 里的 `onMounted`）完全不需要关心重试机制。
4.  **严格类型检查**：基于 TypeScript 编写，适配 Axios 的最新类型定义，适合大型项目及 SDK 开发。

## 注意事项

* **死循环风险**：刷新 Token 的接口（`refreshTokenApi`）**一定不能**使用会触发此拦截器的实例，否则会陷入“过期 -> 刷新 -> 拦截 -> 刷新”的死循环。
* **并发限制**：如果后端对并发重试有非常严格的限流，可以考虑对重试请求加入微小的 `setTimeout` 错峰。
* **状态同步**：如果你的应用使用了 Pinia 或 Redux 等状态管理工具，刷新成功后记得同步更新 Store 中的 Token 状态。