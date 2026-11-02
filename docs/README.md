# Donate Tools Documentation

## 1. Environment Variables

Copy `.env.example` to `.env` for local development:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `SLIP2SURE_API_KEY` / `VITE_SLIP2SURE_API_KEY` | Yes | Application API Key from [Slip2Sure Dashboard](https://app.slip2sure.com) ("แอพของฉัน" -> Key icon). Ensure your server/Worker IP is whitelisted if IP restriction is enabled. |
| `GEMINI_API_KEY` / `VITE_GEMINI_API_KEY` | Optional | Google Gemini API Key for `gemini-2.5-flash-preview-tts` (fixed `Aoede` voice). Falls back to browser `speechSynthesis` (`th-TH`) if omitted. |
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
bunx wrangler secret put GEMINI_API_KEY
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
- `GET /dashboard`: Streamer dashboard with total revenue, donation count, test alert sender, and transaction log (Admin only).
- `GET /overlay/control` (alias `GET /control`): Live overlay controller with connection counter, remote command bus (`reload`, `clear`, `disconnect`), heartbeat ping, and real-time event terminal (Admin only).
- `GET /overlay`: Transparent OBS Browser Source alert overlay.

### API Endpoints
- `POST /api/donate`: Verify Turnstile & slip image, synthesize Gemini TTS, store in D1, and broadcast donation event.
- `POST /api/donate/test`: Trigger a simulated donation alert with TTS (Admin only).
- `GET /api/events`: Unified SSE stream (`heartbeat`, `overlay_status`, `donate`, `control`, `ping`).
- `GET /api/events/overlay`: Dedicated SSE stream for OBS `/overlay` that tracks active overlay connections.
- `GET /api/events/status`: Current overlay connection status (`online`, `count`, `timestamp`).
- `GET /api/events/poll`: Fallback polling for recent donations and overlay status (`?since=<ms>&client=overlay`).
- `GET /api/events/heartbeat` & `POST /api/events/heartbeat`: Touch/renew overlay heartbeat and broadcast status (Admin only).
- `POST /api/events/control`: Dispatch remote command (`reload`, `clear`, `disconnect`) to connected overlays (Admin only).
- `POST /setup`, `POST /login`, `POST /logout`: Admin authentication form handlers.
- `POST /api/manage/setup`, `POST /api/manage/login`, `POST /api/manage/logout`: Headless JSON authentication (issues `Bearer` token and `dash_token` cookie).
- `GET /api/manage/me`, `PUT /api/manage/credentials`: Inspect admin profile/stats and rotate admin username/password.
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

1. In OBS Studio, add a **Browser** source.
2. Set **URL** to `http://localhost:5173/overlay` (or your deployed Worker URL `/overlay`).
3. Set **Width** to `800` and **Height** to `400`.
4. Check **Control audio via OBS** if you want to route TTS audio through the OBS audio mixer.
5. Open `/overlay/control` in your browser to verify that **CONNECTION** shows `ONLINE` and use the **TEST DONATION ALERT** or **REMOTE COMMAND BUS** (`CLEAR QUEUE`, `FORCE RELOAD`, `RESET SOCKETS`) to manage the overlay live during streams.
