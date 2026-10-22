/**
 * 画像だけを含む段落 → <figure><img><figcaption>alt</figcaption></figure>
 *
 * ビルド後処理（astro:build:done）だと `astro dev` では走らないため、
 * 表示経路そのものである mdast プラグインとして実装する。
 * これで dev / build のどちらでも同じ HTML になる。
 *
 * 対象は「段落の子が画像 1 つだけ」のケース。文章中の画像やリンク付き画像は
 * そのまま段落として残す。alt が空ならキャプションを付けない。
 */
const escAttr = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default {
  name: 'figure-caption',
  /** @param {import('mdast').Paragraph} node */
  paragraph(node) {
    // 空白だけのテキストノードは無視する
    const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
    if (kids.length !== 1) return;
    const img = kids[0];
    if (img.type !== 'image') return;

    const alt = (img.alt ?? '').trim();
    if (!alt) return;

    const tag = `<img src="${escAttr(img.url)}" alt="${escAttr(alt)}">`;
    return {
      type: 'html',
      value: `<figure>${tag}<figcaption>${escText(alt)}</figcaption></figure>`,
    };
  },
};
