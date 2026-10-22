#!/usr/bin/env node
/**
 * 日本語（非 ASCII）タグの扱いを CI で固定する。
 * 非 ASCII タグは URL スラッグを src/data/tag-slugs.json に明示しないと失敗する。
 * （放置すると /tags/天体写真/ のような非 ASCII URL が黙って生えるのを防ぐ）
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { slugifySegment } from '../src/lib/slug.mjs';

const ROOT = new URL('../src/content/pages', import.meta.url);
const map = JSON.parse(await readFile(new URL('../src/data/tag-slugs.json', import.meta.url), 'utf8'));

/** frontmatter の tags: ブロックだけを素朴に読む（このリポジトリの書式に限定） */
function tagsOf(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return [];
  const lines = m[1].split('\n');
  const i = lines.findIndex((l) => /^tags:/.test(l));
  if (i === -1) return [];
  const inline = lines[i].replace(/^tags:\s*/, '').trim();
  if (inline.startsWith('[')) {
    return inline.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  const out = [];
  for (const line of lines.slice(i + 1)) {
    const t = line.match(/^\s+-\s*(.+)$/);
    if (!t) break;
    out.push(t[1].trim().replace(/^["']|["']$/g, ''));
  }
  return out;
}

async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (e.name.endsWith('.md')) files.push(p);
  }
  return files;
}

const files = await walk(ROOT.pathname);
const terms = new Map();
for (const f of files) {
  for (const t of tagsOf(await readFile(f, 'utf8'))) {
    if (!terms.has(t)) terms.set(t, []);
    terms.get(t).push(relative(ROOT.pathname, f));
  }
}

const problems = [];
const nonAscii = [...terms.keys()].filter((t) => /[^\x00-\x7F]/.test(t));

// 異なるタグ名が同じスラッグに落ちると、同じ URL のタグページが 2 つできる。
// （例: "tech_other" と "tech-other" → どちらも /tags/tech-other/）
const bySlug = new Map();
for (const t of terms.keys()) {
  const slug = map[t] ?? slugifySegment(t);
  if (!bySlug.has(slug)) bySlug.set(slug, []);
  bySlug.get(slug).push(t);
}
for (const [slug, names] of bySlug) {
  if (names.length > 1) {
    problems.push({
      tag: names.join(' / '),
      why: `スラッグ衝突: すべて /tags/${slug}/ になる`,
      files: names.flatMap((n) => terms.get(n)),
    });
  }
}
for (const t of nonAscii) {
  const slug = map[t];
  if (!slug) {
    problems.push({ tag: t, why: 'スラッグ未定義', files: terms.get(t) });
  } else if (slug !== slugifySegment(slug)) {
    problems.push({ tag: t, why: `スラッグ "${slug}" が URL 安全でない`, files: terms.get(t) });
  }
}

if (problems.length) {
  console.error(`✗ 日本語タグのスラッグ設定に問題が ${problems.length} 件あります:`);
  for (const p of problems) {
    console.error(`  - "${p.tag}" (${p.why}) ← ${p.files.join(', ')}`);
  }
  console.error('\nsrc/data/tag-slugs.json に次の 1 行を追加してください（既存 URL を変えないこと）:');
  for (const p of problems) console.error(`  "${p.tag}": "<ascii-slug>"`);
  process.exit(1);
}

console.log(`✓ タグ ${terms.size} 件（うち日本語 ${nonAscii.length} 件）すべて URL スラッグ確定済み`);
