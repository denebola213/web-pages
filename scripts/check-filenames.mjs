#!/usr/bin/env node
/**
 * 「ファイル名 = URL」不変条件のチェック。
 * 記事ファイル名が slugify で変化する場合（'_' や大文字を含む等）は exit 1。
 * これがあるおかげで 301 リダイレクトを増やさずに済む。
 */
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { slugifySegment } from '../src/lib/slug.mjs';

const ROOT = new URL('../src/content/pages', import.meta.url);
const problems = [];

async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(p);
      continue;
    }
    if (!e.name.endsWith('.md')) continue;
    const stem = e.name.replace(/\.md$/, '');
    if (stem === 'index') continue;
    const fixed = slugifySegment(stem);
    if (fixed !== stem) {
      problems.push({
        file: relative(ROOT.pathname, p),
        fixed,
        reason: /[^\x00-\x7F]/.test(stem) ? '非ASCII' : '_ または大文字を含む',
      });
    }
  }
}

await walk(ROOT.pathname);

if (problems.length) {
  console.error(`✗ URL と一致しないファイル名が ${problems.length} 件あります:`);
  for (const p of problems) console.error(`  - ${p.file}  (${p.reason}) → ${p.fixed}.md にリネームしてください`);
  process.exit(1);
}
console.log('✓ すべてのファイル名が URL と一致しています');
