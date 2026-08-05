# 複数デザイン案の並行開発とプレビュー

複数のデザイン案を別ブランチで並行開発し、各案を URL で確認できるようにするための運用手順。
最終的に店主に見比べてもらい、1 案を選んで本番（`main`）にマージする想定。

**この仕組みは開発中のプレビュー専用。本番の GitHub Pages / `deploy.yml` には一切手を入れない。**

---

## 全体像

- 本番配信：これまで通り GitHub Pages（`main` への push、または microCMS Webhook で自動デプロイ）。
- デザイン案のプレビュー配信：**Cloudflare Pages** を追加で連携する。Cloudflare Pages は GitHub リポジトリを連携すると、**push した全ブランチに対して自動でプレビュー用 URL を発行する**機能を標準で持っているため、ブランチ＝デザイン案という運用と相性が良い。
- 独自ドメインの DNS は今まで通り GitHub Pages 向けのまま変更しない。Cloudflare Pages 側は `*.pages.dev` のサブドメインのみを使う（本番ドメインには一切関与しない）。

```
develop
 ├─ feature/design-a  --push--> Cloudflare Pages が自動ビルド --> https://feature-design-a.<project>.pages.dev/
 ├─ feature/design-b  --push--> 同上                         --> https://feature-design-b.<project>.pages.dev/
 └─ feature/design-c  --push--> 同上                         --> https://feature-design-c.<project>.pages.dev/
```

各プレビュー URL 配下で、そのブランチのサイトの全ページ（`/`, `/privacy` 等）がそのまま閲覧できる。

## ブランチ命名

`CLAUDE.md` のブランチ表に「デザイン案」専用の接頭辞はないため、機能追加の一種として `feature/` を使う。

- `feature/design-<案の識別名>`（例：`feature/design-warm`, `feature/design-minimal`）
- 分岐元は `develop`。デザイン確定後は通常の運用どおり `develop` → `main` へ `--no-ff` マージする。他の案のブランチは、比較用に残すか削除するかをその都度判断する。

## Cloudflare Pages の初期セットアップ（人が 1 回だけダッシュボードで行う）

Claude からは Cloudflare のダッシュボード操作（GitHub 連携の OAuth 認可）はできないため、以下は開発者が手動で行うこと。

1. Cloudflare アカウントでログイン → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**。
2. リポジトリ `Scythercas/unagi_sanpuku_hp` を選択。
3. ビルド設定：
   - Framework preset: `Astro`（自動検出されない場合は手動指定）
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
4. **Production branch** は `develop` に設定する（`main` は本番 GitHub Pages 専用として Cloudflare 側からは触らない）。これにより Cloudflare 側の「Production」も実質プレビューの一つとして扱われ、本番ドメインとは無関係になる。
5. 環境変数（**Production・Preview の両方**に設定。値は microCMS の GET 専用キーと同じもの）：
   - `MICROCMS_SERVICE_DOMAIN`
   - `MICROCMS_API_KEY`
   - Node バージョンが `.nvmrc`（`22.x` 系）と揃わない場合は `NODE_VERSION` 環境変数も追加で設定する。
6. 保存すると、以後 `feature/design-*` を含む**どのブランチに push しても自動でビルド＆プレビューデプロイ**される。プレビュー URL は Cloudflare Pages の「Deployments」タブ、または各ブランチの GitHub コミットに付くステータスチェックから確認できる（形式は概ね `https://<ブランチ名を英数と-に正規化したもの>.<プロジェクト名>.pages.dev/`）。

この手順はリポジトリのコード変更を伴わない（Cloudflare 側の設定のみ）ため、`.github/workflows/deploy.yml` や `astro.config.mjs` は変更不要。

## 既知の制約（プレビューでのみ発生・実害なし）

- `astro.config.mjs` の `site` は本番ドメイン（`https://sanpuku-unagi.com`）に固定しているため、プレビュー環境で生成される `sitemap.xml` / OGP / JSON-LD の絶対 URL は本番ドメインを指す。プレビューは見た目の確認が目的であり、検索エンジンにも公開されないため実害はない。修正が必要になった場合のみ、Cloudflare Pages が渡すビルド時環境変数（`CF_PAGES_URL` 等）で `site` を上書きする対応を検討する。
- microCMS の API キーは GET 専用のみを使う（不変条件と同じ）。Cloudflare Pages 側にも Secrets 相当の値としてのみ設定し、リポジトリには一切コミットしない。

## 運用フロー

1. `develop` から `feature/design-x` を作成し、そのブランチ上でデザイン案を作り込む。
2. push するたびに Cloudflare Pages が自動でビルド・プレビューを更新する。
3. 各案のプレビュー URL を店主に共有し、見比べてもらう。
4. 決定したら、その案のブランチを通常のマージ運用（`--no-ff`、Squash 禁止）で `develop` → `main` に反映し、本番の GitHub Pages に反映させる。
5. 採用されなかった案のブランチは、記録として残すか、不要であれば削除する（削除は破壊的操作なので、消す前に開発者側で最終確認する）。
