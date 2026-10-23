# Donate Tools Documentation

## 1. Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_SLIP2SURE_API_KEY` / `SLIP2SURE_API_KEY` | Yes | Application API Key from [Slip2Sure Dashboard](https://app.slip2sure.com) ("แอพของฉัน" -> Key icon). Make sure your server IP is whitelisted in the Slip2Sure app settings. |
| `VITE_GEMINI_API_KEY` / `GEMINI_API_KEY` | Optional | Google Gemini API Key for `gemini-2.5-flash-preview-tts` (fixed `Aoede` voice). Falls back to browser `speechSynthesis` (`th-TH`) if omitted. |
| `VITE_BANK_NAME` / `BANK_NAME` | Optional | Bank name/code displayed on the donation page (e.g., `KBANK`, `SCB`). |
| `VITE_BANK_ACCOUNT` / `BANK_ACCOUNT` | Optional | Receiving bank account number (displayed on UI and verified against slip receiver). |
| `VITE_ACCOUNT_NAME` / `ACCOUNT_NAME` | Optional | Account holder display name shown to donors. |
| `VITE_PROMPTPAY_ID` / `PROMPTPAY_ID` | Optional | Receiving PromptPay phone/ID number (displayed on UI and verified against slip receiver). |
| `VITE_TRUEWALLET_ID` / `TRUEWALLET_ID` | Optional | Receiving TrueMoney Wallet phone number (displayed on UI and verified against TrueMoney slip `account_to_mobile`). |

For Cloudflare Workers production deployment, set secrets via Wrangler:

```sh
bunx wrangler secret put SLIP2SURE_API_KEY
bunx wrangler secret put GEMINI_API_KEY
```

---

## 2. Internal Endpoints

### `GET /`
Donor-facing web form and recent donation feed. Supports:
- Uploading Bank Slip images (`PNG`, `JPG`, `JPEG`)
- Uploading TrueMoney Slip images (`PNG`, `JPG`, `JPEG`)
- Submitting raw Bank QR Code payload strings
- Sending test alerts without a slip (`type=test`)

### `GET /overlay`
Transparent OBS Browser Source overlay. Connects to `/api/events` via `EventSource`, queues incoming donations, animates the alert card, and plays raw 24kHz L16 PCM audio from Gemini TTS.

### `GET /api/events`
Server-Sent Events (`text/event-stream`) endpoint. Emits:
- `event: donate` — JSON payload of `DonateEvent` (`id`, `donor`, `amount`, `message`, `audioBase64`, `sampleRate`, `createdAt`)
- `event: ping` — Keep-alive heartbeat every 15 seconds

### `POST /api/donate`
Multipart form-data endpoint:

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | `bank-image` \| `truemoney` \| `bank-payload` \| `test` |
| `donor` | `string` | Optional display name (defaults to sender name on slip) |
| `message` | `string` | Donation message to display and read via TTS |
| `image` | `File` | Slip image file (required for `bank-image` and `truemoney`) |
| `payload` | `string` | QR Code string (required for `bank-payload`) |
| `amount` | `number` | Test amount in THB (used when `type=test`) |

---

## 3. Slip2Sure Upstream API Reference

All upstream requests use header `x-api-key: <SLIP2SURE_API_KEY>`.

| Slip Type | Upstream Endpoint | Content-Type | Body Field |
| :--- | :--- | :--- | :--- |
| Bank Slip (Image) | `POST https://api.slip2sure.com/api/v0/bank/v0/verifyByFile` | `multipart/form-data` | `image` (File) |
| Bank Slip (Payload) | `POST https://api.slip2sure.com/api/v0/bank/v0/verifyByPayload` | `application/json` | `{"payload": "..."}` |
| Bank Slip (Base64) | `POST https://api.slip2sure.com/api/v0/bank/v0/verifyByBase64` | `application/json` | `{"payload": "..."}` |
| TrueMoney (Image) | `POST https://api.slip2sure.com/api/v0/truemoney/v2/verify` | `multipart/form-data` | `image` (File) |

### Common Slip2Sure Error Codes

| Code | Cause | Fix |
| :--- | :--- | :--- |
| `INVALID_HEADER` | Missing `x-api-key` header | Set `VITE_SLIP2SURE_API_KEY` in `.env` |
| `UNAUTHORIZED` | Invalid API key | Check or rotate key in Slip2Sure dashboard |
| `IP_NOT_ALLOWED` | Server IP not whitelisted | Add your IP under "แอพของฉัน" -> Edit -> Whitelist IP |
| `CREDIT_INSUFFIENCT` | Insufficient Slip2Sure credit | Top up credit at `app.slip2sure.com` |
| `SLIP_NOT_EXIST` / `SLIP_QRCODE_NOT_EXIST` | Unreadable or invalid slip image | Upload a clear, uncropped PNG/JPG slip |
| `SLIP_BBL_PENDING` | Bangkok Bank slip pending confirmation | Wait 2–3 minutes after transfer and retry |
| `DUPLICATE_SLIP` | `is_exist: true` or already redeemed | Use a new transfer slip |

---

## 4. OBS Studio Setup

1. In OBS Studio, add a **Browser** source.
2. Set **URL** to `http://localhost:5173/overlay` (or your deployed Worker URL `/overlay`).
3. Set **Width** to `800` and **Height** to `400`.
4. Check **Control audio via OBS** if you want to route TTS audio through OBS mixer.
5. In the OBS custom CSS (default is already transparent), no changes are required; the page hides the browser audio unlock button automatically when clicked or can be hidden via `.unlock-btn { display: none; }`.
