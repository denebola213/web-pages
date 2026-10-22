#!/usr/bin/env node
/**
 * Zola (Tera) content -> plain Markdown + YAML frontmatter, for Astro.
 *
 * 一度きりの移行ツール（Zola 版は zola-final タグに保存されている）。
 * 書き換えるのはエンジン固有記法だけ:
 *   {{ image_view(path="x", title='t') }}  -> ![t](/x)
 *   {% mermaiddiagram() %} ... {% end %}   -> ```mermaid フェンス
 *   <!-- more -->                          -> そのまま（ただの HTML コメント）
 * frontmatter は Zola 専用キー（template, page_template, sort_by）を落とし、
 * [taxonomies].tags を tags に平坦化する。
 *
 * TOML はこの用途に必要な範囲だけを自前で読む。Node に TOML パーサが無く、
 * 移行済みの一度きりのツールのために依存を増やさないための割り切り。
 * 対応: 基本文字列 / リテラル文字列 / 真偽値 / 整数・浮動小数 /
 *       日付・日時（文字列として保持）/ 配列（複数行可）/ [table] 見出し。
 * テーブルの入れ子（[a.b]）とインラインテーブルは非対応。
 *
 * 使い方: node scripts/zola2md.ts <zola-content-dir> <out-dir>
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

const IMG =
  /\{\{\s*image_view\(\s*path\s*=\s*["']([^"']+)["']\s*(?:,\s*title\s*=\s*['"]([^'"]*)['"])?\s*\)\s*\}\}/g;
const MERMAID = /\{%\s*mermaiddiagram\(\)\s*%\}([\s\S]*?)\{%\s*end\s*%\}/g;

/** YAML に出す frontmatter キー（Zola 専用キーは落とす） */
const KEEP = ['title', 'date', 'updated', 'description', 'thumbnail'] as const;

type TomlTable = Record<string, unknown>;

/** 文字列リテラルの外側にある `#` 以降を落とす */
function stripComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (quote === '"' && c === '\\') {
        i += 1;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '#') return line.slice(0, i);
  }
  return line;
}

/** `[` `]` の対応が取れているか（複数行配列の継続判定に使う） */
function bracketsBalanced(src: string): boolean {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (quote === '"' && c === '\\') i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '[') depth += 1;
    else if (c === ']') depth -= 1;
  }
  return depth <= 0;
}

/** トップレベルのカンマで分割する（クォート・入れ子を考慮） */
function splitTopLevel(src: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (quote === '"' && c === '\\') {
        cur += src[i + 1] ?? '';
        i += 1;
      } else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      cur += c;
      continue;
    }
    if (c === '[' || c === '{') depth += 1;
    if (c === ']' || c === '}') depth -= 1;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** 基本文字列（"..."）のエスケープを戻す */
function unescapeBasic(v: string): string {
  return v
    .slice(1, -1)
    .replace(/\\(["\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');
}

function parseValue(src: string): unknown {
  const v = src.trim();
  if (v.startsWith('"')) return unescapeBasic(v);
  if (v.startsWith("'")) return v.slice(1, -1);
  if (v.startsWith('[')) return splitTopLevel(v.replace(/^\[/, '').replace(/\]$/, '')).map(parseValue);
  if (v === 'true') return true;
  if (v === 'false') return false;
  // 日付・日時は YAML にそのまま出したいので文字列として保持する
  if (/^\d{4}-\d{2}-\d{2}([Tt ].*)?$/.test(v)) return v;
  if (/^[+-]?\d+$/.test(v)) return Number(v);
  if (/^[+-]?(\d+\.\d*|\.\d+)([eE][+-]?\d+)?$/.test(v)) return Number(v);
  return v;
}

/** `[a.b]` 形式のテーブル見出しを辿って、そのテーブルを返す */
function ensureTable(root: TomlTable, path: string[]): TomlTable {
  let table = root;
  for (const key of path) {
    const next = table[key];
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      table = next as TomlTable;
    } else {
      const created: TomlTable = {};
      table[key] = created;
      table = created;
    }
  }
  return table;
}

/** このリポジトリの Zola frontmatter を読むのに足りる範囲の TOML パーサ */
function parseToml(text: string): TomlTable {
  const root: TomlTable = {};
  let table = root;
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = stripComment(lines[i]).trim();
    if (!line) continue;

    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      table = ensureTable(root, header[1].split('.').map((s) => s.trim()));
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_-]+)\s*=\s*([\s\S]*)$/);
    if (!kv) continue;

    let valueSrc = kv[2];
    // 閉じていない配列は次の行に続く
    while (valueSrc.trimStart().startsWith('[') && !bracketsBalanced(valueSrc) && i + 1 < lines.length) {
      i += 1;
      valueSrc += '\n' + stripComment(lines[i]);
    }
    table[kv[1]] = parseValue(valueSrc);
  }
  return root;
}

/** ISO 8601 の日付・日時（Zola の date 型が出す形） */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})?)?$/;

function yamlScalar(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  const s = String(v);
  // 日付・日時は YAML のタイムスタンプとして素で出す（Python 版の isoformat と同じ扱い）
  if (ISO_DATE.test(s)) return s.replace(/[Zz]$/, '+00:00');
  return `"${s.replace(/"/g, '\\"')}"`;
}

function convert(text: string): string {
  if (!text.startsWith('+++')) return text;
  const end = text.indexOf('\n+++', 3);
  if (end === -1) throw new Error('TOML frontmatter の終端 (+++) が見つかりません');
  const fm = parseToml(text.slice(4, end).trim());
  let body = text.slice(end + 4).replace(/^\n+/, '');

  body = body.replace(
    MERMAID,
    (_m, inner: string) => '```mermaid\n' + inner.replace(/^\n+|\n+$/g, '') + '\n```',
  );
  body = body.replace(IMG, (_m, path: string, title?: string) => `![${title ?? ''}](/${path})`);

  const out: string[] = ['---'];
  for (const k of KEEP) {
    if (k in fm) out.push(`${k}: ${yamlScalar(fm[k])}`);
  }
  const taxonomies = fm['taxonomies'];
  const tags =
    taxonomies && typeof taxonomies === 'object' && !Array.isArray(taxonomies)
      ? ((taxonomies as TomlTable)['tags'] as unknown[] | undefined)
      : undefined;
  const terms = Array.isArray(tags) ? tags : [];
  out.push('tags:' + (terms.length ? '' : ' []'));
  for (const t of terms) out.push(`  - ${yamlScalar(t)}`);
  out.push('---');
  return out.join('\n') + '\n\n' + body.replace(/^\n+|\n+$/g, '') + '\n';
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const [src, dst] = process.argv.slice(2);
if (!src || !dst) {
  console.error('usage: node scripts/zola2md.ts <zola-content-dir> <out-dir>');
  process.exit(1);
}

let count = 0;
for (const p of await walk(src)) {
  let rel = relative(src, p);
  // セクション索引 -> コレクション索引
  if (rel.split('/').pop() === '_index.md') rel = rel.replace(/_index\.md$/, 'index.md');
  const tgt = join(dst, rel);
  await mkdir(dirname(tgt), { recursive: true });
  await writeFile(tgt, convert(await readFile(p, 'utf8')), 'utf8');
  count += 1;
}
console.log(`converted ${count} files -> ${dst}`);
