# 其他

**收什么**：文档模板、提示词、可复用素材

**不收什么**：与 DSH 无关的通用素材

**注意**：说明它解决什么问题、适合谁

## 一个条目的结构

```
其他/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
