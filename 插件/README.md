# 插件

**收什么**：装进 `引擎\插件\` 的 DSH 插件：package.json + 入口 + cordis.patch.yml 挂载说明

**不收什么**：改内核源码的补丁、需要预编译的工具链

**注意**：必须写清兼容的引擎版本，和「装完怎么验证生效」

## 一个条目的结构

```
插件/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
