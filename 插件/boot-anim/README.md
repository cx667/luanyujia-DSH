# 启动动画插件 v1.1.0

给 DSH 工作台的设置页加一个「**启动动画**」分区：列出外壳支持的全部启动动画，**点卡片切换**（下次启动生效），右上「**▶ 预览当前**」立刻整窗播放一遍。

![设置页预览](preview.jpg)

## 装完你会看到

```
设置 → 启动动画
┌────────────────────────────────────────────┐
│ 启动动画                        [▶ 预览当前] │
│ 点卡片只切换（下次启动生效）；要看效果点右上   │
│                                            │
│ ┌──────────┐ ┌──────────────┐ ┌──────────┐ │
│ │ 经典      │ │ 线条睁眼鲸鱼  │ │ 为理想奋斗 │ │
│ │ 鲸鱼logo… │ │ 使用中        │ │ 红标志…   │ │
│ └──────────┘ └──────────────┘ └──────────┘ │
│ 配置：<DSH 根>\外壳\data\boot-animation.json │
└────────────────────────────────────────────┘
```

卡片来自外壳写出的 `available` 清单——**外壳里加了新动画，这里自动多一张卡**，插件不用改。

## 它做了什么（先看这段，避免误会）

启动画面是**外壳**（Electron 工作台）在引擎页面之前画的，所以插件**不负责播放**，只做三件事：

| 能力 | 怎么实现 |
|---|---|
| 列出可选动画 | `GET /plugins/boot-anim/list`，读外壳写的 `available` |
| 切换 | `POST /select` → 只改 `外壳\data\boot-animation.json` 的 `id` |
| 预览当前 | `POST /preview` → 写 `外壳\data\boot-preview.json`，外壳轮询到就播一遍，**不改选择** |

⇒ **外壳管播，插件管选**。这也是「换完要下次启动才生效」的原因：画面在界面之前，没法当场换；要看效果用「▶ 预览当前」。

## 安装

1. 把 `src/` 整个复制到 `引擎\插件\boot-anim\`
2. 打开 `引擎\.dsh\profiles\web\cordis.patch.yml`，在你的插件段里加两行：

   ```yaml
   - id: boot-anim-host
     name: dsh-plugin-boot-anim
   ```

3. 重启引擎（或等 profile 热加载），进 **设置 → 启动动画**

> 外壳目录的解析顺序：`DSH_SHELL_DIR`（环境变量） → `<DSH_HOME>\..\..\外壳` → 当前目录下的 `外壳`。
> 标准安装（`<DSH 根>\引擎\.dsh` + `<DSH 根>\外壳` 同级）不用配任何东西。

## 对外接口（给二次开发）

| 路由 | 方法 | 作用 |
|---|---|---|
| `/plugins/boot-anim/list` | GET | `{ ok, current, available[], source, fallback? }` |
| `/plugins/boot-anim/select` | POST `{id}` | 只保存选择 |
| `/plugins/boot-anim/preview` | POST `{id?}` | 只触发预览，`id` 省略＝当前选择 |

## 目录

```
src/
├─ package.json      插件清单（dsh.client 声明注入 settings 插槽）
├─ lib/index.js      主机侧：/list · /select · /preview
└─ client/client.js  设置页 UI（React，走 slots 注入）
```

## 坑

| 现象 | 原因 |
|---|---|
| 只有「经典」一张卡 | 你的外壳还没实现启动动画注册表（不会写 `available`）。插件会用兜底项，不报错 |
| 卡片点了没反应 | 外壳版本不支持 `boot-animation.json` 契约 |
| 换了但启动还是老画面 | 正常：**下次启动**才生效；点「预览当前」可当场看 |
| 预览点了没动 | 外壳要轮询 `boot-preview.json`；旧外壳没有这个通道 |
| 配置写到了别处 | 外壳不在默认结构 → 设 `DSH_SHELL_DIR` |
| 设置里没有「启动动画」 | 插件没加载：查 `cordis.patch.yml` 有没有 `boot-anim-host`，或看引擎启动日志 |

## 版本

- **1.1.0**（2026-10-22）：新增「▶ 预览当前」（走 `boot-preview.json`，不改选择）；卡片点选不再自动预览；清单改为读外壳的 `available`，删除内置 `catalog.json`；外壳目录改为可移植解析。
- 1.0.1：首个版本，只有「经典」，只能选、不能预览。
