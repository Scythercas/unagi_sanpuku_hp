# CLAUDE.md

このリポジトリで開発を行う Claude 向けの指示書。実装前に必ず本ファイルと `docs/DESIGN.md`・`docs/SCHEMA.md` を読むこと。人間向けの背景は `docs/` を参照。

---

## プロジェクト概要

群馬県・北高崎のうな重／うな丼店「**さんぷく**」の店舗紹介サイト。
- 目的：店の情報・メニュー・写真・採用情報を落ち着いた雰囲気で見せる。集客の土台。
- **予約・EC・問い合わせフォームは作らない**（将来も予定なし）。連絡は電話と Instagram のみ。
- 店主は PC に不慣れ。日常の文章・写真差し替えは店主のご子息が microCMS 上で行う。
- コード・ビルド・構成変更は開発者（および Claude）が担当。

## 絶対に守る不変条件（違反すると壊れる／課金が発生する）

1. **microCMS の画像 URL を最終 HTML / CSS に残さない。** 画像は必ずビルド前にローカルへ落とし、Astro でローカル最適化して配信する（後述「画像パイプライン」）。microCMS から訪問者へ直接配信すると 20GB/月の転送枠を消費し、超過で **API 停止 → サイト更新不能**になる。
2. **React を導入しない。** 素の Astro + Tailwind のみ。動的なインタラクションが必要でも、まず素の JS / Astro で解決する。
3. **出力は完全な静的サイト**（`output: 'static'`）。SSR・サーバー関数・DB を使わない。
4. **秘密情報をコードにコミットしない。** microCMS の API キー等は環境変数（ローカルは `.env`、本番は GitHub Actions Secrets）。`.env` は `.gitignore` 済みにする。
5. **`site` は本番の独自ドメイン**（`https://{{DOMAIN}}`、既定は `https://sanpuku-unagi.com`）。独自ドメインを apex で使うため **`base` は設定しない**（サブパスにしない）。`public/CNAME` に独自ドメインを記載する。
6. 破壊的・不可逆な操作（デプロイ設定の削除、シークレットの削除等）は勝手に行わず、必要なら人間に確認する。

## 技術スタック

- **Astro**（静的出力）+ **Tailwind CSS**。Astro/Tailwind の導入は着手時点の公式手順に従う（Tailwind のバージョンや連携方法は変わりうるので要確認）。
- 画像最適化：`astro:assets`（内部で sharp）。**ローカル画像**として最適化する。
- コンテンツ：**microCMS**（ヘッドレス CMS、Hobby 無料プラン）。SDK は `microcms-js-sdk`。
- ホスティング（本番）：**GitHub Pages**（public リポジトリ）。デプロイは GitHub Actions（`.github/workflows/deploy.yml`）。
- プレビュー（開発用）：**Cloudflare Pages**。`develop` およびトピックブランチへの push で `.github/workflows/preview.yml` が実URL（`<branch>.sanpuku-unagi-preview.pages.dev`）へ自動デプロイする。本番の GitHub Pages とは完全に独立した、開発者のデザイン確認専用の環境。
- 解析：**Google Analytics 4**（gtag）。
- 地図：Google マップの共有埋め込み iframe（**API キー不要**。Maps JavaScript API は使わない）。

## ディレクトリ構成（目標）

```
/
├─ CLAUDE.md                     # 本ファイル
├─ README.md
├─ .nvmrc                        # Node バージョン固定
├─ .gitignore                    # .env, node_modules 等
├─ package.json
├─ astro.config.mjs
├─ public/
│   ├─ CNAME                     # {{DOMAIN}} を記載
│   ├─ robots.txt
│   ├─ favicon.*
│   ├─ fonts/                    # 自己ホストする筆文字フォント（woff2/ttf、店名表示用）
│   └─ videos/                   # ヒーロー動画（現状は仮動画。本番は店舗提供の調理動画に差し替え予定）
├─ scripts/
│   └─ prebuild-images.mjs       # microCMS 画像をローカルへ取得（下記契約）
├─ src/
│   ├─ assets/images/            # 取得済み画像（Git にコミットする＝バックアップ兼用）
│   ├─ data/image-map.json       # 生成物。record id → ローカル画像パス等の対応表
│   ├─ lib/
│   │   ├─ microcms.ts           # microCMS クライアントと取得ヘルパ
│   │   ├─ images.ts             # image-map.json → astro:assets 用ローカル画像の解決
│   │   ├─ content.ts            # menu/gallery のカテゴリ/種別グルーピング
│   │   └─ config.ts             # GA4 測定 ID 等のハードコード設定
│   ├─ layouts/
│   ├─ components/                # Hero/Menu/Gallery/ShopInfo/Recruit/News/Footer/TabsScript 等
│   └─ pages/
│       ├─ index.astro           # メインの1ページ（セクション構成）
│       └─ privacy.astro         # プライバシーポリシー（GA 利用のため必須）
├─ .github/workflows/
│   ├─ deploy.yml                # 本番（GitHub Pages）。push(main) / workflow_dispatch / microCMS Webhook
│   └─ preview.yml               # 開発用プレビュー（Cloudflare Pages）。push(develop・トピックブランチ)
└─ docs/                          # 設計・手順・引き継ぎ
```

## コマンド（package.json）

- `npm run fetch:images` → `node scripts/prebuild-images.mjs`
- `npm run dev` → `npm run fetch:images && astro dev`
- `npm run build` → `npm run fetch:images && astro build`
- `npm run preview` → `astro preview`

## 環境変数

| 変数 | 用途 | 置き場所 |
|---|---|---|
| `MICROCMS_SERVICE_DOMAIN` | `xxxx.microcms.io` の `xxxx` | `.env`（ローカル）/ Actions Secrets（本番） |
| `MICROCMS_API_KEY` | **GET 専用**の API キー | 同上 |

GA4 の測定 ID（`G-XXXXXXX`）は秘密情報ではないので、環境変数化は任意（ハードコード可）。

## 画像パイプライン（パターンB／実装契約）

`scripts/prebuild-images.mjs` の要件：

1. `MICROCMS_API_KEY` が無い／失効なら**即エラー終了**（壊れたサイトを公開しない）。
2. `gallery` と `menu` の全レコードを取得し、画像フィールドの URL を収集。
3. 各画像を **imgix パラメータ付き URL**で取得してソースを正規化：`?fm=jpg&w=2000&q=88`（原寸が巨大でもビルドが引くのは 2000px 版だけ）。
4. 保存先は `src/assets/images/`。ファイル名は**画像 ID から決定的に生成**（毎回同名。差分・キャッシュを効かせる）。
5. **冪等**：同一画像（`updatedAt` またはURL内ハッシュで判定）が既にあれば再取得しない。
6. `src/data/image-map.json` を出力：`{ recordId: { localPath, alt/caption, ... } }`。Astro 側はこれを参照。
7. 取得失敗（404 等）は**全体を止めず**警告＋スキップ。該当箇所は代替表示 or 非表示に。
8. リトライ＋タイムアウト付き。依存は最小（標準 `fetch` ＋必要なら `sharp`）。
9. 取得画像は **Git にコミットする**（リポジトリをサイトのバックアップにするため。`.gitignore` に入れない）。

Astro 側の最適化：
- `src/assets/images/` のローカル画像を `import.meta.glob('/src/assets/images/*.{jpg,jpeg,png}')` で読み込み、`astro:assets` の `<Image>` / `<Picture>` に渡す。
- 出力は **WebP** 主体、`srcset` は概ね 400/800/1200/1600px、`sizes` は表示レイアウトに合わせる。品質 q≒78–82。
- **全画像に width/height（または aspect-ratio）を出力**して CLS を防ぐ。
- ファーストビュー外は `loading="lazy"`、ヒーロー1枚のみ `loading="eager"` + `fetchpriority="high"`。
- AVIF は初版では入れない（ビルド時間増に対し効果限定的）。必要になれば `<Picture formats={['avif','webp']}>` で追加。

## microCMS 取得（src/lib/microcms.ts）

- `createClient({ serviceDomain, apiKey })` を使う。
- 取得対象と型は `docs/SCHEMA.md` に厳密に定義。エンドポイント：`shop`（オブジェクト）, `menu`（リスト）, `gallery`（リスト）, `recruit`（オブジェクト）, `news`（リスト）。
- 一覧は `order` フィールドで昇順ソートしてから描画（microCMS 既定は作成日時順）。
- `recruit.isOpen === false` のときは採用セクションごと非表示。`news` が空ならお知らせセクション非表示。

## ページ構成（index.astro のセクション）

1. ヒーロー：5秒ほどの調理動画イントロ→筆文字フォント（自己ホスト WOFF2）で店名を大きくリビール。スクロールすればいつでも待たずに下へ進める（動画は CSS アニメーションのみで暗転・リビールし、JS 不使用）。**電話 CTA ボタンはヒーローには置かない**。`prefers-reduced-motion` 時は動画の代わりに静止画＋店名を最初から表示。
2. 一言紹介（`shop.catchcopy`。空なら非表示）
3. メニュー／ギャラリー／店舗情報／採用情報を**セクション単位のタブで切り替え**（`data-tabs` 属性＋`TabsScript.astro` の素の JS。ネストしたタブも `closest('[data-tabs]')` で自グループのみ制御）。存在しない・非公開のタブはそもそも生成しない：
   - メニュー：`menu` をカテゴリでグルーピングし、内部にもカテゴリ別タブを持つ。価格は数値を「1,800円」等に整形。
   - ギャラリー：`gallery` を種別（外観/内装/調理/料理）でグルーピングし、内部にも種別タブを持つ。
   - 店舗情報：住所・営業時間・定休日・駐車場・席数、Google マップ iframe、`tel:` リンク。
   - 採用情報：`recruit.isOpen` が true のときのみタブ自体を表示。
4. お知らせ（`news`。臨時休業等。空なら非表示）
5. フッター（Instagram リンク、コピーライト、プライバシーポリシーへのリンク）

`/privacy` に GA/Cookie に関するプライバシーポリシーを置く。

## 電話 CTA

電話番号は `tel:` リンク（`TelLink.astro`）にする。ヒーローには置かず、**店舗情報タブ内にのみ**表示する。クリックを **GA4 のイベント**（`click_tel`）として計測できるようクリックリスナーで `gtag('event', 'click_tel')` を発火。「サイト経由で電話に繋がった数」が唯一意味のある指標。

## SEO / 集客の土台（初版から入れる）

- `sitemap.xml`・`robots.txt`（Astro 公式インテグレーション等で生成）。
- **構造化データ（schema.org の Restaurant / LocalBusiness）**：店名・住所・電話・営業時間・価格帯・提供メニュー等を JSON-LD で出力。値は `shop` から。
- **OGP / Twitter Card**：代表画像（1200×630、`?w=1200&h=630&fit=crop` でローカル生成）と説明文。og:image は**自ドメインの絶対 URL**。
- `<title>` / meta description は各ページ適切に。日本語・地域名（北高崎・高崎・うなぎ）を意識。

## Definition of Done（実装完了の条件）

- [ ] `npm run build` がクリーンに通り、`dist/` に静的サイトが出る。
- [ ] ビルド後の HTML/CSS に **microCMS の画像 URL が一切含まれない**（`grep microcms dist -r` で確認）。
- [ ] 全画像に width/height があり、CLS が出ない。ヒーロー以外は lazy。
- [ ] `recruit.isOpen=false` / `news` 空 のとき該当セクションが消える。
- [ ] 電話番号が `tel:` リンクで、GA イベントが発火する。
- [ ] Google マップ iframe が表示される（API キー不要の共有埋め込み）。
- [ ] JSON-LD・OGP・sitemap・robots が出力される。
- [ ] `.env` や秘密がコミットされていない。
- [ ] Lighthouse で パフォーマンス／アクセシビリティが良好(写真主体でも LCP を意識)。

## Git 運用

### ブランチ一覧

| ブランチ | 役割 | 分岐元 | マージ先 | 直接コミット |
|---|---|---|---|---|
| `main` | 本番。常にリリース可能な状態 | — | — | 禁止 |
| `develop` | 統合。次リリースの最新 | `main` | `main` | 禁止 |
| `feature/xxx` | 機能追加 | `develop` | `develop` | 可 |
| `fix/xxx` | 不具合修正(緊急でないもの) | `develop` | `develop` | 可 |
| `refactor/xxx` | 挙動を変えない内部改善 | `develop` | `develop` | 可 |
| `docs/xxx` | ドキュメントのみ | `develop` | `develop` | 可 |
| `test/xxx` | テストの追加・修正 | `develop` | `develop` | 可 |
| `env/xxx` | 環境構築・依存更新・設定 | `develop` | `develop` | 可 |
| `chore/xxx` | 雑務(上記に当てはまらない) | `develop` | `develop` | 可 |
| `ci/xxx` | GitHub Actions / ワークフロー | `develop` | `develop` | 可 |
| `hotfix/xxx` | 本番の緊急修正 | `main` | `main` と `develop` の両方 | 可 |

`main` / `develop` への直接コミットは禁止。作業は必ずトピックブランチを切って行う。

### マージ方式

すべてのマージで `--no-ff`(マージコミットを作る)を使う。**Squash merge は禁止。**

理由: 本プロジェクトはマージ後もブランチを残す運用のため、Squash merge を使うと Git 上そのブランチが「未マージ」と判定され、再マージ時に同一変更が重複する。

### コミット・リリースメッセージ

接頭辞は上記のブランチ接頭辞と同一語彙を使う(`feature` / `fix` / `hotfix` / `refactor` / `docs` / `test` / `env` / `chore` / `ci`)。

## 参照

- `docs/DESIGN.md` … 設計判断の全体像と理由
- `docs/SCHEMA.md` … microCMS スキーマの厳密定義
- `docs/SETUP.md` … 環境構築手順
- `docs/OPERATIONS.md` … 運用・引き継ぎ
- `docs/CONTENT-CHECKLIST.md` … 顧客確認・素材の未確定事項
- `docs/CONTENT-DRAFT.md` … microCMS 投入用コンテンツ下書きと入力進捗

## 未確定プレースホルダ（実装時に確定値へ置換）

`{{DOMAIN}}`（既定 sanpuku-unagi.com・**ドメイン未購入のため未確定**。購入までコードは既定値のまま運用）、店舗の駐車場・席数・テイクアウト/出前対応の有無等（`docs/CONTENT-CHECKLIST.md` 参照）。

確定済み: `{{GITHUB_USERNAME}}` = `Scythercas`, `{{REPO_NAME}}` = `unagi_sanpuku_hp`（<https://github.com/Scythercas/unagi_sanpuku_hp>）。`{{MICROCMS_SERVICE_DOMAIN}}` = `unagisanpuku`。`{{GA4_MEASUREMENT_ID}}` = `G-X7TDGRCV1T`（`src/lib/config.ts` にハードコード済み）。
