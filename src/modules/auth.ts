import { Hono, type Context, type Next } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Bindings } from './config'
import { createAdmin, getAdmin } from './db'

const COOKIE_NAME = 'dash_token'

// ponytail: Web Crypto SHA-256 hash instead of bcrypt/argon2 native dependency
export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sessionToken(username: string, passwordHash: string): Promise<string> {
  return sha256(`rawblock:session:${username}:${passwordHash}`)
}

export async function dashboardAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const admin = await getAdmin(c.env?.DB)
  if (!admin) return c.redirect('/setup')

  const token = getCookie(c, COOKIE_NAME)
  const expected = await sessionToken(admin.username, admin.passwordHash)
  if (!token || token !== expected) {
    return c.redirect('/login')
  }
  await next()
}

export const authRoute = new Hono<{ Bindings: Bindings }>()
  .post('/setup', async (c) => {
    const existing = await getAdmin(c.env?.DB)
    if (existing) return c.redirect('/login')

    const form = await c.req.formData()
    const username = String(form.get('username') || '').trim()
    const password = String(form.get('password') || '')
    const confirm = String(form.get('confirm') || '')

    if (!username || password.length < 4 || password !== confirm) {
      return c.redirect('/setup?error=1')
    }

    const passwordHash = await sha256(`rawblock:pwd:${username}:${password}`)
    await createAdmin(c.env?.DB, username, passwordHash)

    const token = await sessionToken(username, passwordHash)
    setCookie(c, COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7
    })
    return c.redirect('/dashboard')
  })
  .post('/login', async (c) => {
    const admin = await getAdmin(c.env?.DB)
    if (!admin) return c.redirect('/setup')

    const form = await c.req.formData()
    const username = String(form.get('username') || '').trim()
    const password = String(form.get('password') || '')
    const passwordHash = await sha256(`rawblock:pwd:${username}:${password}`)

    if (username === admin.username && passwordHash === admin.passwordHash) {
      const token = await sessionToken(admin.username, admin.passwordHash)
      setCookie(c, COOKIE_NAME, token, {
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7
      })
      return c.redirect('/dashboard')
    }
    return c.redirect('/login?error=1')
  })
  .post('/logout', (c) => {
    deleteCookie(c, COOKIE_NAME, { path: '/' })
    return c.redirect('/login')
  })
