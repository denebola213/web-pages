/**
 * 本文先頭の H1 をビルド時に落とす。
 *
 * 記事の Markdown は markdownlint に通る形（= `# 見出し` を持つ）で保ちたいが、
 * テンプレート側でも同じ H1 から <h1> を出すため、そのままだと重複する。
 * ここで本文の H1 を取り除き、見た目上の H1 を 1 つに統一する。
 *
 * 前提: すべての記事は本文に H1 をちょうど 1 つ持つ
 *       （scripts/check-content.ts が CI で検査する）。
 */
import type { MdastNode } from './mdast.ts';

export default {
  name: 'drop-h1',
  heading(node: MdastNode): { type: 'text'; value: string } | undefined {
    if (node.depth !== 1) return;
    return { type: 'text', value: '' };
  },
};
