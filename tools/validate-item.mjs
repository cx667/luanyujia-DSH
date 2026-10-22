// 校验所有条目：字段 / 预览文件真假 / 体积 / 敏感内容 / 目录深度
// 用法：node tools/validate-item.mjs            （校验全部）
//       node tools/validate-item.mjs 启动动画/classic-whale  （只校验一个）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATS = ['启动动画', '界面与主题', '插件', '技能', 'MCP', '场景', '其他'];
const MAX_FILE = 5 * 1024 * 1024;
const MAX_ITEM = 20 * 1024 * 1024;
const TEXT_EXT = /\.(md|json|js|mjs|cjs|ts|tsx|html|css|yml|yaml|txt|cmd|ps1)$/i;

const SECRETS = [
  [/sk-[A-Za-z0-9]{20,}/, '疑似 OpenAI 风格密钥 sk-…'],
  [/gh[pous]_[A-Za-z0-9]{30,}/, '疑似 GitHub token'],
  [/AKIA[0-9A-Z]{16}/, '疑似 AWS Access Key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, '疑似私钥'],
  [/\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/, '疑似内网 IP'],
  [/[A-Za-z]:\\{1,2}(?:Users|DSH|项目|工作)/, '疑似本机绝对路径']
];

function magicOk(file, type) {
  const b = fs.readFileSync(file);
  if (type === 'gif') return b.slice(0, 4).toString('ascii') === 'GIF8';
  if (type === 'png') return b[0] === 0x89 && b.slice(1, 4).toString('ascii') === 'PNG';
  if (type === 'jpg' || type === 'jpeg') return b[0] === 0xff && b[1] === 0xd8;
  if (type === 'mp4') return b.slice(4, 8).toString('ascii') === 'ftyp';
  if (type === 'webm') return b.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}

function depthOf(dir, base) {
  return path.relative(base, dir).split(path.sep).length;
}

function walkFiles(dir, base, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, base, out); else out.push(p);
  }
  return out;
}

const problems = [];
const warnings = [];
const list = [];

const only = process.argv[2] ? [process.argv[2]] : null;
const targets = [];
if (only) {
  targets.push({ rel: only.replace(/\\/g, '/'), dir: path.join(ROOT, only) });
} else {
  for (const cat of CATS) {
    const d = path.join(ROOT, cat);
    if (!fs.existsSync(d)) continue;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) targets.push({ rel: cat + '/' + e.name, dir: path.join(d, e.name) });
    }
  }
}

for (const t of targets) {
  const tag = t.rel;
  const mf = path.join(t.dir, 'manifest.json');
  if (!fs.existsSync(mf)) { problems.push(tag + '：缺 manifest.json'); continue; }
  let m;
  try { m = JSON.parse(fs.readFileSync(mf, 'utf8')); }
  catch (e) { problems.push(tag + '：manifest.json 不是合法 JSON（' + e.message + '）'); continue; }

  for (const k of ['id', 'title', 'category', 'version', 'summary', 'author', 'license', 'install', 'updatedAt']) {
    if (!m[k]) problems.push(tag + '：manifest 缺字段 ' + k);
  }
  if (m.id && m.id !== path.basename(t.dir)) problems.push(tag + '：id(' + m.id + ') 与目录名不一致');
  const parentCat = t.rel.split('/')[0];
  if (m.category && m.category !== parentCat) problems.push(tag + '：category(' + m.category + ') 与所在目录(' + parentCat + ') 不一致');
  const sl = String(m.summary || '').length;
  if (sl < 20 || sl > 120) problems.push(tag + '：summary 长度 ' + sl + '（要求 20~120 字）');

  // 预览
  if (!m.preview || !m.preview.file) {
    warnings.push(tag + '：没有 preview（站点会用占位图）');
  } else {
    const pf = path.join(t.dir, String(m.preview.file));
    if (!fs.existsSync(pf)) problems.push(tag + '：预览文件不存在 ' + m.preview.file);
    else {
      const size = fs.statSync(pf).size;
      if (size > MAX_FILE) problems.push(tag + '：预览超过 5 MB（' + (size / 1048576).toFixed(2) + ' MB）');
      if (!magicOk(pf, String(m.preview.type || '').toLowerCase())) problems.push(tag + '：预览文件头与类型不符（' + m.preview.type + '）');
    }
  }

  // README
  const rm = path.join(t.dir, 'README.md');
  if (!fs.existsSync(rm)) problems.push(tag + '：缺 README.md');
  else {
    const txt = fs.readFileSync(rm, 'utf8');
    if (txt.length < 200) problems.push(tag + '：README 太短（' + txt.length + ' 字符，要求 ≥200）');
  }

  // 体积 / 深度 / 敏感
  const files = walkFiles(t.dir, t.dir);
  let total = 0;
  for (const f of files) {
    const st = fs.statSync(f);
    total += st.size;
    if (st.size > MAX_FILE && !/\.(mp4|webm|zip)$/i.test(f)) problems.push(tag + '：单文件超过 5 MB → ' + path.basename(f));
    const relDepth = path.relative(ROOT, f).split(path.sep).length;
    if (relDepth > 4) problems.push(tag + '：目录超过 3 层 → ' + path.relative(t.dir, f));
    if (TEXT_EXT.test(f)) {
      const txt = fs.readFileSync(f, 'utf8');
      for (const [re, msg] of SECRETS) {
        const hit = txt.match(re);
        if (hit) problems.push(tag + '：' + path.basename(f) + ' 命中「' + msg + '」→ ' + String(hit[0]).slice(0, 40));
      }
    }
  }
  if (total > MAX_ITEM) problems.push(tag + '：条目总大小 ' + (total / 1048576).toFixed(2) + ' MB（上限 20 MB）');

  list.push({ 条目: tag, 分类: m.category || parentCat, 文件数: files.length, 大小KB: Math.round(total / 1024), 预览: m.preview ? m.preview.type : '无' });
}

if (list.length) console.table(list);
console.log('--- 结论 ---');
if (problems.length) {
  console.log('⛔ ' + problems.length + ' 个问题：');
  problems.forEach((p) => console.log('  · ' + p));
} else {
  console.log('✅ 全部通过（' + targets.length + ' 个条目）');
}
if (warnings.length) {
  console.log('⚠ ' + warnings.length + ' 条提醒：');
  warnings.forEach((w) => console.log('  · ' + w));
}
process.exit(problems.length ? 1 : 0);
