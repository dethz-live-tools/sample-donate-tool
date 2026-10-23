import { Hono } from 'hono'
import { dashboardAuth } from './auth'
import { getConfig, type Bindings } from './config'
import { insertDonation } from './db'
import { broadcast, type DonateEvent } from './events'
import { verifySlip } from './slip2sure'
import { generateGeminiTTS } from './tts'

export const donateRoute = new Hono<{ Bindings: Bindings }>()
  .post('/', async (c) => {
    const cfg = getConfig(c.env)
    const form = await c.req.formData()
    const donorInput = String(form.get('donor') || '').trim()
    const message = String(form.get('message') || '').trim()

    const verified = await verifySlip(form, cfg, c.env?.DB)
    if (!verified.ok) {
      return c.json({ ok: false, code: verified.code, error: verified.error }, verified.status as any)
    }

    const type = String(form.get('type') || 'bank-image')
    const donor = donorInput || verified.senderName
    const tts = await generateGeminiTTS(`${donor} โดเนท ${verified.amount} บาท ${message}`, cfg.geminiKey)

    const ev: DonateEvent = {
      id: crypto.randomUUID(),
      donor,
      amount: verified.amount,
      message,
      type,
      transRef: verified.transRef,
      audioBase64: tts.audioBase64,
      sampleRate: tts.sampleRate,
      createdAt: Date.now()
    }

    await insertDonation(c.env?.DB, ev)
    broadcast(ev)
    return c.json({ ok: true, event: ev, slip: verified.raw })
  })
  .post('/test', dashboardAuth, async (c) => {
    const cfg = getConfig(c.env)
    const body = (await c.req.json().catch(() => ({}))) as any
    const donor = String(body.donor || 'TEST DONOR').trim()
    const amount = Math.max(10, Number(body.amount) || 99)
    const message = String(body.message || 'ทดสอบระบบแจ้งเตือนโดเนท!').trim()
    const tts = await generateGeminiTTS(`${donor} โดเนท ${amount} บาท ${message}`, cfg.geminiKey)

    const ev: DonateEvent = {
      id: crypto.randomUUID(),
      donor,
      amount,
      message,
      type: 'test',
      transRef: `TEST-${Date.now()}`,
      audioBase64: tts.audioBase64,
      sampleRate: tts.sampleRate,
      createdAt: Date.now()
    }
    await insertDonation(c.env?.DB, ev)
    broadcast(ev)
    return c.json({ ok: true, event: ev })
  })
