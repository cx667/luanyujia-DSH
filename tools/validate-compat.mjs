// 校验每个条目 manifest.json 的 compat 字段：形状对不？区间能不能解析？能不能判「适用哪个 DSH 版本」？
// 用法：node tools/validate-compat.mjs                校验全部条目
//       node tools/validate-compat.mjs 0.2.1-rc.2     额外列出「这个版本能用 / 不能用」两份清单
//
// 为什么要有这个脚本：条目 1535 条，用户最常问的一句是「我这个 DSH 版本能装吗」。
// compat.dsh 就是回答它的唯一机器可读字段；没有它就只能读 README 猜。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATS = ['启动动画', '界面与主题', '插件', '技能', 'MCP', '场景', '其他'];

// ---------- 极简 semver：够判 DSH 的 ">=0.2.1-rc.2 <0.2.2" 这种区间 ----------
const VRE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parseVersion(s) {
  const m = VRE.exec(String(s).trim());
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || '' };
}

function cmpPre(a, b) {
  // 无 prerelease 的 > 有 prerelease 的（1.0.0 > 1.0.0-rc.1）
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const as = a.split('.'), bs = b.split('.');
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i], y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) { const d = +x - +y; if (d) return d < 0 ? -1 : 1; }
    else if (nx !== ny) return nx ? -1 : 1; // 数字段 < 字母段
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function compare(a, b) {
  const A = parseVersion(a), B = parseVersion(b);
  if (!A || !B) throw new Error('版本号不合法：' + (!A ? a : b));
  for (const k of ['major', 'minor', 'patch']) if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  return cmpPre(A.pre, B.pre);
}

/** 支持：`1.2.3` `=1.2.3` `>=1.2.3` `>1.2.3` `<=1.2.3` `<1.2.3` `^1.2.3` `~1.2` `*`，空格=AND，`||`=OR */
export function satisfies(version, range) {
  const r = String(range).trim();
  if (!r || r === '*' || r === 'any') return true;
  return r.split('||').some((part) => {
    const terms = part.trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return true;
    return terms.every((t) => {
      let op = '=';
      let v = t;
      const m = /^(>=|<=|>|<|=|\^|~)?(.*)$/.exec(t);
      if (m) { op = m[1] || '='; v = m[2]; }
      if (op === '^' || op === '~') {
        const base = parseVersion(v);
        if (!base) throw new Error('版本号不合法：' + v);
        if (compare(version, v) < 0) return false;
        const upper = op === '^'
          ? (base.major > 0 ? `${base.major + 1}.0.0` : `0.${base.minor + 1}.0`)
          : `${base.major}.${base.minor + 1}.0`;
        return compare(version, upper) < 0;
      }
      const c = compare(version, v);
      switch (op) {
        case '>=': return c >= 0;
        case '>': return c > 0;
        case '<=': return c <= 0;
        case '<': return c < 0;
        default: return c === 0;
      }
    });
  });
}

// ---------- 校验 ----------
const problems = [];
const warnings = [];
const rows = [];

function checkManifest(tag, m) {
  const c = m.compat;
  if (c === undefined) { warnings.push(tag + '：没有 compat 字段（用户无法机器判断适用哪个 DSH 版本）'); return null; }
  if (c === null) { warnings.push(tag + '：compat 是 null（若确实全版本可用，写 {"dsh":"*"}）'); return null; }
  if (typeof c !== 'object' || Array.isArray(c)) { problems.push(tag + '：compat 必须是对象，实际是 ' + typeof c); return null; }
  const allowed = new Set(['dsh', 'os', 'shell', 'arch', 'notes']);
  for (const k of Object.keys(c)) if (!allowed.has(k)) warnings.push(tag + '：compat 里有未约定字段 ' + k + '（约定见 说明/条目字段规范.md）');
  if (!c.dsh) problems.push(tag + '：compat 缺 dsh（例如 ">=0.2.1-rc.2 <0.2.2"）');
  else if (typeof c.dsh !== 'string') problems.push(tag + '：compat.dsh 必须是字符串');
  else {
    try { satisfies('0.2.1-rc.2', c.dsh); } catch (e) { problems.push(tag + '：compat.dsh 区间不合法 → ' + e.message); }
  }
  if (c.os !== undefined && typeof c.os !== 'string' && !Array.isArray(c.os)) problems.push(tag + '：compat.os 必须是字符串或数组');
  if (c.shell !== undefined && typeof c.shell !== 'string') problems.push(tag + '：compat.shell 必须是字符串');
  return c;
}

const targets = [];
for (const cat of CATS) {
  const d = path.join(ROOT, cat);
  if (!fs.existsSync(d)) continue;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) targets.push({ rel: cat + '/' + e.name, dir: path.join(d, e.name) });
  }
}
for (const t of targets) {
  const mf = path.join(t.dir, 'manifest.json');
  if (!fs.existsSync(mf)) continue;
  let m;
  try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch { problems.push(t.rel + '：manifest.json 不是合法 JSON'); continue; }
  const c = checkManifest(t.rel, m);
  rows.push({ 条目: t.rel, dsh: c && c.dsh ? c.dsh : '—', os: c && c.os ? String(c.os) : '—' });
}

console.table(rows);
console.log('--- 结论 ---');
if (problems.length) { console.log('⛔ ' + problems.length + ' 个问题：'); problems.forEach((p) => console.log('  · ' + p)); }
else console.log('✅ compat 形状全部通过（' + targets.length + ' 个条目）');
if (warnings.length) { console.log('⚠ ' + warnings.length + ' 条提醒：'); warnings.forEach((w) => console.log('  · ' + w)); }

// ---------- 可选：按某个 DSH 版本分两份清单 ----------
const ver = process.argv[2];
if (ver) {
  if (!parseVersion(ver)) { console.error('\n版本号不合法：' + ver); process.exit(2); }
  const yes = [], no = [], unknown = [];
  for (const t of targets) {
    const mf = path.join(t.dir, 'manifest.json');
    if (!fs.existsSync(mf)) continue;
    let m; try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); } catch { continue; }
    const c = m.compat;
    if (!c || !c.dsh) { unknown.push(t.rel); continue; }
    let ok = false;
    try { ok = satisfies(ver, c.dsh); } catch { unknown.push(t.rel); continue; }
    (ok ? yes : no).push(t.rel + '  (' + c.dsh + ')');
  }
  console.log('\n=== DSH ' + ver + ' ===');
  console.log('\n可用（' + yes.length + '）'); yes.forEach((x) => console.log('  ✓ ' + x));
  console.log('\n不适用（' + no.length + '）'); no.forEach((x) => console.log('  ✗ ' + x));
  console.log('\n未声明 compat（' + unknown.length + '）'); unknown.slice(0, 20).forEach((x) => console.log('  ? ' + x));
  if (unknown.length > 20) console.log('  …还有 ' + (unknown.length - 20) + ' 条');
}

process.exit(problems.length ? 1 : 0);
