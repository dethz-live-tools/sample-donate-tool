import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { authRoute, dashboardAuth, manageRoute } from './modules/auth'
import { getConfig, type Bindings } from './modules/config'
import { getAdmin, getLeaderboard, listDonations } from './modules/db'
import { donateRoute } from './modules/donate'
import { eventsRoute, getOverlayStatus, isOverlayOnline, resolveTtsEnabled } from './modules/events'
import { OverlayControlPage } from './pages/control'
import { CountdownOverlayPage } from './pages/countdown'
import { DashboardPage } from './pages/dashboard'
import { HomePage } from './pages/home'
import { LeaderboardOverlayPage } from './pages/leaderboard'
import { LoginPage } from './pages/login'
import { OverlayPage } from './pages/overlay'
import { SetupPage } from './pages/setup'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: Bindings }>()

app.use(secureHeaders())
app.use('*', async (c, next) => {
  if (c.req.header('authorization')?.toLowerCase().startsWith('bearer ')) return next()
  if (c.req.path === '/api/manage/login' || c.req.path === '/api/manage/setup') return next()
  return csrf()(c, next)
})
app.use(renderer)
app.route('/', authRoute)
app.route('/api/manage', manageRoute)
app.route('/api/events', eventsRoute)
app.route('/api/donate', donateRoute)

app.get('/', (c) => c.render(<HomePage config={getConfig(c.env)} overlayOnline={isOverlayOnline()} />))
app.get('/setup', async (c) => {
  const admin = await getAdmin(c.env?.DB)
  if (admin) return c.redirect('/login')
  return c.render(<SetupPage error={c.req.query('error') === '1'} />)
})
app.get('/login', async (c) => {
  const admin = await getAdmin(c.env?.DB)
  if (!admin) return c.redirect('/setup')
  return c.render(<LoginPage error={c.req.query('error') === '1'} />)
})
app.get('/dashboard', dashboardAuth, async (c) => {
  const [items] = await Promise.all([listDonations(c.env?.DB), resolveTtsEnabled(c.env)])
  return c.render(<DashboardPage items={items} overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control', dashboardAuth, async (c) => {
  await resolveTtsEnabled(c.env)
  return c.render(<OverlayControlPage overlayStatus={getOverlayStatus()} />)
})
app.get('/control', dashboardAuth, (c) => c.redirect('/overlay/control'))
app.get('/overlay', async (c) => {
  const ttsEnabled = await resolveTtsEnabled(c.env)
  return c.render(<OverlayPage ttsEnabled={ttsEnabled} />)
})
app.get('/overlay/leaderboard', async (c) => {
  const rawLimit = Number(c.req.query('limit'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 5
  const title = c.req.query('title') || 'TOP DONORS'
  const items = await getLeaderboard(c.env?.DB, limit)
  return c.render(<LeaderboardOverlayPage initialItems={items} limit={limit} title={title} />)
})
app.get('/overlay/countdown', (c) => {
  const title = c.req.query('title') || 'STARTING SOON'
  const minutes = Number(c.req.query('minutes')) || 0
  const seconds = Number(c.req.query('seconds')) || 0
  const target = c.req.query('target') || ''
  const endMsg = c.req.query('end') || 'LIVE NOW'
  return c.render(
    <CountdownOverlayPage
      title={title}
      minutes={minutes}
      seconds={seconds}
      target={target}
      endMsg={endMsg}
    />
  )
})

export default app
