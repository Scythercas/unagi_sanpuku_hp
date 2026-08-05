# さんぷく 店舗紹介サイト

群馬県・北高崎のうな重／うな丼店「さんぷく」の店舗紹介サイト。静的サイト（Astro + Tailwind）＋ヘッドレス CMS（microCMS）を GitHub Pages で配信する。予約・EC・フォームは持たない。

## 技術構成（要約）

- **Astro（静的出力）+ Tailwind CSS**（React は使わない）
- **microCMS**（Hobby 無料・顧客所有）でコンテンツ管理
- **GitHub Pages**（public リポジトリ）＋独自ドメイン＋自動 HTTPS（本番）
- **GitHub Actions** でビルド／デプロイ（push・手動・microCMS Webhook）
- **Cloudflare Pages**（開発者用プレビュー。`develop`・トピックブランチを実 URL で確認。本番とは独立）
- **Google Analytics 4**、地図は Google マップ共有 iframe（API キー不要）
- 画像は**ビルド前にローカル取得して最適化**（microCMS URL を最終 HTML に残さない）

## クイックスタート（開発者）

```bash
nvm use                 # .nvmrc の Node バージョン
npm install
cp .env.example .env     # microCMS の値を記入
npm run dev              # 画像取得 → astro dev
npm run build            # 本番ビルド（dist/）
```

`.env`：
```
MICROCMS_SERVICE_DOMAIN=xxxx      # xxxx.microcms.io の xxxx
MICROCMS_API_KEY=xxxxxxxx         # GET 専用キー
```

## ドキュメント

| ファイル | 内容 |
|---|---|
| `CLAUDE.md` | 開発する Claude 向けの実装指示（不変条件・画像パイプライン契約・DoD） |
| `docs/DESIGN.md` | 設計書（構成・選定理由・所有分離・各種方針） |
| `docs/SCHEMA.md` | microCMS スキーマの厳密定義（5 API） |
| `docs/SETUP.md` | 環境構築手順（ゼロ→公開） |
| `docs/OPERATIONS.md` | 運用引き継ぎ書（アカウント・バックアップ・移管） |
| `docs/CONTENT-CHECKLIST.md` | 顧客確認・素材の未確定事項 |
| `docs/CONTENT-DRAFT.md` | microCMS 投入用コンテンツ下書きと入力進捗 |

## 重要な約束事（詳細は CLAUDE.md）

- microCMS の画像 URL を最終 HTML/CSS に残さない（20GB 転送枠と課金・停止回避）。
- React を入れない。完全な静的出力にする。
- 秘密情報はコミットしない（`.env` と Actions Secrets）。
- 独自ドメインは apex 運用（`site` に独自ドメイン、`base` なし、`public/CNAME` あり）。

## 所有・引き継ぎ

リポジトリは開発者の個人アカウント（案2）。ご子息を Collaborator に追加し、将来 Transfer ownership で顧客側へ移管できる状態を保つ。ドメイン・CMS・GA・GBP は顧客所有。詳細は `docs/OPERATIONS.md`。
