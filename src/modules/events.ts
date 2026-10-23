import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
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

export const eventsRoute = new Hono<{ Bindings: Bindings }>()
  .get('/poll', async (c) => {
    const since = Number(c.req.query('since') || 0)
    const items = await listDonations(c.env?.DB, 20, since, true)
    return c.json({ ok: true, items: items.reverse() })
  })
  .get('/', (c) => {
    return streamSSE(c, async (stream) => {
      let lastSeen = Date.now()
      const seenIds = new Set<string>()
      const send = (ev: DonateEvent) => {
        if (seenIds.has(ev.id)) return
        seenIds.add(ev.id)
        if (ev.createdAt > lastSeen) lastSeen = ev.createdAt
        stream.writeSSE({ event: 'donate', data: JSON.stringify(ev), id: ev.id })
      }
      listeners.add(send)
      stream.onAbort(() => {
        listeners.delete(send)
      })
      while (true) {
        const fresh = await listDonations(c.env?.DB, 10, lastSeen, true)
        for (const ev of fresh.reverse()) {
          send(ev)
        }
        await stream.writeSSE({ event: 'ping', data: '1' })
        await stream.sleep(2000)
      }
    })
  })
