import { Hono, type Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { dashboardAuth, isValidSession } from './auth'
import { getConfig, type Bindings } from './config'
import {
  applySubathonCommand,
  getFilterConfig,
  getLeaderboard,
  getSubathonState,
  getTtsConfig,
  listDonations,
  setFilterConfig,
  setTtsConfig,
  type FilterSettings,
  type SubathonState,
  type TtsSettings
} from './db'
import { syncSubathonWithTikTokLive } from './tiktok'

export type DonateEvent = {
  id: string
  donor: string
  amount: number
  message: string
  type?: string
  transRef?: string
  audioBase64?: string
  sampleRate: number
  ttsEnabled?: boolean
  createdAt: number
}

export type OverlayStatus = {
  online: boolean
  count: number
  ttsEnabled: boolean
  ttsVoice?: string
  ttsRate?: string
  ttsPitch?: string
  filterEnabled?: boolean
  filterAction?: string
  timestamp: number
}

export type OverlayCommand = {
  action: 'reload' | 'clear' | 'disconnect' | 'tts' | string
  enabled?: boolean
  voice?: string
  rate?: string
  pitch?: string
  [key: string]: any
}

const listeners = new Set<(ev: DonateEvent) => void>()
const statusListeners = new Set<(status: OverlayStatus) => void>()
const controlListeners = new Set<(cmd: OverlayCommand) => void>()
const overlayConnections = new Set<string>()
let lastOverlayHeartbeat = 0
let runtimeTtsConfig: TtsSettings | null = null
let runtimeFilterConfig: FilterSettings | null = null
const OVERLAY_TIMEOUT_MS = 15_000
const ALLOWED_CONTROL_ACTIONS = new Set(['reload', 'clear', 'disconnect', 'tts', 'heartbeat', 'countdown', 'leaderboard', 'subathon', 'alert', 'bg'])

export async function resolveTtsConfig(env?: Bindings): Promise<TtsSettings> {
  const cfg = getConfig(env)
  const val = await getTtsConfig(env?.DB, runtimeTtsConfig?.enabled ?? cfg.ttsEnabled)
  runtimeTtsConfig = val
  return val
}

export async function resolveTtsEnabled(env?: Bindings): Promise<boolean> {
  const cfg = await resolveTtsConfig(env)
  return cfg.enabled
}

export async function updateTtsConfig(env: Bindings | undefined, update: Partial<TtsSettings>): Promise<TtsSettings> {
  const val = await setTtsConfig(env?.DB, update)
  runtimeTtsConfig = val
  broadcastOverlayStatus()
  broadcastControl({
    action: 'tts',
    enabled: val.enabled,
    voice: val.voice,
    rate: val.rate,
    pitch: val.pitch,
    timestamp: Date.now()
  })
  return val
}

export async function updateTtsEnabled(env: Bindings | undefined, enabled: boolean): Promise<boolean> {
  const updated = await updateTtsConfig(env, { enabled })
  return updated.enabled
}

export async function resolveFilterConfig(env?: Bindings): Promise<FilterSettings> {
  const val = await getFilterConfig(env?.DB)
  runtimeFilterConfig = val
  return val
}

export async function updateFilterConfig(env: Bindings | undefined, update: Partial<FilterSettings>): Promise<FilterSettings> {
  const val = await setFilterConfig(env?.DB, update)
  runtimeFilterConfig = val
  broadcastOverlayStatus()
  return val
}

export function isOverlayOnline(): boolean {
  if (overlayConnections.size > 0) return true
  return Date.now() - lastOverlayHeartbeat < OVERLAY_TIMEOUT_MS
}

export function getOverlayStatus(): OverlayStatus {
  return {
    online: isOverlayOnline(),
    count: overlayConnections.size,
    ttsEnabled: runtimeTtsConfig?.enabled ?? true,
    ttsVoice: runtimeTtsConfig?.voice ?? 'th-TH-NiwatNeural',
    ttsRate: runtimeTtsConfig?.rate ?? '+0%',
    ttsPitch: runtimeTtsConfig?.pitch ?? '+0Hz',
    filterEnabled: runtimeFilterConfig?.enabled ?? true,
    filterAction: runtimeFilterConfig?.action ?? 'censor',
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
  await resolveTtsEnabled(c.env)
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

    const sendDonate = (ev: DonateEvent) => {
      if (cleanedUp || seenIds.has(ev.id)) return
      seenIds.add(ev.id)
      stream
        .writeSSE({
          event: 'donate',
          data: JSON.stringify(sanitizeEvent(ev, isAdmin)),
          id: ev.id
        })
        .catch(() => {
          cleanup()
        })
    }
    listeners.add(sendDonate)

    const sendStatus = (status: OverlayStatus) => {
      if (cleanedUp) return
      stream
        .writeSSE({
          event: 'overlay_status',
          data: JSON.stringify(status)
        })
        .catch(() => {
          cleanup()
        })
    }
    statusListeners.add(sendStatus)

    const sendControl = (cmd: OverlayCommand) => {
      if (cleanedUp || (!isOverlay && !isAdmin)) return
      stream
        .writeSSE({
          event: 'control',
          data: JSON.stringify(cmd)
        })
        .catch(() => {
          cleanup()
        })
    }
    controlListeners.add(sendControl)

    stream.onAbort(cleanup)

    // Immediate heartbeat and initial status on connect
    await stream
      .writeSSE({
        event: 'heartbeat',
        data: JSON.stringify({
          ok: true,
          client,
          online: isOverlayOnline(),
          count: overlayConnections.size,
          timestamp: Date.now()
        })
      })
      .catch(() => {
        cleanup()
      })

    if (cleanedUp) return

    await stream
      .writeSSE({
        event: 'overlay_status',
        data: JSON.stringify(getOverlayStatus())
      })
      .catch(() => {
        cleanup()
      })

    try {
      while (!cleanedUp) {
        await stream.sleep(15000)
        if (cleanedUp) break
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
    } catch {
      // stream aborted or closed
    } finally {
      cleanup()
    }
  })
}

export const eventsRoute = new Hono<{ Bindings: Bindings }>()
  .get('/poll', async (c) => {
    await resolveTtsEnabled(c.env)
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
  .get('/status', async (c) => {
    await resolveTtsEnabled(c.env)
    return c.json({ ok: true, ...getOverlayStatus() })
  })
  .get('/leaderboard', async (c) => {
    const rawLimit = Number(c.req.query('limit'))
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 5
    const items = await getLeaderboard(c.env?.DB, limit)
    return c.json({ ok: true, items })
  })
  .get('/subathon', async (c) => {
    const state = await syncSubathonWithTikTokLive(c.env?.DB)
    return c.json({ ok: true, state })
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
    if (!ALLOWED_CONTROL_ACTIONS.has(action)) {
      return c.json({ ok: false, error: 'INVALID_ACTION' }, 400)
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
      subathonState = await applySubathonCommand(c.env?.DB, body)
    }

    const payload = { ...body, action, ...(subathonState ? { subathonState } : {}), timestamp: Date.now() }
    broadcastControl(payload)
    return c.json({ ok: true, command: payload, ...(subathonState ? { subathonState } : {}), status: getOverlayStatus() })
  })
  .get('/overlay', (c) => sseHandler(c, 'overlay'))
  .get('/', (c) => sseHandler(c))
