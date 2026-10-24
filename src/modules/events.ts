import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { isValidSession } from './auth'
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

const listeners = new Set<(ev: DonateEvent) => void>()

export function broadcast(ev: DonateEvent) {
  listeners.forEach((fn) => fn(ev))
}

function sanitizeEvent(ev: DonateEvent, isAdmin: boolean): DonateEvent {
  return isAdmin ? ev : { ...ev, transRef: undefined }
}

export const eventsRoute = new Hono<{ Bindings: Bindings }>()
  .get('/poll', async (c) => {
    const isAdmin = await isValidSession(c)
    const minSince = Date.now() - 60_000
    const since = Math.max(Number(c.req.query('since') || 0), minSince)
    const items = await listDonations(c.env?.DB, 20, since, true)
    return c.json({ ok: true, items: items.reverse().map((ev) => sanitizeEvent(ev, isAdmin)) })
  })
  .get('/', async (c) => {
    const isAdmin = await isValidSession(c)
    return streamSSE(c, async (stream) => {
      const seenIds = new Set<string>()
      const send = (ev: DonateEvent) => {
        if (seenIds.has(ev.id)) return
        seenIds.add(ev.id)
        stream.writeSSE({ event: 'donate', data: JSON.stringify(sanitizeEvent(ev, isAdmin)), id: ev.id })
      }
      listeners.add(send)
      stream.onAbort(() => {
        listeners.delete(send)
      })
      while (true) {
        await stream.writeSSE({ event: 'ping', data: '1' })
        await stream.sleep(15000)
      }
    })
  })
