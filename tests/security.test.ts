import { Database } from 'bun:sqlite'
import { beforeAll, describe, expect, test } from 'bun:test'
import type { D1Like } from '../src/db/client'

// Verify CF Workers rule 10021: zero crypto.getRandomValues() calls during module evaluation.
const origGetRandomValues = crypto.getRandomValues.bind(crypto)
let globalRandomCalls = 0
crypto.getRandomValues = ((arr: ArrayBufferView) => {
  globalRandomCalls++
  return origGetRandomValues(arr)
}) as typeof crypto.getRandomValues

const { default: app } = await import('../src/index')
crypto.getRandomValues = origGetRandomValues

function createSqliteD1(): D1Like {
  const sqlite = new Database(':memory:')
  const runStmt = (q: string, args: unknown[]) => {
    const stmt = sqlite.prepare(q)
    const params = args.map((a) => (typeof a === 'boolean' ? (a ? 1 : 0) : a))
    return { stmt, params }
  }
  return {
    prepare(q: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              const { stmt, params } = runStmt(q, args)
              const info = stmt.run(...(params as never[]))
              return { success: true, meta: { changes: info.changes } }
            },
            async all() {
              const { stmt, params } = runStmt(q, args)
              const rows = stmt.all(...(params as never[]))
              return { success: true, results: rows }
            },
            async first() {
              const { stmt, params } = runStmt(q, args)
              return stmt.get(...(params as never[])) ?? null
            },
            async raw() {
              const { stmt, params } = runStmt(q, args)
              return stmt.values(...(params as never[]))
            }
          }
        }
      }
    }
  }
}

const ORIGIN = 'http://localhost:5173'
const OWNER_DISCORD_ID = '387465159322632202'
const OP1_DISCORD_ID = '11111111111111111'
const OP2_DISCORD_ID = '22222222222222222'
const OP3_DISCORD_ID = '33333333333333333'

const env = {
  DB: createSqliteD1(),
  SESSION_SECRET: 'test-session-secret-0123456789abcdef',
  SLIP2SURE_API_KEY: 'test-s2s-key',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'discord-client-secret',
  DISCORD_ALLOWED_USER_IDS: OWNER_DISCORD_ID
}

function extractCookies(res: Response): Record<string, string> {
  const out: Record<string, string> = {}
  const headers = (res.headers as any).getSetCookie?.() || []
  for (const h of headers) {
    const [pair] = String(h).split(';')
    const idx = pair.indexOf('=')
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
  }
  return out
}

async function loginDiscordAs(discordId: string, username: string) {
  const start = await app.request(`${ORIGIN}/auth/discord`, {}, env as any)
  const startCookies = extractCookies(start)
  const state = startCookies.discord_oauth_state
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.startsWith('https://discord.com/api/oauth2/token')) {
      return new Response(JSON.stringify({ access_token: `tok_${discordId}` }), { status: 200 })
    }
    if (url.startsWith('https://discord.com/api/users/@me')) {
      return new Response(JSON.stringify({ id: discordId, username, global_name: username }), { status: 200 })
    }
    throw new Error(`Unexpected outbound fetch in test: ${url}`)
  }) as typeof fetch
  try {
    const cb = await app.request(
      `${ORIGIN}/auth/discord/callback?code=testcode&state=${encodeURIComponent(state)}`,
      { headers: { Cookie: `discord_oauth_state=${state}` } },
      env as any
    )
    const cookies = extractCookies(cb)
    return { res: cb, cookies }
  } finally {
    globalThis.fetch = origFetch
  }
}

describe('security regression suite', () => {
  let ownerBearer = ''
  let ownerCookies: Record<string, string> = {}
  let op1Cookies: Record<string, string> = {}

  beforeAll(async () => {
    // 1. Setup admin via SESSION_SECRET-guarded setup route
    const setupRes = await app.request(
      `${ORIGIN}/api/manage/setup`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-setup-token': env.SESSION_SECRET },
        body: JSON.stringify({ username: 'admin', password: 'StrongPassword123!' })
      },
      env as any
    )
    const setupJson = (await setupRes.json()) as any
    expect(setupRes.status).toBe(200)
    ownerBearer = setupJson.token

    // 2. Authenticate owner via Discord OAuth flow
    const ownerAuthRes = await loginDiscordAs(OWNER_DISCORD_ID, 'owner_user')
    expect(ownerAuthRes.res.status).toBe(302)
    ownerCookies = ownerAuthRes.cookies

    // 3. Owner creates op1 with ['dashboard', 'access'] and op3 with ['dashboard', 'access']
    const addOp1 = await app.request(
      `${ORIGIN}/api/manage/access`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBearer}` },
        body: JSON.stringify({ discordId: OP1_DISCORD_ID, username: 'op1', permissions: ['dashboard', 'access'] })
      },
      env as any
    )
    expect(addOp1.status).toBe(200)

    const addOp3 = await app.request(
      `${ORIGIN}/api/manage/access`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBearer}` },
        body: JSON.stringify({ discordId: OP3_DISCORD_ID, username: 'op3', permissions: ['dashboard', 'access'] })
      },
      env as any
    )
    expect(addOp3.status).toBe(200)

    const op1AuthRes = await loginDiscordAs(OP1_DISCORD_ID, 'op1')
    expect(op1AuthRes.res.status).toBe(302)
    op1Cookies = op1AuthRes.cookies
  })

  test('disallows global-scope crypto.getRandomValues() on module load', () => {
    expect(globalRandomCalls).toBe(0)
  })

  test('blocks non-owner access-scope escalation and owner overwrite', async () => {
    const op1CookieHeader = `dash_token=${op1Cookies.dash_token}; dash_refresh=${op1Cookies.dash_refresh}`

    // Self-escalation via PATCH must fail
    const selfPatch = await app.request(
      `${ORIGIN}/api/manage/access/${OP1_DISCORD_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: op1CookieHeader },
        body: JSON.stringify({ permissions: ['dashboard', 'controls', 'config', 'access'] })
      },
      env as any
    )
    expect(selfPatch.status).toBe(403)

    // Creating a new user with 'access' permission by non-owner must fail
    const grantAccess = await app.request(
      `${ORIGIN}/api/manage/access`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: op1CookieHeader },
        body: JSON.stringify({ discordId: OP2_DISCORD_ID, permissions: ['dashboard', 'access'] })
      },
      env as any
    )
    expect(grantAccess.status).toBe(403)

    // Creating a new user with a permission caller lacks ('controls') must fail
    const grantUnheld = await app.request(
      `${ORIGIN}/api/manage/access`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: op1CookieHeader },
        body: JSON.stringify({ discordId: OP2_DISCORD_ID, permissions: ['controls'] })
      },
      env as any
    )
    expect(grantUnheld.status).toBe(403)

    // Modifying or deleting another 'access' operator by non-owner must fail
    const delAccessAdmin = await app.request(
      `${ORIGIN}/api/manage/access/${OP3_DISCORD_ID}`,
      {
        method: 'DELETE',
        headers: { Origin: ORIGIN, Cookie: op1CookieHeader }
      },
      env as any
    )
    expect(delAccessAdmin.status).toBe(403)

    // Creating/overwriting env owner ID must fail even for owner
    const addOwnerId = await app.request(
      `${ORIGIN}/api/manage/access`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBearer}` },
        body: JSON.stringify({ discordId: OWNER_DISCORD_ID, permissions: ['dashboard'] })
      },
      env as any
    )
    expect(addOwnerId.status).toBe(400)

    // Delegating subset ['dashboard'] to op2 succeeds for op1
    const grantSubset = await app.request(
      `${ORIGIN}/api/manage/access`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: op1CookieHeader },
        body: JSON.stringify({ discordId: OP2_DISCORD_ID, permissions: ['dashboard'] })
      },
      env as any
    )
    expect(grantSubset.status).toBe(200)
  })

  test('enforces controls permission on GET /api/tiktok/config', async () => {
    const op1CookieHeader = `dash_token=${op1Cookies.dash_token}`
    const denied = await app.request(`${ORIGIN}/api/tiktok/config`, { headers: { Cookie: op1CookieHeader } }, env as any)
    expect(denied.status).toBe(403)

    const allowed = await app.request(
      `${ORIGIN}/api/tiktok/config`,
      { headers: { Authorization: `Bearer ${ownerBearer}` } },
      env as any
    )
    expect(allowed.status).toBe(200)
    const body = (await allowed.json()) as any
    expect(body.ok).toBe(true)
    expect(typeof body.key).toBe('string')
  })

  test('blocks explicit API refresh when apiEnabled=false while allowing cookie refresh', async () => {
    const ownerCookieHeader = `dash_token=${ownerCookies.dash_token}; dash_refresh=${ownerCookies.dash_refresh}`
    const disableRes = await app.request(
      `${ORIGIN}/api/manage/auth/config`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: ownerCookieHeader },
        body: JSON.stringify({ apiEnabled: false })
      },
      env as any
    )
    expect(disableRes.status).toBe(200)

    // Refresh via explicit JSON body refreshToken without Bearer must be blocked
    const explicitRefresh = await app.request(
      `${ORIGIN}/api/manage/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ refreshToken: ownerCookies.dash_refresh })
      },
      env as any
    )
    expect(explicitRefresh.status).toBe(403)

    // Browser cookie refresh remains usable
    const cookieRefresh = await app.request(
      `${ORIGIN}/api/manage/auth/refresh`,
      {
        method: 'POST',
        headers: { Origin: ORIGIN, Cookie: `dash_refresh=${ownerCookies.dash_refresh}` }
      },
      env as any
    )
    expect(cookieRefresh.status).toBe(200)

    // Re-enable API
    await app.request(
      `${ORIGIN}/api/manage/auth/config`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Cookie: ownerCookieHeader },
        body: JSON.stringify({ apiEnabled: true })
      },
      env as any
    )
  })

  test('enforces heartbeat GET method rule, donation gate, and slip magic-byte check', async () => {
    const hbCookie = await app.request(
      `${ORIGIN}/api/events/heartbeat`,
      { headers: { Cookie: `dash_token=${ownerCookies.dash_token}` } },
      env as any
    )
    expect(hbCookie.status).toBe(405)

    const hbBearer = await app.request(
      `${ORIGIN}/api/events/heartbeat`,
      { headers: { Authorization: `Bearer ${ownerBearer}` } },
      env as any
    )
    expect(hbBearer.status).toBe(200)

    // Closed donation gate blocks /api/donate
    const closedDonate = await app.request(
      `${ORIGIN}/api/donate`,
      { method: 'POST', headers: { Origin: ORIGIN }, body: new FormData() },
      env as any
    )
    expect(closedDonate.status).toBe(403)

    // Open gate temporarily and verify fake PNG bytes are rejected on /api/donate/session
    await app.request(
      `${ORIGIN}/api/manage/donate`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerBearer}` },
        body: JSON.stringify({ enabled: true })
      },
      env as any
    )
    const fd = new FormData()
    fd.set('sid', '0123456789abcdef0123')
    fd.set('image', new File([new TextEncoder().encode('not-a-real-png')], 'fake.png', { type: 'image/png' }))
    const badSlip = await app.request(
      `${ORIGIN}/api/donate/session`,
      { method: 'POST', headers: { Origin: ORIGIN }, body: fd },
      env as any
    )
    expect(badSlip.status).toBe(400)
  })
})
