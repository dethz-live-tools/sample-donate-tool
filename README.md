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
- **Real-Time OBS Overlay & Remote Controller**:
  - Transparent OBS Browser Source (`/overlay`) with sequential alert + TTS playback queue
  - Dedicated SSE stream (`/api/events/overlay`), heartbeat tracking, and automatic polling fallback (`/api/events/poll`)
  - Live Overlay Controller (`/overlay/control`) to monitor active connections, dispatch remote commands (`reload`, `clear`, `disconnect`), and view live event logs
- **Admin Dashboard, Management API & Cloudflare D1 Persistence**:
  - First-run admin setup (`/setup`) and rate-limited login (`/login`, 3 tries/min) using Web Crypto `PBKDF2` + `HMAC-SHA256` signed tokens (`dash_token` cookie or `Authorization: Bearer <token>`)
  - Headless Management JSON API (`/api/manage/*`) for login, credential rotation, donation ledger management, and overlay control
  - Donation history table and simulated test alerts (`/dashboard`)

## Quick Start

1. **Install dependencies**
   ```sh
   bun install
   ```

2. **Configure environment variables**
   ```sh
   cp .env.example .env
   ```
   Edit `.env`:
   ```dotenv
   # Slip2Sure Application API Key (from https://app.slip2sure.com)
   SLIP2SURE_API_KEY=your_slip2sure_api_key_here

   # Google Gemini API Key for Gemini 2.5 Flash TTS (optional; falls back to browser TTS if omitted)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional HMAC secret for dashboard sessions
   SESSION_SECRET=change_me_to_random_secret

   # Receiving Account Configuration
   VITE_BANK_NAME=KBANK
   VITE_BANK_ACCOUNT=123-4-56789-0
   VITE_ACCOUNT_NAME=นายสมชาย ใจดี
   VITE_PROMPTPAY_ID=0812345678
   VITE_TRUEWALLET_ID=0812345678

   # Cloudflare Turnstile (optional)
   VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFsDEJrv5csefss-
   TURNSTILE_SECRET_KEY=your_turnstile_secret_key
   ```

3. **Run local dev server**
   ```sh
   bun run dev
   ```
   - **Donation Page**: `http://localhost:5173/`
   - **Admin Setup / Login**: `http://localhost:5173/setup` or `http://localhost:5173/login`
   - **Streamer Dashboard**: `http://localhost:5173/dashboard`
   - **Overlay Controller**: `http://localhost:5173/overlay/control`
   - **OBS Overlay**: `http://localhost:5173/overlay`

4. **Deploy to Cloudflare Workers**
   ```sh
   bun run deploy
   ```

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

- [Setup & Architecture](./docs/README.md) — Environment variables, D1 & Wrangler configuration, Slip2Sure error codes, and OBS setup.
- [API Reference](./docs/API.md) — Full documentation for HTTP endpoints, authentication, SSE event streams, and command bus payloads.
