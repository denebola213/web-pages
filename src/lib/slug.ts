/**
 * パス → URL の規則（唯一の実装）。Astro のビルドと CI スクリプトの両方から import する。
 * Zola の挙動に合わせる: 小文字化し、空白と '_' を '-' に畳む。
 */
export function slugifySegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * タグ名 → タクソノミ URL のスラッグ。
 * Zola は非 ASCII を deunicode していた（"日記" → "ri-ji"）ため、その分だけ明示マップで固定する。
 */
export function tagSlug(name: string, map: Record<string, string> = {}): string {
  return map[name] ?? slugifySegment(name);
}

/** content ファイルの相対パス → ページ id（= URL パス）。 */
export function idFromPath(entry: string): string {
  const parts = entry.replace(/\.mdx?$/, '').split('/');
  const last = parts.pop() ?? '';
  const segments = parts.map(slugifySegment);
  if (last !== 'index') segments.push(slugifySegment(last));
  return segments.filter(Boolean).join('/') || 'index';
}
