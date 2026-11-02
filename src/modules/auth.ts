import { Hono, type Context, type Next } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Bindings } from './config'
import { createAdmin, deleteDonation, getAdmin, getDonationStats, listDonations, updateAdmin } from './db'
import { broadcastControl, broadcastOverlayStatus, getOverlayStatus, touchOverlayHeartbeat, type OverlayCommand } from './events'

const COOKIE_NAME = 'dash_token'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ponytail: Web Crypto PBKDF2 + HMAC-SHA256 instead of bcrypt/argon2/jwt native dependencies
export async function sha256(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)))
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = new Uint8Array((saltHex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)))
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256)
  return `${saltHex}:${toHex(bits)}`
}

async function hashPassword(password: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return pbkdf2(password, salt)
}

async function verifyPassword(username: string, password: string, stored: string): Promise<boolean> {
  const candidate = stored.includes(':')
    ? await pbkdf2(password, stored.split(':')[0])
    : await sha256(`rawblock:pwd:${username}:${password}`)
  const a = new TextEncoder().encode(candidate)
  const b = new TextEncoder().encode(stored)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
}

function getSecret(env: Bindings | undefined, passwordHash: string): string {
  return `${env?.SESSION_SECRET || env?.SLIP2SURE_API_KEY || env?.VITE_SLIP2SURE_API_KEY || 'rawblock'}:${passwordHash}`
}

async function createSessionToken(env: Bindings | undefined, username: string, passwordHash: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS
  const sig = await hmacSign(getSecret(env, passwordHash), `${username}:${exp}`)
  return `${exp}.${sig}`
}

export async function isValidSession(c: Context<{ Bindings: Bindings }>): Promise<boolean> {
  const admin = await getAdmin(c.env?.DB)
  if (!admin) return false
  const authHeader = c.req.header('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  const token = bearer || getCookie(c, COOKIE_NAME)
  if (!token || !token.includes('.')) return false
  const [expStr, sig] = token.split('.')
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  const expected = await hmacSign(getSecret(c.env, admin.passwordHash), `${admin.username}:${exp}`)
  const a = new TextEncoder().encode(sig)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function dashboardAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const isApi = c.req.path.startsWith('/api/')
  const admin = await getAdmin(c.env?.DB)
  if (!admin) return isApi ? c.json({ ok: false, error: 'SETUP_REQUIRED' }, 401) : c.redirect('/setup')
  if (!(await isValidSession(c))) return isApi ? c.json({ ok: false, error: 'UNAUTHORIZED' }, 401) : c.redirect('/login')
  await next()
}

export const authRoute = new Hono<{ Bindings: Bindings }>()
  .post('/setup', async (c) => {
    const existing = await getAdmin(c.env?.DB)
    if (existing) return c.redirect('/login')

    const form = await c.req.formData()
    const username = String(form.get('username') || '').trim().slice(0, 50)
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')

    if (!username || password.length < 8 || password !== confirm) {
      return c.redirect('/setup?error=1')
    }

    const passwordHash = await hashPassword(password)
    if (!(await createAdmin(c.env?.DB, username, passwordHash))) {
      return c.redirect('/setup?error=1')
    }

    const token = await createSessionToken(c.env, username, passwordHash)
    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      path: '/',
      sameSite: 'Lax',
      maxAge: SESSION_TTL_MS / 1000
    })
    return c.redirect('/dashboard')
  })
  .post('/login', async (c) => {
    const admin = await getAdmin(c.env?.DB)
    if (!admin) return c.redirect('/setup')

    const ip = c.req.header('cf-connecting-ip') || 'local'
    const now = Date.now()
    if (loginAttempts.size > 500) {
      for (const [k, v] of loginAttempts) if (now >= v.resetAt) loginAttempts.delete(k)
    }
    const rate = loginAttempts.get(ip)
    if (rate && now < rate.resetAt && rate.count >= 3) {
      return c.redirect('/login?error=1')
    }

    const form = await c.req.formData()
    const username = String(form.get('username') || '').trim()
    const password = String(form.get('password') || '')

    if (username === admin.username && (await verifyPassword(username, password, admin.passwordHash))) {
      loginAttempts.delete(ip)
      const token = await createSessionToken(c.env, admin.username, admin.passwordHash)
      setCookie(c, COOKIE_NAME, token, {
        httpOnly: true,
        secure: new URL(c.req.url).protocol === 'https:',
        path: '/',
        sameSite: 'Lax',
        maxAge: SESSION_TTL_MS / 1000
      })
      return c.redirect('/dashboard')
    }

    loginAttempts.set(ip, {
      count: rate && now < rate.resetAt ? rate.count + 1 : 1,
      resetAt: rate && now < rate.resetAt ? rate.resetAt : now + 60_000
    })
    return c.redirect('/login?error=1')
  })
  .post('/logout', (c) => {
    deleteCookie(c, COOKIE_NAME, { path: '/' })
    return c.redirect('/login')
  })

function setSessionCookie(c: Context<{ Bindings: Bindings }>, token: string) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
    sameSite: 'Lax',
    maxAge: SESSION_TTL_MS / 1000
  })
}

// ponytail: single Hono router for JSON management API using existing PBKDF2 + HMAC token (cookie or Bearer)
export const manageRoute = new Hono<{ Bindings: Bindings }>()
  .post('/setup', async (c) => {
    const existing = await getAdmin(c.env?.DB)
    if (existing) return c.json({ ok: false, error: 'ADMIN_ALREADY_EXISTS' }, 409)

    const body = (await c.req.json().catch(() => ({}))) as any
    const username = String(body.username || '').trim().slice(0, 50)
    const password = String(body.password || '')
    if (!username || password.length < 8) {
      return c.json({ ok: false, error: 'INVALID_CREDENTIALS_FORMAT' }, 400)
    }

    const passwordHash = await hashPassword(password)
    if (!(await createAdmin(c.env?.DB, username, passwordHash))) {
      return c.json({ ok: false, error: 'SETUP_FAILED' }, 409)
    }

    const token = await createSessionToken(c.env, username, passwordHash)
    setSessionCookie(c, token)
    return c.json({ ok: true, username, token, expiresAt: Number(token.split('.')[0]) })
  })
  .post('/login', async (c) => {
    const admin = await getAdmin(c.env?.DB)
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)

    const ip = c.req.header('cf-connecting-ip') || 'local'
    const now = Date.now()
    if (loginAttempts.size > 500) {
      for (const [k, v] of loginAttempts) if (now >= v.resetAt) loginAttempts.delete(k)
    }
    const rate = loginAttempts.get(ip)
    if (rate && now < rate.resetAt && rate.count >= 3) {
      return c.json({ ok: false, error: 'RATE_LIMITED' }, 429)
    }

    const body = (await c.req.json().catch(() => ({}))) as any
    const username = String(body.username || '').trim()
    const password = String(body.password || '')

    if (username === admin.username && (await verifyPassword(username, password, admin.passwordHash))) {
      loginAttempts.delete(ip)
      const token = await createSessionToken(c.env, admin.username, admin.passwordHash)
      setSessionCookie(c, token)
      return c.json({ ok: true, username: admin.username, token, expiresAt: Number(token.split('.')[0]) })
    }

    loginAttempts.set(ip, {
      count: rate && now < rate.resetAt ? rate.count + 1 : 1,
      resetAt: rate && now < rate.resetAt ? rate.resetAt : now + 60_000
    })
    return c.json({ ok: false, error: 'INVALID_CREDENTIALS' }, 401)
  })
  .post('/logout', (c) => {
    deleteCookie(c, COOKIE_NAME, { path: '/' })
    return c.json({ ok: true })
  })
  .get('/me', dashboardAuth, async (c) => {
    const admin = await getAdmin(c.env?.DB)
    const stats = await getDonationStats(c.env?.DB)
    return c.json({
      ok: true,
      username: admin?.username,
      stats,
      overlayStatus: getOverlayStatus()
    })
  })
  .put('/credentials', dashboardAuth, async (c) => {
    const admin = await getAdmin(c.env?.DB)
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)

    const body = (await c.req.json().catch(() => ({}))) as any
    const currentPassword = String(body.currentPassword || '')
    const newUsername = String(body.username || admin.username).trim().slice(0, 50)
    const newPassword = String(body.newPassword || '')

    if (!(await verifyPassword(admin.username, currentPassword, admin.passwordHash))) {
      return c.json({ ok: false, error: 'INVALID_CURRENT_PASSWORD' }, 401)
    }
    if (!newUsername || (newPassword && newPassword.length < 8)) {
      return c.json({ ok: false, error: 'INVALID_CREDENTIALS_FORMAT' }, 400)
    }

    const nextHash = newPassword ? await hashPassword(newPassword) : admin.passwordHash
    if (!(await updateAdmin(c.env?.DB, newUsername, nextHash))) {
      return c.json({ ok: false, error: 'UPDATE_FAILED' }, 500)
    }

    const token = await createSessionToken(c.env, newUsername, nextHash)
    setSessionCookie(c, token)
    return c.json({ ok: true, username: newUsername, token, expiresAt: Number(token.split('.')[0]) })
  })
  .get('/donations', dashboardAuth, async (c) => {
    const rawLimit = Number(c.req.query('limit') || 100)
    const limit = Math.min(500, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 100))
    const rawSince = Number(c.req.query('since') || 0)
    const since = Number.isFinite(rawSince) ? Math.max(0, rawSince) : 0
    const includeTest = c.req.query('includeTest') === '1' || c.req.query('includeTest') === 'true'
    const [items, stats] = await Promise.all([
      listDonations(c.env?.DB, limit, since, includeTest),
      getDonationStats(c.env?.DB)
    ])
    return c.json({ ok: true, stats, items })
  })
  .delete('/donations/:id', dashboardAuth, async (c) => {
    const id = c.req.param('id')
    const deleted = await deleteDonation(c.env?.DB, id)
    if (!deleted) return c.json({ ok: false, error: 'NOT_FOUND' }, 404)
    return c.json({ ok: true, id })
  })
  .get('/overlay', dashboardAuth, (c) => {
    return c.json({ ok: true, ...getOverlayStatus() })
  })
  .post('/overlay/control', dashboardAuth, async (c) => {
    const body = ((await c.req.json().catch(() => ({}))) as OverlayCommand) || {}
    const action = String(body.action || '').trim()
    if (!action) return c.json({ ok: false, error: 'ACTION_REQUIRED' }, 400)
    if (action === 'heartbeat') {
      touchOverlayHeartbeat()
      broadcastOverlayStatus()
      return c.json({ ok: true, status: getOverlayStatus() })
    }
    const payload = { ...body, action, timestamp: Date.now() }
    broadcastControl(payload)
    return c.json({ ok: true, command: payload, status: getOverlayStatus() })
  })
