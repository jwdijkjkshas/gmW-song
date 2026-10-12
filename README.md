# gmW • Lunar Music

A deliberately small, quiet music player. Next.js 14 · TypeScript · Tailwind · Supabase.

**What's in it:** loading screen → email/password auth (or guest) → search (YouTube) → persistent player with queue, shuffle, repeat, volume, keyboard shortcuts → synced lyrics (LRCLIB) → likes and playlists (Supabase, row-level security). The gmW logo dodges your cursor on the sign-in screen (spring physics, touch-aware, respects reduced motion).

**Deliberately left out to stay minimal:** Spotify, SoundCloud, albums/artists pages, genre browsing, recommendations, search suggestions, profile/settings page, manually uploaded timestamped lyrics. Each can be added later without restructuring.

## 1. Install

```bash
npm install
cp .env.example .env.local
```

## 2. Supabase (auth + database)

1. Create a project at supabase.com.
2. Project Settings → API: copy the **URL** and **anon key** into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. SQL Editor: run `supabase/schema.sql` (creates `liked_tracks` and `playlists` with owner-only RLS policies).
4. Authentication → URL Configuration: add `http://localhost:3000` and your Vercel URL as allowed redirect URLs. Email confirmation is on by default; turn it off under Providers → Email if you want instant sign-up while testing.

## 3. YouTube search

1. Google Cloud Console → enable **YouTube Data API v3** → create an API key.
2. Put it in `.env.local` as `YOUTUBE_API_KEY`. It is only read in `app/api/search/route.ts` (server side) and never sent to the browser.
3. Quota: each search costs 100 units of the default 10,000/day, so about 100 searches a day. Results are cached for 5 minutes, and searches only run on Enter.

## 4. Run

```bash
npm run dev     # http://localhost:3000
```

Without Supabase variables, guest mode still works (library saved to this device). Without `YOUTUBE_API_KEY`, search shows a clear setup message instead of fake results.

## 5. Deploy to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Add the three environment variables from `.env.example` in Project Settings → Environment Variables.
3. Deploy, then add the Vercel URL to Supabase's redirect URLs.

## Keyboard shortcuts

Space play/pause · ←/→ seek 5s · Shift+←/→ previous/next · ↑/↓ volume · M mute · L lyrics and queue · Esc close.

## Provider limits (read this)

- **YouTube:** playback uses the official IFrame player. Videos whose owners block embedding show an error and the queue skips ahead. The player must stay visible (use the Video toggle to tuck it away; don't hide it permanently). Browsers may pause playback in background tabs, especially on mobile.
- **Lyrics:** fetched from LRCLIB, a community database. Coverage varies and matching is by cleaned-up title/artist, so some tracks will show "No lyrics found" or occasionally a mismatch.
- **Recently played and recent searches** are stored per device in localStorage, not in Supabase.
- **Guest data** lives only in this browser.

## Status

The code was written without network access, so `npm install`, `next build` and the integrations have **not been run or tested**. Expect to fix small type or runtime errors on the first build, and test sign-up, search, playback, lyrics and playlists against your own credentials before relying on it.
