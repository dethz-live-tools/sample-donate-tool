import { Hono, type Context } from 'hono'
import { dashboardAuth, getTikTokWebhookKey, isValidSession } from './auth'
import type { Bindings } from './config'
import { addSubathonDonation, getSubathonState } from './db'
import { broadcastControl } from './events'

const seenGiftIds = new Set<string>()

function sanitizeText(val: unknown, maxLen = 50): string {
  return String(val || '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .trim()
    .slice(0, maxLen)
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function isAuthorizedWebhook(c: Context<{ Bindings: Bindings }>, body: Record<string, any>): Promise<boolean> {
  if (await isValidSession(c)) return true
  const expectedKey = await getTikTokWebhookKey(c.env)
  const authHeader = c.req.header('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''
  const candidate = String(
    c.req.query('key') ||
      c.req.query('token') ||
      c.req.header('x-webhook-key') ||
      c.req.header('x-tiktok-key') ||
      body.key ||
      body.secret ||
      bearer ||
      ''
  ).trim()
  return safeEqual(candidate, expectedKey)
}

async function handleTikTokGiftWebhook(c: Context<{ Bindings: Bindings }>) {
  const body =
    c.req.method === 'POST' || c.req.method === 'PUT'
      ? ((await c.req.json().catch(() => ({}))) as Record<string, any>)
      : ({} as Record<string, any>)

  if (!(await isAuthorizedWebhook(c, body))) {
    return c.json({ ok: false, error: 'UNAUTHORIZED_WEBHOOK_KEY' }, 401)
  }

  // Ignore intermediate streak packets from tiktok-live-connector (giftType 1 before repeatEnd)
  const giftType = Number(body.giftType ?? body.gift_type ?? c.req.query('giftType') ?? 0)
  const repeatEnd = body.repeatEnd ?? body.repeat_end ?? c.req.query('repeatEnd')
  if (giftType === 1 && (repeatEnd === false || repeatEnd === 'false' || repeatEnd === '0' || body.streaking === true)) {
    return c.json({ ok: true, added: false, ignored: true, reason: 'STREAK_IN_PROGRESS' })
  }

  const eventId = sanitizeText(
    body.msgId || body.eventId || body.id || c.req.query('msgId') || c.req.query('eventId') || c.req.query('id'),
    100
  )
  if (eventId) {
    if (seenGiftIds.has(eventId)) {
      return c.json({ ok: true, added: false, ignored: true, reason: 'DUPLICATE_EVENT_ID', eventId })
    }
    if (seenGiftIds.size >= 500) {
      const oldest = seenGiftIds.values().next().value
      if (oldest) seenGiftIds.delete(oldest)
    }
    seenGiftIds.add(eventId)
  }

  const donor =
    sanitizeText(
      body.nickname ||
        body.username ||
        body.uniqueId ||
        body.user ||
        body.donor ||
        body.sender ||
        c.req.query('user') ||
        c.req.query('username') ||
        c.req.query('nickname') ||
        c.req.query('donor'),
      50
    ) || 'TIKTOK GIFTER'

  const giftName =
    sanitizeText(
      body.giftName ||
        body.gift_name ||
        body.gift ||
        body.item ||
        c.req.query('gift') ||
        c.req.query('giftName'),
      50
    ) || 'TIKTOK GIFT'

  const repeatCount = Math.max(
    1,
    Math.round(
      Number(
        body.repeatCount ??
          body.repeat_count ??
          body.repeat ??
          body.count ??
          body.combo ??
          c.req.query('repeat') ??
          c.req.query('repeatCount') ??
          c.req.query('count') ??
          1
      ) || 1
    )
  )

  const rawDiamonds =
    body.diamondCount ??
    body.diamond_count ??
    body.diamonds ??
    body.unitCoins ??
    c.req.query('diamonds') ??
    c.req.query('diamondCount')

  const rawTotalCoins =
    body.coins ??
    body.totalCoins ??
    body.total_coins ??
    body.amount ??
    body.value ??
    c.req.query('coins') ??
    c.req.query('amount')

  const coins =
    rawDiamonds !== undefined && rawDiamonds !== ''
      ? Number(rawDiamonds) * repeatCount
      : Number(rawTotalCoins)

  if (!Number.isFinite(coins) || coins <= 0) {
    return c.json(
      {
        ok: false,
        error: 'INVALID_COINS',
        message: 'Provide positive coins or diamondCount parameter'
      },
      400
    )
  }

  const current = await getSubathonState(c.env?.DB)
  if (current.isEnded) {
    return c.json({
      ok: true,
      added: false,
      reason: 'SUBATHON_ENDED',
      donor,
      giftName,
      coins,
      repeatCount,
      addedSeconds: 0,
      subathonState: current
    })
  }
  const rateCoins = Math.max(0.01, current.rateCoins || 1)
  const rateSeconds = Math.max(1, current.rateSeconds || current.secPerThb || 6)
  const steps = Math.floor(coins / rateCoins)
  const remainder = Number((coins % rateCoins).toFixed(2))

  if (steps <= 0) {
    broadcastControl({
      action: 'subathon',
      cmd: 'gift_ignored',
      mode: 'subathon',
      subathonState: current,
      gift: {
        donor,
        giftName,
        coins,
        repeatCount,
        steps: 0,
        remainder,
        addedSecs: 0
      },
      timestamp: Date.now()
    })
    return c.json({
      ok: true,
      added: false,
      reason: 'BELOW_MIN_RATE',
      donor,
      giftName,
      coins,
      repeatCount,
      rateCoins,
      rateSeconds,
      steps: 0,
      remainder,
      addedSeconds: 0,
      subathonState: current
    })
  }

  const addedSeconds = Math.round(steps * rateSeconds)
  const updatedState = await addSubathonDonation(c.env?.DB, coins)

  broadcastControl({
    action: 'subathon',
    cmd: 'gift',
    mode: 'subathon',
    subathonState: updatedState,
    gift: {
      donor,
      giftName,
      coins,
      repeatCount,
      steps,
      remainder,
      addedSecs: addedSeconds
    },
    timestamp: Date.now()
  })

  return c.json({
    ok: true,
    added: true,
    donor,
    giftName,
    coins,
    repeatCount,
    rateCoins,
    rateSeconds,
    steps,
    remainder,
    addedSeconds,
    subathonState: updatedState
  })
}

export const tiktokRoute = new Hono<{ Bindings: Bindings }>()
  .get('/config', dashboardAuth, async (c) => {
    const key = await getTikTokWebhookKey(c.env)
    return c.json({ ok: true, key })
  })
  .get('/webhook', handleTikTokGiftWebhook)
  .post('/webhook', handleTikTokGiftWebhook)
  .get('/gift', handleTikTokGiftWebhook)
  .post('/gift', handleTikTokGiftWebhook)
