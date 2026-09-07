# YouTube Typing

YouTube動画とユーザー作成のタイピング譜面を同期するWebサービスです。

## 現在の実装

- YouTube IFrame APIによる動画再生・現在時刻取得
- 「現在時刻を登録」で譜面行を作成
- 行ごとの開始時刻を±0.1秒／数値入力で調整
- LocalStorageへの譜面保存
- JSONエクスポート
- YouTube時間に合わせたプレイ画面
- ひらがな／カタカナ正規化
- `shi/si`, `chi/ti`, `tsu/tu`など複数ローマ字ルート
- 拗音、促音、ん、記号の基本ルート対応
- クライアント側のみでリアルタイム判定（プレイ中のAI APIなし）
- レスポンシブUI

## 起動

```bash
npm install
npm run dev
```

`.env`は現在不要です。公開・認証・お気に入り等のクラウド機能は、Supabase接続を追加して拡張する前提です。

## 設計

Phase 1〜3（核となるプレイ、譜面エディタ、ローカル保存）を先に動作させ、Supabase依存をMVPの実験から分離しています。`supabase/schema.sql`にはPhase 4以降のDB/RLS設計を収録しています。
