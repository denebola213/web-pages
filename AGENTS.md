## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Redirects

`public/_redirects` は Cloudflare Workers の静的アセットが解釈する。**`astro dev` では効かない**ので、301 の動作確認は `npx wrangler dev`（`dist/` をアセットとして起動）で行う。

## Content conventions

- **タイトルは本文の `# 見出し` だけ**。frontmatter に `title` は書かない（`scripts/check-content.mjs` が CI で弾く）。`<title>`・パンくず・サイドバー・一覧はすべてこの H1 から生成し、本文の H1 はビルド時に落として（`src/lib/drop-h1.satteri.mjs`）テンプレート側の 1 つに統一する。
- 記事の Markdown は markdownlint に通す（`npm run lint:md`、CI でも実行）。行長・見出し末尾の記号・コード内タブは日本語向けに無効化済み（`.markdownlint-cli2.jsonc`）。
- 画像は `public/image/` に置き、本文では `![代替テキスト](/image/foo.jpg)`。`width`/`height` はビルド後に自動付与される（`src/lib/image-attrs.integration.mjs`）。alt は必須。

## Vendored assets

- `public/vendor/mermaid.min.js` は mermaid 11.17.2 の UMD ビルド（3.5MB / gzip 957KB）。CDN には依存しない。
- 更新手順: `npm pack mermaid@<version>` → 展開した `package/dist/mermaid.min.js` を `public/vendor/` にコピー → `npm run build` で図が描画されることを確認。
- ESM ビルド（`mermaid.esm.min.mjs`）は 103 個のチャンクに分かれるため、自前ホスティングでは UMD を使う。
