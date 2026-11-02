# Donate Tools — Slip2Sure + Gemini TTS

Stream donation platform with real-time OBS overlay alerts, automatic slip verification via [Slip2Sure API](https://app.slip2sure.com/user/api/docs), voice synthesis powered by Google Gemini 2.5 Flash TTS, and remote overlay management. Built on Hono + Vite + Cloudflare Workers & D1.

## Features

- **Slip Verification (`Slip2Sure API`)**:
  - Bank / PromptPay slip image verification (`POST /api/v0/bank/v0/verifyByFile`)
  - TrueMoney Wallet slip image verification (`POST /api/v0/truemoney/v2/verify`)
  - Automatic PromptPay QR generation on the donor page
  - Masked digit matching against configured Bank, PromptPay, or TrueMoney receiver IDs
  - Minimum donation check (10 THB) and duplicate slip prevention (`is_exist` + D1 `trans_ref` uniqueness + in-flight lock)
- **Bot Protection (`Cloudflare Turnstile`)**:
  - Optional Turnstile challenge verification before calling Slip2Sure API to protect quota
- **AI Voice Alerts (`Gemini 2.5 Flash TTS`)**:
  - Fixed `Aoede` voice via `gemini-2.5-flash-preview-tts`
  - 24kHz 16-bit PCM Web Audio decoding in browser
  - Automatic fallback to Web Speech API (`th-TH`) when `GEMINI_API_KEY` is omitted
  - Configurable on/off via `TTS_ENABLED` env var or live toggle on `/overlay/control` and `PUT /api/manage/tts` (persisted in D1)
- **Real-Time OBS Overlay & Remote Controller**:
  - Transparent OBS Browser Source (`/overlay`) with sequential alert + TTS playback queue
  - Dedicated SSE stream (`/api/events/overlay`), heartbeat tracking, and automatic polling fallback (`/api/events/poll`)
  - Live Overlay Controller (`/overlay/control`) to monitor active connections, dispatch remote commands (`reload`, `clear`, `disconnect`, `tts`), and view live event logs
- **Admin Dashboard, Management API & Cloudflare D1 Persistence**:
  - First-run admin setup (`/setup`) and rate-limited login (`/login`, 3 tries/min) using Web Crypto `PBKDF2` + `HMAC-SHA256` signed tokens (`dash_token` cookie or `Authorization: Bearer <token>`)
  - Headless Management JSON API (`/api/manage/*`) for login, auth/token control (`status`, `refresh`, `revoke`, `config`), credential rotation, TTS toggle, donation ledger management, and overlay control
  - Donation history table and simulated test alerts (`/dashboard`)

## Quick Start

See the dedicated [**Quick Start Guide**](./docs/QUICKSTART.md) for full setup instructions, local development, and deployment steps.

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

- `src/index.tsx` — App entry, security headers, CSRF middleware, and route wiring
- `src/renderer.tsx` — HTML layout shell and asset tags
- `src/style.css` — Global raw-block UI and overlay styles
- `src/modules/config.ts` — Environment and receiver account config loader
- `src/modules/db.ts` — Cloudflare D1 auto-schema initialization and queries (`donations`, `admins`)
- `src/modules/auth.ts` — Admin setup, login, rate limiting, and `PBKDF2` / `HMAC-SHA256` session middleware
- `src/modules/slip2sure.ts` — Slip2Sure API verification, receiver mask check, and duplicate guard
- `src/modules/tts.ts` — Gemini 2.5 Flash TTS (`Aoede`) audio generator
- `src/modules/events.ts` — SSE stream (`/api/events`, `/api/events/overlay`), overlay status, polling, and command bus
- `src/modules/donate.ts` — Donation submission (`POST /api/donate`) and test alert (`POST /api/donate/test`)
- `src/pages/home.tsx` — Public donor page (`GET /`) with PromptPay QR, slip upload, and live overlay status
- `src/pages/setup.tsx` — Initial admin account creation (`GET /setup`)
- `src/pages/login.tsx` — Admin sign-in page (`GET /login`)
- `src/pages/dashboard.tsx` — Streamer dashboard (`GET /dashboard`) with revenue stats, test alert form, and history
- `src/pages/control.tsx` — Remote overlay controller and live SSE terminal (`GET /overlay/control`)
- `src/pages/overlay.tsx` — OBS Browser Source alert overlay (`GET /overlay`)
- `schema.sql` — D1 SQL schema reference for `donations` and `admins`

## Documentation

Complete documentation is maintained in the [`docs/`](./docs) directory:

| Document | Topic | Description |
| :--- | :--- | :--- |
| [**docs/QUICKSTART.md**](./docs/QUICKSTART.md) | [Quick Start Guide](./docs/QUICKSTART.md) | Prerequisites, local development, D1 configuration, and deployment commands. |
| [**docs/README.md**](./docs/README.md) | [Setup & Architecture](./docs/README.md#1-environment-variables) | Environment variables, Cloudflare D1 & Wrangler secrets configuration. |
| [**docs/README.md**](./docs/README.md) | [Slip2Sure Error Codes](./docs/README.md#3-slip2sure-verification--error-codes) | Validation rules, receiver matching, and upstream Slip2Sure error code troubleshooting. |
| [**docs/README.md**](./docs/README.md) | [OBS Studio Setup](./docs/README.md#4-obs-studio-setup) | Browser source configuration, dimensions, transparent audio routing, and live controls. |
| [**docs/README.md**](./docs/README.md) | [Security & Threat Model](./docs/README.md#5-security-architecture--threat-model) | PBKDF2 hashing, instant token revocation, CSRF/CORS, input sanitization, and duplicate slip guards. |
| [**docs/API.md**](./docs/API.md) | [Public Donation APIs](./docs/API.md#1-donation-endpoints) | `POST /api/donate` multipart slip verification and test alerts. |
| [**docs/API.md**](./docs/API.md) | [Real-Time SSE Stream](./docs/API.md#2-real-time-server-sent-events-sse--overlay-control) | `GET /api/events`, `GET /api/events/overlay`, heartbeat pinging, and polling fallback. |
| [**docs/API.md**](./docs/API.md) | [Web Authentication](./docs/API.md#3-authentication--admin-endpoints) | Web form `/setup`, `/login`, and `/logout` with rate limiting. |
| [**docs/API.md**](./docs/API.md) | [Management JSON API](./docs/API.md#4-management-json-api-apimanage) | Headless programmatic administration: login, token refresh/revocation, TTS toggling, and ledger queries. |
