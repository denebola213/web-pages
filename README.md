# denebola213_pages

https://www.st-albireo.net のソース。Astro による完全静的サイト（クライアント JS は mermaid のページのみ）。

## 構成

| パス | 内容 |
|---|---|
| `/diary/` | 日付順の記事。URL は `/diary/YYYYMMDD/` で年ごとに割らない |
| `/docs/` | 技術ドキュメント。階層ツリーで辿る |
| `/tags/` | タグ別の一覧 |
| `/docs/about/` | 自己紹介 |

## 開発

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # dist/ へ静的出力
npm run check    # URL・タイトル・Markdown・タグ・リダイレクト・コントラストの検査
```

`npm run check` は CI でも同じものを回す。デプロイ前に必ず通すこと。

## コンテンツ

記事は `src/content/pages/{diary,docs}/` に Markdown で置く。

- タイトルは**本文の `# 見出し`**。frontmatter に `title` は書かない
- 画像は `public/image/`、本文からは `/image/foo.jpg` で参照（alt 必須）
- 詳しい規約と落とし穴は [AGENTS.md](AGENTS.md)

## デプロイ

本番は Netlify（`netlify.toml`）。`public/_redirects` は Netlify と Cloudflare Workers の双方が解釈するが、**`astro dev` では効かない**ので 301 の確認は `npx wrangler dev` かプレビュー環境で行う。

Cloudflare Workers へ移す場合の設定（`wrangler.jsonc`、`.github/workflows/deploy.yml`）も同梱してある。併用すると二重デプロイになるため、どちらか一方に決めて他方を外すこと。

## ライセンス

記事本文の著作権は著者に帰属する。`public/vendor/mermaid.min.js` は mermaid（MIT、同ディレクトリの `mermaid.LICENSE.txt`）。
