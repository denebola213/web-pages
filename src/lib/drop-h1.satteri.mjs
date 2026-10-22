/**
 * 本文先頭の H1 をビルド時に落とす。
 *
 * 記事の Markdown は markdownlint に通る形（= `# 見出し` を持つ）で保ちたいが、
 * テンプレート側でも frontmatter title から H1 を出すため、そのままだと重複する。
 * ここで本文の H1 を取り除き、見た目上の H1 を 1 つに統一する。
 *
 * 前提: すべての記事が frontmatter に title を持つこと。
 *       scripts/check-content.mjs が「title の欠落」と「本文 H1 との不一致」を検査する。
 */
export default {
  name: 'drop-h1',
  /** @param {import('mdast').Heading} node */
  heading(node) {
    if (node.depth !== 1) return;
    return { type: 'text', value: '' };
  },
};
