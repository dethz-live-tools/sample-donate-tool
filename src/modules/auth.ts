import { Hono, type Context, type Next } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Bindings } from './config'
import { getDb } from '../db/client'
import {
  addDiscordWhitelist,
  applySubathonCommand,
  bumpTokenVersion,
  CATPPUCCIN_ACCENTS,
  CATPPUCCIN_FLAVORS,
  createAdmin,
  DEFAULT_DISCORD_PERMISSIONS,
  deleteDonation,
  DISCORD_PERMISSIONS,
  getAdmin,
  getDiscordWhitelistEntry,
  getDonationStats,
  getSubathonState,
  isDiscordWhitelisted,
  listDiscordWhitelist,
  listDonations,
  parseDiscordPermissions,
  removeDiscordWhitelist,
  saveAdminDiscord,
  setApiEnabled,
  updateAdmin,
  updateDiscordWhitelistEntry,
  type DiscordPermission,
  type SubathonState
} from './db'
import {
  broadcastControl,
  broadcastOverlayStatus,
  getOverlayStatus,
  resolveDonateEnabled,
  resolveFilterConfig,
  resolveHeaderConfig,
  resolveThemeConfig,
  resolveTtsConfig,
  resolveTtsEnabled,
  touchOverlayHeartbeat,
  updateDonateEnabled,
  updateFilterConfig,
  updateHeaderConfig,
  updateThemeConfig,
  updateTtsConfig,
  updateTtsEnabled,
  type OverlayCommand
} from './events'
import { DEFAULT_BLOCKED_WORDS } from './filter'
import { EDGE_TTS_VOICES } from './tts'

const COOKIE_NAME = 'dash_token'
const REFRESH_COOKIE_NAME = 'dash_refresh'
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 // 1 hour default session_timeout
const DEFAULT_REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days default refresh token TTL
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export function parseDurationMs(raw: unknown, fallbackMs: number, minMs = 60_000): number {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return fallbackMs
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)?$/)
  if (!m) return fallbackMs
  const val = Number(m[1])
  if (!Number.isFinite(val) || val <= 0) return fallbackMs
  const unit = m[2] || ''
  let ms = val
  if (unit === 'd') ms = val * 86_400_000
  else if (unit === 'h') ms = val * 3_600_000
  else if (unit === 'm') ms = val * 60_000
  else if (unit === 's') ms = val * 1000
  else if (unit === 'ms') ms = val
  else ms = val > 31_536_000 ? val : val * 1000 // plain number: seconds (or ms if > 1 year in seconds)
  return Math.max(minMs, Math.round(ms))
}

export function getSessionTimeoutMs(env?: Bindings): number {
  return parseDurationMs(env?.SESSION_TIMEOUT, DEFAULT_SESSION_TTL_MS, 60_000)
}

export function getRefreshTimeoutMs(env?: Bindings): number {
  return parseDurationMs(env?.REFRESH_TOKEN_TIMEOUT, DEFAULT_REFRESH_TTL_MS, 300_000)
}

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
  if (!stored || stored.startsWith('discord:')) return false
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

let ephemeralFallbackSecret: string | undefined

// Lazy per-isolate fallback: CF Workers forbid crypto.getRandomValues() in global scope.
function getBaseSecret(env: Bindings | undefined): string {
  return (
    env?.SESSION_SECRET ||
    env?.SLIP2SURE_API_KEY ||
    (ephemeralFallbackSecret ??= toHex(crypto.getRandomValues(new Uint8Array(32))))
  )
}

function getSecret(env: Bindings | undefined, passwordHash: string, tokenVersion = 1): string {
  return `${getBaseSecret(env)}:${passwordHash}:v${tokenVersion}`
}

export async function getTikTokWebhookKey(env: Bindings | undefined): Promise<string> {
  const admin = await getAdmin(getDb(env))
  const baseSecret = admin
    ? getSecret(env, admin.passwordHash, admin.tokenVersion)
    : `${getBaseSecret(env)}:default`
  const sig = await hmacSign(baseSecret, 'tiktok-webhook-key')
  return sig.slice(0, 32)
}

export function getEnvAllowedDiscordIds(env?: Bindings): string[] {
  const raw = [
    env?.DISCORD_ALLOWED_USER_IDS,
    env?.DISCORD_ADMIN_USER_ID,
    env?.DISCORD_OWNER_ID,
    env?.DISCORD_ID,
    (env as any)?.VITE_DISCORD_ALLOWED_USER_IDS
  ]
    .filter(Boolean)
    .join(',')
    .trim()
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )
}

async function createSessionToken(
  env: Bindings | undefined,
  username: string,
  passwordHash: string,
  tokenVersion = 1,
  discordId = ''
): Promise<string> {
  const exp = Date.now() + getSessionTimeoutMs(env)
  const payload = discordId ? `${username}:${exp}:${discordId}` : `${username}:${exp}`
  const sig = await hmacSign(getSecret(env, passwordHash, tokenVersion), payload)
  return discordId ? `${exp}.${sig}.${discordId}` : `${exp}.${sig}`
}

async function createRefreshToken(
  env: Bindings | undefined,
  username: string,
  passwordHash: string,
  tokenVersion = 1,
  discordId = ''
): Promise<string> {
  const exp = Date.now() + getRefreshTimeoutMs(env)
  const payload = discordId ? `refresh:${username}:${exp}:${discordId}` : `refresh:${username}:${exp}`
  const sig = await hmacSign(`${getSecret(env, passwordHash, tokenVersion)}:refresh`, payload)
  return discordId ? `${exp}.${sig}.${discordId}` : `${exp}.${sig}`
}

export function extractRefreshToken(c: Context<{ Bindings: Bindings }>, bodyRefreshToken?: unknown): string {
  if (typeof bodyRefreshToken === 'string' && bodyRefreshToken.trim()) return bodyRefreshToken.trim()
  const headerToken = (c.req.header('x-refresh-token') || '').trim()
  if (headerToken) return headerToken
  return (getCookie(c, REFRESH_COOKIE_NAME) || '').trim()
}

export async function verifyRefreshToken(
  c: Context<{ Bindings: Bindings }>,
  rawRefresh?: string
): Promise<{ valid: boolean; discordId: string; exp: number }> {
  const db = getDb(c.env)
  const admin = await getAdmin(db)
  if (!admin) return { valid: false, discordId: '', exp: 0 }
  const token = (rawRefresh ?? extractRefreshToken(c)).trim()
  if (!token || !token.includes('.')) return { valid: false, discordId: '', exp: 0 }
  const [expStr, sig, tokenDiscordId = ''] = token.split('.')
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return { valid: false, discordId: '', exp: 0 }
  const payload = tokenDiscordId
    ? `refresh:${admin.username}:${exp}:${tokenDiscordId}`
    : `refresh:${admin.username}:${exp}`
  const expected = await hmacSign(`${getSecret(c.env, admin.passwordHash, admin.tokenVersion)}:refresh`, payload)
  const a = new TextEncoder().encode(sig)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return { valid: false, discordId: '', exp: 0 }
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  if (diff !== 0) return { valid: false, discordId: '', exp: 0 }
  if (tokenDiscordId) {
    const envIds = getEnvAllowedDiscordIds(c.env)
    if (!envIds.includes(tokenDiscordId) && !(await isDiscordWhitelisted(db, tokenDiscordId))) {
      return { valid: false, discordId: '', exp: 0 }
    }
  }
  return { valid: true, discordId: tokenDiscordId, exp }
}

export function extractToken(c: Context<{ Bindings: Bindings }>): { token: string; isBearer: boolean } {
  const authHeader = c.req.header('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  if (bearer) return { token: bearer, isBearer: true }
  return { token: getCookie(c, COOKIE_NAME) || '', isBearer: false }
}

export async function isValidSession(c: Context<{ Bindings: Bindings }>): Promise<boolean> {
  const db = getDb(c.env)
  const admin = await getAdmin(db)
  if (!admin) return false
  const { token, isBearer } = extractToken(c)
  if (isBearer && !admin.apiEnabled) return false
  if (!token || !token.includes('.')) return false
  const [expStr, sig, tokenDiscordId] = token.split('.')
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  const payload = tokenDiscordId ? `${admin.username}:${exp}:${tokenDiscordId}` : `${admin.username}:${exp}`
  const expected = await hmacSign(getSecret(c.env, admin.passwordHash, admin.tokenVersion), payload)
  const a = new TextEncoder().encode(sig)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  if (diff !== 0) return false
  if (tokenDiscordId) {
    const envIds = getEnvAllowedDiscordIds(c.env)
    if (!envIds.includes(tokenDiscordId) && !(await isDiscordWhitelisted(db, tokenDiscordId))) {
      return false
    }
  }
  return true
}

export async function isOwnerSession(c: Context<{ Bindings: Bindings }>): Promise<boolean> {
  if (!(await isValidSession(c))) return false
  const { token } = extractToken(c)
  const tokenDiscordId = token.split('.')[2] || ''
  if (!tokenDiscordId) return true
  const envIds = getEnvAllowedDiscordIds(c.env)
  return envIds.includes(tokenDiscordId)
}

export async function getSessionPermissions(c: Context<{ Bindings: Bindings }>): Promise<DiscordPermission[]> {
  if (!(await isValidSession(c))) return []
  const { token } = extractToken(c)
  const tokenDiscordId = token.split('.')[2] || ''
  if (!tokenDiscordId) return [...DISCORD_PERMISSIONS]
  const envIds = getEnvAllowedDiscordIds(c.env)
  if (envIds.includes(tokenDiscordId)) return [...DISCORD_PERMISSIONS]
  const entry = await getDiscordWhitelistEntry(getDb(c.env), tokenDiscordId)
  return entry ? entry.permissions : []
}

export function getFirstAllowedPath(perms: DiscordPermission[]): string {
  if (perms.includes('dashboard')) return '/dashboard'
  if (perms.includes('controls')) return '/overlay/control'
  if (perms.includes('config')) return '/dashboard/config'
  if (perms.includes('access')) return '/dashboard/access'
  return '/login?error=unauthorized'
}

export async function dashboardAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const isApi = c.req.path.startsWith('/api/') || c.req.method !== 'GET'
  const admin = await getAdmin(getDb(c.env))
  if (!admin) return isApi ? c.json({ ok: false, error: 'SETUP_REQUIRED' }, 401) : c.redirect('/setup')
  const { isBearer } = extractToken(c)
  if (isBearer && !admin.apiEnabled) {
    return c.json({ ok: false, error: 'MANAGE_API_DISABLED' }, 403)
  }
  if (!(await isValidSession(c))) return isApi ? c.json({ ok: false, error: 'UNAUTHORIZED' }, 401) : c.redirect('/login')
  const perms = await getSessionPermissions(c)
  c.set('userPermissions' as any, perms)
  c.set('sessionTimeoutMs' as any, getSessionTimeoutMs(c.env))
  await next()
}

export function requirePermission(...anyOf: DiscordPermission[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const isApi = c.req.path.startsWith('/api/') || c.req.method !== 'GET'
    const admin = await getAdmin(getDb(c.env))
    if (!admin) return isApi ? c.json({ ok: false, error: 'SETUP_REQUIRED' }, 401) : c.redirect('/setup')
    const { isBearer } = extractToken(c)
    if (isBearer && !admin.apiEnabled) {
      return c.json({ ok: false, error: 'MANAGE_API_DISABLED' }, 403)
    }
    if (!(await isValidSession(c))) return isApi ? c.json({ ok: false, error: 'UNAUTHORIZED' }, 401) : c.redirect('/login')
    const perms = await getSessionPermissions(c)
    c.set('userPermissions' as any, perms)
    c.set('sessionTimeoutMs' as any, getSessionTimeoutMs(c.env))
    if (anyOf.length > 0 && !anyOf.some((p) => perms.includes(p))) {
      if (isApi) return c.json({ ok: false, error: 'FORBIDDEN', required: anyOf }, 403)
      const target = getFirstAllowedPath(perms)
      return c.redirect(target.includes('?') ? target : `${target}?error=forbidden`)
    }
    await next()
  }
}

export async function ownerAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  await dashboardAuth(c, async () => {
    if (!(await isOwnerSession(c))) {
      c.res = c.json({ ok: false, error: 'OWNER_REQUIRED' }, 403)
      return
    }
    await next()
  })
}

function getDiscordRedirectUri(c: Context<{ Bindings: Bindings }>): string {
  if (c.env?.DISCORD_REDIRECT_URI) return c.env.DISCORD_REDIRECT_URI
  const u = new URL(c.req.url)
  return `${u.protocol}//${u.host}/auth/discord/callback`
}

async function handleDiscordLogin(c: Context<{ Bindings: Bindings }>) {
  const clientId = c.env?.DISCORD_CLIENT_ID || c.env?.VITE_DISCORD_CLIENT_ID
  if (!clientId) {
    return c.redirect('/login?error=not_configured')
  }
  const state = toHex(crypto.getRandomValues(new Uint8Array(16)))
  const redirectUri = getDiscordRedirectUri(c)
  setCookie(c, 'discord_oauth_state', state, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
    sameSite: 'Lax',
    maxAge: 300
  })
  const url = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&prompt=consent&state=${encodeURIComponent(state)}`
  return c.redirect(url)
}

async function handleDiscordCallback(c: Context<{ Bindings: Bindings }>) {
  const queryState = c.req.query('state') || ''
  const cookieState = getCookie(c, 'discord_oauth_state') || ''
  deleteCookie(c, 'discord_oauth_state', { path: '/' })

  if (c.req.query('error')) {
    return c.redirect('/login?error=cancelled')
  }

  if (!queryState || !cookieState || queryState !== cookieState) {
    return c.redirect('/login?error=state_mismatch')
  }

  const code = c.req.query('code')
  if (!code) {
    return c.redirect('/login?error=no_code')
  }

  const clientId = c.env?.DISCORD_CLIENT_ID || c.env?.VITE_DISCORD_CLIENT_ID || ''
  const clientSecret = c.env?.DISCORD_CLIENT_SECRET || ''
  if (!clientId || !clientSecret) {
    return c.redirect('/login?error=not_configured')
  }

  const redirectUri = getDiscordRedirectUri(c)
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString(),
    signal: AbortSignal.timeout(8000)
  }).catch(() => null)

  if (!tokenRes || !tokenRes.ok) {
    return c.redirect('/login?error=token_failed')
  }

  const tokenData = ((await tokenRes.json().catch(() => ({}))) as Record<string, any>) || {}
  const accessToken = tokenData.access_token
  if (!accessToken) {
    return c.redirect('/login?error=token_failed')
  }

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(8000)
  }).catch(() => null)

  if (!userRes || !userRes.ok) {
    return c.redirect('/login?error=user_failed')
  }

  const userData = ((await userRes.json().catch(() => ({}))) as Record<string, any>) || {}
  const discordId = String(userData.id || '').trim()
  const rawHandle = String(userData.username || '').trim()
  const globalName = String(userData.global_name || '').trim()
  const discordUsername =
    globalName && rawHandle && globalName !== rawHandle
      ? `${globalName} (@${rawHandle})`
      : rawHandle
        ? `@${rawHandle}`
        : globalName || `discord_${discordId.slice(-4)}`

  if (!discordId) {
    return c.redirect('/login?error=user_failed')
  }

  const db = getDb(c.env)
  const allowedList = getEnvAllowedDiscordIds(c.env)
  const dbWhitelist = await listDiscordWhitelist(db)
  const inEnv = allowedList.includes(discordId)
  const existingEntry = dbWhitelist.find((x) => x.discordId === discordId)
  const inDb = Boolean(existingEntry)

  if (!inEnv && !inDb) {
    return c.redirect('/login?error=unauthorized')
  }

  await saveAdminDiscord(db, discordUsername, inEnv ? discordId : '')
  if (inDb) {
    await updateDiscordWhitelistEntry(db, discordId, { username: discordUsername })
  }
  const currentAdmin = await getAdmin(db)
  const sessionUser = currentAdmin?.username || discordUsername
  const passwordHash = currentAdmin?.passwordHash || `discord:${toHex(crypto.getRandomValues(new Uint8Array(32)))}`
  const tokenVersion = currentAdmin?.tokenVersion || 1
  const [token, refreshToken] = await Promise.all([
    createSessionToken(c.env, sessionUser, passwordHash, tokenVersion, discordId),
    createRefreshToken(c.env, sessionUser, passwordHash, tokenVersion, discordId)
  ])

  setSessionCookie(c, token, refreshToken)
  const effectivePerms: DiscordPermission[] = inEnv
    ? [...DISCORD_PERMISSIONS]
    : existingEntry?.permissions || DEFAULT_DISCORD_PERMISSIONS
  return c.redirect(getFirstAllowedPath(effectivePerms))
}

export const authRoute = new Hono<{ Bindings: Bindings }>()
  .get('/auth/discord', handleDiscordLogin)
  .get('/login/discord', handleDiscordLogin)
  .get('/auth/discord/callback', handleDiscordCallback)
  .get('/login/discord/callback', handleDiscordCallback)
  .post('/login', (c) => c.redirect('/auth/discord'))
  .post('/setup', (c) => c.redirect('/auth/discord'))
  .post('/logout', (c) => {
    clearSessionCookies(c)
    return c.redirect('/login')
  })
  .get('/tts', dashboardAuth, async (c) => {
    const ttsConfig = await resolveTtsConfig(c.env)
    return c.json({ ok: true, ...ttsConfig, voices: EDGE_TTS_VOICES })
  })
  .put('/tts', requirePermission('config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const current = await resolveTtsConfig(c.env)
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
    const voice = typeof body.voice === 'string' && body.voice ? body.voice : current.voice
    const rate = typeof body.rate === 'string' ? body.rate : current.rate
    const pitch = typeof body.pitch === 'string' ? body.pitch : current.pitch
    const updated = await updateTtsConfig(c.env, { enabled: nextEnabled, voice, rate, pitch })
    return c.json({ ok: true, ...updated, overlayStatus: getOverlayStatus() })
  })
  .get('/filter', dashboardAuth, async (c) => {
    const filterConfig = await resolveFilterConfig(c.env)
    return c.json({ ok: true, ...filterConfig, defaultCount: DEFAULT_BLOCKED_WORDS.length })
  })
  .put('/filter', requirePermission('config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const current = await resolveFilterConfig(c.env)
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
    const words = typeof body.words === 'string' ? body.words : current.words
    const action = body.action === 'mute' ? 'mute' : 'censor'
    const updated = await updateFilterConfig(c.env, { enabled: nextEnabled, words, action })
    return c.json({ ok: true, ...updated, defaultCount: DEFAULT_BLOCKED_WORDS.length, overlayStatus: getOverlayStatus() })
  })

function setSessionCookie(c: Context<{ Bindings: Bindings }>, token: string, refreshToken?: string) {
  const isHttps = new URL(c.req.url).protocol === 'https:'
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    path: '/',
    sameSite: 'Lax',
    maxAge: Math.floor(getSessionTimeoutMs(c.env) / 1000)
  })
  if (refreshToken) {
    setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isHttps,
      path: '/',
      sameSite: 'Lax',
      maxAge: Math.floor(getRefreshTimeoutMs(c.env) / 1000)
    })
  }
}

function clearSessionCookies(c: Context<{ Bindings: Bindings }>) {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' })
}

async function guardAccessMutation(
  c: Context<{ Bindings: Bindings }>,
  db: ReturnType<typeof getDb>,
  targetId: string,
  nextPermissions?: DiscordPermission[],
  isDelete = false
): Promise<{ status: 400 | 403; error: string } | null> {
  const envIds = getEnvAllowedDiscordIds(c.env)
  if (envIds.includes(targetId)) return { status: 400, error: 'CANNOT_MODIFY_OWNER' }
  const tokenDiscordId = extractToken(c).token.split('.')[2] || ''
  if (isDelete && targetId === tokenDiscordId) return { status: 400, error: 'CANNOT_REMOVE_SELF' }
  if (await isOwnerSession(c)) return null
  if (targetId === tokenDiscordId) return { status: 403, error: 'CANNOT_MODIFY_SELF' }
  const [existing, callerPerms] = await Promise.all([getDiscordWhitelistEntry(db, targetId), getSessionPermissions(c)])
  if (existing?.permissions.includes('access') || nextPermissions?.includes('access')) {
    return { status: 403, error: 'OWNER_REQUIRED' }
  }
  if (existing?.permissions.some((p) => !callerPerms.includes(p)) || nextPermissions?.some((p) => !callerPerms.includes(p))) {
    return { status: 403, error: 'FORBIDDEN' }
  }
  return null
}

// ponytail: single Hono router for JSON management API using existing PBKDF2 + HMAC token (cookie or Bearer)
export const manageRoute = new Hono<{ Bindings: Bindings }>()
  .post('/setup', async (c) => {
    const existing = await getAdmin(getDb(c.env))
    if (existing) return c.json({ ok: false, error: 'ADMIN_ALREADY_EXISTS' }, 409)

    const body = (await c.req.json().catch(() => ({}))) as any
    const setupSecret = c.env?.SESSION_SECRET || ''
    const suppliedSecret = String(c.req.header('x-setup-token') || body.setupToken || '')
    if (!setupSecret || suppliedSecret !== setupSecret) {
      return c.json({ ok: false, error: setupSecret ? 'INVALID_SETUP_TOKEN' : 'SETUP_DISABLED' }, 403)
    }

    const username = String(body.username || '').trim().slice(0, 50)
    const password = String(body.password || '')
    if (!username || password.length < 8 || password.length > 128) {
      return c.json({ ok: false, error: 'INVALID_CREDENTIALS_FORMAT' }, 400)
    }

    const passwordHash = await hashPassword(password)
    if (!(await createAdmin(getDb(c.env), username, passwordHash))) {
      return c.json({ ok: false, error: 'SETUP_FAILED' }, 409)
    }

    const [token, refreshToken] = await Promise.all([
      createSessionToken(c.env, username, passwordHash),
      createRefreshToken(c.env, username, passwordHash)
    ])
    setSessionCookie(c, token, refreshToken)
    return c.json({
      ok: true,
      username,
      token,
      refreshToken,
      sessionTimeoutMs: getSessionTimeoutMs(c.env),
      expiresAt: Number(token.split('.')[0]),
      refreshExpiresAt: Number(refreshToken.split('.')[0])
    })
  })
  .post('/login', async (c) => {
    const admin = await getAdmin(getDb(c.env))
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)
    if (!admin.apiEnabled) return c.json({ ok: false, error: 'MANAGE_API_DISABLED' }, 403)

    const ip = c.req.header('cf-connecting-ip') || 'local'
    const now = Date.now()
    if (loginAttempts.size > 500) {
      for (const [k, v] of loginAttempts) if (now >= v.resetAt) loginAttempts.delete(k)
    }
    const rate = loginAttempts.get(ip)
    const globalRate = loginAttempts.get('__global__')
    if ((rate && now < rate.resetAt && rate.count >= 3) || (globalRate && now < globalRate.resetAt && globalRate.count >= 5)) {
      return c.json({ ok: false, error: 'RATE_LIMITED' }, 429)
    }

    const body = (await c.req.json().catch(() => ({}))) as any
    const username = String(body.username || '').trim()
    const password = String(body.password || '')

    if (!username || password.length > 128) {
      return c.json({ ok: false, error: 'INVALID_CREDENTIALS' }, 401)
    }

    if (username === admin.username && (await verifyPassword(username, password, admin.passwordHash))) {
      loginAttempts.delete(ip)
      loginAttempts.delete('__global__')
      const [token, refreshToken] = await Promise.all([
        createSessionToken(c.env, admin.username, admin.passwordHash, admin.tokenVersion),
        createRefreshToken(c.env, admin.username, admin.passwordHash, admin.tokenVersion)
      ])
      setSessionCookie(c, token, refreshToken)
      return c.json({
        ok: true,
        username: admin.username,
        token,
        refreshToken,
        tokenVersion: admin.tokenVersion,
        sessionTimeoutMs: getSessionTimeoutMs(c.env),
        expiresAt: Number(token.split('.')[0]),
        refreshExpiresAt: Number(refreshToken.split('.')[0])
      })
    }

    loginAttempts.set(ip, {
      count: rate && now < rate.resetAt ? rate.count + 1 : 1,
      resetAt: rate && now < rate.resetAt ? rate.resetAt : now + 60_000
    })
    loginAttempts.set('__global__', {
      count: globalRate && now < globalRate.resetAt ? globalRate.count + 1 : 1,
      resetAt: globalRate && now < globalRate.resetAt ? globalRate.resetAt : now + 60_000
    })
    return c.json({ ok: false, error: 'INVALID_CREDENTIALS' }, 401)
  })
  .post('/logout', (c) => {
    clearSessionCookies(c)
    return c.json({ ok: true })
  })
  .get('/auth/status', async (c) => {
    const admin = await getAdmin(getDb(c.env))
    const authenticated = await isValidSession(c)
    const { token, isBearer } = extractToken(c)
    const exp = authenticated && token.includes('.') ? Number(token.split('.')[0]) : null
    const refreshCheck = await verifyRefreshToken(c)
    const isOwner = authenticated ? await isOwnerSession(c) : false
    const ip = c.req.header('cf-connecting-ip') || 'local'
    const rate = loginAttempts.get(ip)
    const rateLimited = Boolean(rate && Date.now() < rate.resetAt && rate.count >= 3)
    return c.json({
      ok: true,
      setupRequired: !admin,
      authenticated,
      role: authenticated ? (isOwner ? 'owner' : 'member') : null,
      authMethod: authenticated ? (isBearer ? 'bearer' : 'cookie') : null,
      username: authenticated ? admin?.username : undefined,
      apiEnabled: admin?.apiEnabled ?? true,
      tokenVersion: authenticated ? admin?.tokenVersion : undefined,
      sessionTimeoutMs: getSessionTimeoutMs(c.env),
      expiresAt: exp,
      hasRefreshToken: refreshCheck.valid,
      refreshExpiresAt: refreshCheck.valid ? refreshCheck.exp : null,
      rateLimited
    })
  })
  .post('/auth/refresh', async (c) => {
    const admin = await getAdmin(getDb(c.env))
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)
    const { isBearer } = extractToken(c)
    const body = (await c.req.json().catch(() => ({}))) as any
    const hasExplicitRefresh = Boolean(
      (typeof body.refreshToken === 'string' && body.refreshToken.trim()) ||
        (typeof body.refresh_token === 'string' && body.refresh_token.trim()) ||
        (c.req.header('x-refresh-token') || '').trim()
    )
    if ((isBearer || hasExplicitRefresh) && !admin.apiEnabled) {
      return c.json({ ok: false, error: 'MANAGE_API_DISABLED' }, 403)
    }
    const rawRefresh = extractRefreshToken(c, body.refreshToken || body.refresh_token)
    const refreshCheck = await verifyRefreshToken(c, rawRefresh)
    let tokenDiscordId = ''
    if (refreshCheck.valid) {
      tokenDiscordId = refreshCheck.discordId
    } else if (await isValidSession(c)) {
      tokenDiscordId = extractToken(c).token.split('.')[2] || ''
    } else {
      clearSessionCookies(c)
      return c.json({ ok: false, error: 'INVALID_REFRESH_TOKEN' }, 401)
    }

    const [token, refreshToken] = await Promise.all([
      createSessionToken(c.env, admin.username, admin.passwordHash, admin.tokenVersion, tokenDiscordId),
      createRefreshToken(c.env, admin.username, admin.passwordHash, admin.tokenVersion, tokenDiscordId)
    ])
    setSessionCookie(c, token, refreshToken)
    return c.json({
      ok: true,
      username: admin.username,
      token,
      refreshToken,
      tokenVersion: admin.tokenVersion,
      sessionTimeoutMs: getSessionTimeoutMs(c.env),
      expiresAt: Number(token.split('.')[0]),
      refreshExpiresAt: Number(refreshToken.split('.')[0])
    })
  })
  .post('/auth/revoke', ownerAuth, async (c) => {
    const admin = await getAdmin(getDb(c.env))
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)
    const body = (await c.req.json().catch(() => ({}))) as any
    const keepCurrent = Boolean(body.keepCurrent)
    const tokenDiscordId = extractToken(c).token.split('.')[2] || ''
    const nextVersion = await bumpTokenVersion(getDb(c.env))
    if (keepCurrent) {
      const [token, refreshToken] = await Promise.all([
        createSessionToken(c.env, admin.username, admin.passwordHash, nextVersion, tokenDiscordId),
        createRefreshToken(c.env, admin.username, admin.passwordHash, nextVersion, tokenDiscordId)
      ])
      setSessionCookie(c, token, refreshToken)
      return c.json({
        ok: true,
        revoked: true,
        tokenVersion: nextVersion,
        token,
        refreshToken,
        sessionTimeoutMs: getSessionTimeoutMs(c.env),
        expiresAt: Number(token.split('.')[0]),
        refreshExpiresAt: Number(refreshToken.split('.')[0])
      })
    }
    clearSessionCookies(c)
    return c.json({ ok: true, revoked: true, tokenVersion: nextVersion })
  })
  .put('/auth/config', ownerAuth, async (c) => {
    const admin = await getAdmin(getDb(c.env))
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)
    const body = (await c.req.json().catch(() => ({}))) as any
    let apiEnabled = admin.apiEnabled
    if (typeof body.apiEnabled === 'boolean') {
      apiEnabled = await setApiEnabled(getDb(c.env), body.apiEnabled)
    }
    if (body.unlockRateLimit) {
      loginAttempts.clear()
    }
    return c.json({
      ok: true,
      apiEnabled,
      tokenVersion: admin.tokenVersion,
      rateLimitCleared: Boolean(body.unlockRateLimit)
    })
  })
  .get('/me', dashboardAuth, async (c) => {
    const [admin, stats, ttsEnabled, permissions] = await Promise.all([
      getAdmin(getDb(c.env)),
      getDonationStats(getDb(c.env)),
      resolveTtsEnabled(c.env),
      getSessionPermissions(c)
    ])
    return c.json({
      ok: true,
      username: admin?.username,
      permissions,
      ttsEnabled,
      stats,
      overlayStatus: getOverlayStatus()
    })
  })
  .get('/tts', dashboardAuth, async (c) => {
    const ttsConfig = await resolveTtsConfig(c.env)
    return c.json({ ok: true, ...ttsConfig, voices: EDGE_TTS_VOICES })
  })
  .put('/tts', requirePermission('config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const current = await resolveTtsConfig(c.env)
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
    const voice = typeof body.voice === 'string' && body.voice ? body.voice : current.voice
    const rate = typeof body.rate === 'string' ? body.rate : current.rate
    const pitch = typeof body.pitch === 'string' ? body.pitch : current.pitch
    const updated = await updateTtsConfig(c.env, { enabled: nextEnabled, voice, rate, pitch })
    return c.json({ ok: true, ...updated, overlayStatus: getOverlayStatus() })
  })
  .get('/filter', dashboardAuth, async (c) => {
    const filterConfig = await resolveFilterConfig(c.env)
    return c.json({ ok: true, ...filterConfig, defaultCount: DEFAULT_BLOCKED_WORDS.length })
  })
  .put('/filter', requirePermission('config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const current = await resolveFilterConfig(c.env)
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
    const words = typeof body.words === 'string' ? body.words : current.words
    const action = body.action === 'mute' ? 'mute' : 'censor'
    const updated = await updateFilterConfig(c.env, { enabled: nextEnabled, words, action })
    return c.json({ ok: true, ...updated, defaultCount: DEFAULT_BLOCKED_WORDS.length, overlayStatus: getOverlayStatus() })
  })
  .put('/credentials', ownerAuth, async (c) => {
    const admin = await getAdmin(getDb(c.env))
    if (!admin) return c.json({ ok: false, error: 'SETUP_REQUIRED' }, 400)

    const body = (await c.req.json().catch(() => ({}))) as any
    const currentPassword = String(body.currentPassword || '')
    const newUsername = String(body.username || admin.username).trim().slice(0, 50)
    const newPassword = String(body.newPassword || '')

    if (!(await verifyPassword(admin.username, currentPassword, admin.passwordHash))) {
      return c.json({ ok: false, error: 'INVALID_CURRENT_PASSWORD' }, 401)
    }
    if (!newUsername || currentPassword.length > 128 || (newPassword && (newPassword.length < 8 || newPassword.length > 128))) {
      return c.json({ ok: false, error: 'INVALID_CREDENTIALS_FORMAT' }, 400)
    }

    const nextHash = newPassword ? await hashPassword(newPassword) : admin.passwordHash
    if (!(await updateAdmin(getDb(c.env), newUsername, nextHash))) {
      return c.json({ ok: false, error: 'UPDATE_FAILED' }, 500)
    }

    const tokenDiscordId = extractToken(c).token.split('.')[2] || ''
    const nextVersion = newPassword ? await bumpTokenVersion(getDb(c.env)) : admin.tokenVersion
    const [token, refreshToken] = await Promise.all([
      createSessionToken(c.env, newUsername, nextHash, nextVersion, tokenDiscordId),
      createRefreshToken(c.env, newUsername, nextHash, nextVersion, tokenDiscordId)
    ])
    setSessionCookie(c, token, refreshToken)
    return c.json({
      ok: true,
      username: newUsername,
      token,
      refreshToken,
      tokenVersion: nextVersion,
      sessionTimeoutMs: getSessionTimeoutMs(c.env),
      expiresAt: Number(token.split('.')[0]),
      refreshExpiresAt: Number(refreshToken.split('.')[0])
    })
  })
  .get('/donations', requirePermission('dashboard'), async (c) => {
    const rawLimit = Number(c.req.query('limit') || 100)
    const limit = Math.min(500, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 100))
    const rawSince = Number(c.req.query('since') || 0)
    const since = Number.isFinite(rawSince) ? Math.max(0, rawSince) : 0
    const includeTest = c.req.query('includeTest') === '1' || c.req.query('includeTest') === 'true'
    const [items, stats] = await Promise.all([
      listDonations(getDb(c.env), limit, since, includeTest),
      getDonationStats(getDb(c.env))
    ])
    return c.json({ ok: true, stats, items })
  })
  .delete('/donations/:id', requirePermission('dashboard'), async (c) => {
    const id = c.req.param('id')
    const deleted = await deleteDonation(getDb(c.env), id)
    if (!deleted) return c.json({ ok: false, error: 'NOT_FOUND' }, 404)
    return c.json({ ok: true, id })
  })
  .get('/subathon', dashboardAuth, async (c) => {
    const state = await getSubathonState(getDb(c.env))
    return c.json({ ok: true, state })
  })
  .put('/subathon', requirePermission('controls'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const subathonState = await applySubathonCommand(getDb(c.env), { cmd: 'set', ...body })
    const payload = { action: 'subathon', cmd: 'set', ...body, subathonState, timestamp: Date.now() }
    broadcastControl(payload)
    return c.json({ ok: true, state: subathonState })
  })
  .get('/overlay', dashboardAuth, async (c) => {
    await resolveTtsEnabled(c.env)
    return c.json({ ok: true, ...getOverlayStatus() })
  })
  .post('/overlay/control', requirePermission('controls', 'config'), async (c) => {
    const body = ((await c.req.json().catch(() => ({}))) as OverlayCommand) || {}
    const action = String(body.action || '').trim()
    if (!action) return c.json({ ok: false, error: 'ACTION_REQUIRED' }, 400)
    const allowed = new Set(['reload', 'clear', 'disconnect', 'tts', 'heartbeat', 'countdown', 'leaderboard', 'subathon', 'alert', 'bg', 'theme'])
    if (!allowed.has(action)) return c.json({ ok: false, error: 'INVALID_ACTION' }, 400)
    if (action === 'heartbeat') {
      touchOverlayHeartbeat()
      broadcastOverlayStatus()
      return c.json({ ok: true, status: getOverlayStatus() })
    }
    if (action === 'tts') {
      const current = await resolveTtsConfig(c.env)
      const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : !current.enabled
      const voice = typeof body.voice === 'string' && body.voice ? body.voice : current.voice
      const rate = typeof body.rate === 'string' ? body.rate : current.rate
      const pitch = typeof body.pitch === 'string' ? body.pitch : current.pitch
      const updated = await updateTtsConfig(c.env, { enabled: nextEnabled, voice, rate, pitch })
      return c.json({
        ok: true,
        command: {
          action: 'tts',
          enabled: updated.enabled,
          voice: updated.voice,
          rate: updated.rate,
          pitch: updated.pitch,
          timestamp: Date.now()
        },
        status: getOverlayStatus()
      })
    }
    let subathonState: SubathonState | undefined
    if (body.cmd !== 'bg' && (action === 'subathon' || (action === 'countdown' && body.mode !== 'countdown'))) {
      subathonState = await applySubathonCommand(getDb(c.env), body)
    }
    const payload = { ...body, action, ...(subathonState ? { subathonState } : {}), timestamp: Date.now() }
    broadcastControl(payload)
    return c.json({ ok: true, command: payload, ...(subathonState ? { subathonState } : {}), status: getOverlayStatus() })
  })
  .get('/access', requirePermission('access'), async (c) => {
    const items = await listDiscordWhitelist(getDb(c.env))
    return c.json({ ok: true, envIds: getEnvAllowedDiscordIds(c.env), items })
  })
  .post('/access', requirePermission('access'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const discordId = String(body.discordId || body.discord_user_id || '').trim()
    const note = String(body.note || '').trim().slice(0, 100)
    let username = body.username !== undefined ? String(body.username || '').trim().slice(0, 80) : undefined
    if (!/^\d{15,22}$/.test(discordId)) {
      return c.json({ ok: false, error: 'INVALID_DISCORD_ID' }, 400)
    }
    const db = getDb(c.env)
    const isOwner = await isOwnerSession(c)
    const permissions =
      body.permissions !== undefined
        ? parseDiscordPermissions(body.permissions)
        : isOwner
          ? DEFAULT_DISCORD_PERMISSIONS
          : (await getSessionPermissions(c)).filter((p) => p !== 'access')
    const guardErr = await guardAccessMutation(c, db, discordId, permissions)
    if (guardErr) return c.json({ ok: false, error: guardErr.error }, guardErr.status)
    if (!username && (c.env as any)?.DISCORD_BOT_TOKEN) {
      const botRes = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
        headers: { Authorization: `Bot ${(c.env as any).DISCORD_BOT_TOKEN}` },
        signal: AbortSignal.timeout(4000)
      }).catch(() => null)
      if (botRes?.ok) {
        const u = ((await botRes.json().catch(() => ({}))) as Record<string, any>) || {}
        const handle = String(u.username || '').trim()
        const globalName = String(u.global_name || '').trim()
        username =
          globalName && handle && globalName !== handle
            ? `${globalName} (@${handle})`
            : handle
              ? `@${handle}`
              : globalName || undefined
      }
    }
    await addDiscordWhitelist(db, discordId, note, username, permissions)
    const items = await listDiscordWhitelist(db)
    return c.json({ ok: true, discordId, envIds: getEnvAllowedDiscordIds(c.env), items })
  })
  .patch('/access/:id', requirePermission('access'), async (c) => {
    const id = String(c.req.param('id') || '').trim()
    const body = (await c.req.json().catch(() => ({}))) as any
    const db = getDb(c.env)
    const permissions =
      body.permissions !== undefined ? parseDiscordPermissions(body.permissions) : undefined
    const guardErr = await guardAccessMutation(c, db, id, permissions)
    if (guardErr) return c.json({ ok: false, error: guardErr.error }, guardErr.status)
    const username = body.username !== undefined ? String(body.username || '').trim().slice(0, 80) : undefined
    const note = body.note !== undefined ? String(body.note || '').trim().slice(0, 100) : undefined
    const updated = await updateDiscordWhitelistEntry(db, id, { username, note, permissions })
    if (!updated) return c.json({ ok: false, error: 'NOT_FOUND' }, 404)
    const items = await listDiscordWhitelist(db)
    return c.json({ ok: true, id, envIds: getEnvAllowedDiscordIds(c.env), items })
  })
  .delete('/access/:id', requirePermission('access'), async (c) => {
    const id = String(c.req.param('id') || '').trim()
    const db = getDb(c.env)
    const guardErr = await guardAccessMutation(c, db, id, undefined, true)
    if (guardErr) return c.json({ ok: false, error: guardErr.error }, guardErr.status)
    const removed = await removeDiscordWhitelist(db, id)
    if (!removed) return c.json({ ok: false, error: 'NOT_FOUND' }, 404)
    const items = await listDiscordWhitelist(db)
    return c.json({ ok: true, id, envIds: getEnvAllowedDiscordIds(c.env), items })
  })
  .get('/donate', dashboardAuth, async (c) => {
    const donateEnabled = await resolveDonateEnabled(c.env)
    return c.json({ ok: true, donateEnabled, overlayStatus: getOverlayStatus() })
  })
  .put('/donate', requirePermission('dashboard', 'config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const current = await resolveDonateEnabled(c.env)
    const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : !current
    const donateEnabled = await updateDonateEnabled(c.env, nextEnabled)
    return c.json({ ok: true, donateEnabled, overlayStatus: getOverlayStatus() })
  })
  .get('/theme', dashboardAuth, async (c) => {
    const theme = await resolveThemeConfig(c.env)
    return c.json({ ok: true, ...theme, flavors: CATPPUCCIN_FLAVORS, accents: CATPPUCCIN_ACCENTS, overlayStatus: getOverlayStatus() })
  })
  .put('/theme', requirePermission('config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const updated = await updateThemeConfig(c.env, { flavor: body.flavor, accent: body.accent })
    return c.json({ ok: true, ...updated, overlayStatus: getOverlayStatus() })
  })
  .get('/header', dashboardAuth, async (c) => {
    const header = await resolveHeaderConfig(c.env)
    return c.json({ ok: true, ...header, overlayStatus: getOverlayStatus() })
  })
  .put('/header', requirePermission('config'), async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as any
    const updated = await updateHeaderConfig(c.env, {
      siteTitle: body.siteTitle,
      headerTitle: body.headerTitle,
      headerSubtitle: body.headerSubtitle
    })
    return c.json({ ok: true, ...updated, overlayStatus: getOverlayStatus() })
  })
