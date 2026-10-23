# Donate Tools — Slip2Sure + Gemini TTS

Stream donation receiving app with real-time OBS overlay alerts, automatic slip verification via [Slip2Sure API](https://app.slip2sure.com/user/api/docs), and voice synthesis powered by Google Gemini 2.5 Flash TTS. Built on Hono + Vite + Cloudflare Workers with zero extra runtime dependencies.

## Features

- **Slip Verification (`Slip2Sure API`)**:
  - Bank slip image upload (`POST /api/v0/bank/v0/verifyByFile`)
  - TrueMoney Wallet slip image upload (`POST /api/v0/truemoney/v2/verify`)
  - Bank QR payload verification (`POST /api/v0/bank/v0/verifyByPayload`)
  - Duplicate slip rejection (`is_exist` flag + transaction reference tracking)
- **AI Voice Alerts (`Gemini 2.5 Flash TTS`)**:
  - Selectable voices (`Kore`, `Puck`, `Zephyr`, `Charon`, `Aoede`)
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
   Fill in `VITE_SLIP2SURE_API_KEY` and `VITE_GEMINI_API_KEY` in `.env`.

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

## Documentation

See [docs/README.md](./docs/README.md) for API endpoints, Slip2Sure error codes, and OBS setup instructions.
