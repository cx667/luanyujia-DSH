# 界面与主题

**收什么**：面板渲染器、顶栏 / 标签栏、配色方案、图标、皮肤

**不收什么**：只有设计稿没有能跑的实现

**注意**：渲染器要说明它注册的类型名与依赖

## 一个条目的结构

```
界面与主题/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
