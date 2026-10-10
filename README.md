# YouTube Typing

YouTube videosに合わせて自分で譜面を作り、ローマ字でタイピングするNext.jsアプリです。

## Development

```bash
npm install
npm run dev
```

## GitHub Pages

The repository includes GitHub Actions workflows for the static export and GitHub Pages deployment. The Pages build uses `NEXT_PUBLIC_BASE_PATH=/youtube-typing`.

## Supabase

- Supabase client configuration: `lib/supabase/client.ts`
- SQL schema and RLS policies: `supabase/schema.sql`
- Environment variable examples: `.env.example`

Apply the schema in the Supabase SQL Editor before enabling account, public map, favorites, history, reports, or copyright request features.
