# API Documentation

Base URL: `http://localhost:5173` (local development) or `https://donate-tools.detzz.workers.dev` (production).

> [!NOTE]
> Browser form/cookie `POST` routes are protected by Hono's `csrf()` middleware (`Origin` header validation) and `secureHeaders()`. Admin-protected endpoints accept either a valid `dash_token` HTTP-only session cookie (obtained via `/auth/discord`) or an `Authorization: Bearer <token>` header (obtained via `/api/manage/setup` or `/api/manage/login`). Unauthenticated API calls return `401 Unauthorized` JSON (`{"ok": false, "error": "UNAUTHORIZED" | "SETUP_REQUIRED"}`), missing permission scopes return `403 FORBIDDEN`, and owner-only routes return `403 OWNER_REQUIRED`.

---

## 1. Donation Endpoints

### `POST /api/donate`
Process a donation by verifying Cloudflare Turnstile (if configured), validating the bank/PromptPay or TrueMoney slip image via Slip2Sure, synthesizing Edge Neural TTS audio, persisting the transaction to Cloudflare D1, and broadcasting a real-time `donate` SSE event.

- **Content-Type**: `multipart/form-data`
- **Authentication**: Public (protected by optional Cloudflare Turnstile)

#### Request Fields
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `type` | `string` | No | `bank-image` (default) or `truemoney`. |
| `donor` | `string` | No | Donor display name (max 50 chars). Defaults to sender name extracted from slip. |
| `message` | `string` | No | Donation message read aloud by TTS (max 200 chars). |
| `image` | `File` | Yes | Slip image (`image/png`, `image/jpeg`, or `image/webp`, max 5 MB). |
| `cf-turnstile-response` | `string` | Conditional | Cloudflare Turnstile token (required when `TURNSTILE_SECRET_KEY` is configured). |

#### Success Response (`200 OK`)
```json
{
  "ok": true,
  "event": {
    "id": "e6a4b3f1-285b-481d-862d-6060c283d6a9",
    "donor": "SOMCHAI",
    "amount": 100,
    "message": "Keep up the great work!",
    "type": "bank-image",
    "transRef": "2026103001234567890",
    "audioBase64": "UklGRi...",
    "sampleRate": 24000,
    "createdAt": 1793335000000
  }
}
```

#### Error Response (`400 Bad Request` / upstream status)
```json
{
  "ok": false,
  "code": "DUPLICATE_SLIP",
  "error": "สลิปนี้ถูกใช้งานไปแล้ว"
}
```

#### Error Codes
| Code | Status | Description |
| :--- | :---: | :--- |
| `DONATE_CLOSED` | `403` | Donations are disabled (`donateEnabled: false`). |
| `TURNSTILE_REQUIRED` | `400` | Turnstile token missing when `TURNSTILE_SECRET_KEY` is enabled. |
| `TURNSTILE_FAILED` | `400` | Turnstile token verification failed at Cloudflare siteverify. |
| `MIN_AMOUNT` | `400` | Slip transfer amount is less than `10` THB. |
| `WRONG_RECEIVER` | `400` | Slip recipient account/PromptPay/TrueMoney number does not match configured receiver. |
| `INVALID_SLIP` | `400` | Missing transaction reference in slip verification payload. |
| `DUPLICATE_SLIP` | `400` | Slip was already used (`is_exist`, stored in DB `donations`, or currently in-flight). |
| `UPSTREAM_ERROR` | `502` | Unable to reach Slip2Sure verification API. |
| `<SLIP2SURE_CODE>` | `4xx/5xx` | Upstream Slip2Sure error code (e.g., `SLIP_NOT_EXIST`, `SLIP_BBL_PENDING`, `UNAUTHORIZED`). |

---

### `POST /api/donate/test`
Trigger a simulated donation alert with Edge Neural TTS audio synthesis, store it in D1 (`type: "test"`), and broadcast it to all connected overlays and dashboards.

- **Content-Type**: `application/json`
- **Authentication**: Admin session cookie (`dash_token`) or `Authorization: Bearer <token>` required

#### Request Body
| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :--- | :--- |
| `donor` | `string` | No | `"TEST DONOR"` | Simulated donor name (max 50 chars). |
| `amount` | `number` | No | `99` | Simulated amount in THB (clamped between `10` and `1,000,000`). |
| `message` | `string` | No | `"ทดสอบระบบแจ้งเตือนโดเนท!"` | Simulated message read aloud by TTS (max 200 chars). |
| `ttsEnabled` | `boolean` | No | current setting | Override whether TTS is synthesized/spoken for this test alert. |

```json
{
  "donor": "TEST DONOR",
  "amount": 99,
  "message": "ทดสอบระบบแจ้งเตือนโดเนท!",
  "ttsEnabled": true
}
```

#### Success Response (`200 OK`)
```json
{
  "ok": true,
  "event": {
    "id": "c1f73b88-c71b-42ea-a4e9-1144de94c8ee",
    "donor": "TEST DONOR",
    "amount": 99,
    "message": "ทดสอบระบบแจ้งเตือนโดเนท!",
    "type": "test",
    "transRef": "TEST-1793335000000",
    "audioBase64": "UklGRi...",
    "sampleRate": 24000,
    "ttsEnabled": true,
    "createdAt": 1793335000000
  }
}
```

---

## 2. Real-Time Server-Sent Events (SSE) & Overlay Control

### `GET /api/events`
Unified SSE stream for the donor home page, streamer dashboard, overlay controller, or custom integrations.

- **Query Parameters**:
  - `client` (optional): `dashboard` | `overlay` | `default`. Passing `client=overlay` registers the connection in the active overlay pool.
- **Headers**:
  - `Accept: text/event-stream`

#### SSE Events Emitted
1. `heartbeat`: Sent immediately on connection (includes `client` identifier) and every 15 seconds thereafter.
   ```
   event: heartbeat
   data: {"ok":true,"client":"default","online":true,"count":1,"timestamp":1793335000000}
   ```
2. `overlay_status`: Sent immediately on connection and broadcast whenever an overlay connects, disconnects, or sends a heartbeat.
   ```
   event: overlay_status
   data: {"online":true,"count":1,"ttsEnabled":true,"ttsVoice":"th-TH-NiwatNeural","ttsRate":"+0%","ttsPitch":"+0Hz","filterEnabled":true,"filterAction":"censor","timestamp":1793335000000}
   ```
3. `donate`: Broadcast when a real or test donation is processed.
   - **Privacy Scrubbing**: `transRef` is included only if the SSE request carries a valid admin `dash_token` cookie; public/non-admin streams have `transRef` omitted.
   ```
   event: donate
   id: e6a4b3f1-285b-481d-862d-6060c283d6a9
   data: {"id":"e6a4b3f1-285b-481d-862d-6060c283d6a9","donor":"SOMCHAI","amount":100,"message":"Keep up the great work!","type":"bank-image","audioBase64":"...","sampleRate":24000,"createdAt":1793335000000}
   ```
4. `control`: Broadcast to overlay (`client=overlay`) and authenticated admin streams when an admin dispatches a command via `POST /api/events/control` or `POST /api/manage/overlay/control`.
   ```
   event: control
   data: {"action":"reload","timestamp":1793335000000}
   ```
   *(For timer overlays, action may be `"countdown"` with payload `diffSeconds`, `setSeconds`, `pause`, or `resume`.)*
5. `ping`: Keep-alive frame emitted every 15 seconds.
   ```
   event: ping
   data: 1
   ```

---

### `GET /api/events/overlay`
Dedicated SSE stream endpoint for the OBS `/overlay` page. Equivalent to `GET /api/events?client=overlay`.

- **Behavior**:
  - Registers a unique connection ID in `overlayConnections` and marks overlay status `online: true`.
  - Broadcasts updated `overlay_status` to all connected clients.
  - Renews heartbeat every 15 seconds while open.
  - Automatically removes the connection ID and broadcasts updated `overlay_status` when the stream aborts or closes.

---

### `GET /api/events/status`
Retrieve current overlay online state, active SSE connection count, donation gate, theme/header config, and live TTS / filter settings.

- **Authentication**: None
- **Success Response (`200 OK`)**:
```json
{
  "ok": true,
  "online": true,
  "count": 1,
  "donateEnabled": true,
  "themeFlavor": "macchiato",
  "themeAccent": "sapphire",
  "siteTitle": "",
  "headerTitle": "",
  "headerSubtitle": "",
  "ttsEnabled": true,
  "ttsVoice": "th-TH-NiwatNeural",
  "ttsRate": "+0%",
  "ttsPitch": "+0Hz",
  "filterEnabled": true,
  "filterAction": "censor",
  "timestamp": 1793335000000
}
```

---

### `GET /api/events/leaderboard`
Retrieve ranked list of top donors aggregated by cumulative donation sum from Cloudflare D1 (excluding simulated test donations).

- **Query Parameters**:
  - `limit` (`number`, optional): Max ranks returned (clamped between `1` and `50`, default `5`).
- **Authentication**: None
- **Success Response (`200 OK`)**:
```json
{
  "ok": true,
  "items": [
    {
      "donor": "SOMCHAI",
      "total": 5000,
      "count": 12
    },
    {
      "donor": "ALICE",
      "total": 3500,
      "count": 4
    }
  ]
}
```

---

### `GET /api/events/poll`
Fallback JSON polling endpoint for recent donations (within the last 60 seconds) and current overlay status.

- **Query Parameters**:
  - `since` (`number`, optional): Unix timestamp in ms. Clamped to at most 60 seconds ago (`Date.now() - 60000`).
  - `client` (`string`, optional): Pass `client=overlay` to refresh the server-side overlay heartbeat (`15s` TTL).
- **Authentication**: Public (`transRef` is scrubbed unless a valid `dash_token` cookie is present).

#### Success Response (`200 OK`)
```json
{
  "ok": true,
  "items": [
    {
      "id": "e6a4b3f1-285b-481d-862d-6060c283d6a9",
      "donor": "SOMCHAI",
      "amount": 100,
      "message": "Keep going!",
      "type": "bank-image",
      "sampleRate": 24000,
      "createdAt": 1793335000000
    }
  ],
  "overlayOnline": true,
  "overlayStatus": {
    "online": true,
    "count": 1,
    "timestamp": 1793335000000
  }
}
```

---

### `GET /api/events/heartbeat` & `POST /api/events/heartbeat`
Manually touch the overlay heartbeat timestamp (marks overlay online for 15 seconds even without an open SSE stream) and broadcast `overlay_status`.

- **Authentication**: `controls` permission (`dash_token` cookie or `Authorization: Bearer <token>`); `GET` requires `Authorization: Bearer <token>` and rejects cookie-only calls with `405 USE_POST_FOR_HEARTBEAT`
- **Success Response (`200 OK`)**:
```json
{
  "ok": true,
  "online": true,
  "count": 1,
  "timestamp": 1793335000000
}
```

---

### `POST /api/events/control`
Dispatch a remote command to all connected OBS overlay clients over the SSE `control` event channel.

- **Content-Type**: `application/json`
- **Authentication**: `controls` or `config` permission (`dash_token` cookie or `Authorization: Bearer <token>`)

#### Request Body
```json
{
  "action": "reload"
}
```

| Action | Effect |
| :--- | :--- |
| `reload` | Instructs connected `/overlay` browsers to execute `window.location.reload()`. |
| `clear` | Empties the overlay's client-side alert queue, stops active TTS playback, and hides the alert card. |
| `disconnect` | Clears `overlayConnections` and resets `lastOverlayHeartbeat` on the server, then broadcasts `disconnect` so overlays close and reconnect after 2 seconds. |
| `tts` | Toggles TTS voice on/off (or sets `enabled: boolean`, `voice`, `rate`, `pitch`), persists to DB, and immediately updates overlay audio. |
| `heartbeat` | Renews overlay heartbeat and broadcasts `overlay_status`. |
| `countdown` | Controls `/overlay/countdown` timer (`cmd`: `'start'`, `'pause'`, `'reset'`, `'set'`, `'adjust'`; `seconds` or `minutes`; `delta` in seconds; `title`). |
| `leaderboard` | Updates leaderboard overlay options (`limit`, `title`, `transparent`). |
| `subathon` | Updates/controls `/overlay/subathon` state and broadcasts command. |
| `alert` | Controls alert overlay state (`transparent`). |
| `bg` | Updates overlay transparent background state. |
| `theme` | Broadcasts theme flavor/accent update (`flavor`, `accent`). |

#### Success Response (`200 OK`)
```json
{
  "ok": true,
  "command": {
    "action": "reload",
    "timestamp": 1793335000000
  },
  "status": {
    "online": true,
    "count": 1,
    "timestamp": 1793335000000
  }
}
```

#### Error Response (`400 Bad Request`)
```json
{
  "ok": false,
  "error": "ACTION_REQUIRED" | "INVALID_ACTION"
}
```

---

## 3. Authentication & Admin Endpoints

Admin browser sessions use two HTTP-only, `SameSite=Lax` cookies signed with `HMAC-SHA256`: `dash_token` (access token, `SESSION_TIMEOUT` default `3600` seconds) and `dash_refresh` (refresh token, `REFRESH_TOKEN_TIMEOUT` default `604800` seconds). Passwords for headless setup/login are hashed using Web Crypto `PBKDF2` (`100,000` iterations, `SHA-256`, 16-byte random salt).

### `GET /auth/discord` (`GET /login/discord`)
Initiate Discord OAuth2 authorization with a 5-minute HTTP-only `discord_oauth_state` CSRF cookie. `POST /login` and `POST /setup` redirect to `/auth/discord`.

### `GET /auth/discord/callback` (`GET /login/discord/callback`)
Verify `state` cookie, exchange the OAuth code for a Discord user profile, verify the Discord ID against `DISCORD_ALLOWED_USER_IDS` (primary owner) or DB `discord_whitelist`, update the stored Discord username, set `dash_token` and `dash_refresh`, and redirect to the operator's first permitted route (`/dashboard`, `/overlay/control`, `/dashboard/config`, or `/dashboard/access`).

### `POST /logout`
Clear both `dash_token` and `dash_refresh` session cookies.

- **Responses**:
  - `302 Found -> /login`

---

## 4. Management JSON API (`/api/manage`)

Headless JSON API for programmatic administration. Supports both the `dash_token` session cookie and `Authorization: Bearer <token>` header. Requests carrying `Authorization: Bearer <token>` (plus `/api/manage/login` and `/api/manage/setup`) bypass browser `Origin` CSRF checks so CLI tools and external services can call them directly.

### `POST /api/manage/setup`
Initialize the admin account when none exists in DB.

- **Content-Type**: `application/json`
- **Headers**: `x-setup-token: <SESSION_SECRET>` (or `setupToken` in body)
- **Authentication**: Requires `SESSION_SECRET` setup token (only succeeds when no admin exists)
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "yourpassword"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "admin",
    "token": "1793940000000.<hmac_sha256_hex>",
    "refreshToken": "1794541200000.<hmac_sha256_hex>",
    "sessionTimeoutMs": 3600000,
    "expiresAt": 1793940000000,
    "refreshExpiresAt": 1794541200000
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"ok": false, "error": "INVALID_CREDENTIALS_FORMAT"}` (username empty or password < 8 chars)
  - `403 Forbidden`: `{"ok": false, "error": "INVALID_SETUP_TOKEN" | "SETUP_DISABLED"}`
  - `409 Conflict`: `{"ok": false, "error": "ADMIN_ALREADY_EXISTS" | "SETUP_FAILED"}`

---

### `POST /api/manage/login`
Authenticate with `username` and `password` to receive a signed bearer token (also sets the `dash_token` cookie). Rate-limited to 3 failed attempts per 60 seconds per client IP (`cf-connecting-ip`).

- **Content-Type**: `application/json`
- **Authentication**: Public
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "yourpassword"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "admin",
    "token": "1793940000000.<hmac_sha256_hex>",
    "expiresAt": 1793940000000
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"ok": false, "error": "SETUP_REQUIRED"}`
  - `401 Unauthorized`: `{"ok": false, "error": "INVALID_CREDENTIALS"}`
  - `429 Too Many Requests`: `{"ok": false, "error": "RATE_LIMITED"}`

---

### `POST /api/manage/logout`
Clear the `dash_token` cookie.

- **Response (`200 OK`)**: `{"ok": true}`

---

### `GET /api/manage/auth/status`
Inspect current authentication state, role (`owner` or `member`), active auth method (`bearer` or `cookie`), token version, session/refresh timeout timestamps, Bearer API enablement, and IP rate-limit status.

- **Authentication**: Public (returns extended session details when authenticated)
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "setupRequired": false,
    "authenticated": true,
    "role": "owner",
    "authMethod": "bearer",
    "username": "admin",
    "apiEnabled": true,
    "tokenVersion": 1,
    "sessionTimeoutMs": 3600000,
    "expiresAt": 1793940000000,
    "hasRefreshToken": true,
    "refreshExpiresAt": 1794541200000,
    "rateLimited": false
  }
  ```

---

### `POST /api/manage/auth/refresh`
Issue a fresh `dash_token` and `dash_refresh` pair using a valid refresh token (`refreshToken` / `refresh_token` in JSON body, `x-refresh-token` header, or `dash_refresh` cookie) or active session.

- **Authentication**: Refresh token (`dash_refresh` / `x-refresh-token` / body `refreshToken`) or active `Authorization: Bearer <token>` / `dash_token` cookie
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "admin",
    "token": "1793940000000.<hmac_sha256_hex>",
    "refreshToken": "1794541200000.<hmac_sha256_hex>",
    "tokenVersion": 1,
    "sessionTimeoutMs": 3600000,
    "expiresAt": 1793940000000,
    "refreshExpiresAt": 1794541200000
  }
  ```

---

### `POST /api/manage/auth/revoke`
Increment `token_version` in DB to immediately revoke all previously issued Bearer tokens, `dash_token`, and `dash_refresh` cookies across all devices.

- **Content-Type**: `application/json`
- **Authentication**: Primary owner (`ownerAuth`: `Authorization: Bearer <token>` or `dash_token` cookie)
- **Request Body (optional)**:
  ```json
  {
    "keepCurrent": true
  }
  ```
  - When `keepCurrent: true`, returns newly signed `token` and `refreshToken` for the new `tokenVersion` and updates cookies.
  - When `keepCurrent: false` (default), clears session cookies and invalidates all tokens immediately.
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "revoked": true,
    "tokenVersion": 2,
    "token": "1793940000000.<hmac_sha256_hex>",
    "refreshToken": "1794541200000.<hmac_sha256_hex>",
    "sessionTimeoutMs": 3600000,
    "expiresAt": 1793940000000,
    "refreshExpiresAt": 1794541200000
  }
  ```

---

### `PUT /api/manage/auth/config`
Control external Management API access (`apiEnabled`) and reset IP login rate-limit lockouts (`unlockRateLimit`).
When `apiEnabled` is set to `false`, `POST /api/manage/login` and all `Authorization: Bearer <token>` requests are rejected with `403 Forbidden` (`{"ok": false, "error": "MANAGE_API_DISABLED"}`), while browser dashboard cookie sessions remain usable so the owner can re-enable it.

- **Content-Type**: `application/json`
- **Authentication**: Primary owner (`ownerAuth`)
- **Request Body**:
  ```json
  {
    "apiEnabled": true,
    "unlockRateLimit": true
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "apiEnabled": true,
    "tokenVersion": 2,
    "rateLimitCleared": true
  }
  ```

---

### `GET /api/manage/me`
Return current admin username, caller `permissions`, TTS setting, donation totals (excluding test alerts), and live overlay status.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "admin",
    "permissions": ["dashboard", "controls", "config", "access"],
    "ttsEnabled": true,
    "stats": {
      "count": 42,
      "totalAmount": 5400
    },
    "overlayStatus": {
      "online": true,
      "count": 1,
      "ttsEnabled": true,
      "timestamp": 1793335000000
    }
  }
  ```

---

### `PUT /api/manage/credentials`
Update admin `username` and/or `password`. Because tokens are HMAC-signed with the admin's password hash, changing the password or username immediately invalidates all previously issued tokens and returns a fresh token.

- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Request Body**:
  | Field | Type | Required | Description |
  | :--- | :--- | :---: | :--- |
  | `currentPassword` | `string` | Yes | Current admin password for verification. |
  | `username` | `string` | No | New admin username (1–50 chars; defaults to current username). |
  | `newPassword` | `string` | No | New admin password (min 8 chars if provided; keeps current password if omitted). |
  ```json
  {
    "currentPassword": "oldpassword",
    "username": "newadmin",
    "newPassword": "newpassword123"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "newadmin",
    "token": "1793940000000.<hmac_sha256_hex>",
    "expiresAt": 1793940000000
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{"ok": false, "error": "INVALID_CREDENTIALS_FORMAT" | "SETUP_REQUIRED"}`
  - `401 Unauthorized`: `{"ok": false, "error": "INVALID_CURRENT_PASSWORD" | "UNAUTHORIZED"}`

---

### `GET /api/manage/donations`
List recorded donations and aggregate revenue stats.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Query Parameters**:
  - `limit` (`number`, optional): Max rows to return (`1`–`500`, default `100`).
  - `since` (`number`, optional): Only return donations with `createdAt > since` (default `0`).
  - `includeTest` (`string`, optional): Set `true` or `1` to include `type: "test"` alerts.
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "stats": {
      "count": 42,
      "totalAmount": 5400
    },
    "items": [
      {
        "id": "e6a4b3f1-285b-481d-862d-6060c283d6a9",
        "donor": "SOMCHAI",
        "amount": 100,
        "message": "Keep going!",
        "type": "bank-image",
        "transRef": "2026103001234567890",
        "sampleRate": 24000,
        "createdAt": 1793335000000
      }
    ]
  }
  ```

---

### `DELETE /api/manage/donations/:id`
Delete a donation record by ID from D1.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Success Response (`200 OK`)**: `{"ok": true, "id": "e6a4b3f1-285b-481d-862d-6060c283d6a9"}`
- **Error Response (`404 Not Found`)**: `{"ok": false, "error": "NOT_FOUND"}`

---

### `GET /api/manage/overlay`
Inspect live overlay connection status and TTS state.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "online": true,
    "count": 1,
    "ttsEnabled": true,
    "timestamp": 1793335000000
  }
  ```

---

### `GET /api/manage/tts` & `PUT /api/manage/tts`
Query or update the Edge Neural TTS voice settings (`enabled`, `voice`, `rate`, `pitch`). Persisted in D1 (`admins` table) and broadcast in real time to all connected overlays.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Request Body (`PUT /api/manage/tts`, optional)**:
  ```json
  {
    "enabled": true,
    "voice": "th-TH-NiwatNeural",
    "rate": "+0%",
    "pitch": "+0Hz"
  }
  ```
  *(Supported voices: `th-TH-NiwatNeural`, `th-TH-PremwadeeNeural`, `en-US-AriaNeural`, `en-US-GuyNeural`, `en-US-JennyNeural`, `ja-JP-NanamiNeural`, `ja-JP-KeitaNeural`.)*
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "enabled": true,
    "voice": "th-TH-NiwatNeural",
    "rate": "+0%",
    "pitch": "+0Hz",
    "voices": [
      { "id": "th-TH-NiwatNeural", "name": "Thai - Niwat (Male)", "lang": "th-TH", "gender": "Male" },
      { "id": "th-TH-PremwadeeNeural", "name": "Thai - Premwadee (Female)", "lang": "th-TH", "gender": "Female" }
    ],
    "overlayStatus": {
      "online": true,
      "count": 1,
      "ttsEnabled": true,
      "ttsVoice": "th-TH-NiwatNeural",
      "ttsRate": "+0%",
      "ttsPitch": "+0Hz",
      "filterEnabled": true,
      "filterAction": "censor",
      "timestamp": 1793335000000
    }
  }
  ```

---

### `GET /api/manage/filter` & `PUT /api/manage/filter`
Query or update the donation profanity and word filtering configuration. Persisted in Cloudflare D1 (`admins` table) and broadcast in real time to all connected overlays.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Request Body (`PUT /api/manage/filter`, optional)**:
  ```json
  {
    "enabled": true,
    "action": "censor",
    "words": "badword1, badword2\nbadword3"
  }
  ```
  - `enabled` (`boolean`): Toggle the word filter on or off.
  - `action` (`"censor"` | `"mute"`):
    - `"censor"`: Replaces profanity with asterisks (`***`) and skips asterisks in spoken TTS.
    - `"mute"`: Automatically silences/mutes TTS audio for flagged donation messages while preserving visual text.
  - `words` (`string`): Comma- or newline-separated custom blocked words. Added on top of 270+ built-in Thai/English profanities (obbaeiei/bad-words-thai).
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "enabled": true,
    "action": "censor",
    "words": "badword1, badword2",
    "defaultCount": 273,
    "overlayStatus": {
      "online": true,
      "count": 1,
      "ttsEnabled": true,
      "ttsVoice": "th-TH-NiwatNeural",
      "filterEnabled": true,
      "filterAction": "censor",
      "timestamp": 1793335000000
    }
  }
  ```

---

### `POST /api/manage/overlay/control`
Broadcast a control command (`reload`, `clear`, `disconnect`, `tts`, `heartbeat`, `countdown`, `leaderboard`, `subathon`, `alert`, `bg`, `theme`) to connected OBS overlays.

- **Content-Type**: `application/json`
- **Authentication**: `controls` or `config` permission (`Authorization: Bearer <token>` or `dash_token` cookie)
- **Request Body**:
  ```json
  {
    "action": "clear"
  }
  ```
  *(For timer overlays: `{ "action": "countdown", "cmd": "adjust", "delta": 60 }` to add 1 minute, or `-60` to subtract.)*
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "command": {
      "action": "clear",
      "timestamp": 1793335000000
    },
    "status": {
      "online": true,
      "count": 1,
      "timestamp": 1793335000000
    }
  }
  ```

---

### `GET /api/manage/donate` & `PUT /api/manage/donate`
Query or toggle the public donation gate (`donateEnabled`). `PUT` accepts `{"enabled": true|false}` (toggles current state if omitted; requires `dashboard` or `config` permission) and broadcasts updated `overlayStatus`.

---

### `GET /api/manage/theme` & `PUT /api/manage/theme`
Query or update the Catppuccin UI theme (`flavor`: `macchiato` | `latte` | `frappe` | `mocha`; `accent`: `rosewater` | `flamingo` | `pink` | `mauve` | `red` | `maroon` | `peach` | `yellow` | `green` | `teal` | `sky` | `sapphire` | `blue` | `lavender`). `PUT` requires `config` permission and broadcasts a `theme` control event.

---

### `GET /api/manage/header` & `PUT /api/manage/header`
Query or update custom page/header text (`siteTitle` max 80 chars, `headerTitle` max 80 chars, `headerSubtitle` max 200 chars). `PUT` requires `config` permission and broadcasts updated `overlayStatus`.

---

### `GET /api/manage/subathon` & `PUT /api/manage/subathon`
Query or update subathon timer settings and state (`PUT` applies a `set` command; requires `controls` permission).

---

### `GET /api/manage/access`, `POST /api/manage/access`, `PATCH /api/manage/access/:id` & `DELETE /api/manage/access/:id`
Manage Discord whitelist operators and per-section permissions (`dashboard`, `controls`, `config`, `access`; requires `access` permission). Non-owner operators cannot self-modify (`403 CANNOT_MODIFY_SELF`), grant or edit `access` entries (`403 OWNER_REQUIRED`), or grant permissions they do not hold (`403 FORBIDDEN`).
- `POST /api/manage/access`: Add or upsert a Discord ID (`discordId`, optional `username`, `note`, `permissions`; rejects `DISCORD_ALLOWED_USER_IDS` with `400 CANNOT_MODIFY_OWNER`).
- `PATCH /api/manage/access/:id`: Update `username`, `note`, or `permissions` for a non-owner DB entry (`400 CANNOT_MODIFY_OWNER` if ID is in `DISCORD_ALLOWED_USER_IDS`).
- `DELETE /api/manage/access/:id`: Remove a DB whitelist entry (`400 CANNOT_MODIFY_OWNER` / `CANNOT_REMOVE_SELF`).
