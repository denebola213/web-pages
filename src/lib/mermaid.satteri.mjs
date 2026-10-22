/**
 * ```mermaid ... ``` -> <pre class="mermaid"> へのビルド時変換。
 * Astro 7 既定の Markdown プロセッサ（Sätteri）の mdast プラグイン。
 * 記事側は標準のコードフェンスのままでよく、外部パッケージは不要。
 */
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default {
  name: 'mermaid-fence',
  /** @param {import('mdast').Code} node @param {any} ctx */
  code(node) {
    if (node.lang !== 'mermaid') return;
    return { type: 'html', value: `<pre class="mermaid">${escape(node.value)}</pre>` };
  },
};
