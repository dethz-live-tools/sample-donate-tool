import { Hono } from 'hono'
import { dashboardAuth } from './auth'
import { getConfig, type Bindings } from './config'
import { addSubathonDonation, insertDonation } from './db'
import { broadcast, resolveTtsConfig, resolveTtsEnabled, resolveFilterConfig, type DonateEvent } from './events'
import { filterWordContent } from './filter'
import { verifySlip } from './slip2sure'
import { generateEdgeTTS } from './tts'

const inflightRefs = new Set<string>()

function sanitizeInput(text: string, maxLen: number): string {
  return String(text || '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim()
    .slice(0, maxLen)
}

export const donateRoute = new Hono<{ Bindings: Bindings }>()
  .post('/', async (c) => {
    const cfg = getConfig(c.env)
    const form = await c.req.formData()
    const donorInput = sanitizeInput(String(form.get('donor') || ''), 50)
    const message = sanitizeInput(String(form.get('message') || ''), 200)

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
      let donor = (donorInput || verified.senderName).slice(0, 50)
      let msg = message

      const filterConfig = await resolveFilterConfig(c.env)
      let shouldMuteTts = false
      let speechDonor = donor
      let speechMsg = msg
      if (filterConfig.enabled) {
        const fDonor = filterWordContent(donor, filterConfig)
        const fMsg = filterWordContent(msg, filterConfig)
        donor = fDonor.cleanText
        msg = fMsg.cleanText
        speechDonor = fDonor.speechText || 'ผู้บริจาค'
        speechMsg = fMsg.speechText
        if (fDonor.shouldMuteTts || fMsg.shouldMuteTts) {
          shouldMuteTts = true
        }
      }

      const ttsConfig = await resolveTtsConfig(c.env)
      const ttsActive = ttsConfig.enabled && !shouldMuteTts
      const speechText = speechMsg
        ? `${speechDonor} โดเนท ${verified.amount} บาท ${speechMsg}`
        : `${speechDonor} โดเนท ${verified.amount} บาท`
      const tts = ttsActive
        ? await generateEdgeTTS(speechText, {
            voice: ttsConfig.voice,
            rate: ttsConfig.rate,
            pitch: ttsConfig.pitch
          })
        : { sampleRate: 0 }

      const ev: DonateEvent = {
        id: crypto.randomUUID(),
        donor,
        amount: verified.amount,
        message: msg,
        type,
        transRef: verified.transRef,
        audioBase64: tts.audioBase64,
        sampleRate: tts.sampleRate || 24000,
        ttsEnabled: ttsActive,
        createdAt: Date.now()
      }

      if (!(await insertDonation(c.env?.DB, ev))) {
        return c.json({ ok: false, code: 'DUPLICATE_SLIP', error: 'สลิปนี้ถูกใช้งานไปแล้ว' }, 400)
      }
      const subathonState = await addSubathonDonation(c.env?.DB, verified.amount)
      broadcast(ev)
      return c.json({ ok: true, event: ev, subathonState })
    } finally {
      inflightRefs.delete(verified.transRef)
    }
  })
  .post('/test', dashboardAuth, async (c) => {
    const cfg = getConfig(c.env)
    const body = (await c.req.json().catch(() => ({}))) as any
    const rawDonor = sanitizeInput(String(body.donor || 'TEST DONOR'), 50) || 'TEST DONOR'
    const rawAmt = Number(body.amount)
    const amount = Math.min(1_000_000, Math.max(1, Number.isFinite(rawAmt) ? rawAmt : 99))
    const rawMsg = sanitizeInput(String(body.message || 'ทดสอบระบบแจ้งเตือนโดเนท!'), 200)

    const filterConfig = await resolveFilterConfig(c.env)
    let donor = rawDonor
    let message = rawMsg
    let shouldMuteTts = false
    let speechDonor = rawDonor
    let speechMsg = rawMsg
    if (filterConfig.enabled) {
      const fDonor = filterWordContent(donor, filterConfig)
      const fMsg = filterWordContent(message, filterConfig)
      donor = fDonor.cleanText
      message = fMsg.cleanText
      speechDonor = fDonor.speechText || 'ผู้บริจาค'
      speechMsg = fMsg.speechText
      if (fDonor.shouldMuteTts || fMsg.shouldMuteTts) {
        shouldMuteTts = true
      }
    }

    const ttsConfig = await resolveTtsConfig(c.env)
    const ttsEnabled = (typeof body.ttsEnabled === 'boolean' ? body.ttsEnabled : ttsConfig.enabled) && !shouldMuteTts
    const voice = typeof body.voice === 'string' && body.voice ? body.voice : ttsConfig.voice
    const rate = typeof body.rate === 'string' ? body.rate : ttsConfig.rate
    const pitch = typeof body.pitch === 'string' ? body.pitch : ttsConfig.pitch
    const speechText = speechMsg ? `${speechDonor} โดเนท ${amount} บาท ${speechMsg}` : `${speechDonor} โดเนท ${amount} บาท`
    const tts = ttsEnabled
      ? await generateEdgeTTS(speechText, { voice, rate, pitch })
      : { sampleRate: 0 }

    const ev: DonateEvent = {
      id: crypto.randomUUID(),
      donor,
      amount,
      message,
      type: 'test',
      transRef: `TEST-${Date.now()}`,
      audioBase64: tts.audioBase64,
      sampleRate: tts.sampleRate || 24000,
      ttsEnabled,
      createdAt: Date.now()
    }
    await insertDonation(c.env?.DB, ev)
    const subathonState = await addSubathonDonation(c.env?.DB, amount)
    broadcast(ev)
    return c.json({ ok: true, event: ev, subathonState })
  })
