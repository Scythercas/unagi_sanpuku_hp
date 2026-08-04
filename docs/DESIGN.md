# 設計書 — さんぷく 店舗紹介サイト

最終更新：着手時に日付を記入 / 対象：開発者・Claude・引き継ぎ担当

## 1. 概要と目的

群馬県・北高崎のうな重／うな丼店「さんぷく」の店舗紹介サイト。落ち着いた雰囲気で、店の情報・メニュー・写真・採用を見せる。集客の土台（検索・地図・SNS からの流入受け皿）を作ることが目的。

- Instagram：`{{INSTAGRAM_URL}}`（既定 https://www.instagram.com/sanpuku_unagi ）

## 2. 前提と制約

- 店主は PC に不慣れ。**店側での高度な運用は不可**。日常更新（文章・写真差し替え）は店主のご子息が担当。
- コード・ビルド・構成変更・トラブル対応は開発者が担当。
- **予約・EC・問い合わせフォームは作らない（将来も予定なし）。** 連絡は電話と Instagram のみ。
- **極力ランニングコストを発生させない。** 実費はドメイン代のみを許容。
- 店側の作業を増やさない設計を最優先する。

## 3. アーキテクチャ

```
[ご子息] --編集--> [microCMS(顧客所有/無料)]
                        |
                        | (1) Webhookで更新通知（fine-grained PAT）
                        v
                 [GitHub Actions] --(2) 画像をローカル取得(imgix正規化)＋Astroビルド-->
                        |
                        | (3) 静的ファイルをデプロイ
                        v
                 [GitHub Pages(public)] <--HTTPS-- [独自ドメイン(顧客所有/レジストラDNS)]
                        ^
                        | (4) 訪問者は画像もGitHub Pagesから受信（microCMSは実行時ノータッチ）
                   [訪問者ブラウザ] --GA4--> [Google Analytics(顧客所有)]
```

要点：**実行時に microCMS へアクセスさせない**。画像もテキストもビルド時に取り込み、静的化して GitHub Pages から配信する。

## 4. 技術スタックと選定理由（要約）

| 領域 | 採用 | 理由 |
|---|---|---|
| フレームワーク | Astro（静的出力）+ Tailwind | 写真主体の静的サイトに最適。JS 最小。保守が軽い。**React は不採用**（この規模で不要、依存増は保守負担）。 |
| CMS | microCMS Hobby（無料） | 国産・管理画面が平易でご子息が扱える。無料枠で足りる。ヘッドレスなのでロックインが弱い。 |
| ホスティング | GitHub Pages（public） | 無料。独自ドメイン＋自動 HTTPS。DNS を顧客レジストラに置いたまま繋がる（apex は A レコード、www は CNAME）。 |
| CI/CD | GitHub Actions | microCMS の GitHub Actions Webhook 連携が標準対応。push / 手動 / CMS更新 で起動。 |
| 解析 | Google Analytics 4（無料） | 顧客希望。gtag を head に設置。 |
| 地図 | Google マップ共有 iframe | **API キー・課金アカウント不要**。Maps JS API は使わない（2025 の料金改定で誤用時に課金リスクがあるため）。 |

## 5. 所有・管理の分離（案2を採用）

| 資産 | 所有アカウント | 管理・作業 |
|---|---|---|
| 独自ドメイン | **顧客**（レジストラ契約） | 更新監視は開発者が代行 |
| DNS | 顧客レジストラに設置（委任なし） | 開発者が設定 |
| microCMS（編集アカウント） | **顧客**（ご子息がオーナー） | ご子息が編集／開発者は設定用メンバー |
| GA4 プロパティ | **顧客**（Google アカウント） | 開発者は編集者 |
| Google ビジネスプロフィール | **顧客** | 開発者が整備支援 |
| リポジトリ・ビルド | **開発者の個人アカウント** | 開発者。ご子息を Collaborator に追加。**将来 Transfer ownership で顧客/顧客Orgへ移管**する前提を書面合意 |

案2の弱点（リポジトリが開発者依存）は、①ご子息を Collaborator に追加、②リポジトリを public にしフォーク/クローンで複製可能に、③運用引き継ぎ書とトークン設計、④第二連絡先、で緩和する（`docs/OPERATIONS.md`）。

## 6. コンテンツ設計（5 API）

microCMS の Hobby は **API 5 個まで**。以下ちょうど 5 個で確定（詳細は `docs/SCHEMA.md`）。

1. `shop`（オブジェクト）… 店名・営業時間・定休日・住所・電話・駐車場・席数・テイクアウト/出前・Instagram 等の単一情報
2. `menu`（リスト）… うな重/うな丼の松竹梅、宴会・コース、一品、テイクアウト、ドリンク
3. `gallery`（リスト）… 外観・内装・調理・料理の写真
4. `recruit`（オブジェクト）… バイト募集（`isOpen` で表示切替）
5. `news`（リスト）… 臨時休業・繁忙期営業案内・イベント等

**この 5 個で拡張余地はゼロ。** 将来クーポン等を足すなら、`recruit` を `shop` のフィールドに畳んで 1 枠空ける等の判断が必要。

## 7. 画像パイプライン（パターンB：プリビルド）

**背景：microCMS の 20GB/月「データ転送量」は画像配信も対象**で、超過すると API 停止（＝更新不能）。したがって訪問者へは microCMS から配信しない。

- ビルド前に `scripts/prebuild-images.mjs` が `gallery`・`menu` の画像を **imgix パラメータで正規化**（`?fm=jpg&w=2000&q=88`）して `src/assets/images/` に取得。
- 決定的なファイル名＋`updatedAt` 判定で**冪等**。GitHub Actions のキャッシュで差分のみ取得。
- 取得画像は **Git にコミット**＝リポジトリがサイトのバックアップを兼ねる。
- Astro（`astro:assets`）が**ローカル画像**として WebP・レスポンシブ生成。最終 HTML に microCMS URL は残さない。
- 実装契約の詳細は `CLAUDE.md` 参照。

## 8. デプロイ／ビルド起動

- **push（main）**：コード変更時。
- **microCMS Webhook → GitHub Actions（`repository_dispatch`）**：コンテンツ「公開・更新／非公開」時のみ。下書き保存では回さない。
- **`workflow_dispatch`**：手動再ビルド（緊急時）。
- 認証：microCMS の Webhook に **単一リポジトリに絞った fine-grained PAT** を設定。トークンは開発者名義（引き継ぎ時に差し替え）。
- Node バージョンを `.nvmrc` で固定、lockfile をコミット、Actions のバージョンをタグ固定して**長期再現性**を担保。

## 9. ドメイン・DNS・HTTPS

- ドメイン：`{{DOMAIN}}`（既定 `sanpuku-unagi.com`、Instagram の綴りと一致。**アンダースコアは不可**。要確定は `docs/CONTENT-CHECKLIST.md`）。
- DNS（顧客レジストラ）：
  - apex（`{{DOMAIN}}`）→ GitHub Pages の A レコード 4 本（`185.199.108.153` / `.109.153` / `.110.153` / `.111.153`）。IPv6 の AAAA も併記可。
  - `www` → `CNAME` で `Scythercas.github.io`。
- 正規 URL を apex か www のどちらかに統一し、もう一方はリダイレクト（重複 URL 回避）。
- GitHub Pages 設定で **HTTPS 強制**。`public/CNAME` に独自ドメインを記載（デプロイで消えないようにする）。

## 10. 解析（GA4）とプライバシー

- GA4 プロパティは顧客の Google アカウントで作成、`G-XXXXXXX` を head の gtag で読み込む。
- 電話 `tel:` クリックを GA イベント化（「サイト→電話」件数がこの店で唯一意味のある指標）。
- **プライバシーポリシー `/privacy` を必ず用意**（GA が Cookie を使うため。Google 規約上も告知が必要）。
- 客層はほぼ国内想定のため、フルの Cookie 同意バナー（CMP）は初版では見送り、ポリシー掲載＋GA の IP 匿名化で運用する判断も可。**最終判断は店側（法務）に確認**。開発者は法律助言者ではない。

## 11. SEO / 集客の土台（無料・初版から）

- Google ビジネスプロフィール整備（地図・検索表示、集客効果はサイト以上のことも）。
- Google Search Console 登録、`sitemap.xml`・`robots.txt`。
- 構造化データ（schema.org Restaurant / LocalBusiness）を JSON-LD で。
- OGP / Twitter Card（代表画像・説明文）。

## 12. 法務

- **プライバシーポリシー：必要**（GA 利用のため）。
- **特定商取引法に基づく表記：不要**（ネット販売・有料オンライン取引が無いため）。混同して無駄に作らない。
- Instagram 流用写真の権利（撮影者が別にいる場合の使用可否）を店側に確認。

## 13. 未確定事項

`docs/CONTENT-CHECKLIST.md` に集約。着手前に最低限、ドメイン綴りの確定と一言紹介の承認、写真素材の棚卸しを済ませる。
