# 淋雨家的 DSH

> 我自己的 DSH **成品仓库**：启动动画、插件、技能、主题……每一个都是**独立可用**的一份东西，
> 不打包、不混装。看中哪个拿走哪个。

- 方法/教程 → [`luanyujia-workbench`](https://github.com/mashanglinyu/luanyujia-workbench)
- 个人站 → [luanyujia.pages.dev](https://luanyujia.pages.dev)
- 本站（成品集市）→ [mydsh.xyz](https://mydsh.xyz) —— **持续更新中**：启动动画 / 界面主题 / 插件 / 技能 / MCP / 场景，每条都能单独装

## 目录

```
启动动画/     每个条目一个文件夹（英文 slug）
界面与主题/
插件/
技能/
MCP/
场景/
其他/
tools/        索引生成 + 校验脚本
index.json    自动生成的总索引（站点直接读这个）
```

## 一个条目长这样

```
启动动画/classic-whale/
├─ manifest.json   机器读：标题/简介/版本/许可/安装方式
├─ README.md       人读：做什么、怎么装、有什么坑
├─ preview.mp4     预览（mp4 或 gif，≤5 MB）
├─ poster.jpg      封面帧
└─ src/            源码或成品
```

`manifest.json` 示例：

```json
{
  "id": "classic-whale",
  "title": "经典鲸鱼启动动画",
  "category": "启动动画",
  "version": "1.0.0",
  "summary": "40~70 字：做了什么 / 怎么装 / 有什么坑",
  "author": "淋雨家",
  "license": "MIT",
  "compat": { "dsh": ">=0.2.1-rc.2", "os": "any" },
  "install": "复制 src/ 到 引擎\\插件\\，在 cordis.patch.yml 挂一行",
  "preview": { "type": "mp4", "file": "preview.mp4", "poster": "poster.jpg" },
  "updatedAt": "2026-10-22"
}
```

## 怎么用

1. 进分类目录，挑一个条目
2. 读它的 `README.md`（怎么装、有什么坑）
3. 需要的东西在 `src/` 里

⚠️ 这些是**我本机在用的东西**整理出来的，不是「装完就能用」的安装包。
路径、版本、依赖都要按你自己的环境改，README 里写了哪些必须改。

## 索引

```bash
node tools/build-index.mjs      # 扫所有条目 → 生成 index.json
node tools/validate-item.mjs    # 校验：字段 / 预览文件 / 体积 / 敏感词
```

提交前跑一遍 `validate-item.mjs`，它会把「预览文件是假的」「README 空壳」「夹带密钥」这类问题挡下来。

## 规矩（我自己也守）

| 项 | 值 |
|---|---|
| 单文件 | ≤ 5 MB |
| 单条目 | ≤ 20 MB |
| 目录深度 | 分类/条目/文件，最多 3 层 |
| 二进制 | 不收 `.exe / .msi / .zip`；大东西走 Releases |
| 命名 | 目录用英文 slug，中文标题写进 `manifest.json` |

## 许可

- 代码：MIT（见 `LICENSE`）
- 图文与预览素材：CC BY 4.0
- 单个条目里若自带 `LICENSE`，以它为准

---

作者：[淋雨家](https://luanyujia.pages.dev) · 这个仓库只放我自己的东西，不接受外部提交。
