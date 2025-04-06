# mcp-proxy

<p>
  <a href="https://github.com/L-Qun/mcp-proxy/actions/workflows/ci.yml"><img src="https://github.com/L-Qun/mcp-proxy/actions/workflows/ci.yml/badge.svg" alt="GitHub Actions status"></a>
  <a href= "https://github.com/prettier/prettier"><img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg"></a>
  <a href="https://github.com/facebook/jest"><img src="https://img.shields.io/badge/tested_with-jest-99424f.svg" alt="Tested with Jest"></a>
  <a href="CONTRIBUTING.md#pull-requests"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="#license"><img src="https://img.shields.io/github/license/sourcerer-io/hall-of-fame.svg?colorB=ff0000"></a>
</p>

实现了 SSE 与 STDIO 之间的协议转换

使用其他语言阅读：[English](./README.MD) | 简体中文

## 动机

<div align="center">
  <img src="./img/protocol-conversion.png" width="700">
</div>

MCP 协议转换在一些场景非常重要，比如：

1. Claude 或者一些其他的客户端不支持 SSE 协议。
2. 我们希望将基于 STDIO 协议的 MCP Server 进行部署。

现在你可以使用这个工具来解决这个问题。

## 用法

- SSE 转换为 STDIO

```
 npx @mcp-stack/proxy stdio-to-sse https://your-mcp-server/sse
```

- STDIO 转换为 SSE

```
npx @mcp-stack/proxy sse-to-stdio node /path/to/your/mcp/script.js --port 8080
```

## 背后

<div align="center">
  <img src="./img/core.png" width="700">
</div>
