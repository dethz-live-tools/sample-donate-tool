import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { authRoute, dashboardAuth } from './modules/auth'
import { getConfig, type Bindings } from './modules/config'
import { getAdmin, listDonations } from './modules/db'
import { donateRoute } from './modules/donate'
import { eventsRoute, getOverlayStatus, isOverlayOnline } from './modules/events'
import { OverlayControlPage } from './pages/control'
import { DashboardPage } from './pages/dashboard'
import { HomePage } from './pages/home'
import { LoginPage } from './pages/login'
import { OverlayPage } from './pages/overlay'
import { SetupPage } from './pages/setup'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: Bindings }>()

app.use(secureHeaders())
app.use(csrf())
app.use(renderer)
app.route('/', authRoute)
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
  const items = await listDonations(c.env?.DB)
  return c.render(<DashboardPage items={items} overlayStatus={getOverlayStatus()} />)
})
app.get('/overlay/control', dashboardAuth, (c) => {
  return c.render(<OverlayControlPage overlayStatus={getOverlayStatus()} />)
})
app.get('/control', dashboardAuth, (c) => c.redirect('/overlay/control'))
app.get('/overlay', (c) => c.render(<OverlayPage />))

export default app
