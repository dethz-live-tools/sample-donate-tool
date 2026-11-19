# Database Layer (Drizzle)

The app's persistence is a Drizzle-backed controller that runs on **either**
Cloudflare D1 (default) or PostgreSQL — switchable via one env var, no code
changes.

## Layout

| Path | Purpose |
| :--- | :--- |
| `src/db/schema.ts` | Drizzle table definitions: `donations`, `admins`, `subathon_state`, `discord_whitelist` (pg-core dialect) |
| `src/db/client.ts` | `AppDatabase` controller contract + `getDb(env)` factory (D1 or Postgres) |
| `src/modules/db.ts` | All data-access functions (`getAdmin`, `listDonations`, `saveSubathonState`, …); callers never touch Drizzle directly |

`db.ts` functions take an `AppDatabase` and are backend-agnostic: every query is
written once in Drizzle's query builder and compiles to the right dialect
(SQLite for D1, Postgres otherwise). Drizzle re-keys result rows to camelCase
(`passwordHash`, `transRef`, `endMsg`, …).

## Backend selection

`getDb(env)` picks the backend at first use (lazy, one instance per isolate), by
precedence:

1. `POSTGRES_URL` set → Postgres
2. `DB` D1 binding present (from `wrangler.jsonc`) → D1
3. neither → throws a clear config error

```sh
# D1 (default) — no extra config; the wrangler D1 binding is used:
docker compose up -d --build app

# Postgres — set the URL; the d1 volume is unused:
echo 'POSTGRES_URL=postgresql://donate:donate@postgres:5432/donate' >> .env
docker compose up -d --build app postgres
```

## Schema auto-init

Tables auto-create on first request — `ensureSchema()` in `db.ts` runs portable
`CREATE TABLE IF NOT EXISTS` DDL (booleans as `boolean`, epoch-millis columns as
`bigint`; SQLite's `bigint` is INTEGER affinity, so the same DDL works on both)
and idempotent `ALTER TABLE ... ADD COLUMN` statements for columns added in newer
releases (`donate_enabled`, `theme_flavor`, `theme_accent`, `site_title`,
`header_title`, `header_subtitle` on `admins`; `username`, `permissions` on
`discord_whitelist`). No migration runner is required at runtime.

## Column types (why some differ from the obvious)

- **Epoch milliseconds** (`created_at`, `updated_at`, `target_epoch`): declared
  `bigint`. SQLite INTEGER is 64-bit, but Postgres `integer` is int4 —
  `Date.now()` overflows int4. The schema uses a `customType` `int64` so the same
  file works for both dialects (sqlite-core has no `bigint()`).
- **Booleans** (`is_running`, `api_enabled`, …): declared `boolean` in the
  schema and DDL; SQLite stores 0/1, Postgres stores true/false. Readers use a
  defensive `bool()` that accepts both.

## Upgrading the schema

For fresh installs, edit the DDL block in `ensureSchema()` in `db.ts` (it is
idempotent). For migrating existing data, `drizzle-kit` is a devDependency —
add a `drizzle.config.ts` pointing at `src/db/schema.ts`, then run
`bunx drizzle-kit generate` and apply the generated SQL via
`wrangler d1 execute` (D1) or `psql` (Postgres).

## Notes

- `wrangler.jsonc` sets `"compatibility_flags": ["nodejs_compat"]` — the
  Postgres driver (`postgres`, porsager) needs Node builtins; in workerd it
  resolves to its `cloudflare:sockets` implementation automatically.
- Postgres mode uses one short-lived TCP connection per query — fine for this
  app's low QPS; switch to a shared pool (in `src/db/client.ts`) if QPS grows.
- The TikTok webhook key and admin session secrets are independent of the
  backend; they live in `SESSION_SECRET` / `SLIP2SURE_API_KEY`.