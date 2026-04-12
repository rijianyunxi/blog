---
title: Webpack 配置解析
date: 2026-03-28
tags: [Webpack, 工程化, 面试]
---

# Webpack 配置解析

Webpack 是现代前端工程化的核心工具，本文讲解其核心配置。

## 1. 核心配置

```javascript
module.exports = {
  // 入口文件
  entry: './src/index.js',
  
  // 输出
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true, // 清理 dist
  },
  
  // loader
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  // plugin
  plugins: [],
  
  // 开发服务器
  devServer: {
    port: 3000,
    hot: true,
  },
  
  // 解析
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
}
```

## 2. entry 和 output

### 多入口

```javascript
entry: {
  main: './src/main.js',
  vendor: './src/vendor.js',
}

output: {
  filename: '[name].[contenthash].js',
}
```

## 3. loader

### 常见 loader

```javascript
rules: [
  // Babel
  {
    test: /\.(js|jsx)$/,
    exclude: /node_modules/,
    use: 'babel-loader',
  },
  
  // CSS
  {
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],
  },
  
  // 图片
  {
    test: /\.(png|jpg|gif)$/,
    type: 'asset/resource',
  },
  
  // 字体
  {
    test: /\.(woff|woff2|eot|ttf|otf)$/,
    type: 'asset/resource',
  },
]
```

## 4. Plugin

### 常用 plugin

```javascript
plugins: [
  new HtmlWebpackPlugin({
    template: './src/index.html',
    minify: true,
  }),
  
  new MiniCssExtractPlugin({
    filename: '[name].[contenthash].css',
  }),
  
  new DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
]
```

## 5. Loader vs Plugin

| 特性 | Loader | Plugin |
|------|--------|--------|
| 处理时机 | 打包时 | 全过程 |
| 功能 | 转换特定文件 | 更广泛的任务 |
| 执行方式 | 链式调用 | 广播事件 |

## 6. 面试高频问题

### Q: Loader 和 Plugin 的区别？

- Loader 作用于特定文件的转换
- Plugin 可以在整个打包过程中执行更广泛的任务

### Q: 如何优化构建速度？

1. 使用 cache-loader
2. 使用 thread-loader 多进程
3. externals 排除大库
4. 懒加载动态导入

## 7. 总结

Webpack 配置的核心：
- entry/output：输入输出
- loader：文件转换
- plugin：扩展功能
