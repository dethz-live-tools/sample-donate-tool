import { Hono } from 'hono'
import { dashboardAuth } from './auth'
import { getConfig, type Bindings } from './config'
import { addSubathonDonation, insertDonation } from './db'
import { broadcast, resolveTtsConfig, resolveTtsEnabled, resolveFilterConfig, type DonateEvent } from './events'
import { filterWordContent } from './filter'
import { verifySlip } from './slip2sure'
import { generateEdgeTTS } from './tts'

const inflightRefs = new Set<string>()

// shortcut: in-memory mobile upload session map (15m TTL, max 50), move to D1/KV if multi-isolate scale needed
type MobileUploadSession = {
  sid: string
  donor: string
  type: string
  message: string
  slipBuffer?: ArrayBuffer
  slipName?: string
  slipMime?: string
  slipUpdatedAt?: number
  completedEvent?: { id: string; donor: string; amount: number; createdAt: number }
  updatedAt: number
}
const SESSION_TTL_MS = 15 * 60 * 1000
const uploadSessions = new Map<string, MobileUploadSession>()

function cleanSessions() {
  const now = Date.now()
  for (const [k, v] of uploadSessions) {
    if (now - v.updatedAt > SESSION_TTL_MS) uploadSessions.delete(k)
  }
  while (uploadSessions.size > 50) {
    const oldest = uploadSessions.keys().next().value
    if (!oldest) break
    uploadSessions.delete(oldest)
  }
}

function sanitizeSid(raw: unknown): string {
  const s = String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return s.length >= 8 ? s : ''
}

function sanitizeInput(text: string, maxLen: number): string {
  return String(text || '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim()
    .slice(0, maxLen)
}

export const donateRoute = new Hono<{ Bindings: Bindings }>()
  .get('/session', (c) => {
    cleanSessions()
    const sid = sanitizeSid(c.req.query('sid'))
    if (!sid) return c.json({ ok: false, error: 'INVALID_SID' }, 400)
    const sess = uploadSessions.get(sid)
    if (!sess) {
      return c.json({ ok: true, exists: false, sid })
    }
    return c.json({
      ok: true,
      exists: true,
      sid,
      donor: sess.donor,
      type: sess.type,
      message: sess.message,
      hasSlip: Boolean(sess.slipBuffer),
      slipName: sess.slipName || '',
      slipMime: sess.slipMime || '',
      slipUpdatedAt: sess.slipUpdatedAt || 0,
      completedEvent: sess.completedEvent || null,
      updatedAt: sess.updatedAt
    })
  })
  .get('/session/slip', (c) => {
    cleanSessions()
    const sid = sanitizeSid(c.req.query('sid'))
    const sess = sid ? uploadSessions.get(sid) : undefined
    if (!sess || !sess.slipBuffer) return c.text('Not found', 404)
    return new Response(sess.slipBuffer, {
      headers: {
        'Content-Type': sess.slipMime || 'image/jpeg',
        'Cache-Control': 'no-store'
      }
    })
  })
  .post('/session', async (c) => {
    cleanSessions()
    const contentType = c.req.header('content-type') || ''
    let sid = ''
    let donor: string | undefined
    let type: string | undefined
    let message: string | undefined
    let file: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await c.req.formData()
      sid = sanitizeSid(form.get('sid'))
      if (form.has('donor')) donor = sanitizeInput(String(form.get('donor') || ''), 50)
      if (form.has('type')) type = form.get('type') === 'truemoney' ? 'truemoney' : 'bank-image'
      if (form.has('message')) message = sanitizeInput(String(form.get('message') || ''), 200)
      const rawFile = form.get('image')
      if (rawFile && typeof rawFile !== 'string' && rawFile instanceof File && rawFile.size > 0) {
        file = rawFile
      }
    } else {
      const body = (await c.req.json().catch(() => ({}))) as any
      sid = sanitizeSid(body.sid)
      if (typeof body.donor === 'string') donor = sanitizeInput(body.donor, 50)
      if (typeof body.type === 'string') type = body.type === 'truemoney' ? 'truemoney' : 'bank-image'
      if (typeof body.message === 'string') message = sanitizeInput(body.message, 200)
    }

    if (!sid) return c.json({ ok: false, error: 'INVALID_SID' }, 400)

    const existing = uploadSessions.get(sid) || {
      sid,
      donor: '',
      type: 'bank-image',
      message: '',
      updatedAt: Date.now()
    }

    if (donor !== undefined) existing.donor = donor
    if (type !== undefined) existing.type = type
    if (message !== undefined) existing.message = message

    if (file) {
      if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        return c.json({ ok: false, error: 'รองรับเฉพาะไฟล์รูปภาพ PNG/JPG ขนาดไม่เกิน 5MB' }, 400)
      }
      existing.slipBuffer = await file.arrayBuffer()
      existing.slipName = (file.name || 'slip.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50) || 'slip.jpg'
      existing.slipMime = file.type
      existing.slipUpdatedAt = Date.now()
      existing.completedEvent = undefined
    }

    existing.updatedAt = Date.now()
    uploadSessions.set(sid, existing)

    return c.json({
      ok: true,
      sid,
      donor: existing.donor,
      type: existing.type,
      message: existing.message,
      hasSlip: Boolean(existing.slipBuffer),
      slipName: existing.slipName || '',
      slipUpdatedAt: existing.slipUpdatedAt || 0,
      updatedAt: existing.updatedAt
    })
  })
  .post('/', async (c) => {
    cleanSessions()
    const cfg = getConfig(c.env)
    const form = await c.req.formData()
    const sid = sanitizeSid(form.get('sid'))
    const sess = sid ? uploadSessions.get(sid) : undefined
    const donorInput = sanitizeInput(String(form.get('donor') || sess?.donor || ''), 50)
    const message = sanitizeInput(String(form.get('message') || sess?.message || ''), 200)

    const rawImage = form.get('image')
    if ((!rawImage || typeof rawImage === 'string' || !(rawImage instanceof File) || rawImage.size === 0) && sess?.slipBuffer) {
      form.set(
        'image',
        new File([sess.slipBuffer], sess.slipName || 'slip.jpg', { type: sess.slipMime || 'image/jpeg' })
      )
    }

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
      if (sess) {
        sess.slipBuffer = undefined
        sess.slipName = undefined
        sess.slipMime = undefined
        sess.slipUpdatedAt = 0
        sess.completedEvent = { id: ev.id, donor: ev.donor, amount: ev.amount, createdAt: ev.createdAt }
        sess.updatedAt = Date.now()
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
