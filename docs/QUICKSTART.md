# Quick Start Guide

Step-by-step setup guide for running Donate Tools locally and deploying to Cloudflare Workers.

---

## 1. Prerequisites

- [Bun](https://bun.sh) (v1.1+) or Node.js (v20+)
- [Cloudflare Account](https://dash.cloudflare.com) with Workers and D1 enabled
- [Slip2Sure Account & API Key](https://app.slip2sure.com) (for bank/TrueMoney slip verification)
- Microsoft Edge Neural TTS is built-in with zero API keys required

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
TTS_ENABLED=true

# Secret key & timeouts for HMAC-SHA256 signing of admin session tokens
SESSION_SECRET=change_me_to_random_secret
SESSION_TIMEOUT=3600
REFRESH_TOKEN_TIMEOUT=604800

# Receiving Account Configuration
VITE_BANK_NAME=KBANK
VITE_BANK_ACCOUNT=123-4-56789-0
VITE_ACCOUNT_NAME=นายสมชาย ใจดี
VITE_PROMPTPAY_ID=0812345678
VITE_TRUEWALLET_ID=0812345678

# Cloudflare Turnstile bot protection (optional)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFsDEJrv5csefss-
TURNSTILE_SECRET_KEY=your_turnstile_secret_key

# Discord OAuth2 Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_ALLOWED_USER_IDS=123456789012345678
```

---

## 4. Local Development Server

Start the local Vite dev server:

```sh
bun run dev
```

Navigate to:
- **Donation Page**: `http://localhost:5173/`
- **Admin Login (Discord OAuth2)**: `http://localhost:5173/login`
- **Streamer Dashboard**: `http://localhost:5173/dashboard`
- **Configuration (Theme, Header, TTS, Filter)**: `http://localhost:5173/dashboard/config`
- **Discord Access Whitelist**: `http://localhost:5173/dashboard/access`
- **Overlay Controller**: `http://localhost:5173/overlay/control` (or `/control`)
- **OBS Donation Alert Overlay**: `http://localhost:5173/overlay` (or `/overlay/alert`)
- **OBS Leaderboard Overlay**: `http://localhost:5173/overlay/leaderboard?limit=5`
- **OBS Countdown Overlay**: `http://localhost:5173/overlay/countdown?minutes=10`
- **OBS Subathon Marathon Overlay**: `http://localhost:5173/overlay/subathon?hours=2&sec_per_thb=6` (or `/overlay/submatron`)

---

## 5. Cloudflare D1 Database Setup

The app auto-creates the required tables (`donations`, `admins`, `subathon_state`, `discord_whitelist`) and missing columns on first request. You can also manually apply the schema via Wrangler:

```sh
bunx wrangler d1 execute donate-tools-db --file=./schema.sql
```

Set production secrets in Cloudflare:

```sh
bunx wrangler secret put SLIP2SURE_API_KEY
bunx wrangler secret put SESSION_SECRET
bunx wrangler secret put TURNSTILE_SECRET_KEY
bunx wrangler secret put DISCORD_CLIENT_SECRET
```

---

## 5b. Alternative: PostgreSQL

D1 is the default backend; set `POSTGRES_URL` (e.g. `postgresql://user:pass@host:5432/dbname`) to use Postgres instead — it takes precedence and D1 is unused. Tables auto-create on first request either way.

In Docker, set `POSTGRES_URL=postgresql://donate:donate@postgres:5432/donate` in `.env` and start both services:

```sh
docker compose up -d --build app postgres
```

---

## 6. Production Deployment

Build and deploy to Cloudflare Workers:

```sh
bun run deploy
```

---

## 7. Running in Docker

Works without a Cloudflare account — the app runs in a local `workerd` instance (via `vite preview`), with D1 backed by SQLite in a named volume.

```sh
cp .env.example .env   # edit with your values
docker compose up -d --build
```

- App: `http://localhost:4173/`
- All env values in `.env` reach the worker (no `.dev.vars` needed)
- D1 state lives in the `d1` volume — survives container/image rebuilds, lost with `docker compose rm -v`
- Behind a reverse proxy with a custom domain, uncomment `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` in `compose.yaml` (Vite otherwise rejects unknown `Host` headers with 403)
- To start from a clean database: `docker compose down && docker volume rm donate-tool_d1 && docker compose up -d`

---

## 8. Next Steps

- [API Reference](./API.md) — Comprehensive documentation of all donation, SSE, and management endpoints.
- [Setup & Architecture](./README.md) — Environment variables, error codes, and security threat model.
- [OBS Studio Setup](./README.md#4-obs-studio-setup) — Configure your OBS Browser Source for streaming.
