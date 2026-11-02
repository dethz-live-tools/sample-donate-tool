import { Hono } from 'hono'
import { dashboardAuth } from './auth'
import { getConfig, type Bindings } from './config'
import { insertDonation } from './db'
import { broadcast, type DonateEvent } from './events'
import { verifySlip } from './slip2sure'
import { generateGeminiTTS } from './tts'

const inflightRefs = new Set<string>()

export const donateRoute = new Hono<{ Bindings: Bindings }>()
  .post('/', async (c) => {
    const cfg = getConfig(c.env)
    const form = await c.req.formData()
    const donorInput = String(form.get('donor') || '').trim().slice(0, 50)
    const message = String(form.get('message') || '').trim().slice(0, 200)

    // ponytail: native fetch to cloudflare turnstile siteverify, saves slip2sure api quota
    const turnstileSecret = c.env?.TURNSTILE_SECRET_KEY || cfg.turnstileSecret
    if (turnstileSecret) {
      const token = String(form.get('cf-turnstile-response') || '')
      if (!token) {
        return c.json({ ok: false, code: 'TURNSTILE_REQUIRED', error: 'กรุณายืนยันความปลอดภัย (Turnstile)' }, 400)
      }
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: token,
          remoteip: c.req.header('cf-connecting-ip') || ''
        })
      }).catch(() => null)
      const outcome = verifyRes
        ? ((await verifyRes.json().catch(() => ({ success: false }))) as { success: boolean; 'error-codes'?: string[] })
        : { success: false }
      if (!outcome.success) {
        return c.json({ ok: false, code: 'TURNSTILE_FAILED', error: 'การตรวจสอบ Turnstile ไม่ถูกต้อง' }, 400)
      }
    }

    const verified = await verifySlip(form, cfg, c.env?.DB)
    if (!verified.ok) {
      return c.json({ ok: false, code: verified.code, error: verified.error }, verified.status as any)
    }

    if (inflightRefs.has(verified.transRef)) {
      return c.json({ ok: false, code: 'DUPLICATE_SLIP', error: 'สลิปนี้ถูกใช้งานไปแล้ว' }, 400)
    }
    inflightRefs.add(verified.transRef)

    try {
      const type = form.get('type') === 'truemoney' ? 'truemoney' : 'bank-image'
      const donor = (donorInput || verified.senderName).slice(0, 50)
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

      if (!(await insertDonation(c.env?.DB, ev))) {
        return c.json({ ok: false, code: 'DUPLICATE_SLIP', error: 'สลิปนี้ถูกใช้งานไปแล้ว' }, 400)
      }
      broadcast(ev)
      return c.json({ ok: true, event: ev })
    } finally {
      inflightRefs.delete(verified.transRef)
    }
  })
  .post('/test', dashboardAuth, async (c) => {
    const cfg = getConfig(c.env)
    const body = (await c.req.json().catch(() => ({}))) as any
    const donor = String(body.donor || 'TEST DONOR').trim().slice(0, 50)
    const rawAmt = Number(body.amount)
    const amount = Math.min(1_000_000, Math.max(10, Number.isFinite(rawAmt) ? rawAmt : 99))
    const message = String(body.message || 'ทดสอบระบบแจ้งเตือนโดเนท!').trim().slice(0, 200)
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
