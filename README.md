# Donate Tools — Slip2Sure + Gemini TTS

Stream donation receiving app with real-time OBS overlay alerts, automatic slip verification via [Slip2Sure API](https://app.slip2sure.com/user/api/docs), and voice synthesis powered by Google Gemini 2.5 Flash TTS. Built on Hono + Vite + Cloudflare Workers with zero extra runtime dependencies.

## Features

- **Slip Verification (`Slip2Sure API`)**:
  - Bank slip image upload (`POST /api/v0/bank/v0/verifyByFile`)
  - TrueMoney Wallet slip image upload (`POST /api/v0/truemoney/v2/verify`)
  - Bank QR payload verification (`POST /api/v0/bank/v0/verifyByPayload`)
  - Receiver account matching against configured Bank, PromptPay, or TrueMoney ID
  - Duplicate slip rejection (`is_exist` flag + transaction reference tracking)
- **AI Voice Alerts (`Gemini 2.5 Flash TTS`)**:
  - Fixed `Aoede` voice
  - Direct 24kHz 16-bit PCM Web Audio decoding in browser
  - Automatic fallback to Web Speech API (`th-TH`) when `VITE_GEMINI_API_KEY` is omitted
- **Real-Time OBS Overlay (`/overlay`)**:
  - Transparent background ready for OBS Browser Source
  - Server-Sent Events (`/api/events`) with sequential alert + audio playback queue

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
   # API Keys
   VITE_SLIP2SURE_API_KEY=your_slip2sure_api_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here

   # Receiving Account Configuration (displayed on UI & verified against slips)
   VITE_BANK_NAME=KBANK
   VITE_BANK_ACCOUNT=123-4-56789-0
   VITE_ACCOUNT_NAME=นายสมชาย ใจดี
   VITE_PROMPTPAY_ID=0812345678
   VITE_TRUEWALLET_ID=0812345678
   ```

3. **Run local dev server**
   ```sh
   bun run dev
   ```
   - **Donation Page**: `http://localhost:5173/`
   - **OBS Overlay**: `http://localhost:5173/overlay`

4. **Deploy to Cloudflare Workers**
   ```sh
   bun run deploy
   ```

## Project Structure

- `src/index.tsx` — App entry and route wiring
- `src/modules/config.ts` — Environment & receiver account config loader
- `src/modules/slip2sure.ts` — Slip2Sure API verification + receiver/duplicate checks
- `src/modules/tts.ts` — Gemini 2.5 Flash TTS (`Aoede`) audio generator
- `src/modules/events.ts` — SSE stream (`/api/events`) and donation history
- `src/modules/donate.ts` — Donation submission handler (`POST /api/donate`)
- `src/pages/home.tsx` — Donor web page (`GET /`)
- `src/pages/overlay.tsx` — OBS Browser Source alert overlay (`GET /overlay`)

## Documentation

- [API Reference](./docs/API.md) — Comprehensive documentation for endpoints, SSE events, and payloads.
- [Setup & Architecture](./docs/README.md) — Environment variables, Slip2Sure error codes, and OBS configuration.
