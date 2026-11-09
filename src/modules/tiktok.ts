import { Hono, type Context } from 'hono'
import { dashboardAuth, getTikTokWebhookKey, isValidSession } from './auth'
import type { Bindings } from './config'
import { addSubathonDonation, applySubathonCommand, getSubathonState, type D1Binding, type SubathonState } from './db'
import { broadcastControl } from './events'

const seenGiftIds = new Set<string>()
let lastLiveCheckAt = 0
let lastCheckedUsername = ''
const LIVE_CHECK_TTL_MS = 15_000

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

export async function checkTikTokUserLive(rawUsername: string): Promise<boolean | null> {
  const username = String(rawUsername || '')
    .replace(/^@+/, '')
    .trim()
  if (!username) return null

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.tiktok.com/'
  }

  try {
    const apiUrl = `https://www.tiktok.com/api-live/user/room/?aid=1988&sourceType=54&uniqueId=${encodeURIComponent(username)}`
    const res = await fetch(apiUrl, { headers })
    if (res.ok) {
      const json = (await res.json().catch(() => null)) as any
      const roomStatus = json?.data?.liveRoom?.status ?? json?.data?.user?.status
      if (typeof roomStatus === 'number') {
        return roomStatus === 2
      }
    }
  } catch {}

  try {
    const pageUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}/live`
    const res = await fetch(pageUrl, {
      headers: {
        ...headers,
        Accept: 'text/html,application/xhtml+xml'
      }
    })
    if (res.ok) {
      const html = await res.text()
      if (html.includes('"liveRoom"')) {
        if (/"liveRoom"\s*:\s*\{[^}]*"status"\s*:\s*2\b/.test(html) || /"liveRoomUserInfo"[\s\S]{0,1500}"status"\s*:\s*2\b/.test(html)) {
          return true
        }
        if (/"liveRoom"\s*:\s*\{[^}]*"status"\s*:\s*4\b/.test(html) || /"liveRoomUserInfo"[\s\S]{0,1500}"status"\s*:\s*4\b/.test(html)) {
          return false
        }
      }
    }
  } catch {}

  return null
}

export async function syncSubathonWithTikTokLive(
  db: D1Binding | undefined,
  forceCheck = false
): Promise<SubathonState> {
  const current = await getSubathonState(db)
  const username = String(current.tiktokUsername || '')
    .replace(/^@+/, '')
    .trim()

  if (!current.tiktokAutoSync || !username) {
    return current
  }

  const now = Date.now()
  if (!forceCheck && username === lastCheckedUsername && now - lastLiveCheckAt < LIVE_CHECK_TTL_MS) {
    return current
  }

  lastLiveCheckAt = now
  lastCheckedUsername = username
  const liveResult = await checkTikTokUserLive(username)
  if (liveResult === null) {
    return current
  }

  const shouldSyncState =
    liveResult !== Boolean(current.tiktokIsLive) ||
    (liveResult && !current.isRunning && current.remainingSeconds > 0) ||
    (!liveResult && current.isRunning)

  if (!shouldSyncState) {
    return current
  }

  const updated = await applySubathonCommand(db, {
    cmd: 'tiktok_live',
    tiktokIsLive: liveResult
  })
  broadcastControl({
    action: 'subathon',
    cmd: 'tiktok_live',
    mode: 'subathon',
    tiktokIsLive: liveResult,
    subathonState: updated,
    timestamp: Date.now()
  })
  return updated
}

async function handleTikTokLiveStatusWebhook(c: Context<{ Bindings: Bindings }>) {
  const body =
    c.req.method === 'POST' || c.req.method === 'PUT'
      ? ((await c.req.json().catch(() => ({}))) as Record<string, any>)
      : ({} as Record<string, any>)

  if (!(await isAuthorizedWebhook(c, body))) {
    return c.json({ ok: false, error: 'UNAUTHORIZED_WEBHOOK_KEY' }, 401)
  }

  const rawUsername =
    body.tiktokUsername ??
    body.username ??
    body.user ??
    c.req.query('username') ??
    c.req.query('user')

  const rawAutoSync = body.tiktokAutoSync ?? body.autoSync ?? c.req.query('autoSync')
  const rawStatus = String(
    body.status ?? body.event ?? body.state ?? c.req.query('status') ?? c.req.query('event') ?? ''
  )
    .toLowerCase()
    .trim()

  let nextLive: boolean | undefined
  if (typeof body.live === 'boolean') nextLive = body.live
  else if (typeof body.tiktokIsLive === 'boolean') nextLive = body.tiktokIsLive
  else if (typeof body.online === 'boolean') nextLive = body.online
  else if (['live', 'online', 'start', 'started', 'stream_start', '1', 'true'].includes(rawStatus)) {
    nextLive = true
  } else if (['offline', 'hold', 'pause', 'paused', 'end', 'ended', 'stream_end', '0', 'false'].includes(rawStatus)) {
    nextLive = false
  }

  const current = await getSubathonState(c.env?.DB)
  const targetUsername =
    typeof rawUsername === 'string' ? rawUsername.replace(/^@+/, '').trim() : current.tiktokUsername || ''

  // If check=1 or no explicit live boolean was given and a username exists, probe TikTok LIVE directly
  const shouldProbe =
    body.check === true ||
    c.req.query('check') === '1' ||
    (nextLive === undefined && Boolean(targetUsername))

  let probedLive: boolean | null = null
  if (shouldProbe && targetUsername) {
    lastLiveCheckAt = Date.now()
    lastCheckedUsername = targetUsername
    probedLive = await checkTikTokUserLive(targetUsername)
    if (probedLive !== null && nextLive === undefined) {
      nextLive = probedLive
    }
  }

  const updated = await applySubathonCommand(c.env?.DB, {
    cmd: 'tiktok_live',
    ...(typeof rawUsername === 'string' ? { tiktokUsername: targetUsername } : {}),
    ...(typeof rawAutoSync === 'boolean'
      ? { tiktokAutoSync: rawAutoSync }
      : rawAutoSync === '1' || rawAutoSync === 'true'
        ? { tiktokAutoSync: true }
        : rawAutoSync === '0' || rawAutoSync === 'false'
          ? { tiktokAutoSync: false }
          : {}),
    ...(typeof nextLive === 'boolean' ? { tiktokIsLive: nextLive } : {})
  })

  broadcastControl({
    action: 'subathon',
    cmd: 'tiktok_live',
    mode: 'subathon',
    tiktokIsLive: updated.tiktokIsLive,
    subathonState: updated,
    timestamp: Date.now()
  })

  return c.json({
    ok: true,
    tiktokUsername: updated.tiktokUsername,
    tiktokAutoSync: updated.tiktokAutoSync,
    tiktokIsLive: updated.tiktokIsLive,
    probedLive,
    isRunning: updated.isRunning,
    subathonState: updated
  })
}

async function handleTikTokGiftWebhook(c: Context<{ Bindings: Bindings }>) {
  const body =
    c.req.method === 'POST' || c.req.method === 'PUT'
      ? ((await c.req.json().catch(() => ({}))) as Record<string, any>)
      : ({} as Record<string, any>)

  if (!(await isAuthorizedWebhook(c, body))) {
    return c.json({ ok: false, error: 'UNAUTHORIZED_WEBHOOK_KEY' }, 401)
  }

  // Handle stream start/end webhook events sent to the same webhook URL
  const rawEvent = String(body.event || body.type || c.req.query('event') || '').toLowerCase().trim()
  if (['live', 'stream_start', 'online', 'offline', 'stream_end', 'hold'].includes(rawEvent)) {
    return handleTikTokLiveStatusWebhook(c)
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

  let current = await getSubathonState(c.env?.DB)
  // Receiving a live gift when auto-sync is enabled means the TikTok stream is LIVE
  if (current.tiktokAutoSync && !current.tiktokIsLive) {
    current = await applySubathonCommand(c.env?.DB, {
      cmd: 'tiktok_live',
      tiktokIsLive: true
    })
  }

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
  .get('/live', handleTikTokLiveStatusWebhook)
  .post('/live', handleTikTokLiveStatusWebhook)
  .get('/webhook', handleTikTokGiftWebhook)
  .post('/webhook', handleTikTokGiftWebhook)
  .get('/gift', handleTikTokGiftWebhook)
  .post('/gift', handleTikTokGiftWebhook)
