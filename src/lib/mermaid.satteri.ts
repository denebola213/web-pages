/**
 * ```mermaid ... ``` -> <pre class="mermaid"> へのビルド時変換。
 * Astro 7 既定の Markdown プロセッサ（Sätteri）の mdast プラグイン。
 * 記事側は標準のコードフェンスのままでよく、外部パッケージは不要。
 */
import type { MdastNode } from './mdast.ts';

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default {
  name: 'mermaid-fence',
  code(node: MdastNode): { type: 'html'; value: string } | undefined {
    if (node.lang !== 'mermaid') return;
    return { type: 'html', value: `<pre class="mermaid">${escape(node.value ?? '')}</pre>` };
  },
};
