# API Documentation

Base URL: `http://localhost:5173` (local development) or `https://donate-tools.detzz.workers.dev` (production).

> [!NOTE]
> Browser form/cookie `POST` routes are protected by Hono's `csrf()` middleware (`Origin` header validation) and `secureHeaders()`. Admin-protected endpoints accept either a valid `dash_token` HTTP-only session cookie (obtained via `/setup` or `/login`) or an `Authorization: Bearer <token>` header (obtained via `/api/manage/setup` or `/api/manage/login`). Unauthenticated API calls return `401 Unauthorized` JSON (`{"ok": false, "error": "UNAUTHORIZED" | "SETUP_REQUIRED"}`).

---

## 1. Donation Endpoints

### `POST /api/donate`
Process a donation by verifying Cloudflare Turnstile (if configured), validating the bank/PromptPay or TrueMoney slip image via Slip2Sure, synthesizing Gemini 2.5 Flash TTS audio, persisting the transaction to Cloudflare D1, and broadcasting a real-time `donate` SSE event.

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
| `TURNSTILE_REQUIRED` | `400` | Turnstile token missing when `TURNSTILE_SECRET_KEY` is enabled. |
| `TURNSTILE_FAILED` | `400` | Turnstile token verification failed at Cloudflare siteverify. |
| `MIN_AMOUNT` | `400` | Slip transfer amount is less than `10` THB. |
| `WRONG_RECEIVER` | `400` | Slip recipient account/PromptPay/TrueMoney number does not match configured receiver. |
| `INVALID_SLIP` | `400` | Missing transaction reference in slip verification payload. |
| `DUPLICATE_SLIP` | `400` | Slip was already used (`is_exist`, stored in D1 `donations`, or currently in-flight). |
| `UPSTREAM_ERROR` | `502` | Unable to reach Slip2Sure verification API. |
| `<SLIP2SURE_CODE>` | `4xx/5xx` | Upstream Slip2Sure error code (e.g., `SLIP_NOT_EXIST`, `SLIP_BBL_PENDING`, `UNAUTHORIZED`). |

---

### `POST /api/donate/test`
Trigger a simulated donation alert with Gemini TTS audio synthesis, store it in D1 (`type: "test"`), and broadcast it to all connected overlays and dashboards.

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
   data: {"online":true,"count":1,"timestamp":1793335000000}
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
Retrieve current overlay online state and active SSE connection count.

- **Authentication**: None
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

- **Authentication**: Admin session cookie (`dash_token`) or `Authorization: Bearer <token>` required
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
- **Authentication**: Admin session cookie (`dash_token`) or `Authorization: Bearer <token>` required

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
| `tts` | Toggles TTS voice on/off (or sets `enabled: boolean` if provided), persists to D1, and immediately mutes/enables overlay audio. |
| `countdown` | Controls `/overlay/countdown` timer (`cmd`: `'start'`, `'pause'`, `'reset'`, `'set'`, `'adjust'`; `seconds` or `minutes`; `delta` in seconds; `title`). |

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

Admin sessions use an HTTP-only, `SameSite=Lax` cookie named `dash_token` valid for 7 days (`604800` seconds), signed with `HMAC-SHA256`. Passwords are hashed using Web Crypto `PBKDF2` (`100,000` iterations, `SHA-256`, 16-byte random salt).

### `POST /setup`
Create the initial administrator account (only allowed when no admin row exists in D1 `admins`).

- **Content-Type**: `application/x-www-form-urlencoded` or `multipart/form-data`
- **Form Fields**:
  - `username`: Admin username (1–50 chars, required)
  - `password`: Password (minimum 8 chars, required)
  - `confirm`: Must match `password`
- **Responses**:
  - `302 Found -> /dashboard` (sets `dash_token` cookie on success)
  - `302 Found -> /setup?error=1` (validation failure)
  - `302 Found -> /login` (if admin already exists)

### `POST /login`
Authenticate administrator and issue a `dash_token` cookie. Rate-limited to 3 failed attempts per 60 seconds per client IP (`cf-connecting-ip`).

- **Content-Type**: `application/x-www-form-urlencoded` or `multipart/form-data`
- **Form Fields**:
  - `username`: Admin username
  - `password`: Admin password
- **Responses**:
  - `302 Found -> /dashboard` (sets `dash_token` cookie on success)
  - `302 Found -> /login?error=1` (invalid credentials or rate-limited)
  - `302 Found -> /setup` (if no admin is configured yet)

### `POST /logout`
Clear the `dash_token` session cookie.

- **Responses**:
  - `302 Found -> /login`

---

## 4. Management JSON API (`/api/manage`)

Headless JSON API for programmatic administration. Supports both the `dash_token` session cookie and `Authorization: Bearer <token>` header. Requests carrying `Authorization: Bearer <token>` (plus `/api/manage/login` and `/api/manage/setup`) bypass browser `Origin` CSRF checks so CLI tools and external services can call them directly.

### `POST /api/manage/setup`
Initialize the admin account when none exists in D1.

- **Content-Type**: `application/json`
- **Authentication**: Public (only succeeds when no admin exists)
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
  - `400 Bad Request`: `{"ok": false, "error": "INVALID_CREDENTIALS_FORMAT"}` (username empty or password < 8 chars)
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
Inspect current authentication state, active auth method (`bearer` or `cookie`), token version, expiration timestamp, Bearer API enablement, and IP rate-limit status.

- **Authentication**: Public (returns extended session details when authenticated)
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "setupRequired": false,
    "authenticated": true,
    "authMethod": "bearer",
    "username": "admin",
    "apiEnabled": true,
    "tokenVersion": 1,
    "expiresAt": 1793940000000,
    "rateLimited": false
  }
  ```

---

### `POST /api/manage/auth/refresh`
Issue a new 7-day signed token for the currently authenticated admin without revoking existing sessions.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "admin",
    "token": "1793940000000.<hmac_sha256_hex>",
    "tokenVersion": 1,
    "expiresAt": 1793940000000
  }
  ```

---

### `POST /api/manage/auth/revoke`
Increment `token_version` in D1 to immediately revoke all previously issued Bearer tokens and `dash_token` cookies across all devices.

- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Request Body (optional)**:
  ```json
  {
    "keepCurrent": true
  }
  ```
  - When `keepCurrent: true`, returns a newly signed token for the new `tokenVersion` and updates the session cookie.
  - When `keepCurrent: false` (default), clears the session cookie and invalidates all tokens immediately.
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "revoked": true,
    "tokenVersion": 2,
    "token": "1793940000000.<hmac_sha256_hex>",
    "expiresAt": 1793940000000
  }
  ```

---

### `PUT /api/manage/auth/config`
Control external Management API access (`apiEnabled`) and reset IP login rate-limit lockouts (`unlockRateLimit`).
When `apiEnabled` is set to `false`, `POST /api/manage/login` and all `Authorization: Bearer <token>` requests are rejected with `403 Forbidden` (`{"ok": false, "error": "MANAGE_API_DISABLED"}`), while browser dashboard cookie sessions remain usable so the admin can re-enable it.

- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
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
Return current admin username, TTS setting, donation totals (excluding test alerts), and live overlay status.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "username": "admin",
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
Query or update the TTS voice setting (`true` = enabled, `false` = muted). Persisted in D1 (`admins.tts_enabled`, with `TTS_ENABLED` env var as default) and broadcast in real time to all connected overlays.

- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Request Body (`PUT /api/manage/tts`, optional)**:
  ```json
  {
    "enabled": false
  }
  ```
  *(Omit `enabled` to toggle the current state.)*
- **Success Response (`200 OK`)**:
  ```json
  {
    "ok": true,
    "ttsEnabled": false,
    "overlayStatus": {
      "online": true,
      "count": 1,
      "ttsEnabled": false,
      "timestamp": 1793335000000
    }
  }
  ```

---

### `POST /api/manage/overlay/control`
Broadcast a control command (`reload`, `clear`, `disconnect`, or `heartbeat`) to connected OBS overlays.

- **Content-Type**: `application/json`
- **Authentication**: `Authorization: Bearer <token>` or `dash_token` cookie
- **Request Body**:
  ```json
  {
    "action": "clear"
  }
  ```
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
