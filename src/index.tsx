import { Hono } from 'hono'
import { authRoute, dashboardAuth } from './modules/auth'
import { getConfig, type Bindings } from './modules/config'
import { getAdmin, listDonations } from './modules/db'
import { donateRoute } from './modules/donate'
import { eventsRoute } from './modules/events'
import { DashboardPage } from './pages/dashboard'
import { HomePage } from './pages/home'
import { LoginPage } from './pages/login'
import { OverlayPage } from './pages/overlay'
import { SetupPage } from './pages/setup'
import { renderer } from './renderer'

const app = new Hono<{ Bindings: Bindings }>()

app.use(renderer)
app.route('/', authRoute)
app.route('/api/events', eventsRoute)
app.route('/api/donate', donateRoute)

app.get('/', (c) => c.render(<HomePage config={getConfig(c.env)} />))
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
  return c.render(<DashboardPage items={items} />)
})
app.get('/overlay', (c) => c.render(<OverlayPage />))

export default app
