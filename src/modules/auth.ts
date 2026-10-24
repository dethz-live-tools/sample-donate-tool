import { Hono, type Context, type Next } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Bindings } from './config'
import { createAdmin, getAdmin } from './db'

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
  const token = getCookie(c, COOKIE_NAME)
  if (!token || !token.includes('.')) return false
  const [expStr, sig] = token.split('.')
  const exp = Number(expStr)
  if (!exp || Date.now() > exp) return false
  const expected = await hmacSign(getSecret(c.env, admin.passwordHash), `${admin.username}:${exp}`)
  const a = new TextEncoder().encode(sig)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function dashboardAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const admin = await getAdmin(c.env?.DB)
  if (!admin) return c.redirect('/setup')
  if (!(await isValidSession(c))) return c.redirect('/login')
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

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'local'
    const now = Date.now()
    const rate = loginAttempts.get(ip)
    if (rate && now < rate.resetAt && rate.count >= 5) {
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
