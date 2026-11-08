# Donate Tools Documentation

For a fast step-by-step installation and local setup guide, see [**Quick Start Guide**](./QUICKSTART.md).

## 1. Environment Variables

Copy `.env.example` to `.env` for local development:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `SLIP2SURE_API_KEY` / `VITE_SLIP2SURE_API_KEY` | Yes | Application API Key from [Slip2Sure Dashboard](https://app.slip2sure.com) ("แอพของฉัน" -> Key icon). Ensure your server/Worker IP is whitelisted if IP restriction is enabled. |
| `TTS_ENABLED` / `VITE_TTS_ENABLED` | Optional | Default TTS voice toggle (`true` or `false`, default `true`). Can also be toggled live via `/overlay/control` or `PUT /api/manage/tts` (persisted in D1). |
| `SESSION_SECRET` | Optional | Secret key used for HMAC-SHA256 signing of the `dash_token` admin session cookie. Falls back to `SLIP2SURE_API_KEY` if omitted. |
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
```

The application automatically initializes the `donations` and `admins` tables on first D1 query (`src/modules/db.ts`), or you can apply `schema.sql` manually:

```sh
bunx wrangler d1 execute donate-tools-db --file=./schema.sql
```

---

## 2. Pages & API Overview

See full request/response schemas and SSE event payloads in [API.md](./API.md).

### Web Pages
- `GET /`: Public donation form with PromptPay QR, bank/TrueMoney slip upload, Turnstile widget, and live overlay status indicator.
- `GET /setup`: Initial administrator account creation (redirects to `/login` once an admin exists in D1).
- `GET /login`: Administrator login page (rate-limited to 3 attempts per minute per IP).
- `GET /dashboard`: Streamer dashboard with total revenue, donation count, test alert sender, TTS and filter toggles, and transaction log (Admin only).
- `GET /overlay/control` (alias `GET /control`): Live overlay controller with connection counter, TTS settings, bad words filter config, remote command bus (`reload`, `clear`, `disconnect`, `tts`, `countdown`), heartbeat ping, and real-time event terminal (Admin only).
- `GET /overlay` (alias `GET /overlay/alert`): Transparent OBS Browser Source alert overlay (Width: 800, Height: 400).
- `GET /overlay/leaderboard`: Transparent OBS Browser Source top donors leaderboard overlay (Width: 450, Height: 500, `?limit=5&title=TOP+DONORS`).
- `GET /overlay/countdown`: Transparent OBS Browser Source countdown timer overlay (Width: 450, Height: 250, `?minutes=10&title=STARTING+SOON`).
- `GET /overlay/subathon` (alias `GET /overlay/submatron`): Transparent OBS Browser Source subathon marathon timer overlay (Width: 450, Height: 250, `?hours=2&sec_per_thb=6&cap_hours=24`).

### API Endpoints
- `POST /api/donate`: Verify Turnstile & slip image, sanitize & filter profanity, synthesize Edge TTS (when enabled), store in D1, and broadcast donation event.
- `POST /api/donate/test`: Trigger a simulated donation alert with TTS (Admin only).
- `GET /api/events`: Unified SSE stream (`heartbeat`, `overlay_status`, `donate`, `control`, `ping`).
- `GET /api/events/overlay`: Dedicated SSE stream for OBS `/overlay` that tracks active overlay connections.
- `GET /api/events/status`: Current overlay connection status (`online`, `count`, `ttsEnabled`, `ttsVoice`, `ttsRate`, `ttsPitch`, `filterEnabled`, `filterAction`, `timestamp`).
- `GET /api/events/poll`: Fallback polling for recent donations and overlay status (`?since=<ms>&client=overlay`).
- `GET /api/events/heartbeat` & `POST /api/events/heartbeat`: Touch/renew overlay heartbeat and broadcast status (Admin only).
- `POST /api/events/control`: Dispatch remote command (`reload`, `clear`, `disconnect`, `tts`, `countdown`) to connected overlays (Admin only).
- `POST /setup`, `POST /login`, `POST /logout`: Admin authentication form handlers.
- `POST /api/manage/setup`, `POST /api/manage/login`, `POST /api/manage/logout`: Headless JSON authentication (issues `Bearer` token and `dash_token` cookie).
- `GET /api/manage/auth/status`, `POST /api/manage/auth/refresh`, `POST /api/manage/auth/revoke`, `PUT /api/manage/auth/config`: Inspect auth state, refresh tokens, revoke all active tokens (`token_version`), toggle Bearer API access (`apiEnabled`), and clear login rate-limit lockouts.
- `GET /api/manage/me`, `PUT /api/manage/credentials`: Inspect admin profile/stats and rotate admin username/password.
- `GET /api/manage/tts`, `PUT /api/manage/tts`: Query or update TTS settings (`enabled`, `voice`, `rate`, `pitch`), persisted in D1.
- `GET /api/manage/filter`, `PUT /api/manage/filter`: Query or update word filter settings (`enabled`, `action: censor|mute`, `words`), persisted in D1.
- `GET /api/manage/donations`, `DELETE /api/manage/donations/:id`: Query and delete recorded D1 donations.
- `GET /api/manage/overlay`, `POST /api/manage/overlay/control`: Query and control OBS overlays via JSON API.

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

- **Authentication & Password Hashing**:
  - Passwords hashed using Web Crypto PBKDF2 (`100,000` iterations, `SHA-256`, 16-byte cryptographically secure random salt).
  - Strict password bound (`8` to `128` chars) prevents computational DoS / CPU exhaustion on crypto hashing.
  - Tokens signed with HMAC-SHA256 bound to password hash and `token_version` (`${username}:${exp}:v${tokenVersion}`).
  - Instant revocation: calling `POST /api/manage/auth/revoke` increments `token_version` in D1, invalidating all issued tokens across all devices simultaneously.
  - Brute-force protection: rate-limited to 3 failed attempts per 60 seconds per IP (`cf-connecting-ip`) on both web form `/login` and JSON `/api/manage/login`.
- **CSRF & Header Protection**:
  - All state-changing web requests protected by Hono's `csrf()` (verifies `Origin`). Headless API requests with `Authorization: Bearer <token>` bypass browser CSRF.
  - `secureHeaders()` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and strict transport security.
- **Input Sanitization & Injection Defense**:
  - Text inputs (`donor`, `message`) sanitized by stripping C0/C1 control codes and Unicode directionality/bidi overrides (`\u202A`–`\u202E`, zero-width spaces).
  - Profanity filtering with 270+ Thai/English words (obbaeiei/bad-words-thai) and safe-words whitelist protection (`สวัสดี`, `อีเมล`, `หีบสมบัติ`).
  - Asterisk characters (`***`) stripped from TTS spoken audio to prevent pronouncing "ดอกจัน".
  - Slip upload filenames sanitized to alphanumeric and safe characters (`[a-zA-Z0-9._-]`, max 50 chars) before upstream proxying.
  - Microsoft Edge Neural TTS with SSML XML escaping, zero-dependency WebSocket streaming, and automatic voice failover.
  - Event bus commands validated against a strict action allowlist (`reload`, `clear`, `disconnect`, `tts`, `countdown`, `heartbeat`).
- **Duplicate Slip Prevention**:
  - Triple-layer guard: Slip2Sure upstream `is_exist` flag + in-memory `inflightRefs` lock Set + D1 `trans_ref` unique constraint (`INSERT OR IGNORE`).
