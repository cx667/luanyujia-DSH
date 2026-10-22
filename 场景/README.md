# 场景

**收什么**：工作台布局配置：`scenarios/*.json` + 定位卡

**不收什么**：直接抄别人场景但不写明改哪的

**注意**：面板 id / 坐标 / 会话绑定要能对上

## 一个条目的结构

```
场景/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
