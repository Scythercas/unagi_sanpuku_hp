# 環境構築手順書

ゼロから公開までの手順。**上から順に**実施。`{{...}}` は確定値に置換。開発者が実施し、顧客側の操作（★印）は横で案内しながら顧客アカウントで行う。

## 0. 事前準備・前提

- Node.js（LTS）と Git を用意。バージョンは `.nvmrc` に固定する。
- アカウント：開発者の GitHub、顧客の Google アカウント、顧客のドメインレジストラ、顧客の microCMS。
- `docs/CONTENT-CHECKLIST.md` の未確定事項（特にドメイン綴り）を先に確定。

## 1. リポジトリと Astro 雛形

1. 開発者の個人アカウントに **public リポジトリ** `{{REPO_NAME}}`（既定 `sanpuku-unagi`）を作成。
2. Astro プロジェクトを作成し、Tailwind を導入（着手時点の公式手順に従う。バージョン・連携方法は要確認）。
3. `.nvmrc`（Node バージョン）、`.gitignore`（`.env`, `node_modules`, `dist` 等）を用意。
4. `astro.config.mjs` に `site: 'https://{{DOMAIN}}'` を設定。**`base` は設定しない**（apex 運用）。
5. `public/CNAME` に `{{DOMAIN}}` を記載。
6. `docs/` 一式（本ドキュメント群）と `CLAUDE.md` をリポジトリに置く。

## 2. microCMS 作成とスキーマ（★顧客アカウント）

1. ★ご子息の microCMS アカウントでサービスを作成（オーナー＝ご子息）。サービスドメインが `{{MICROCMS_SERVICE_DOMAIN}}.microcms.io` になる。
2. ★開発者を**メンバーに招待**（Hobby はメンバー 3 人まで）。
3. `docs/SCHEMA.md` のとおり **5 つの API**（`shop`/`menu`/`gallery`/`recruit`/`news`）を作成。形式（オブジェクト/リスト）とセレクト選択肢を定義どおりに。
4. 初期コンテンツを最小限投入（`shop` の必須項目、写真数枚）。
5. **GET 専用の API キー**を発行（`MICROCMS_API_KEY` に使用）。

## 3. ローカル開発

1. リポジトリ直下に `.env` を作成：
   ```
   MICROCMS_SERVICE_DOMAIN={{MICROCMS_SERVICE_DOMAIN}}
   MICROCMS_API_KEY=（GET専用キー）
   ```
2. `npm install` → `npm run dev`（内部で画像取得スクリプトが走る）。
3. 画像がローカル取得され、最終 HTML に microCMS URL が出ないことを確認。

## 4. GitHub Actions（ビルド＆デプロイ）

1. `.github/workflows/deploy.yml` を作成。トリガーは `push`（main）/ `workflow_dispatch` / `repository_dispatch`（型名は例 `microcms-update`）。
2. `actions/setup-node`（`.nvmrc` 参照）、依存・画像キャッシュ（`actions/cache`）、`npm ci` → `npm run build`。
3. `actions/upload-pages-artifact` → `actions/deploy-pages` で公開。`permissions: pages: write, id-token: write`。
4. リポジトリ **Settings → Secrets** に `MICROCMS_SERVICE_DOMAIN` と `MICROCMS_API_KEY`（GET 専用）を登録。
5. リポジトリ **Settings → Pages** で Source を GitHub Actions に。

## 5. 独自ドメインと DNS（★顧客レジストラ）

1. ★ドメイン `{{DOMAIN}}` を顧客のレジストラで取得（顧客名義・顧客カード）。**自動更新 ON**。
2. ★DNS レコードを設定：
   - apex（`{{DOMAIN}}`）→ A レコード：`185.199.108.153` / `185.199.109.153` / `185.199.110.153` / `185.199.111.153`
   - `www` → CNAME：`{{GITHUB_USERNAME}}.github.io`
3. GitHub Pages 設定で Custom domain に `{{DOMAIN}}` を入力し、**Enforce HTTPS** をオン（証明書発行は DNS 浸透後に少し待つ）。
4. `public/CNAME` に `{{DOMAIN}}` が入っていることを再確認（デプロイで独自ドメイン設定が消えないため）。
5. apex / www の正規化（片方へリダイレクト）を決めて設定。

## 6. microCMS Webhook（更新→自動再ビルド）

1. GitHub で **fine-grained PAT** を発行。対象は**このリポジトリ 1 つだけ**に限定し、`repository_dispatch` 起動に必要な最小権限のみ付与。開発者名義。
2. ★（または開発者が設定用メンバーとして）microCMS の各 API 設定 → Webhook → **GitHub Actions** を選択し、ユーザー名・リポジトリ名・トークン・トリガーイベント名（deploy.yml と一致）を入力。
3. 通知タイミングは「公開・更新／非公開」時のみに限定。
4. microCMS でコンテンツを更新 → Actions が起動 → 反映されることを確認。

## 7. Google Analytics 4（★顧客 Google アカウント）

1. ★顧客の Google アカウントで GA4 プロパティを作成、測定 ID `{{GA4_MEASUREMENT_ID}}`（`G-XXXXXXX`）を取得。開発者を編集者に招待。
2. head に gtag スニペットを設置。`tel:` クリックの GA イベント（例 `click_tel`）を実装。
3. `/privacy`（プライバシーポリシー）を用意し、GA/Cookie の利用を明記。フットに導線。

## 8. SEO / 集客の土台

1. `sitemap.xml`・`robots.txt` を出力。
2. schema.org（Restaurant/LocalBusiness）JSON-LD、OGP を実装。
3. ★Google ビジネスプロフィールを整備、★Google Search Console にドメイン登録し `sitemap.xml` を送信。
4. ★Instagram プロフィールにサイト URL を追加。

## 9. 公開前チェック（`CLAUDE.md` の Definition of Done も参照）

- [ ] `npm run build` がクリーンに通る。
- [ ] `grep -r microcms dist` で画像 URL が**出てこない**。
- [ ] HTTPS 強制・apex/www リダイレクトが機能。
- [ ] Webhook 更新で自動再ビルドされる。
- [ ] GA4 で計測が入る（tel クリック含む）。
- [ ] 地図・電話リンク・採用/お知らせの表示切替が動く。
- [ ] `docs/OPERATIONS.md` の引き継ぎ書と資格情報マップを作成済み。

## 10. 引き継ぎ資料の作成

`docs/OPERATIONS.md` に沿って「運用引き継ぎ書」を完成させ、顧客（ご子息）に渡す。値（パスワード・トークン）は書かず、**置き場所の地図**として整備する。
