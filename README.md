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

`pnpm check` は GitHub Actions（`ci.yml`）でも同じものを回す。`pull_request` で走るので、マージ前に必ず緑にする（ブランチ保護で `ci / check` を必須にしておくと確実）。

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
- タグは使える（`tags:` に列挙）。ただし **`日記` タグは禁止**（URL に `/diary/` があるため冗長。書くと CI が落ちる）
- 日付はファイル名と frontmatter の両方が必要（URL と表示で出所が違う）

### ドキュメントを追加する

`src/content/pages/docs/<カテゴリ>/<ページ>.md`。**ディレクトリ名がカテゴリ**（ツリーの階層）になる。

```markdown
---
date: 2026-05-30
updated: 2026-10-22
tags:
  - "linux"
  - "pacman"
order: 10
---

# 記事のタイトル

本文。
```

- カテゴリの入口は `docs/<カテゴリ>/index.md`（`# カテゴリ名` を書く）。そのカテゴリ配下のツリーが本文の下に自動で並ぶ
- `updated: YYYY-MM-DD` を書くと、公開日の隣に `更新: 2026-10-22` として表示される（`date` と同じ日なら出ない。`date` より前の日付は CI が弾く）
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

Cloudflare Workers（静的アセット）へ **Workers Builds**（Git 連携）でデプロイする。GitHub Actions は使わない（`.github/workflows/` に残っているのは Mastodon 投稿のみ）。

Workers & Pages → `st-albireo` → Settings → Builds で次を設定する。

| 項目 | 値 |
|---|---|
| Git branch | `master` |
| Build command | `pnpm install --frozen-lockfile && pnpm build && pnpm check` |
| Deploy command | `pnpm dlx wrangler@4.151.3 deploy` |
| Preview command | `pnpm dlx wrangler@4.151.3 preview` |
| Root directory | （空欄） |
| Build variables | `PNPM_VERSION=12.14.0` |

- **API トークンは不要**。Cloudflare がビルド用トークンを自動生成する（GitHub Secrets の `CLOUDFLARE_API_TOKEN` は使わない）
- ビルドイメージの pnpm は既定 10.11.1。このリポジトリは `engines.pnpm: ">=12"` 前提なので `PNPM_VERSION` で 12.14.0 に固定する
- Node はビルドイメージ既定の 24 系（`engines.node: ">=22.22.0"` を満たす）
- wrangler は devDependency に入れていない。`workerd` を含むとローカルの `node_modules` が数百 MB 増えるため、**deploy コマンド側でバージョンを固定**している。更新時はここを書き換える
- 検査（`pnpm check`）がビルドコマンドに含まれるので、落ちればデプロイされない
- **プレビューを使う**: Settings → Build → Branch control で **Enable Preview Builds** を有効にする。`master` 以外のブランチ（例: `astro-rewrite`）へ push するとビルド後にプレビュー URL が発行され、PR にコメントが付く（GitHub 連携の権限が必要）
- プレビューは `WORKERS_CI_BRANCH` が `master` 以外のとき `<meta name="robots" content="noindex, nofollow">` を出力し、`canonical` は本番 URL（`https://www.st-albireo.net/...`）を指す。検索結果に重複して載らないようにするため
- プレビューが不要なら **Enable Preview Builds** を外す（その場合 Preview command は使われない）
- Worker 名・アセット設定は `wrangler.jsonc`（`name: st-albireo`、`assets.directory: ./dist`、`html_handling: auto-trailing-slash`、`not_found_handling: 404-page`）

`public/_redirects` は Cloudflare の静的アセットが解釈する。**`astro dev` では効かない**ので、301 の確認は `pnpm dlx wrangler dev` で行う。

## Mastodon への投稿

`master` に**記事を追加**すると、`.github/workflows/mastodon.yml` が `scripts/post-mastodon.mjs` を実行し、記事名と URL を 1 記事 1 投稿で流す。

- 対象は `src/content/pages/{docs,diary}/**.md` のうち、その push で**追加**されたもの（`git diff --diff-filter=A`）。修正・リネームでは投稿しない
- `index.md`（セクション索引）と `draft: true` は除外
- タイトルと URL はサイト本体と同じ `src/lib/title.mjs` / `src/lib/slug.mjs` から取る
- 記事 URL が 200 を返すまで最大 5 分待ってから投稿する（deploy 完了待ち。`LIVE_TIMEOUT_MS` で変更、`SKIP_LIVE_CHECK=1` で無効化）
- 同じコミットの再実行は `Idempotency-Key` で重複投稿にならない（Mastodon 側のキャッシュが切れた後の再実行は重複し得る）
- ローカル確認は投稿せず本文だけ出す:

  ```sh
  DRY_RUN=1 BEFORE_SHA=HEAD^ GITHUB_SHA=HEAD pnpm run post:mastodon
  ```

必要なシークレットは `MASTODON_TOKEN`（`write:statuses` 権限）。投稿先は既定 `mstdn.nostalgia-tns.net`（`MASTODON_INSTANCE` で変更可）。

## ライセンス

- **コード**（`src/**` のうちコンテンツ以外、`scripts/**`、設定ファイル）: [MIT](LICENSE)
- **記事本文・著者撮影の画像**（`src/content/pages/**`、`public/image/**`）: [CC BY-SA 4.0](LICENSE-CONTENT)
- 第三者の著作物（イベントのフライヤー等）は対象外。記事中のコードスニペットは CC0

引用・逐語複製は出典表示のみで認められます（翻訳・改変には CC BY-SA 4.0 が適用されます）。

`public/vendor/mermaid.min.js` は mermaid（MIT、同ディレクトリの `mermaid.LICENSE.txt`）。
