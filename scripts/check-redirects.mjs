#!/usr/bin/env node
/**
 * URL / リダイレクト整合チェック。
 *  1. urls.lock の全 URL が「配信される」か「301 で実在ページへ送られる」
 *  2. すべての転送先が実在する（404 への 301 を作らない）
 *  3. 転送元が実在ページを隠していない
 *  4. 2 ホップ以上の連鎖がない
 * urls.lock は追記のみ。移動は public/_redirects で吸収する。
 */
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const rd = (p) => readFileSync(new URL(p, root), 'utf8');
const distHas = (u) => existsSync(new URL(u === '/' ? 'dist/index.html' : `dist${u}index.html`, root));

const lock = rd('urls.lock').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const raw = existsSync(new URL('dist/_redirects', root)) ? rd('dist/_redirects') : '';
const rules = raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [from, to, code] = l.split(/\s+/); return { from, to, code: code ?? '302' }; });

/** rule が url に一致すれば実際の転送先を返す（不一致は null） */
function resolve(rule, url) {
  if (rule.from.endsWith('*')) {
    const pre = rule.from.slice(0, -1);
    if (!url.startsWith(pre) || url === pre) return null;
    return rule.to.replace(':splat', url.slice(pre.length));
  }
  return rule.from === url ? rule.to : null;
}

const errors = [];
const permanent = (c) => c === '301' || c === '308';

for (const u of lock) {
  if (distHas(u)) continue;
  const hits = rules.map((r) => [r, resolve(r, u)]).filter(([, d]) => d);
  if (!hits.length) { errors.push(`lock URL が配信もリダイレクトもされない: ${u}`); continue; }
  for (const [r, dest] of hits) {
    if (!permanent(r.code)) errors.push(`恒久移動は 301/308: ${u} (${r.code})`);
    if (!/^https?:/.test(dest) && !distHas(dest)) errors.push(`転送先が存在しない: ${u} -> ${dest}`);
  }
}

for (const r of rules) {
  if (!permanent(r.code)) errors.push(`恒久移動は 301/308: ${r.from} (${r.code})`);
  if (r.from.endsWith('*')) continue;
  if (distHas(r.from)) errors.push(`転送元が実在ページを隠している: ${r.from}`);
  if (!r.to.includes(':splat') && !/^https?:/.test(r.to) && !distHas(r.to))
    errors.push(`転送先が存在しない: ${r.from} -> ${r.to}`);
}

for (const r of rules) {
  if (r.to.includes(':splat')) continue;
  if (rules.some((o) => o !== r && resolve(o, r.to))) errors.push(`リダイレクト連鎖: ${r.from} -> ${r.to} -> …`);
}

if (errors.length) {
  console.error(`✗ ${errors.length} 件`);
  for (const e of [...new Set(errors)]) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ lock ${lock.length} URL / redirect ${rules.length} 条 すべて整合`);
