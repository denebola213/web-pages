#!/usr/bin/env node
/**
 * カラートークンのコントラスト検証（DADS / WCAG 2.1）。
 * tokens.css を読み、実際に使う前景×背景のペアが要件を満たすか確認する。
 *   テキスト 4.5:1 以上 / 非テキスト（境界・アイコン）3:1 以上
 * トークンを変えたらこのスクリプトが落ちるので、値の劣化を CI で止められる。
 */
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const raw = new Map([...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

/** var(--x) を再帰解決 */
function resolve(name, depth = 0) {
  if (depth > 10) throw new Error(`var() が循環しています: ${name}`);
  const v = raw.get(name);
  if (v === undefined) throw new Error(`未定義のトークン: --${name}`);
  const m = v.match(/^var\(--([\w-]+)\)$/);
  return m ? resolve(m[1], depth + 1) : v;
}

const hex = (n) => resolve(n);

function luminance(h) {
  const s = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(s.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** [説明, 前景トークン, 背景トークン, 必要比] */
const checks = [
  ['本文テキスト', 'color-text', 'color-bg', 4.5],
  ['補助テキスト', 'color-text-sub', 'color-bg', 4.5],
  ['本文リンク', 'color-link', 'color-bg', 4.5],
  ['訪問済みリンク', 'color-link-visited', 'color-bg', 4.5],
  ['パンくず（非アクティブ）', 'color-text-sub', 'color-bg', 4.5],
  ['主要 UI', 'color-primary', 'color-bg', 4.5],
  ['プライマリー上の白文字', 'color-bg', 'color-primary', 4.5],
  ['操作要素の境界線', 'color-border-strong', 'color-bg', 3.0],
  ['フォーカスリング', 'color-focus', 'color-bg', 3.0],
  ['成功テキスト', 'color-success', 'color-bg', 4.5],
  ['エラーテキスト', 'color-error', 'color-bg', 4.5],
  ['警告テキスト', 'color-warning', 'color-bg', 4.5],
];

let ng = 0;
console.log('| 用途 | 前景 | 背景 | 比 | 必要 | 判定 |');
console.log('|---|---|---|---|---|---|');
for (const [label, fg, bg, need] of checks) {
  const r = ratio(hex(fg), hex(bg));
  const ok = r >= need;
  if (!ok) ng++;
  console.log(
    `| ${label} | ${hex(fg)} | ${hex(bg)} | ${r.toFixed(2)} | ${need} | ${ok ? 'OK' : 'NG'} |`,
  );
}

if (ng) {
  console.error(`\n✗ ${ng} 件がコントラスト要件を満たしていません（WCAG: テキスト4.5 / 非テキスト3.0）`);
  process.exit(1);
}
console.log(`\n✓ ${checks.length} ペアすべてが WCAG のコントラスト要件を満たしています`);
