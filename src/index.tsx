import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { authRoute, dashboardAuth, getTikTokWebhookKey, manageRoute } from './modules/auth'
import { getConfig, type Bindings } from './modules/config'
import { getAdmin, getLeaderboard, getSubathonState, listDonations } from './modules/db'
import { donateRoute } from './modules/donate'
import { eventsRoute, getOverlayStatus, isOverlayOnline, resolveFilterConfig, resolveTtsConfig, resolveTtsEnabled, updateFilterConfig, updateTtsConfig } from './modules/events'
import { DEFAULT_BLOCKED_WORDS } from './modules/filter'
import { tiktokRoute } from './modules/tiktok'
import { EDGE_TTS_VOICES, synthesizeEdgeTTS } from './modules/tts'
import {
  AlertControlPage,
  CountdownControlPage,
  LeaderboardControlPage,
  OverlayControlPage,
  SubathonControlPage
} from './pages/controls'
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

app.use(secureHeaders())
app.use('*', async (c, next) => {
  if (c.req.header('authorization')?.toLowerCase().startsWith('bearer ')) return next()
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

app.get('/api/tts', async (c) => {
  const text = c.req.query('text') || ''
  if (!text.trim()) return c.text('Text is required', 400)
  const ttsConfig = await resolveTtsConfig(c.env)
  const voice = c.req.query('voice') || ttsConfig.voice
  const rate = c.req.query('rate') || ttsConfig.rate
  const pitch = c.req.query('pitch') || ttsConfig.pitch
  try {
    const res = await synthesizeEdgeTTS(text, { voice, rate, pitch })
    return new Response(res.audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err: any) {
    return c.text(err?.message || 'TTS synthesis failed', 500)
  }
})

app.get('/tts', dashboardAuth, async (c) => {
  const ttsConfig = await resolveTtsConfig(c.env)
  return c.json({ ok: true, ...ttsConfig, voices: EDGE_TTS_VOICES })
})

app.put('/tts', dashboardAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as any
  const current = await resolveTtsConfig(c.env)
  const nextEnabled = typeof body.enabled === 'boolean' ? body.enabled : current.enabled
  const voice = typeof body.voice === 'string' && body.voice ? body.voice : current.voice
  const rate = typeof body.rate === 'string' ? body.rate : current.rate
  const pitch = typeof body.pitch === 'string' ? body.pitch : current.pitch
  const updated = await updateTtsConfig(c.env, { enabled: nextEnabled, voice, rate, pitch })
  return c.json({ ok: true, ...updated, overlayStatus: getOverlayStatus() })
})

app.get('/', (c) =>
  c.render(<HomePage config={getConfig(c.env)} overlayOnline={isOverlayOnline()} mobileSid={c.req.query('sid') || ''} />)
)
app.get('/setup', (c) => c.redirect('/login'))
app.get('/login', async (c) => {
  const configured = Boolean(c.env?.DISCORD_CLIENT_ID || c.env?.VITE_DISCORD_CLIENT_ID)
  return c.render(<LoginPage error={c.req.query('error') || undefined} configured={configured} />)
})
app.get('/dashboard', dashboardAuth, async (c) => {
  const [items] = await Promise.all([listDonations(c.env?.DB), resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<DashboardPage items={items} overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control', dashboardAuth, async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<OverlayControlPage overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control/alert', dashboardAuth, async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<AlertControlPage overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control/leaderboard', dashboardAuth, async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<LeaderboardControlPage overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control/countdown', dashboardAuth, async (c) => {
  await Promise.all([resolveTtsConfig(c.env), resolveFilterConfig(c.env)])
  return c.render(<CountdownControlPage overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control/subathon', dashboardAuth, async (c) => {
  const [, , subathonState, tiktokWebhookKey] = await Promise.all([
    resolveTtsConfig(c.env),
    resolveFilterConfig(c.env),
    getSubathonState(c.env?.DB),
    getTikTokWebhookKey(c.env)
  ])
  return c.render(
    <SubathonControlPage
      overlayStatus={getOverlayStatus()}
      subathonState={subathonState}
      tiktokWebhookKey={tiktokWebhookKey}
    />
  )
})
app.get('/control', dashboardAuth, (c) => c.redirect('/overlay/control'))
app.get('/control/alert', dashboardAuth, (c) => c.redirect('/overlay/control/alert'))
app.get('/control/leaderboard', dashboardAuth, (c) => c.redirect('/overlay/control/leaderboard'))
app.get('/control/countdown', dashboardAuth, (c) => c.redirect('/overlay/control/countdown'))
app.get('/control/subathon', dashboardAuth, (c) => c.redirect('/overlay/control/subathon'))
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
  const items = await getLeaderboard(c.env?.DB, limit)
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
  const initialState = await getSubathonState(c.env?.DB)
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
