# API Documentation

Base URL: `http://localhost:5173` (local) or your Cloudflare Worker domain.

---

## 1. Donation Endpoints

### `POST /api/donate`
Process donation by verifying a bank or TrueMoney slip, generating TTS speech, logging transaction to Cloudflare D1, and broadcasting real-time alert event.

- **Content-Type**: `multipart/form-data`
- **Authentication**: None (public endpoint protected by optional Turnstile)

#### Request Fields
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `type` | `string` | No | `bank-image` (default) or `truemoney` |
| `donor` | `string` | No | Donor name (max 50 chars). Defaults to sender name from slip. |
| `message` | `string` | No | Donor message read aloud by TTS (max 200 chars). |
| `image` | `File` | Yes | Slip image (`image/png`, `image/jpeg`). |
| `cf-turnstile-response` | `string` | Conditional | Turnstile token (required if `TURNSTILE_SECRET_KEY` configured). |

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

#### Error Response (`400 Bad Request` / `422 Unprocessable Entity` / `502 Bad Gateway`)
```json
{
  "ok": false,
  "code": "DUPLICATE_SLIP",
  "error": "สลิปนี้ถูกใช้งานไปแล้ว"
}
```

Common Error Codes:
- `TURNSTILE_REQUIRED` / `TURNSTILE_FAILED`: Turnstile challenge failed or missing.
- `SLIP_REQUIRED`: No slip file provided.
- `DUPLICATE_SLIP`: Slip has already been redeemed in D1 or is in-flight.
- `RECEIVER_MISMATCH`: Transfer recipient account does not match configured owner account.
- `SLIP2SURE_ERROR`: Slip verification upstream rejected.

---

### `POST /api/donate/test`
Send a simulated donation alert without a real slip. Useful for testing overlay alerts and audio playback.

- **Content-Type**: `application/json`
- **Authentication**: Admin session cookie required (`session_id`)

#### Request Body
```json
{
  "donor": "TEST DONOR",
  "amount": 99,
  "message": "ทดสอบระบบแจ้งเตือนโดเนท!"
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
    "createdAt": 1793335000000
  }
}
```

---

## 2. Real-Time Server-Sent Events (SSE) & Status

### `GET /api/events`
Unified SSE stream for dashboard, donor page, and general clients.

- **Query Parameters**:
  - `client`: `dashboard` | `overlay` | `default` (optional)
- **Headers**:
  - `Accept: text/event-stream`
- **Output**: Stream of SSE events

#### Events Emitted:
1. `heartbeat`: Emitted immediately upon connection and every 15 seconds.
   ```
   event: heartbeat
   data: {"ok":true,"online":true,"count":1,"timestamp":1793335000000}
   ```
2. `overlay_status`: Broadcast whenever an overlay connects or disconnects.
   ```
   event: overlay_status
   data: {"online":true,"count":1,"timestamp":1793335000000}
   ```
3. `donate`: Emitted when a new donation is successfully processed. Non-admin clients have `transRef` scrubbed for privacy.
   ```
   event: donate
   id: e6a4b3f1-285b-481d-862d-6060c283d6a9
   data: {"id":"e6a4b3f1-285b-481d-862d-6060c283d6a9","donor":"SOMCHAI","amount":100,"message":"Hello","audioBase64":"...","sampleRate":24000,"createdAt":1793335000000}
   ```
4. `control`: Emitted to signal remote commands to connected overlay browser sources.
   ```
   event: control
   data: {"action":"reload","timestamp":1793335000000}
   ```
5. `ping`: Keep-alive ping every 15 seconds.
   ```
   event: ping
   data: 1
   ```

---

### `GET /api/events/overlay`
Dedicated SSE stream endpoint for the OBS Overlay page. Automatically marks overlay connection active and refreshes heartbeat.

- **Headers**:
  - `Accept: text/event-stream`
- **Behaviors**:
  - Increments active overlay connection count.
  - Broadcasts updated `overlay_status` to all connected clients.
  - Cleans up and decrements connection count on client abort/disconnect.

---

### `GET /api/events/status`
Check current overlay connection status via standard JSON polling.

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

### `GET /api/events/poll`
Poll recent donations and overlay status. Used as a fallback when SSE drops or on interval sync.

- **Query Parameters**:
  - `since` (number, optional): Unix timestamp in ms to fetch donations created after. Defaults to `Date.now() - 60000`.
  - `client` (string, optional): Pass `client=overlay` to register active heartbeat.

- **Success Response (`200 OK`)**:
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

### `POST /api/events/heartbeat` & `GET /api/events/heartbeat`
Manually register or renew overlay heartbeat timestamp.

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
Dispatch remote command to all connected overlay browser sources via the SSE event bus.

- **Content-Type**: `application/json`
- **Authentication**: Admin session cookie required (`session_id`)

#### Request Body
```json
{
  "action": "reload"
}
```

Supported actions:
- `reload`: Forces all OBS overlay sources to refresh window.
- `clear`: Flushes alert queue and immediately dismisses active alert card.
- `disconnect`: Resets server-side active socket list and triggers reconnect.

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
