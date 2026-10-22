# denebola213_pages

https://www.st-albireo.net のソース。Astro による完全静的サイト（クライアント JS は mermaid のページのみ）。

## 構成

| パス | 内容 |
|---|---|
| `/diary/` | 日付順の記事。URL は `/diary/YYYYMMDD/` で年ごとに割らない |
| `/docs/` | 技術ドキュメント。階層ツリーで辿る |
| `/tags/` | タグ別の一覧 |

## 開発

```sh
pnpm install
pnpm dev      # http://localhost:4321
pnpm build    # dist/ へ静的出力
pnpm check    # URL・タイトル・Markdown・タグ・リダイレクト・コントラストの検査
```

`pnpm check` は CI でも同じものを回す。デプロイ前に必ず通すこと。

パッケージマネージャは **pnpm**（`package.json` の `packageManager` でバージョン固定）。`package-lock.json` は持たない。

依存の導入には供給網ポリシーが掛かる（`pnpm-workspace.yaml` の `minimumReleaseAge: 60`）。公開から 60 分未満のバージョンは入らないので、依存を上げた直後に CI が落ちる場合は時間を置くか、値を調整する。

## コンテンツ

記事は `src/content/pages/{diary,docs}/` に Markdown で置く。

- タイトルは**本文の `# 見出し`**。frontmatter に `title` は書かない
- 画像は `public/image/`、本文からは `/image/foo.jpg` で参照（alt 必須）
- 詳しい規約と落とし穴は [AGENTS.md](AGENTS.md)

## デプロイ

Cloudflare Workers（静的アセット）へ GitHub Actions でデプロイする。`master` への push で `pnpm install --frozen-lockfile` → `pnpm build` → 検査 → `wrangler deploy` が走る。

必要なリポジトリシークレット: `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。

`public/_redirects` は Cloudflare の静的アセットが解釈する。**`astro dev` では効かない**ので、301 の確認は `pnpm dlx wrangler dev` で行う。

## ライセンス

- **コード**（`src/**` のうちコンテンツ以外、`scripts/**`、設定ファイル）: [MIT](LICENSE)
- **記事本文・著者撮影の画像**（`src/content/pages/**`、`public/image/**`）: [CC BY-SA 4.0](LICENSE-CONTENT)
- 第三者の著作物（イベントのフライヤー等）は対象外。記事中のコードスニペットは CC0

引用・逐語複製は出典表示のみで認められます（翻訳・改変には CC BY-SA 4.0 が適用されます）。

`public/vendor/mermaid.min.js` は mermaid（MIT、同ディレクトリの `mermaid.LICENSE.txt`）。
