import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { authRoute, getEnvAllowedDiscordIds, getTikTokWebhookKey, manageRoute, requirePermission } from './modules/auth'
import { getConfig, type Bindings } from './modules/config'
import { resolveLocale, t, type Locale } from './i18n'
import { getDb } from './db/client'
import { getAdmin, getLeaderboard, getSubathonState, listDiscordWhitelist, listDonations } from './modules/db'
import { donateRoute } from './modules/donate'
import { eventsRoute, getOverlayStatus, isOverlayOnline, resolveDonateEnabled, resolveFilterConfig, resolveHeaderConfig, resolveThemeConfig, resolveTtsConfig, resolveTtsEnabled, updateFilterConfig, updateTtsConfig } from './modules/events'
import { DEFAULT_BLOCKED_WORDS } from './modules/filter'
import { tiktokRoute } from './modules/tiktok'
import { EDGE_TTS_VOICES, normalizeTtsOptions, synthesizeEdgeTTS } from './modules/tts'
import {
  AlertControlPage,
  CountdownControlPage,
  LeaderboardControlPage,
  OverlayControlPage,
  SubathonControlPage
} from './pages/controls'
import { AccessPage } from './pages/access'
import { ConfigPage } from './pages/config'
import { DashboardPage } from './pages/dashboard'
import { HomePage } from './pages/home'
import { LoginPage } from './pages/login'
import { AlertOverlayPage, CountdownOverlayPage, LeaderboardOverlayPage, SubathonOverlayPage } from './pages/overlays'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: Bindings }>()

app.onError((err, c) => {
  console.error('[app] Unhandled error:', err)
  return c.text('Internal Server Error', 500)
})

app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://challenges.cloudflare.com', 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ['https://challenges.cloudflare.com']
    }
  })
)
app.use('*', async (c, next) => {
  // ponytail: per-request locale, theme & web title from DB for SSR pages
  c.set('lang', resolveLocale(c.req.query(), c.req.header('cookie'), c.req.header('accept-language'), c.env?.DEFAULT_LANG))
  if (c.req.method === 'GET' && !c.req.path.startsWith('/api/')) {
    const [theme, header] = await Promise.all([resolveThemeConfig(c.env), resolveHeaderConfig(c.env)])
    c.set('themeFlavor', theme.flavor)
    c.set('themeAccent', theme.accent)
    c.set('siteTitle', header.siteTitle)
  }
  return next()
})
app.use('*', async (c, next) => {
  const authHeader = c.req.header('authorization') || ''
  if (authHeader.toLowerCase().startsWith('bearer ') && authHeader.slice(7).trim().length > 0) return next()
  if (
    c.req.path === '/api/manage/login' ||
    c.req.path === '/api/manage/setup' ||
    c.req.path.startsWith('/api/tiktok/')
  ) {
    return next()
  }
  return csrf()(c, next)
})
app.use(renderer)
app.route('/', authRoute)
app.route('/api/manage', manageRoute)
app.route('/api/events', eventsRoute)
app.route('/api/donate', donateRoute)
app.route('/api/tiktok', tiktokRoute)

app.get('/api/tts', requirePermission('config', 'controls'), async (c) => {
  const text = (c.req.query('text') || '').slice(0, 500)
  if (!text.trim()) return c.text('Text is required', 400)
  const ttsConfig = await resolveTtsConfig(c.env)
  const { voice, rate, pitch } = normalizeTtsOptions({
    voice: c.req.query('voice') || ttsConfig.voice,
    rate: c.req.query('rate') || ttsConfig.rate,
    pitch: c.req.query('pitch') || ttsConfig.pitch
  })
  try {
    const res = await synthesizeEdgeTTS(text, { voice, rate, pitch })
    return new Response(res.audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch (err: any) {
    return c.text(err?.message || 'TTS synthesis failed', 500)
  }
})

app.get('/', async (c) => {
  const [donateEnabled, header] = await Promise.all([resolveDonateEnabled(c.env), resolveHeaderConfig(c.env)])
  return c.render(
    <HomePage
      config={getConfig(c.env)}
      overlayOnline={isOverlayOnline()}
      donateEnabled={donateEnabled}
      header={header}
      mobileSid={c.req.query('sid') || ''}
      lang={c.get('lang') as Locale}
    />
  )
})
app.get('/setup', (c) => c.redirect('/login'))
app.get('/login', async (c) => {
  const configured = Boolean(c.env?.DISCORD_CLIENT_ID || c.env?.VITE_DISCORD_CLIENT_ID)
  return c.render(<LoginPage error={c.req.query('error') || undefined} configured={configured} lang={c.get('lang') as Locale} />)
})
app.get('/dashboard', requirePermission('dashboard'), async (c) => {
  const [items] = await Promise.all([
    listDonations(getDb(c.env)),
    resolveTtsConfig(c.env),
    resolveFilterConfig(c.env),
    resolveDonateEnabled(c.env)
  ])
  return c.render(<DashboardPage items={items} overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/dashboard/config', requirePermission('config'), async (c) => {
  await Promise.all([
    resolveTtsConfig(c.env),
    resolveFilterConfig(c.env),
    resolveDonateEnabled(c.env),
    resolveThemeConfig(c.env),
    resolveHeaderConfig(c.env)
  ])
  return c.render(<ConfigPage overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/config', requirePermission('config'), (c) => c.redirect('/dashboard/config'))
app.get('/dashboard/access', requirePermission('access'), async (c) => {
  const db = getDb(c.env)
  const [rawItems, admin] = await Promise.all([
    listDiscordWhitelist(db),
    getAdmin(db),
    resolveTtsConfig(c.env),
    resolveFilterConfig(c.env)
  ])
  const items = rawItems.map((item) =>
    !item.username && admin?.discordId === item.discordId && admin.username
      ? { ...item, username: admin.username }
      : item
  )
  return c.render(<AccessPage envIds={getEnvAllowedDiscordIds(c.env)} items={items} overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/access', requirePermission('access'), (c) => c.redirect('/dashboard/access'))
app.get('/overlay/control', requirePermission('controls'), async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<OverlayControlPage overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/overlay/control/alert', requirePermission('controls'), async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<AlertControlPage overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/overlay/control/leaderboard', requirePermission('controls'), async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<LeaderboardControlPage overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/overlay/control/countdown', requirePermission('controls'), async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<CountdownControlPage overlayStatus={getOverlayStatus()} lang={c.get('lang') as Locale} />)
})
app.get('/overlay/control/subathon', requirePermission('controls'), async (c) => {
  const [, , subathonState, tiktokWebhookKey] = await Promise.all([
    resolveTtsConfig(c.env),
    resolveFilterConfig(c.env),
    getSubathonState(getDb(c.env)),
    getTikTokWebhookKey(c.env)
  ])
  return c.render(
    <SubathonControlPage
      overlayStatus={getOverlayStatus()}
      subathonState={subathonState}
      tiktokWebhookKey={tiktokWebhookKey}
      lang={c.get('lang') as Locale}
    />
  )
})
app.get('/control', requirePermission('controls'), (c) => c.redirect('/overlay/control'))
app.get('/control/alert', requirePermission('controls'), (c) => c.redirect('/overlay/control/alert'))
app.get('/control/leaderboard', requirePermission('controls'), (c) => c.redirect('/overlay/control/leaderboard'))
app.get('/control/countdown', requirePermission('controls'), (c) => c.redirect('/overlay/control/countdown'))
app.get('/control/subathon', requirePermission('controls'), (c) => c.redirect('/overlay/control/subathon'))
const isTransparentQuery = (c: any) => {
  const t = c.req.query('transparent')
  const bg = c.req.query('bg')
  return t === '1' || t === 'true' || bg === 'transparent'
}

app.get('/overlay', async (c) => {
  const ttsEnabled = await resolveTtsEnabled(c.env)
  return c.render(<AlertOverlayPage ttsEnabled={ttsEnabled} transparent={isTransparentQuery(c)} />)
})
app.get('/overlay/alert', async (c) => {
  const ttsEnabled = await resolveTtsEnabled(c.env)
  return c.render(<AlertOverlayPage ttsEnabled={ttsEnabled} transparent={isTransparentQuery(c)} />)
})
app.get('/overlay/leaderboard', async (c) => {
  const rawLimit = Number(c.req.query('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 5
  const title = c.req.query('title') || 'TOP DONORS'
  const items = await getLeaderboard(getDb(c.env), limit)
  return c.render(
    <LeaderboardOverlayPage
      initialItems={items}
      limit={limit}
      title={title}
      transparent={isTransparentQuery(c)}
    />
  )
})
app.get('/overlay/countdown', (c) => {
  const title = c.req.query('title') || 'COUNTDOWN'
  const minutes = c.req.query('minutes') !== undefined ? Number(c.req.query('minutes')) : 10
  const seconds = Number(c.req.query('seconds')) || 0
  const target = c.req.query('target') || ''
  const endMsg = c.req.query('end') || 'TIME UP'
  return c.render(
    <CountdownOverlayPage
      title={title}
      minutes={minutes}
      seconds={seconds}
      target={target}
      endMsg={endMsg}
      transparent={isTransparentQuery(c)}
    />
  )
})
app.get('/overlay/subathon', async (c) => {
  const initialState = await getSubathonState(getDb(c.env))
  const title = c.req.query('title') || initialState.title || 'SUBATHON'
  const minutes = c.req.query('minutes') !== undefined ? Number(c.req.query('minutes')) : Math.round(initialState.initialSeconds / 60)
  const seconds = Number(c.req.query('seconds')) || 0
  const target = c.req.query('target') || ''
  const endMsg = c.req.query('end') || initialState.endMsg || 'TIME UP'
  const secPerThb = Number(c.req.query('sec_per_thb') || c.req.query('rate')) || initialState.secPerThb || 6
  const maxHours = Number(c.req.query('max_hours')) || initialState.maxHours || 24
  return c.render(
    <SubathonOverlayPage
      title={title}
      minutes={minutes}
      seconds={seconds}
      target={target}
      endMsg={endMsg}
      secPerThb={secPerThb}
      maxHours={maxHours}
      initialState={initialState}
      transparent={isTransparentQuery(c)}
    />
  )
})
app.get('/overlay/submatron', (c) => c.redirect('/overlay/subathon'))

export default app
