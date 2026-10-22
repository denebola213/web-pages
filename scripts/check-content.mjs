#!/usr/bin/env node
/**
 * 記事タイトルの規約を検査する。
 *
 * タイトルの唯一の出所は本文の `# 見出し`。frontmatter の `title` は使わない
 * （二重管理を避け、markdownlint の MD041 とも一致させる）。
 * テンプレートはこの H1 を読んで <title>・パンくず・サイドバー・一覧を組み立て、
 * ビルド時に本文の H1 を落としてから自分の H1 を出す
 * （src/lib/drop-h1.satteri.mjs）。したがって次の 3 つを固定する。
 *
 *  1. frontmatter に title を書かない
 *  2. 本文 H1 がちょうど 1 つ（コードフェンス内の `#` は除外）
 *  3. H1 が空でない
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/content/pages', import.meta.url);

function split(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: '', body: text };
  return { fm: m[1], body: text.slice(m[0].length) };
}

/** コードフェンス内の `#` はコメントなので H1 として数えない */
function headings(body) {
  const out = [];
  let fence = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    if (/^#\s+/.test(line)) out.push(line.replace(/^#\s+/, '').trim());
  }
  return out;
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const problems = [];
for (const f of await walk(ROOT.pathname)) {
  const rel = relative(ROOT.pathname, f);
  // サイトのトップ（src/content/pages/index.md）はテンプレート固定なので対象外
  if (rel === 'index.md') continue;

  const { fm, body } = split(await readFile(f, 'utf8'));
  const hs = headings(body);

  if (/^title:/m.test(fm)) {
    problems.push(`${rel}: frontmatter の title は廃止。本文の \`# 見出し\` に書く`);
  }
  if (hs.length === 0) problems.push(`${rel}: 本文に H1 がない（タイトルの出所）`);
  if (hs.length > 1) problems.push(`${rel}: 本文 H1 が ${hs.length} 個ある（1 つにする）`);
  if (hs.length === 1 && !hs[0]) problems.push(`${rel}: H1 が空`);
}

if (problems.length) {
  console.error(`✗ タイトル規約に違反が ${problems.length} 件あります:`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('✓ タイトルは本文 H1 に一本化されています');
