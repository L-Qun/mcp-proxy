# mcp-proxy

<p>
  <a href="https://github.com/L-Qun/mcp-proxy/actions/workflows/ci.yml"><img src="https://github.com/L-Qun/mcp-proxy/actions/workflows/ci.yml/badge.svg" alt="GitHub Actions status"></a>
  <a href= "https://github.com/prettier/prettier"><img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg"></a>
  <a href="https://github.com/facebook/jest"><img src="https://img.shields.io/badge/tested_with-jest-99424f.svg" alt="Tested with Jest"></a>
  <a href="CONTRIBUTING.md#pull-requests"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
  <a href="#license"><img src="https://img.shields.io/github/license/sourcerer-io/hall-of-fame.svg?colorB=ff0000"></a>
</p>

Implements protocol conversion between SSE and stdio

Read this in other languages: English | [简体中文](./README_zh-CN.MD)

## Motivation

<div align="center">
  <img src="./img/protocol-conversion.png" width="700">
</div>

When either the client or the server does not support a particular protocol, protocol conversion becomes necessary. For example, some typical scenarios include:

1. Claude or some other clients does not support the SSE protocol.
2. We want to deploy an MCP Server that only supports STDIO.

Now you can use this tool to solve the problem.

## Usage

- SSE to STDIO

```
 npx @mcp-stack/proxy stdio-to-sse https://your-mcp-server/sse
```

- STDIO to SSE

```
npx @mcp-stack/proxy sse-to-stdio node /path/to/your/mcp/script.js --port 8080
```

## Behind the Scenes

<div align="center">
  <img src="./img/core.png" width="700">
</div>
