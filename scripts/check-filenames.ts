#!/usr/bin/env node
/**
 * 「ファイル名 = URL」不変条件のチェック。
 * 記事ファイル名が slugify で変化する場合（'_' や大文字を含む等）は exit 1。
 * これがあるおかげで 301 リダイレクトを増やさずに済む。
 */
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugifySegment } from '../src/lib/slug.ts';

const ROOT = fileURLToPath(new URL('../src/content/pages', import.meta.url));

interface Problem {
  file: string;
  fixed: string;
  reason: string;
}

const problems: Problem[] = [];

async function walk(dir: string): Promise<void> {
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
    const nonAscii = /[^\x00-\x7F]/.test(stem);
    // slugify で変わらない非 ASCII 名（例: 天体.md）も URL が非 ASCII になるため弾く
    if (nonAscii || fixed !== stem) {
      problems.push({
        file: relative(ROOT, p),
        fixed,
        reason: nonAscii ? '非ASCII' : '_ または大文字を含む',
      });
    }
  }
}

await walk(ROOT);

if (problems.length) {
  console.error(`✗ URL と一致しないファイル名が ${problems.length} 件あります:`);
  for (const p of problems)
    console.error(`  - ${p.file}  (${p.reason}) → ${p.fixed}.md にリネームしてください`);
  process.exit(1);
}
console.log('✓ すべてのファイル名が URL と一致しています');
