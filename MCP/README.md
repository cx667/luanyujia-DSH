# MCP

**收什么**：外部工具服务：能注册进 DSH 的 MCP 服务与薄壳

**不收什么**：需要私有凭据才能跑通的整包

**注意**：写清启动命令、端口、依赖，凭据只写「要什么」不写值

## 一个条目的结构

```
MCP/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
