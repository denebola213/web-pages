/**
 * 記事タイトルの唯一の取得口。
 *
 * タイトルは frontmatter ではなく本文の `# 見出し` に置く（markdownlint の
 * MD041 とも一致し、二重管理を避けられる）。ここでは次の 2 点だけ面倒を見る。
 *  - コードフェンス内の `#` を行頭見出しと誤認しない
 *  - 見出し内のインライン記法（リンク・コード・強調）を素のテキストに落とす
 */

const stripInline = (s: string): string =>
  s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|\*|_/g, '')
    .trim();

/** 本文の最初の H1 を返す（コードフェンス内は無視）。無ければ null。 */
export function firstH1(body: string = ''): string | null {
  let fence: string | null = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    if (/^#\s+/.test(line)) return stripInline(line.replace(/^#\s+/, ''));
  }
  return null;
}

/** タイトルを決めるのに必要な最小のエントリ（Astro のコレクション entry を受ける） */
export interface TitledEntry {
  id: string;
  body?: string;
}

/**
 * コレクションのエントリからタイトルを決める。
 * 本文に H1 が無い場合は id の末尾（= URL の slug）にフォールバックする。
 */
export function titleOf(entry: TitledEntry): string {
  return firstH1(entry.body ?? '') ?? entry.id.split('/').pop() ?? entry.id;
}
