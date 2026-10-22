/**
 * mdast ノードのうち、このリポジトリのプラグインが触る範囲だけを表す型。
 *
 * satteri（@astrojs/markdown-satteri の実体）は MdastPluginDefinition などの型を
 * 公開しているが、package.json に無い推移的依存なので import すると依存の宣言漏れになる。
 * そのためプラグインの引数はこの構造的部分型で受け、戻り値は mdast の具体ノード
 * （`{ type: 'text' | 'html'; value: string }`）で返す。
 * プラグイン全体の契約は astro.config.ts の mdastPlugins で型検査される。
 * 型は実行時に消えるので、ビルドにも実行にも影響しない。
 */

/** プラグインが受け取るノード。未知の種別も同じ形で扱う */
export interface MdastNode {
  type: string;
  /** text / code / html などの本文 */
  value?: string;
  /** image の参照先 */
  url?: string;
  /** image の代替テキスト（null を返すパーサもある） */
  alt?: string | null;
  /** heading の深さ（1 = H1） */
  depth?: number;
  /** code の言語（フェンスの info string） */
  lang?: string | null;
  children?: MdastNode[];
}
