/**
 * 启动动画插件 —— 主机侧（发布版）
 *
 * 与本地版的唯一区别：**清单来自插件自带的 catalog.json**，不再依赖外壳写出的 available。
 *   ⇒ 别人装上这个插件，设置里就会有一个「启动动画」分区，里面只列我正式上线的动画。
 *
 * 契约（不变）：
 *   <DSH 根>\外壳\data\boot-animation.json   { "id": "classic", "available": [...] }
 *   - 外壳管播放：启动时读 id
 *   - 本插件管选择：只改 id，**保留**外壳写出的 available，免得把别人的清单覆盖掉
 *
 * 可选环境变量：DSH_SHELL_DIR（外壳目录；不设则从 DSH_HOME 反推 <DSH 根>\外壳）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'boot-anim-host'
export const inject = ['webServer']

const BASE = '/plugins/boot-anim'
// 外壳目录：优先环境变量；否则从 DSH_HOME（引擎\.dsh）反推 <DSH根>\外壳；再不行用相对目录
const DSH_HOME = process.env.DSH_HOME || ''
const SHELL_DIR = process.env.DSH_SHELL_DIR
  || (DSH_HOME ? path.resolve(DSH_HOME, '..', '..', '外壳') : '外壳')
const CFG = path.join(SHELL_DIR, 'data', 'boot-animation.json')
const PREVIEW = path.join(SHELL_DIR, 'data', 'boot-preview.json')

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CATALOG_FILE = path.resolve(HERE, '..', 'catalog.json')

/** 兜底：catalog.json 丢了也要能用（经典是外壳内置的，必然支持） */
const FALLBACK = [
  { id: 'classic', name: '经典', desc: '鲸鱼 logo + 标题 + 阶段文字 + 进度条（外壳默认启动画面）' },
]

function readCatalog() {
  try {
    const j = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8').replace(/^\uFEFF/, ''))
    const items = (Array.isArray(j.items) ? j.items : []).filter((x) => x && x.id)
    if (items.length) return items
  } catch (e) { /* 走兜底 */ }
  return FALLBACK
}

function readShellCfg() {
  try {
    return JSON.parse(fs.readFileSync(CFG, 'utf8').replace(/^\uFEFF/, ''))
  } catch (e) {
    return null
  }
}

function readCfg() {
  const items = readCatalog()
  const ids = items.map((x) => x.id)
  const shell = readShellCfg() || {}
  const current = ids.indexOf(shell.id) >= 0 ? shell.id : ids[0]
  return {
    ok: true,
    current,
    available: items,
    published: ids,
    source: CFG,
    shellDetected: !!shell.id,
  }
}

function writeCfg(id) {
  const items = readCatalog()
  if (!items.some((x) => x.id === id)) {
    return { ok: false, err: '未上线的动画：' + id, available: items.map((x) => x.id) }
  }

  // 保留外壳写的 available（别人的动画清单），只改 id
  const shell = readShellCfg() || {}
  const body = JSON.stringify(Object.assign({}, shell, { id }), null, 2) + '\n'
  fs.mkdirSync(path.dirname(CFG), { recursive: true })
  const tmp = CFG + '.tmp'
  fs.writeFileSync(tmp, body, 'utf8')
  fs.renameSync(tmp, CFG)   // 原子落盘

  // 点选即预览：外壳轮询 boot-preview.json，看到 at 变新就播一遍
  try {
    const pv = { id, at: Date.now(), by: 'boot-anim-plugin' }
    const ptmp = PREVIEW + '.tmp'
    fs.writeFileSync(ptmp, JSON.stringify(pv) + '\n', 'utf8')
    fs.renameSync(ptmp, PREVIEW)
  } catch (e) { /* 预览通道不可用不影响保存 */ }

  return { ok: true, current: id }
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = ''
    req.on('data', (c) => { buf += c; if (buf.length > 100 * 1024) req.destroy() })
    req.on('end', () => resolve(buf))
    req.on('error', () => resolve(''))
  })
}

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: BASE,
      handler: async (req, res) => {
        const pathname = new URL(req.url ?? '/', 'http://x').pathname
        const method = (req.method ?? 'GET').toUpperCase()

        if (pathname === BASE + '/list' && method === 'GET') {
          return sendJson(res, 200, readCfg())
        }

        if (pathname === BASE + '/select' && method === 'POST') {
          const raw = await readBody(req)
          let id = ''
          try { id = String(JSON.parse(raw || '{}').id || '') } catch (e) { id = '' }
          if (!id) return sendJson(res, 400, { ok: false, err: '缺少 id' })
          const r = writeCfg(id)
          return sendJson(res, r.ok ? 200 : 404, r)
        }

        return sendJson(res, 404, { ok: false, err: '未知路径：' + pathname })
      },
    }),
  )
}
