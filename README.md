# Donate Tools — Slip2Sure + Edge TTS

Stream donation platform with real-time OBS overlay alerts, automatic slip verification via [Slip2Sure API](https://app.slip2sure.com/user/api/docs), voice synthesis powered by Microsoft Edge Neural TTS, and remote overlay management. Built on Hono + Vite + Cloudflare Workers & D1.

## Features

- **Slip Verification (`Slip2Sure API`)**:
  - Bank / PromptPay slip image verification (`POST /api/v0/bank/v0/verifyByFile`)
  - TrueMoney Wallet slip image verification (`POST /api/v0/truemoney/v2/verify`)
  - Automatic PromptPay QR generation on the donor page
  - Masked digit matching against configured Bank, PromptPay, or TrueMoney receiver IDs
  - Minimum donation check (10 THB) and duplicate slip prevention (`is_exist` + D1 `trans_ref` uniqueness + in-flight lock)
- **Bot Protection (`Cloudflare Turnstile`)**:
  - Optional Turnstile challenge verification before calling Slip2Sure API to protect quota
- **AI Voice Alerts (`Edge Neural TTS`)**:
  - Microsoft Edge neural text-to-speech with natural Thai (`th-TH-NiwatNeural`, `th-TH-PremwadeeNeural`), English, and Japanese voices
  - Default voice `th-TH-NiwatNeural` with automatic failover fallback if a voice cluster becomes exhausted
  - Zero external SDK or API key needed — runs free and fast
  - Audio loaded and decoded locally in browser / OBS overlay via Web Audio API MP3 decoding
  - Configuration page (`/dashboard/config`) to select voices, adjust speech rate and pitch, and test audio locally
  - Spoken text cleans asterisks (`***`) automatically so TTS skips pronouncing "ดอกจัน" / "asterisk"
  - Configurable on/off via `TTS_ENABLED` env var or live toggle on `/dashboard/config`, `/overlay/control`, and `PUT /api/manage/tts` (persisted in DB)
- **Word Filtering & Profanity Censor**:
  - Integrated `obbaeiei/bad-words-thai` dictionary with 270+ Thai profanities, phonetic variations, karaoke terms, and English curse words
  - Smart whitelist protection for everyday Thai words (`สวัสดี`, `อีเมล`, `หีบสมบัติ`, `ไอที`) preventing false-positive masking
  - Configurable actions: Censor with `***` or automatically silence/mute TTS audio
  - Custom blocked words supported via Configuration page (`/dashboard/config`)
  - Full persistence in D1 / PostgreSQL (`admins` table) and REST API endpoints (`GET/PUT /api/manage/filter`)
- **Subathon / Countdown Timer Overlay (`/overlay/countdown`, `/overlay/subathon`)**:
  - Dedicated subathon marathon timer (`/overlay/subathon` or `/overlay/submatron`) and stream countdown (`/overlay/countdown`)
  - Live timer that automatically adds time on donation (configurable seconds per 1 THB, e.g. 6s/THB)
  - Visual pulse effects, popup notifications with donor name and time added, and customizable cap
  - Complete remote controller buttons: +1m, +5m, +10m, -1m, pause, resume, reset, and live rate adjustments
- **Real-Time OBS Overlays & Remote Controller**:
  - Transparent OBS Browser Sources:
    - Donation Alert (`/overlay` or `/overlay/alert`) with sequential alert + TTS playback queue
    - Top Donors Leaderboard (`/overlay/leaderboard?limit=5`)
    - Countdown Timer (`/overlay/countdown?minutes=10`)
    - Subathon Marathon (`/overlay/subathon?hours=2&sec_per_thb=6`)
  - Dedicated SSE stream (`/api/events/overlay`), heartbeat tracking, and automatic polling fallback (`/api/events/poll`)
  - Live Overlay Controller (`/overlay/control`) to monitor active connections, dispatch remote commands (`reload`, `clear`, `disconnect`, `tts`, `countdown`), and view live event logs
- **TikTok Live & Gift Integration (`/api/tiktok/webhook`, `/api/tiktok/live`)**:
  - Automatic subathon timer extension on TikTok gifts (TikFinity / custom JSON webhook) with HMAC key validation
  - TikTok live stream status sync (auto-start/reset when live, pause on offline with 2-minute webhook override TTL and 3-minute grace period)
- **Discord OAuth2, Access Whitelist, RBAC & Site Config**:
  - Discord OAuth2 sign-in (`/auth/discord`) gated by `DISCORD_ALLOWED_USER_IDS` (primary owners) and dynamic DB whitelist (`/dashboard/access`) with per-user permission scopes (`dashboard`, `controls`, `config`, `access`)
  - Configurable access/idle timeout (`SESSION_TIMEOUT`, default `3600s`) and refresh token (`REFRESH_TOKEN_TIMEOUT`, default `604800s`, `dash_refresh`) with automatic client session refresh
  - Configuration page (`/dashboard/config`, alias `/config`) for Catppuccin flavor/accent theme selector (`macchiato`, `latte`, `frappe`, `mocha`), custom site title & header title/subtitle, TTS voice/rate/pitch, and profanity filter
  - Live donation gate (`donate_enabled`) toggled from `/dashboard`, `/dashboard/config`, or `PUT /api/manage/donate` to open/close donations in real time
  - Thai / English i18n UI switcher (`LangSwitch`, `?lang=th|en`)
- **Admin Dashboard, Management API & Dual Database (D1 / Postgres)**:
  - Rate-limited auth (`/login`, global + per-IP lockout) using Web Crypto `PBKDF2` / `HMAC-SHA256` signed tokens (`dash_token` / `dash_refresh` cookies or `Authorization: Bearer <token>`) and `SESSION_SECRET`-guarded `/api/manage/setup`
  - Headless Management JSON API (`/api/manage/*`) for login, auth/token control (`status`, `refresh`, `revoke`, `config`), TTS, filter, theme, header, subathon, access whitelist, donation gate, ledger management, and overlay control
  - Donation history table and simulated test alerts (`/dashboard`) persisted via Drizzle ORM on Cloudflare D1 or PostgreSQL (`POSTGRES_URL`)

## Quick Start

See the dedicated [**Quick Start Guide**](./docs/QUICKSTART.md) for full setup instructions, local development, and deployment steps.

Or with Docker (no Cloudflare account needed; local `workerd` + D1 in a volume):

```sh
cp .env.example .env && docker compose up -d --build
```

Postgres instead of D1 (D1 is default; `POSTGRES_URL` takes precedence, tables auto-create on first use) — set `POSTGRES_URL=postgresql://donate:donate@postgres:5432/donate` in `.env`, then:

```sh
docker compose up -d --build app postgres
```

Native setup:

```sh
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env

# 3. Start local development
bun run dev

# 4. Deploy to Cloudflare Workers
bun run deploy
```

---

## Project Structure

- `src/index.tsx` — App entry, `Content-Security-Policy` & security headers, CSRF middleware, and route wiring
- `src/renderer.tsx` — HTML layout shell, dynamic `siteTitle`, Google Fonts (`Archivo Black`, `Work Sans`, `Space Mono`, `IBM Plex Sans Thai` fallback), theme sync, and client i18n bootstrap
- `src/i18n.ts` & `src/locales/` — Thai (`th.json`) and English (`en.json`) localization tables
- `src/style.css` — Catppuccin flavors/accents (`data-flavor`, `data-accent`) and raw-block UI/overlay styles
- `src/db/schema.ts` & `src/db/client.ts` — Drizzle schema (`donations`, `admins`, `subathon_state`, `discord_whitelist`) and D1/Postgres factory
- `src/modules/config.ts` — Environment and receiver account config loader
- `src/modules/db.ts` — Portable Drizzle queries and `ensureSchema()` auto-initialization
- `src/modules/auth.ts` — Discord OAuth2, `requirePermission()` / `ownerAuth` RBAC, refresh tokens, rate limiting, and `PBKDF2` / `HMAC-SHA256` session middleware
- `src/modules/slip2sure.ts` — Slip2Sure API verification, magic-byte validation, receiver mask check, and duplicate guard
- `src/modules/filter.ts` — Word filtering engine, bad words dictionary (obbaeiei/bad-words-thai), and whitelist masking
- `src/modules/tts.ts` — Microsoft Edge Neural TTS audio generator, SSML validation, and cluster failover
- `src/modules/tiktok.ts` — TikTok gift & live-status webhooks, scraper sync, and override TTL
- `src/modules/events.ts` — SSE stream (`/api/events`, `/api/events/overlay`), overlay status, polling, and command bus
- `src/modules/donate.ts` — Donation submission (`POST /api/donate`), mobile slip sessions, and test alerts (`POST /api/donate/test`)
- `src/pages/home.tsx` — Public donor page (`GET /`) with custom header title, PromptPay QR, slip upload, closed-gate UI, and live overlay status
- `src/pages/login.tsx` — Discord OAuth2 sign-in page (`GET /login`)
- `src/pages/dashboard.tsx` — Streamer dashboard (`GET /dashboard`) with revenue stats, donation gate toggle, test alert form, and history
- `src/pages/config.tsx` — Configuration page (`GET /dashboard/config`, alias `/config`) for site/header title, Catppuccin theme, TTS, profanity filter, and donation gate
- `src/pages/access.tsx` — Discord access whitelist & permission manager (`GET /dashboard/access`)
- `src/pages/LangSwitch.tsx` — Shared `AdminNav` navigation bar, session auto-refresh guard, and Thai/English locale switcher
- `src/pages/controls/` — Remote overlay controllers (`/overlay/control`, `/alert`, `/leaderboard`, `/countdown`, `/subathon`)
- `src/pages/overlays/` — OBS Browser Source overlays (`/overlay`, `/alert`, `/leaderboard`, `/countdown`, `/subathon`)
- `schema.sql` — SQL schema reference for `donations`, `admins`, `subathon_state`, and `discord_whitelist`

## Documentation

Complete documentation is maintained in the [`docs/`](./docs) directory:

| Document | Topic | Description |
| :--- | :--- | :--- |
| [**docs/QUICKSTART.md**](./docs/QUICKSTART.md) | [Quick Start Guide](./docs/QUICKSTART.md) | Prerequisites, local development, D1 configuration, and deployment commands. |
| [**docs/DATABASE.md**](./docs/DATABASE.md) | [Database Layer](./docs/DATABASE.md) | Drizzle layer, D1 vs Postgres backend selection, schema auto-init. |
| [**docs/README.md**](./docs/README.md) | [Setup & Architecture](./docs/README.md#1-environment-variables) | Environment variables, Cloudflare D1 & Wrangler secrets configuration. |
| [**docs/README.md**](./docs/README.md) | [Slip2Sure Error Codes](./docs/README.md#3-slip2sure-verification--error-codes) | Validation rules, receiver matching, and upstream Slip2Sure error code troubleshooting. |
| [**docs/README.md**](./docs/README.md) | [OBS Studio Setup](./docs/README.md#4-obs-studio-setup) | Browser source configuration, dimensions, transparent audio routing, and live controls. |
| [**docs/README.md**](./docs/README.md) | [Security & Threat Model](./docs/README.md#5-security-architecture--threat-model) | PBKDF2 hashing, instant token revocation, CSRF/CORS, input sanitization, and duplicate slip guards. |
| [**docs/API.md**](./docs/API.md) | [Public Donation APIs](./docs/API.md#1-donation-endpoints) | `POST /api/donate` multipart slip verification and test alerts. |
| [**docs/API.md**](./docs/API.md) | [Real-Time SSE Stream](./docs/API.md#2-real-time-server-sent-events-sse--overlay-control) | `GET /api/events`, `GET /api/events/overlay`, heartbeat pinging, and polling fallback. |
| [**docs/API.md**](./docs/API.md) | [Web Authentication](./docs/API.md#3-authentication--admin-endpoints) | Web form `/setup`, `/login`, and `/logout` with rate limiting. |
| [**docs/API.md**](./docs/API.md) | [Management JSON API](./docs/API.md#4-management-json-api-apimanage) | Headless programmatic administration: login, token refresh/revocation, TTS toggling, and ledger queries. |
