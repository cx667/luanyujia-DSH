# 技能

**收什么**：`SKILL.md` + 参考件的技能包

**不收什么**：空壳 SKILL.md、没有触发词的技能

**注意**：要写触发词、开场定位、按需读哪些参考件

## 一个条目的结构

```
技能/<slug>/
├─ manifest.json
├─ README.md
├─ preview.mp4（或 preview.gif）
├─ poster.jpg
└─ src/
```

目录名用英文 slug（小写 + 连字符），中文标题写在 `manifest.json` 的 `title` 里。
加完跑一遍 `node tools/validate-item.mjs`，再 `node tools/build-index.mjs` 更新总索引。
