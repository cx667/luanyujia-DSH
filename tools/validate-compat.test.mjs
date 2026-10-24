// validate-compat.mjs 的单测：node --test tools/validate-compat.test.mjs
// 覆盖手写 semver 最容易错的几个边界：两段版本、prerelease 规则、^/~ 上界、非法区间。
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVersion, compare, satisfies, main } from './validate-compat.mjs';

test('parseVersion 接受两段写法（~1.2 曾经直接抛错）', () => {
  assert.deepEqual(parseVersion('1.2'), { major: 1, minor: 2, patch: 0, pre: '' });
  assert.deepEqual(parseVersion('v0.2.1-rc.2'), { major: 0, minor: 2, patch: 1, pre: 'rc.2' });
  assert.equal(parseVersion('abc'), null);
});

test('compare 正确处理 prerelease 顺序', () => {
  assert.equal(compare('0.2.1-rc.2', '0.2.1'), -1);
  assert.equal(compare('0.2.1-rc.2', '0.2.1-rc.1'), 1);
  assert.equal(compare('0.2.1', '0.2.1'), 0);
});

test('区间点名校验：0.2.1-rc.2 落在 >=0.2.1-rc.2 <0.2.2 里', () => {
  assert.equal(satisfies('0.2.1-rc.2', '>=0.2.1-rc.2 <0.2.2'), true);
});

test('npm 规则：区间里没写 prerelease 就不匹配 prerelease 版本', () => {
  // 修掉的坑：以前 >=0.2.0 会把 0.3.0-rc.1 判成可用
  assert.equal(satisfies('0.3.0-rc.1', '>=0.2.0'), false);
  assert.equal(satisfies('0.2.1-rc.2', '>=0.2.0'), false);
  // 正式版不受影响
  assert.equal(satisfies('0.2.1', '>=0.2.0'), true);
});

test('^ 与 ~ 的上界', () => {
  assert.equal(satisfies('0.2.9', '^0.2.1'), true);
  assert.equal(satisfies('0.3.0', '^0.2.1'), false);
  assert.equal(satisfies('0.2.5', '~0.2.1'), true);
  assert.equal(satisfies('0.3.0', '~0.2.1'), false);
  assert.equal(satisfies('0.2.1-rc.2', '~1.2'), false); // 能解析，只是不匹配
});

test('通配与 OR', () => {
  assert.equal(satisfies('9.9.9', '*'), true);
  assert.equal(satisfies('0.1.5', '>=0.2.1-rc.2 || >=0.1.0-rc.1'), true);
});

test('非法区间要抛错（供 checkManifest 收集成 problems）', () => {
  assert.throws(() => satisfies('0.2.1-rc.2', '>=0.2.1-rc.2 <'), /版本号不合法/);
  assert.throws(() => satisfies('0.2.1-rc.2', '>=0.2.x'), /版本号不合法/);
});

test('main() 直接跑不退出进程，正常仓库返回 0', () => {
  const code = main(['node', 'tools/validate-compat.mjs', '0.2.1-rc.2']);
  assert.equal(code, 0);
});
