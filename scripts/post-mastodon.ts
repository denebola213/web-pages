#!/usr/bin/env node
/**
 * 記事が追加されたときに Mastodon へ「記事名 + URL」を投稿する。
 *
 * 旧 tweet_update.yml（Deno + コミットメッセージ `post <タイトル>` 判定）の置き換え。
 * 判定材料をコミットメッセージから git の差分に変えたので、記事を追加して push すれば
 * メッセージの書き方に関係なく 1 記事 1 投稿になる。
 *
 * - 対象: この push で「追加」された src/content/pages/{docs,diary}/**.md
 * - 除外: セクション索引の index.md、frontmatter が `draft: true` のもの
 * - タイトルと URL は src/lib/title.ts / src/lib/slug.ts から取る
 *   （サイト本体と同じ実装。ここで独自に組み立てない）
 * - 記事 URL が実際に 200 を返すまで待ってから投稿する（deploy 完了待ち）
 *
 * 環境変数:
 *   MASTODON_TOKEN      必須（DRY_RUN=1 のときだけ省略可）
 *   MASTODON_INSTANCE   既定 https://mstdn.nostalgia-tns.net
 *   SITE_URL            既定 https://www.st-albireo.net
 *   BEFORE_SHA          比較元。Actions では github.event.before
 *   GITHUB_SHA          既定は git rev-parse HEAD
 *   DRY_RUN=1           投稿せず本文を表示
 *   SKIP_LIVE_CHECK=1   URL の実在確認をしない
 *   LIVE_TIMEOUT_MS     実在確認の待ち時間（既定 300000 = 5 分）
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { idFromPath } from '../src/lib/slug.ts';
import { titleOf } from '../src/lib/title.ts';

/** 投稿対象の記事 */
interface Article {
  /** リポジトリからの相対パス（例: src/content/pages/diary/20201104.md） */
  path: string;
  /** ページ id（= URL パス） */
  id: string;
  /** 本文 H1 から取ったタイトル */
  title: string;
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT_PREFIX = 'src/content/pages/';
const SITE = (process.env.SITE_URL ?? 'https://www.st-albireo.net').replace(/\/+$/, '');
const INSTANCE = (process.env.MASTODON_INSTANCE ?? 'https://mstdn.nostalgia-tns.net').replace(/\/+$/, '');
const TOKEN = process.env.MASTODON_TOKEN ?? '';
const DRY_RUN = process.env.DRY_RUN === '1';
const SKIP_LIVE_CHECK = process.env.SKIP_LIVE_CHECK === '1';
const LIVE_TIMEOUT_MS = Number(process.env.LIVE_TIMEOUT_MS ?? 300_000);

// Mastodon の既定上限は 500 文字。URL は 23 文字換算なので、タイトルは余裕を見て切る。
const MAX_TITLE = 200;

function git(args: readonly string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function resolveRange(): { sha: string; base: string } {
  const sha = process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']).trim();
  let base = process.env.BEFORE_SHA || '';

  if (!base || /^0+$/.test(base)) {
    // workflow_dispatch や新規ブランチでは比較元が無い。直前のコミットで代替する。
    try {
      base = git(['rev-parse', `${sha}^`]).trim();
    } catch {
      console.log('比較対象のコミットが無いため、投稿せずに終了します。');
      process.exit(0);
    }
    console.log(`BEFORE_SHA が無いため ${base} との差分で判定します`);
  }

  try {
    git(['cat-file', '-e', `${base}^{commit}`]);
  } catch {
    // force push などで比較元が履歴に無い
    console.log(`${base} が履歴に無いため、直前のコミットとの差分で判定します`);
    base = git(['rev-parse', `${sha}^`]).trim();
  }

  return { sha, base };
}

/** この push で追加されたファイル（A）だけを返す */
function addedFiles(base: string, sha: string): string[] {
  const out = git(['diff', '--name-status', '--diff-filter=A', `${base}..${sha}`]);
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
    .filter(([status]) => status === 'A')
    .map(([, path]) => path);
}

function frontmatter(text: string): string {
  return text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
}

function collectArticles(base: string, sha: string): Article[] {
  const files = addedFiles(base, sha);

  if (files.length === 0) {
    console.log('追加されたファイルはありません。');
  }

  const articles: Article[] = [];
  for (const path of files) {
    if (!path.startsWith(CONTENT_PREFIX) || !path.endsWith('.md')) {
      console.log(`- 対象外（コンテンツ外）: ${path}`);
      continue;
    }
    const rel = path.slice(CONTENT_PREFIX.length); // docs/linux/foo.md
    if (!/^(docs|diary)\//.test(rel)) {
      console.log(`- 対象外（docs/diary 以外）: ${path}`);
      continue;
    }
    if (/\/index\.md$/.test(rel)) {
      console.log(`- 対象外（セクション索引）: ${path}`);
      continue;
    }

    const body = readFileSync(join(ROOT, path), 'utf8');
    if (/^draft:\s*true\s*$/m.test(frontmatter(body))) {
      console.log(`- 対象外（下書き）: ${path}`);
      continue;
    }

    const id = idFromPath(rel);
    articles.push({ path, id, title: titleOf({ id, body }).trim() });
  }
  return articles;
}

function statusText({ title, id }: Pick<Article, 'title' | 'id'>): string {
  const text = title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1)}…` : title;
  return `新しい記事を公開しました。\n# ${text}\n\n${SITE}/${id}/`;
}

async function waitUntilLive(url: string): Promise<boolean> {
  if (SKIP_LIVE_CHECK || DRY_RUN) return true;

  const deadline = Date.now() + LIVE_TIMEOUT_MS;
  for (;;) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return true;
      console.log(`  ${url} はまだ ${res.status}。deploy の完了を待ちます`);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.log(`  ${url} の確認に失敗（${reason}）。再試行します`);
    }
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, 10_000));
  }
}

async function postStatus(text: string, idempotencyKey: string): Promise<unknown> {
  const res = await fetch(`${INSTANCE}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      // 同じキーの再実行は Mastodon 側で重複投稿にならない
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ status: text, visibility: 'public' }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`投稿に失敗 (${res.status} ${res.statusText}): ${body.slice(0, 400)}`);
  }
  return res.json();
}

function summarize(lines: string[]): void {
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  }
}

if (!TOKEN && !DRY_RUN) {
  fail('MASTODON_TOKEN が未設定です（リポジトリシークレットを確認してください）');
}

const { sha, base } = resolveRange();
console.log(`差分: ${base}..${sha}`);
const articles = collectArticles(base, sha);

if (articles.length === 0) {
  summarize(['投稿対象の記事はありませんでした。']);
  process.exit(0);
}

const results: string[] = [];
for (const article of articles) {
  const url = `${SITE}/${article.id}/`;
  const text = statusText(article);

  if (!(await waitUntilLive(url))) {
    fail(`${url} が ${LIVE_TIMEOUT_MS / 1000} 秒以内に公開されませんでした。投稿しません（deploy を確認して再実行してください）`);
  }

  if (DRY_RUN) {
    console.log(`--- DRY_RUN: ${article.path} ---\n${text}\n---`);
    results.push(`- ${text.split('\n')[1]} → ${url}（DRY_RUN）`);
    continue;
  }

  try {
    await postStatus(text, `${sha}:${article.id}`);
  } catch (e) {
    fail(`${article.path}: ${e instanceof Error ? e.message : String(e)}`);
  }
  console.log(`✓ 投稿しました: ${article.title} ${url}`);
  results.push(`- ${text.split('\n')[1]} → ${url}`);
}

summarize(['', `Mastodon へ投稿: ${results.length} 件`, '', ...results]);
