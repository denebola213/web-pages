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

## コンテンツの追加

記事は `src/content/pages/` 配下の Markdown。**ファイルパスがそのまま URL** になる（`docs/linux/pacman.md` → `/docs/linux/pacman/`）。ファイル名に使えるのは小文字・数字・ハイフンだけ（`_`・大文字・非 ASCII は `pnpm check` が弾く）。

### 共通の規約

- タイトルは**本文の `# 見出し`**。frontmatter に `title` は書かない（重複するため CI で禁止）
- H1 はちょうど 1 つ。`<title>`・パンくず・一覧・ツリーはこの H1 から生成される
- `##` / `###` を書くと、H1 の下に**折りたたみ式の目次**が自動で付く（`####` 以下は目次に出ない）
- 画像は `public/image/` に置き、本文から `![代替テキスト](/image/foo.jpg)` で参照する。**alt は必須**で、画像下のキャプションにもなる
- 図は標準のコードフェンスで書く（外部パッケージ不要）:

  ````markdown
  ```mermaid
  graph LR
    A --> B
  ```
  ````

- 下書きは frontmatter に `draft: true`（一覧・ビルドから外れる）
- 書き終えたら `pnpm check`（ファイル名 / タイトル / markdownlint / タグ / リダイレクト / コントラスト）

### 日記を追加する

`src/content/pages/diary/YYYYMMDD.md` を作る。URL は `/diary/YYYYMMDD/` で、年ディレクトリには割らない。

```markdown
---
date: 2026-10-22
---

# 記事のタイトル

本文。
```

- `date` は一覧の並び順と年別見出しに使う（`YYYY-MM-DD`）。ファイル名の日付と揃える
- **タグは書かない**。日記は URL に `/diary/` があるためタグを使わない（`tags:` を書くと CI が落ちる）
- 日付はファイル名と frontmatter の両方が必要（URL と表示で出所が違う）

### ドキュメントを追加する

`src/content/pages/docs/<カテゴリ>/<ページ>.md`。**ディレクトリ名がカテゴリ**（ツリーの階層）になる。

```markdown
---
date: 2026-05-30
tags:
  - "linux"
  - "pacman"
order: 10
---

# 記事のタイトル

本文。
```

- カテゴリの入口は `docs/<カテゴリ>/index.md`（`# カテゴリ名` を書く）。そのカテゴリ配下のツリーが本文の下に自動で並ぶ
- `order` は同じ階層内の並び（小さいほど上）。未指定は 0 扱い、同値はファイル名順
- `tags` を持つのは docs だけ。**日本語タグは `src/data/tag-slugs.json` に `"タグ名": "ascii-slug"` を登録**しないと CI が落ちる（`/tags/天体写真/` のような URL が生えるのを防ぐ）
- タグページ `/tags/<slug>/` は自動生成される

### URL を変える・消すとき

`urls.lock` は**追記のみ**。消さずに `public/_redirects` へ 301 を足す。

```text
/old/path/   /new/path/   301
```

`pnpm check` が次を検出する。

- lock にある URL が「配信もリダイレクトもされていない」
- 転送先が存在しない（404 への 301）
- 転送元が実在ページを隠している
- 2 ホップ以上のリダイレクト連鎖

`_redirects` は `astro dev` では効かない。実 HTTP の確認は `pnpm dlx wrangler dev` で行う。

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
