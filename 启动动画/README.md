# 启动动画

**收什么**：DSH 的启动 / 加载画面：整段动画、片头视频、主题皮肤里的启动块

**不收什么**：纯壁纸、非 DSH 的通用开机动画、只有一张静态图的「伪动画」

**注意**：最好带 preview.mp4（640×360 / 15fps）；有 src/ 能直接看的算满分

## 一个条目的结构

```
启动动画/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
