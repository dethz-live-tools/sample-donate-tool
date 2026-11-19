# Donate Tools Documentation

- **Setup & Architecture** — environment variables, Cloudflare Workers secrets, and the API overview below.
- [**Database Layer (Drizzle)**](./DATABASE.md) — D1 vs Postgres backend selection, schema, auto-init, column types.

For a fast step-by-step installation and local setup guide, see [**Quick Start Guide**](./QUICKSTART.md).

## 1. Environment Variables

Copy `.env.example` to `.env` for local development:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `SLIP2SURE_API_KEY` | Yes | Application API Key from [Slip2Sure Dashboard](https://app.slip2sure.com) ("แอพของฉัน" -> Key icon). Ensure your server/Worker IP is whitelisted if IP restriction is enabled. |
| `SESSION_SECRET` | Recommended | Secret key used for HMAC-SHA256 signing of `dash_token` / TikTok webhook keys and `POST /api/manage/setup` authorization. Falls back to `SLIP2SURE_API_KEY` or an ephemeral CSPRNG secret if omitted. |
| `DISCORD_CLIENT_ID` | Yes (OAuth) | Discord OAuth2 application client ID for admin login. |
| `DISCORD_CLIENT_SECRET` | Yes (OAuth) | Discord OAuth2 application client secret. |
| `DISCORD_ALLOWED_USER_IDS` | Yes (OAuth) | Comma/space-separated Discord user IDs granted primary owner access (also checks `DISCORD_ADMIN_USER_ID`, `DISCORD_OWNER_ID`, `DISCORD_ID`). |
| `DISCORD_BOT_TOKEN` | Optional | Bot token used by `POST /api/manage/access` to resolve Discord handles when `username` is omitted. |
| `DISCORD_REDIRECT_URI` | Optional | Custom OAuth2 callback URL (defaults to `https://<host>/auth/discord/callback`). |
| `SESSION_TIMEOUT` | Optional | Access token & idle timeout (e.g., `3600`, `30m`, `1h`; default `3600s`). |
| `REFRESH_TOKEN_TIMEOUT` | Optional | Refresh token TTL (`dash_refresh`, e.g., `604800`, `7d`; default `604800s`). |
| `POSTGRES_URL` | Optional | PostgreSQL connection string (`postgresql://...`). If unset, Cloudflare D1 binding (`DB`) is used. |
| `DONATE_ENABLED` | Optional | Default donation reception state (`true` or `false`). Can be toggled live on `/dashboard` or `PUT /api/manage/donate`. |
| `DEFAULT_LANG` | Optional | Default UI locale (`th` or `en`, defaults to `th`). |
| `TTS_ENABLED` / `VITE_TTS_ENABLED` | Optional | Default TTS voice toggle (`true` or `false`, default `true`). Can also be toggled live via `/overlay/control` or `PUT /api/manage/tts` (persisted in DB). |
| `BANK_NAME` / `VITE_BANK_NAME` | Optional | Bank name/code displayed on the donation page (e.g., `KBANK`, `SCB`). |
| `BANK_ACCOUNT` / `VITE_BANK_ACCOUNT` | Optional | Receiving bank account number (displayed on UI and verified against slip receiver). |
| `ACCOUNT_NAME` / `VITE_ACCOUNT_NAME` | Optional | Account holder display name shown to donors. |
| `PROMPTPAY_ID` / `VITE_PROMPTPAY_ID` | Optional | Receiving PromptPay phone/ID number (generates QR code on UI and verifies slip receiver). |
| `TRUEWALLET_ID` / `VITE_TRUEWALLET_ID` | Optional | Receiving TrueMoney Wallet phone number (displayed on UI and verified against TrueMoney slip `account_to_mobile`). |
| `TURNSTILE_SITE_KEY` / `VITE_TURNSTILE_SITE_KEY` | Optional | Cloudflare Turnstile widget site key rendered on the donation form. |
| `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SECRET_KEY` | Optional | Cloudflare Turnstile secret key verified on `POST /api/donate` before calling Slip2Sure. |

### Cloudflare Workers Secrets & D1 Setup

Public variables can be placed in `wrangler.jsonc` under `"vars"`. Set sensitive secrets via Wrangler:

```sh
bunx wrangler secret put SLIP2SURE_API_KEY
bunx wrangler secret put SESSION_SECRET
bunx wrangler secret put TURNSTILE_SECRET_KEY
bunx wrangler secret put DISCORD_CLIENT_SECRET
```

The application automatically initializes the `donations`, `admins`, `subathon_state`, and `discord_whitelist` tables and missing columns on first query (`src/modules/db.ts`), or you can apply `schema.sql` manually:

```sh
bunx wrangler d1 execute donate-tools-db --file=./schema.sql
```

---

## 2. Pages & API Overview

See full request/response schemas and SSE event payloads in [API.md](./API.md).

### Web Pages
- `GET /`: Public donation form with custom site/header title, PromptPay QR, bank/TrueMoney slip upload, Turnstile widget, closed-gate state when `donateEnabled` is false, and live overlay status indicator.
- `GET /login`: Discord OAuth2 sign-in page (`GET /auth/discord` -> `/auth/discord/callback`; `GET /setup` redirects to `/login`).
- `GET /dashboard`: Streamer dashboard with total revenue, donation count, donation gate toggle (open/close), test alert sender, and transaction log (requires `dashboard` permission).
- `GET /dashboard/config` (alias `GET /config`): Configuration page for custom site title & header title/subtitle, Catppuccin flavor/accent theme, TTS settings, profanity filter config, and donation gate (requires `config` permission).
- `GET /dashboard/access` (alias `GET /access`): Discord access whitelist manager showing environment owner IDs and DB-managed operator IDs with usernames and per-section permission scopes (requires `access` permission).
- `GET /overlay/control` (alias `GET /control`): Live overlay controller with dedicated sub-pages (`/alert`, `/leaderboard`, `/countdown`, `/subathon`), connection counter, remote command bus, heartbeat ping, and real-time event terminal (requires `controls` permission).
- `GET /overlay` (alias `GET /overlay/alert`): Transparent OBS Browser Source alert overlay (Width: 800, Height: 400).
- `GET /overlay/leaderboard`: Transparent OBS Browser Source top donors leaderboard overlay (Width: 450, Height: 500, `?limit=5&title=TOP+DONORS`).
- `GET /overlay/countdown`: Transparent OBS Browser Source countdown timer overlay (Width: 450, Height: 250, `?minutes=10&title=STARTING+SOON`).
- `GET /overlay/subathon` (alias `GET /overlay/submatron`): Transparent OBS Browser Source subathon marathon timer overlay (Width: 450, Height: 250, `?hours=2&sec_per_thb=6&cap_hours=24`).

### API Endpoints
- `POST /api/donate`: Verify Turnstile & slip image (MIME + magic bytes), enforce donation gate (`403 DONATE_CLOSED`), sanitize & filter profanity, synthesize Edge TTS (when enabled), store in DB, and broadcast donation event. Also supports mobile slip upload sessions (`GET/POST /api/donate/session`, `GET /api/donate/session/slip`).
- `POST /api/donate/test`: Trigger a simulated donation alert with TTS (requires `dashboard` or `controls` permission).
- `GET /api/events`: Unified SSE stream (`heartbeat`, `overlay_status`, `donate`, `control`, `ping`; capped at `MAX_SSE_CLIENTS = 100`).
- `GET /api/events/overlay`: Dedicated SSE stream for OBS `/overlay` that tracks active overlay connections.
- `GET /api/events/status`: Current overlay connection status (`online`, `count`, `donateEnabled`, `themeFlavor`, `themeAccent`, `siteTitle`, `headerTitle`, `headerSubtitle`, `ttsEnabled`, `ttsVoice`, `ttsRate`, `ttsPitch`, `filterEnabled`, `filterAction`, `timestamp`).
- `GET /api/events/poll`: Fallback polling for recent donations and overlay status (`?since=<ms>&client=overlay`).
- `GET /api/events/heartbeat` & `POST /api/events/heartbeat`: Touch/renew overlay heartbeat and broadcast status (`controls` permission; `GET` requires `Authorization: Bearer <token>`, rejecting cookies with `405`).
- `POST /api/events/control`: Dispatch remote command (`reload`, `clear`, `disconnect`, `tts`, `heartbeat`, `countdown`, `leaderboard`, `subathon`, `alert`, `bg`, `theme`) to connected overlays (`controls` or `config` permission).
- `GET /api/tts`: Synthesize Microsoft Edge Neural TTS audio preview (`voice` validated against `EDGE_TTS_VOICES`, `text` capped at 500 chars; requires `config` or `controls` permission).
- `GET /api/tiktok/webhook` & `POST /api/tiktok/webhook`: Receive TikTok gift events and stream status updates (`key` / `x-webhook-key` HMAC-authenticated, or Bearer / same-origin POST admin session).
- `GET /api/tiktok/live` & `POST /api/tiktok/live`: Sync TikTok live status and auto-start/pause subathon timer with 2-minute webhook override TTL.
- `GET /auth/discord` & `GET /auth/discord/callback`: Discord OAuth2 authorization with `state` cookie verification and env/DB whitelist validation.
- `POST /api/manage/setup`, `POST /api/manage/login`, `POST /api/manage/logout`: Headless JSON authentication (`setup` requires `x-setup-token` matching `SESSION_SECRET`; `login` rate-limited globally and per-IP).
- `GET /api/manage/access`, `POST /api/manage/access`, `PATCH /api/manage/access/:id`, `DELETE /api/manage/access/:id`: List, add, update (`username`, `note`, `permissions`), and remove DB whitelist IDs (`access` permission).
- `GET /api/manage/donate`, `PUT /api/manage/donate`: Query or toggle donation reception state (`donateEnabled`).
- `GET /api/manage/theme`, `PUT /api/manage/theme`: Query or update Catppuccin flavor and accent (`config` permission for `PUT`).
- `GET /api/manage/header`, `PUT /api/manage/header`: Query or update `siteTitle`, `headerTitle`, and `headerSubtitle` (`config` permission for `PUT`).
- `GET /api/manage/subathon`, `PUT /api/manage/subathon`: Query or update subathon timer state (`controls` permission for `PUT`).
- `GET /api/manage/auth/status`, `POST /api/manage/auth/refresh`, `POST /api/manage/auth/revoke`, `PUT /api/manage/auth/config`: Inspect auth/refresh state, refresh access/refresh tokens (`dash_refresh`), revoke all active tokens (`ownerAuth`), toggle Bearer API access (`ownerAuth`), and clear login rate-limit lockouts (`ownerAuth`).
- `GET /api/manage/me`, `PUT /api/manage/credentials`: Inspect admin profile/permissions/stats and rotate admin username/password (`ownerAuth`).
- `GET /api/manage/tts`, `PUT /api/manage/tts`: Query or update TTS settings (`enabled`, `voice`, `rate`, `pitch`), persisted in DB (`config` permission for `PUT`).
- `GET /api/manage/filter`, `PUT /api/manage/filter`: Query or update word filter settings (`enabled`, `action: censor|mute`, `words`), persisted in DB (`config` permission for `PUT`).
- `GET /api/manage/donations`, `DELETE /api/manage/donations/:id`: Query and delete recorded donations (`dashboard` permission).
- `GET /api/manage/overlay`, `POST /api/manage/overlay/control`: Query and control OBS overlays via JSON API (`controls` or `config` permission for `POST`).

---

## 3. Slip2Sure Verification & Error Codes

All upstream requests use header `x-api-key: <SLIP2SURE_API_KEY>`.

| Slip Type | Upstream Endpoint | Content-Type | Body Field |
| :--- | :--- | :--- | :--- |
| Bank / PromptPay Slip (Image) | `POST https://api.slip2sure.com/api/v0/bank/v0/verifyByFile` | `multipart/form-data` | `image` (File, PNG/JPG/WebP ≤ 5MB) |
| TrueMoney Wallet (Image) | `POST https://api.slip2sure.com/api/v0/truemoney/v2/verify` | `multipart/form-data` | `image` (File, PNG/JPG/WebP ≤ 5MB) |

### Validation & Upstream Error Codes

| Code | Cause | Fix |
| :--- | :--- | :--- |
| `TURNSTILE_REQUIRED` / `TURNSTILE_FAILED` | Missing or invalid Cloudflare Turnstile token | Complete the Turnstile challenge on the form or verify `TURNSTILE_SECRET_KEY` |
| `MIN_AMOUNT` | Slip transfer amount is under 10 THB | Minimum accepted donation is 10 THB |
| `WRONG_RECEIVER` | Slip recipient does not match configured `BANK_ACCOUNT`, `PROMPTPAY_ID`, or `TRUEWALLET_ID` | Ensure donor transferred to the configured receiving account |
| `INVALID_SLIP` | Slip has no transaction reference (`transRef` / `transaction_id`) | Upload a valid completed transfer slip |
| `DUPLICATE_SLIP` | `is_exist: true`, already recorded in D1 `donations`, or currently in-flight | Use a new, unused transfer slip |
| `INVALID_HEADER` | Missing `x-api-key` header | Set `SLIP2SURE_API_KEY` in `.env` or Wrangler secrets |
| `UNAUTHORIZED` | Invalid Slip2Sure API key | Check or rotate key in Slip2Sure dashboard |
| `IP_NOT_ALLOWED` | Server IP not whitelisted | Add your server IP under "แอพของฉัน" -> Edit -> Whitelist IP |
| `CREDIT_INSUFFIENCT` | Insufficient Slip2Sure credit | Top up credit at `app.slip2sure.com` |
| `SLIP_NOT_EXIST` / `SLIP_QRCODE_NOT_EXIST` | Unreadable or invalid slip image | Upload a clear, uncropped PNG/JPG/WebP slip |
| `SLIP_BBL_PENDING` | Bangkok Bank slip pending confirmation | Wait 2–3 minutes after transfer and retry |

---

## 4. OBS Studio Setup

### 1. Donation Alert Overlay
1. In OBS Studio, add a **Browser** source named `Donate Alert`.
2. Set **URL** to `http://localhost:5173/overlay` (or `https://<your-worker>.workers.dev/overlay`).
3. Set **Width** to `800` and **Height** to `400`.
4. Check **Control audio via OBS** to route TTS audio through OBS mixer.

### 2. Top Donors Leaderboard Overlay
1. In OBS Studio, add a **Browser** source named `Top Donors`.
2. Set **URL** to `http://localhost:5173/overlay/leaderboard?limit=5` (customizable with `?limit=10&title=CHAMPIONS`).
3. Set **Width** to `450` and **Height** to `500`.

### 3. Countdown Timer Overlay
1. In OBS Studio, add a **Browser** source named `Stream Countdown`.
2. Set **URL** to `http://localhost:5173/overlay/countdown?minutes=10&title=STARTING+SOON`.
3. Set **Width** to `450` and **Height** to `250`.
4. Use `/overlay/control` to remotely start, pause, reset, or adjust countdown times live during the stream.

### 4. Subathon Marathon Timer Overlay
1. In OBS Studio, add a **Browser** source named `Subathon Timer`.
2. Set **URL** to `http://localhost:5173/overlay/subathon?hours=2&sec_per_thb=6&cap_hours=24`.
3. Set **Width** to `450` and **Height** to `250`.
4. Automatically extends timer on donation based on `sec_per_thb` (default 6 seconds per 1 THB). Remote adjustments (+1m, +5m, +10m, -1m, pause, resume, reset) handled via `/overlay/control`.

---

## 5. Security Architecture & Threat Model

See [API Reference](./API.md) for full endpoint specifications.

- **Authentication, RBAC & Cryptographic Secrets**:
  - Primary authentication via Discord OAuth2 (`state` CSRF cookie verified on callback) gated by `DISCORD_ALLOWED_USER_IDS` and `discord_whitelist`.
  - Role & permission separation: `requirePermission()` enforces per-user scopes (`dashboard`, `controls`, `config`, `access`) on whitelisted Discord operators, while `ownerAuth` restricts `/api/manage/auth/revoke`, `/api/manage/auth/config`, and `/api/manage/credentials` to primary owner sessions (`isOwnerSession()`).
  - Discord-created admins receive a 256-bit CSPRNG secret seed in `passwordHash`; `getBaseSecret()` lazily initializes a per-isolate CSPRNG fallback inside request handlers (never in global scope, keeping Cloudflare Workers `code: 10021` compliant).
  - Short-lived `dash_token` (`SESSION_TIMEOUT`, default `3600s`) paired with `dash_refresh` (`REFRESH_TOKEN_TIMEOUT`, default `604800s`) and HMAC-SHA256 signing bound to secret seed, `token_version`, and `tokenDiscordId`.
  - Passwords hashed using Web Crypto PBKDF2 (`100,000` iterations, `SHA-256`, 16-byte cryptographically secure random salt), bounded to `8`–`128` chars.
  - Brute-force protection: rate-limited to 3 failed attempts per 60 seconds per IP (`cf-connecting-ip`) plus a 5-failure/60s global lockout on `/api/manage/login`. `POST /api/manage/setup` requires `SESSION_SECRET` (`x-setup-token`).
- **CSRF & Header Protection**:
  - All state-changing web requests protected by Hono's `csrf()` (verifies `Origin`). Headless API requests with `Authorization: Bearer <token>` and HMAC-authenticated `/api/tiktok/*` webhooks bypass browser CSRF; `GET /api/events/heartbeat` rejects cookie sessions (`405`).
  - `secureHeaders()` sets `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict transport security.
- **Input Sanitization, Upload Bounds & Injection Defense**:
  - Text inputs (`donor`, `message`, header fields) sanitized by stripping C0/C1 control codes and Unicode directionality/bidi overrides (`\u202A`–`\u202E`, zero-width spaces).
  - Slip images validated by both MIME type and binary magic bytes (`PNG`, `JPEG`, `WebP` via `isSupportedSlipImageBytes()`); mobile upload sessions require 16-char `sid` and are capped at 20 sessions / 25 MB.
  - Profanity filtering with 270+ Thai/English words (obbaeiei/bad-words-thai) and safe-words whitelist protection (`สวัสดี`, `อีเมล`, `หีบสมบัติ`).
  - Asterisk characters (`***`) stripped from TTS spoken audio to prevent pronouncing "ดอกจัน".
  - Slip upload filenames sanitized to alphanumeric and safe characters (`[a-zA-Z0-9._-]`, max 50 chars) before upstream proxying.
  - `GET /api/tts` validates `voice` against `EDGE_TTS_VOICES`, `rate`/`pitch`/`volume` via `normalizeTtsOptions()`, and XML-escapes text.
  - Event bus commands validated against a strict action allowlist (`reload`, `clear`, `disconnect`, `tts`, `heartbeat`, `countdown`, `leaderboard`, `subathon`, `alert`, `bg`, `theme`); SSE streams capped at `MAX_SSE_CLIENTS = 100`.
- **Duplicate Slip Prevention**:
  - Triple-layer guard: Slip2Sure upstream `is_exist` flag + in-memory `inflightRefs` lock Set + D1 `trans_ref` unique constraint (`INSERT OR IGNORE`).
