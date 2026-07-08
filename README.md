# Clip Pilot

Clip Pilot is a local-first MVP for preparing one short-form video for YouTube Shorts, TikTok, and Instagram Reels. It uses FFmpeg for safe media conversion, SQLite for local history, OAuth for YouTube, and explicit manual workflows where an approved posting integration is not configured.

It does **not** collect platform passwords, automate a browser, bypass login, scrape accounts, or imitate a mobile app.

## What works

- Upload `.mp4` or `.mov` files up to 500 MB and 180 seconds.
- Inspect duration, resolution, format, codecs, file size, and 9:16 orientation with FFprobe.
- Create 1080×1920 H.264/AAC MP4 exports for all three platforms. Non-vertical content is scaled and padded rather than cropped.
- Extract a thumbnail, preview the prepared clip, adapt captions, and reuse hashtag groups.
- Store uploads, settings, per-platform statuses, errors, and posted URLs in local SQLite.
- Connect YouTube, TikTok, and Instagram through official OAuth flows with encrypted refreshable tokens.
- Automatically upload to TikTok through the approved Content Posting API and to Instagram through the approved resumable Reels publishing flow.
- Retain downloadable files and manual checklists whenever an account, app permission, or platform capability is unavailable.

## Platform support

| Platform | MVP behavior | Why |
|---|---|---|
| YouTube Shorts | Official OAuth + YouTube Data API upload; supports private, unlisted, public, scheduling, and a generated thumbnail | The `videos.insert` API supports uploads. New, unaudited Google API projects may be restricted to private uploads until audited. |
| TikTok | Official OAuth + Content Posting API binary upload, with live creator/privacy capability checks | Requires a registered TikTok developer app, approved `video.publish` scope, user authorization, and an audit for public visibility. Unaudited clients remain restricted by TikTok. |
| Instagram Reels | Official Instagram OAuth + resumable Reels upload, processing poll, and publish | Requires an eligible professional account and approved `instagram_business_basic` and `instagram_business_content_publish` permissions. |

Official references: [YouTube videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert), [TikTok Content Posting API](https://developers.tiktok.com/products/content-posting-api), and [Meta Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/).

## Prerequisites

- Node.js 22 or newer (Node 24 is recommended for the built-in SQLite API).
- FFmpeg and FFprobe on `PATH`.
- A Google Cloud OAuth application only if direct YouTube upload is needed.

### Install FFmpeg

Windows:

```powershell
winget install --id Gyan.FFmpeg -e
ffmpeg -version
ffprobe -version
```

macOS:

```bash
brew install ffmpeg
```

Ubuntu/Debian:

```bash
sudo apt update && sudo apt install ffmpeg
```

If the binaries are not on `PATH`, set `FFMPEG_PATH` and `FFPROBE_PATH` in `.env` to their absolute paths.

## Setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env`.

3. Generate a local encryption key. PowerShell example:

   ```powershell
   $bytes = New-Object byte[] 32
   [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
   [Convert]::ToBase64String($bytes)
   ```

   Put the output in `APP_ENCRYPTION_KEY`. Changing or losing this key makes stored OAuth tokens unreadable.

4. Start the app:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:3000`.

The SQLite database is created automatically at `data/clip-pilot.db`. Uploaded originals and exports stay in `uploads/` and `exports/`; all three locations are excluded from Git.

## Platform OAuth setup

Every connector also requires `APP_ENCRYPTION_KEY`. Tokens are encrypted with AES-256-GCM before SQLite storage.

### YouTube

1. Create or select a project in Google Cloud Console.
2. Enable **YouTube Data API v3**.
3. Configure the OAuth consent screen.
4. Create an OAuth 2.0 Client ID for a web application.
5. Add `http://localhost:3000/api/youtube/callback` as an authorized redirect URI.
6. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `APP_ENCRYPTION_KEY` in `.env`.
7. Restart Clip Pilot and choose **Connect YouTube**.

Only the `youtube.upload` scope is requested. The OAuth refresh token is encrypted with AES-256-GCM before it is stored in SQLite. Production deployment should use HTTPS, a managed secret store, access control around the dashboard, and a managed database.

### TikTok

1. Create a **Desktop** app in TikTok for Developers and add Login Kit and Content Posting API. Desktop mode permits the localhost callback and uses PKCE.
2. Register `http://localhost:3000/api/tiktok/callback` as the redirect URI.
3. Request approval for `video.publish`. Add the app's client key and secret to `.env.local`.
4. Restart Clip Pilot and choose **Connect TikTok**.

Clip Pilot queries creator info before every post, uses only privacy values returned for that creator, checks the account-specific duration limit, uploads the MP4 in chunks, and polls publishing status. TikTok restricts unaudited clients and may allow only private visibility until its review is complete.

### Instagram

1. Create a Meta developer app with the Instagram API product.
2. Configure Instagram Login and register `http://localhost:3000/api/instagram/callback`.
3. Request `instagram_business_basic` and `instagram_business_content_publish` through App Review.
4. Add the Instagram client ID and secret to `.env.local`, restart Clip Pilot, and choose **Connect Instagram Reels**.

The connector creates a Reel container, streams the local MP4 through Meta's resumable upload endpoint, waits for processing, publishes the container, and stores the returned permalink. Personal or otherwise ineligible accounts cannot publish through this API.

## Scheduling behavior

YouTube scheduling uploads the file immediately as private and sends a future `publishAt` timestamp. TikTok and Instagram do not expose equivalent native Reel scheduling in these posting APIs, so future times retain the manual checklist and disable automatic Post Now. A durable always-on worker would be required to automate those future times safely.

## Commands

```powershell
npm run dev        # local development
npm run typecheck  # TypeScript validation
npm test           # unit tests
npm run build      # production build
npm start          # run production build
```

## Project structure

```text
app/                         Next.js pages and server API routes
components/                  Dashboard UI
lib/                         database, validation, caption, paths, token vault
video-processing/            FFmpeg module boundary
platforms/youtube/           official YouTube OAuth/upload connector
platforms/tiktok/            official OAuth, creator checks, chunked Direct Post
platforms/instagram/         official OAuth and resumable Reels publishing
db/schema.sql                SQLite schema
uploads/                     private original files (Git-ignored)
exports/                     prepared MP4s and thumbnails (Git-ignored)
```

## Production TODOs

- Complete TikTok and Meta app review before enabling these connectors for accounts outside developer/test roles.
- Add durable publish-status polling for TikTok jobs that remain processing beyond the initial request.
- Add authentication before exposing this dashboard beyond localhost.
- Add a worker queue and object storage before processing large videos in a multi-user deployment.

## Data model

`db/schema.sql` defines four tables:

- `uploads`: source metadata, captions, dimensions, duration, thumbnail, and errors.
- `platform_posts`: per-platform settings, export, schedule, status, URL, and errors.
- `hashtag_groups`: built-in and custom reusable groups.
- `oauth_tokens`: encrypted OAuth token payloads and non-sensitive account labels.

Statuses are `READY`, `NEEDS_ACCOUNT_CONNECTION`, `API_NOT_SUPPORTED`, `MANUAL_POST_REQUIRED`, `POSTED`, and `FAILED`.
