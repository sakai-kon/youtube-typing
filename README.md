# YouTube Typing

YouTube 動画に合わせて自分で譜面を作り、ローマ字でタイピングする Next.js アプリです。

## 開発環境

Node.js 22 を使います。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` に Supabase の URL と **publishable key** を設定してください。管理者用の secret key / service-role key はブラウザーに置かないでください。

型チェックと本番ビルド:

```bash
npm run typecheck
NEXT_PUBLIC_BASE_PATH=/youtube-typing npm run build
```

## GitHub Pages

公開先は `https://sakai-kon.github.io/youtube-typing/` です。リポジトリは **main ブランチの静的ファイル公開**を利用しています。

- `app/` と `lib/` が編集対象の Next.js ソース
- `.github/workflows/sync-static-export.yml` がビルドした `out/` をルートに同期してコミット
- `ci.yml` と `Validate GitHub Pages export` が型チェックと静的ビルドを検証
- `NEXT_PUBLIC_BASE_PATH=/youtube-typing` は Pages のサブパスに必要

Pages を Actions のアーティファクトから別途デプロイしようとしないでください。ビルド成果物は同期ワークフローが `main` に反映し、GitHub Pages のブランチ公開が配信します。

## Supabase

接続先はプロジェクト `youtube-typing`（東京リージョン）です。

- ブラウザー向けクライアント: `lib/supabase/client.ts`
- DBアクセス処理: `lib/cloud.ts`
- テーブル・RLSポリシーの基準SQL: `supabase/schema.sql`
- 環境変数の例: `.env.example`

プロフィール、譜面、お気に入り、プレイ履歴、通報、著作権申立ては Supabase に保存します。テーブルの RLS は必ず有効にし、公開キーだけをクライアントに置いて、アクセス制御は PostgreSQL の RLS ポリシーで行います。

### 認証リダイレクト

Supabase Dashboard の Authentication URL Configuration で、Site URL と Redirect URLs に次を登録してください。

- `https://sakai-kon.github.io/youtube-typing/`
- `http://localhost:3000/**`（ローカル開発用）

新規登録メールのリンクが別のサイトへ移動する場合は、この URL 設定を確認してください。

### データベース変更

ライブ DB に適用するスキーマ変更は先に内容を確認し、データを削除しない小さな変更として適用します。適用後はテーブル、RLS ポリシー、インデックスを読み取りクエリで検証し、Security / Performance Advisor も再確認してください。
