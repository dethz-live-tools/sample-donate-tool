import { Hono, type Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { dashboardAuth, isValidSession } from './auth'
import type { Bindings } from './config'
import { listDonations } from './db'

export type DonateEvent = {
  id: string
  donor: string
  amount: number
  message: string
  type?: string
  transRef?: string
  audioBase64?: string
  sampleRate: number
  createdAt: number
}

export type OverlayStatus = {
  online: boolean
  count: number
  timestamp: number
}

export type OverlayCommand = {
  action: 'reload' | 'clear' | 'disconnect' | string
  [key: string]: any
}

const listeners = new Set<(ev: DonateEvent) => void>()
const statusListeners = new Set<(status: OverlayStatus) => void>()
const controlListeners = new Set<(cmd: OverlayCommand) => void>()
const overlayConnections = new Set<string>()
let lastOverlayHeartbeat = 0
const OVERLAY_TIMEOUT_MS = 15_000

export function isOverlayOnline(): boolean {
  if (overlayConnections.size > 0) return true
  return Date.now() - lastOverlayHeartbeat < OVERLAY_TIMEOUT_MS
}

export function getOverlayStatus(): OverlayStatus {
  return {
    online: isOverlayOnline(),
    count: overlayConnections.size,
    timestamp: Date.now()
  }
}

export function broadcastOverlayStatus() {
  const status = getOverlayStatus()
  statusListeners.forEach((fn) => {
    try {
      fn(status)
    } catch {}
  })
}

export function broadcastControl(cmd: OverlayCommand) {
  if (cmd.action === 'disconnect') {
    overlayConnections.clear()
    lastOverlayHeartbeat = 0
    broadcastOverlayStatus()
  }
  controlListeners.forEach((fn) => {
    try {
      fn(cmd)
    } catch {}
  })
}

export function touchOverlayHeartbeat() {
  lastOverlayHeartbeat = Date.now()
}

export function broadcast(ev: DonateEvent) {
  listeners.forEach((fn) => {
    try {
      fn(ev)
    } catch {}
  })
}

function sanitizeEvent(ev: DonateEvent, isAdmin: boolean): DonateEvent {
  return isAdmin ? ev : { ...ev, transRef: undefined }
}

async function sseHandler(c: Context<{ Bindings: Bindings }>, forcedClient?: string) {
  const isAdmin = await isValidSession(c)
  const client = forcedClient || c.req.query('client') || (c.req.path.endsWith('/overlay') ? 'overlay' : 'default')
  const isOverlay = client === 'overlay'
  const connId = crypto.randomUUID()

  return streamSSE(c, async (stream) => {
    const seenIds = new Set<string>()

    if (isOverlay) {
      overlayConnections.add(connId)
      touchOverlayHeartbeat()
      broadcastOverlayStatus()
    }

    const sendDonate = (ev: DonateEvent) => {
      if (seenIds.has(ev.id)) return
      seenIds.add(ev.id)
      try {
        stream.writeSSE({
          event: 'donate',
          data: JSON.stringify(sanitizeEvent(ev, isAdmin)),
          id: ev.id
        })
      } catch {}
    }
    listeners.add(sendDonate)

    const sendStatus = (status: OverlayStatus) => {
      try {
        stream.writeSSE({
          event: 'overlay_status',
          data: JSON.stringify(status)
        })
      } catch {}
    }
    statusListeners.add(sendStatus)

    const sendControl = (cmd: OverlayCommand) => {
      if (!isOverlay && !isAdmin) return
      try {
        stream.writeSSE({
          event: 'control',
          data: JSON.stringify(cmd)
        })
      } catch {}
    }
    controlListeners.add(sendControl)

    let cleanedUp = false
    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      listeners.delete(sendDonate)
      statusListeners.delete(sendStatus)
      controlListeners.delete(sendControl)
      if (isOverlay) {
        overlayConnections.delete(connId)
        if (overlayConnections.size === 0) {
          lastOverlayHeartbeat = 0
        }
        broadcastOverlayStatus()
      }
    }

    stream.onAbort(cleanup)

    // Immediate heartbeat and initial status on connect
    await stream.writeSSE({
      event: 'heartbeat',
      data: JSON.stringify({
        ok: true,
        client,
        online: isOverlayOnline(),
        count: overlayConnections.size,
        timestamp: Date.now()
      })
    })

    await stream.writeSSE({
      event: 'overlay_status',
      data: JSON.stringify(getOverlayStatus())
    })

    try {
      while (true) {
        await stream.sleep(15000)
        if (isOverlay) {
          touchOverlayHeartbeat()
        }
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({
            ok: true,
            online: isOverlayOnline(),
            count: overlayConnections.size,
            timestamp: Date.now()
          })
        })
        await stream.writeSSE({ event: 'ping', data: '1' })
      }
    } finally {
      cleanup()
    }
  })
}

export const eventsRoute = new Hono<{ Bindings: Bindings }>()
  .get('/poll', async (c) => {
    const isAdmin = await isValidSession(c)
    if (c.req.query('client') === 'overlay') {
      touchOverlayHeartbeat()
    }
    const minSince = Date.now() - 60_000
    const rawSince = Number(c.req.query('since'))
    const since = Number.isFinite(rawSince) ? Math.max(rawSince, minSince) : minSince
    const items = await listDonations(c.env?.DB, 20, since, true)
    return c.json({
      ok: true,
      items: items.reverse().map((ev) => sanitizeEvent(ev, isAdmin)),
      overlayOnline: isOverlayOnline(),
      overlayStatus: getOverlayStatus()
    })
  })
  .get('/status', (c) => {
    return c.json({ ok: true, ...getOverlayStatus() })
  })
  .get('/heartbeat', dashboardAuth, (c) => {
    touchOverlayHeartbeat()
    broadcastOverlayStatus()
    return c.json({ ok: true, ...getOverlayStatus() })
  })
  .post('/heartbeat', dashboardAuth, (c) => {
    touchOverlayHeartbeat()
    broadcastOverlayStatus()
    return c.json({ ok: true, ...getOverlayStatus() })
  })
  .post('/control', dashboardAuth, async (c) => {
    const body = ((await c.req.json().catch(() => ({}))) as OverlayCommand) || {}
    const action = String(body.action || '').trim()
    if (!action) {
      return c.json({ ok: false, error: 'ACTION_REQUIRED' }, 400)
    }

    const payload = { ...body, action, timestamp: Date.now() }
    broadcastControl(payload)
    return c.json({ ok: true, command: payload, status: getOverlayStatus() })
  })
  .get('/overlay', (c) => sseHandler(c, 'overlay'))
  .get('/', (c) => sseHandler(c))
