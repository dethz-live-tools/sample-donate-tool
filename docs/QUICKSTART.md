# Quick Start Guide

Step-by-step setup guide for running Donate Tools locally and deploying to Cloudflare Workers.

---

## 1. Prerequisites

- [Bun](https://bun.sh) (v1.1+) or Node.js (v20+)
- [Cloudflare Account](https://dash.cloudflare.com) with Workers and D1 enabled
- [Slip2Sure Account & API Key](https://app.slip2sure.com) (for bank/TrueMoney slip verification)
- [Google AI Studio Gemini API Key](https://aistudio.google.com) (optional, for Gemini 2.5 Flash TTS)

---

## 2. Install Dependencies

```sh
bun install
```

---

## 3. Configure Environment Variables

Copy the example environment file:

```sh
cp .env.example .env
```

Edit `.env` with your credentials:

```dotenv
# Slip2Sure Application API Key (from https://app.slip2sure.com)
SLIP2SURE_API_KEY=your_slip2sure_api_key_here

# Google Gemini API Key for Gemini 2.5 Flash TTS (optional; falls back to browser TTS if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
TTS_ENABLED=true

# Secret key for HMAC-SHA256 signing of admin session tokens
SESSION_SECRET=change_me_to_random_secret

# Receiving Account Configuration
VITE_BANK_NAME=KBANK
VITE_BANK_ACCOUNT=123-4-56789-0
VITE_ACCOUNT_NAME=นายสมชาย ใจดี
VITE_PROMPTPAY_ID=0812345678
VITE_TRUEWALLET_ID=0812345678

# Cloudflare Turnstile bot protection (optional)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFsDEJrv5csefss-
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

---

## 4. Local Development Server

Start the local Vite dev server:

```sh
bun run dev
```

Navigate to:
- **Donation Page**: `http://localhost:5173/`
- **Initial Admin Setup**: `http://localhost:5173/setup` (create your admin username & password)
- **Admin Login**: `http://localhost:5173/login`
- **Streamer Dashboard**: `http://localhost:5173/dashboard`
- **Overlay Controller**: `http://localhost:5173/overlay/control`
- **OBS Donation Alert Overlay**: `http://localhost:5173/overlay`
- **OBS Leaderboard Overlay**: `http://localhost:5173/overlay/leaderboard?limit=5`
- **OBS Countdown Overlay**: `http://localhost:5173/overlay/countdown?minutes=10`

---

## 5. Cloudflare D1 Database Setup

The app auto-creates the required tables (`donations`, `admins`) on first request. You can also manually apply the schema via Wrangler:

```sh
bunx wrangler d1 execute donate-tools-db --file=./schema.sql
```

Set production secrets in Cloudflare:

```sh
bunx wrangler secret put SLIP2SURE_API_KEY
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put SESSION_SECRET
bunx wrangler secret put TURNSTILE_SECRET_KEY
```

---

## 6. Production Deployment

Build and deploy to Cloudflare Workers:

```sh
bun run deploy
```

---

## 7. Next Steps

- [API Reference](./API.md) — Comprehensive documentation of all donation, SSE, and management endpoints.
- [Setup & Architecture](./README.md) — Environment variables, error codes, and security threat model.
- [OBS Studio Setup](./README.md#4-obs-studio-setup) — Configure your OBS Browser Source for streaming.
