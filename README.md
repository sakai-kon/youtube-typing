# YouTube Typing

YouTube動画とユーザー作成のタイピング譜面を同期するWebサービスです。

## 現在の実装

- YouTube IFrame APIによる動画再生・現在時刻取得
- 「現在時刻を登録」で譜面行を作成
- 行ごとの開始時刻を±0.1秒／数値入力で調整
- LocalStorageへのゲスト譜面保存
- JSONエクスポート／インポート
- YouTube時間に合わせたプレイ画面
- ひらがな／カタカナ正規化
- `shi/si`, `chi/ti`, `tsu/tu`など複数ローマ字ルート
- 拗音、促音、ん、記号の基本ルート対応
- クライアント側のみでリアルタイム判定（プレイ中のAI APIなし）
- Supabase Authによるメール＋パスワード認証
- Supabase PostgreSQLへの譜面保存・公開・非公開・共有
- 公開譜面検索
- お気に入りとプレイ履歴
- 譜面通報と管理者による非公開化・削除・通報処理
- 管理者によるユーザー権限管理
- RLSによるデータアクセス制御
- レスポンシブUI

## Supabase

本番Supabaseプロジェクトは `kfoaphvuwhksdpclfzna` です。

`.env.local` を作成して、次を設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL=https://kfoaphvuwhksdpclfzna.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

公開キーはData APIのクライアント接続用です。Service Role Keyなどの秘密鍵はブラウザへ置かないでください。

データベースの正規スキーマは `supabase/schema.sql` にあります。RLSは `profiles`, `maps`, `favorites`, `play_history`, `reports` の全テーブルで有効です。内部の権限判定・カウンタ更新用関数はAPI公開用の `public` ではなく `private` スキーマに置いています。

## 起動

```bash
npm install
npm run dev
```

Supabaseの環境変数が未設定でも、ゲストのローカル保存・JSON入出力・ローカル譜面のプレイは利用できます。ログイン、公開、検索、履歴、お気に入り、通報などのクラウド機能には環境変数が必要です。

## 設計方針

- Phase 1〜3の核となるYouTube同期、譜面エディタ、ローカル保存を維持
- Phase 4以降をSupabaseへ接続
- プレイ中はサーバーへキー入力を送信しない
- ローマ字判定はブラウザ内で完結し、プレイ中のAI APIコストは0
- 譜面本文・読み・タイミングはユーザー作成データとして管理
- 公開／非公開の権限はクライアントUIだけでなくPostgreSQL RLSでも強制
