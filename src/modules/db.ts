import type { DonateEvent } from './events'

export type D1Binding = {
  prepare(query: string): any
  exec(query: string): Promise<any>
}

export type AdminRecord = {
  username: string
  passwordHash: string
  tokenVersion: number
  apiEnabled: boolean
  discordId?: string
}

// ponytail: auto-init tables via D1 prepare.run instead of migration framework
let initialized = false
async function ensureSchema(db: D1Binding) {
  if (initialized) return
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, donor TEXT NOT NULL, amount REAL NOT NULL, message TEXT NOT NULL, type TEXT NOT NULL, trans_ref TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL, audio_base64 TEXT, sample_rate INTEGER)'
    )
    .run()
  await db
    .prepare('ALTER TABLE donations ADD COLUMN audio_base64 TEXT')
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE donations ADD COLUMN sample_rate INTEGER')
    .run()
    .catch(() => {})
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL, tts_enabled INTEGER, tts_voice TEXT DEFAULT 'th-TH-NiwatNeural', tts_rate TEXT DEFAULT '+0%', tts_pitch TEXT DEFAULT '+0Hz', filter_enabled INTEGER DEFAULT 1, filter_words TEXT DEFAULT '', filter_action TEXT DEFAULT 'censor', token_version INTEGER DEFAULT 1, api_enabled INTEGER DEFAULT 1)"
    )
    .run()
  await db
    .prepare('ALTER TABLE admins ADD COLUMN tts_enabled INTEGER')
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE admins ADD COLUMN tts_voice TEXT DEFAULT 'th-TH-NiwatNeural'")
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE admins ADD COLUMN tts_rate TEXT DEFAULT '+0%'")
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE admins ADD COLUMN tts_pitch TEXT DEFAULT '+0Hz'")
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE admins ADD COLUMN filter_enabled INTEGER DEFAULT 1')
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE admins ADD COLUMN filter_words TEXT DEFAULT ''")
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE admins ADD COLUMN filter_action TEXT DEFAULT 'censor'")
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE admins ADD COLUMN token_version INTEGER DEFAULT 1')
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE admins ADD COLUMN api_enabled INTEGER DEFAULT 1')
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE admins ADD COLUMN discord_id TEXT DEFAULT ''")
    .run()
    .catch(() => {})
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS subathon_state (id INTEGER PRIMARY KEY CHECK (id = 1), title TEXT DEFAULT 'SUBATHON', end_msg TEXT DEFAULT 'TIME UP', initial_seconds INTEGER DEFAULT 600, remaining_seconds INTEGER DEFAULT 600, target_epoch INTEGER DEFAULT 0, is_running INTEGER DEFAULT 1, rate_coins REAL DEFAULT 10, rate_seconds INTEGER DEFAULT 60, sec_per_thb REAL DEFAULT 6, max_hours INTEGER DEFAULT 24, total_added_secs INTEGER DEFAULT 0, total_donations REAL DEFAULT 0, updated_at INTEGER NOT NULL)"
    )
    .run()
  await db
    .prepare('ALTER TABLE subathon_state ADD COLUMN rate_coins REAL DEFAULT 10')
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE subathon_state ADD COLUMN rate_seconds INTEGER DEFAULT 60')
    .run()
    .catch(() => {})
  await db
    .prepare("ALTER TABLE subathon_state ADD COLUMN tiktok_username TEXT DEFAULT ''")
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE subathon_state ADD COLUMN tiktok_auto_sync INTEGER DEFAULT 1')
    .run()
    .catch(() => {})
  await db
    .prepare('ALTER TABLE subathon_state ADD COLUMN tiktok_is_live INTEGER DEFAULT 0')
    .run()
    .catch(() => {})
  initialized = true
}

export type FilterSettings = {
  enabled: boolean
  words: string
  action: 'censor' | 'mute'
}

export async function getFilterConfig(db: D1Binding | undefined): Promise<FilterSettings> {
  const def: FilterSettings = {
    enabled: true,
    words: '',
    action: 'censor'
  }
  if (!db) return def
  await ensureSchema(db)
  const row = (await db.prepare('SELECT filter_enabled, filter_words, filter_action FROM admins WHERE id = 1').first()) as any
  if (!row) return def
  return {
    enabled: row.filter_enabled === null || row.filter_enabled === undefined ? true : Number(row.filter_enabled) !== 0,
    words: String(row.filter_words || ''),
    action: row.filter_action === 'mute' ? 'mute' : 'censor'
  }
}

export async function setFilterConfig(db: D1Binding | undefined, config: Partial<FilterSettings>): Promise<FilterSettings> {
  const current = await getFilterConfig(db)
  const updated: FilterSettings = {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : current.enabled,
    words: typeof config.words === 'string' ? config.words : current.words,
    action: config.action === 'mute' ? 'mute' : 'censor'
  }
  if (!db) return updated
  await ensureSchema(db)
  await db
    .prepare('UPDATE admins SET filter_enabled = ?, filter_words = ?, filter_action = ? WHERE id = 1')
    .bind(updated.enabled ? 1 : 0, updated.words, updated.action)
    .run()
  return updated
}

export type TtsSettings = {
  enabled: boolean
  voice: string
  rate: string
  pitch: string
}

export async function getTtsConfig(db: D1Binding | undefined, fallbackEnabled = true): Promise<TtsSettings> {
  const def: TtsSettings = {
    enabled: fallbackEnabled,
    voice: 'th-TH-NiwatNeural',
    rate: '+0%',
    pitch: '+0Hz'
  }
  if (!db) return def
  await ensureSchema(db)
  const row = (await db.prepare('SELECT tts_enabled, tts_voice, tts_rate, tts_pitch FROM admins WHERE id = 1').first()) as any
  if (!row) return def
  return {
    enabled: row.tts_enabled === null || row.tts_enabled === undefined ? fallbackEnabled : Number(row.tts_enabled) !== 0,
    voice: row.tts_voice || 'th-TH-NiwatNeural',
    rate: row.tts_rate || '+0%',
    pitch: row.tts_pitch || '+0Hz'
  }
}

export async function setTtsConfig(db: D1Binding | undefined, config: Partial<TtsSettings>): Promise<TtsSettings> {
  const current = await getTtsConfig(db)
  const updated: TtsSettings = {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : current.enabled,
    voice: typeof config.voice === 'string' && config.voice ? config.voice : current.voice,
    rate: typeof config.rate === 'string' ? config.rate : current.rate,
    pitch: typeof config.pitch === 'string' ? config.pitch : current.pitch
  }
  if (!db) return updated
  await ensureSchema(db)
  await db
    .prepare('UPDATE admins SET tts_enabled = ?, tts_voice = ?, tts_rate = ?, tts_pitch = ? WHERE id = 1')
    .bind(updated.enabled ? 1 : 0, updated.voice, updated.rate, updated.pitch)
    .run()
  return updated
}

export async function getTtsSetting(db: D1Binding | undefined, fallback = true): Promise<boolean> {
  const cfg = await getTtsConfig(db, fallback)
  return cfg.enabled
}

export async function setTtsSetting(db: D1Binding | undefined, enabled: boolean): Promise<boolean> {
  const updated = await setTtsConfig(db, { enabled })
  return updated.enabled
}

export async function getAdmin(db: D1Binding | undefined): Promise<AdminRecord | null> {
  if (!db) return null
  await ensureSchema(db)
  const row = (await db
    .prepare('SELECT username, password_hash, token_version, api_enabled, discord_id FROM admins WHERE id = 1')
    .first()) as any
  if (!row) return null
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    tokenVersion: Number(row.token_version || 1),
    apiEnabled: row.api_enabled === null || row.api_enabled === undefined ? true : Number(row.api_enabled) !== 0,
    discordId: row.discord_id ? String(row.discord_id) : undefined
  }
}

export async function bumpTokenVersion(db: D1Binding | undefined): Promise<number> {
  if (!db) return 1
  await ensureSchema(db)
  await db.prepare('UPDATE admins SET token_version = COALESCE(token_version, 1) + 1 WHERE id = 1').run()
  const admin = await getAdmin(db)
  return admin?.tokenVersion || 1
}

export async function setApiEnabled(db: D1Binding | undefined, enabled: boolean): Promise<boolean> {
  if (!db) return enabled
  await ensureSchema(db)
  await db
    .prepare('UPDATE admins SET api_enabled = ? WHERE id = 1')
    .bind(enabled ? 1 : 0)
    .run()
  return enabled
}

export async function createAdmin(
  db: D1Binding | undefined,
  username: string,
  passwordHash: string,
  discordId = ''
): Promise<boolean> {
  if (!db) return false
  await ensureSchema(db)
  try {
    await db
      .prepare('INSERT INTO admins (id, username, password_hash, created_at, discord_id) VALUES (1, ?, ?, ?, ?)')
      .bind(username, passwordHash, Date.now(), discordId)
      .run()
    return true
  } catch {
    return false
  }
}

export async function saveAdminDiscord(
  db: D1Binding | undefined,
  username: string,
  discordId: string
): Promise<boolean> {
  if (!db) return false
  await ensureSchema(db)
  const existing = await getAdmin(db)
  if (existing) {
    await db
      .prepare('UPDATE admins SET discord_id = ?, username = ? WHERE id = 1')
      .bind(discordId, username)
      .run()
    return true
  }
  return createAdmin(db, username, `discord:${discordId}`, discordId)
}

export async function updateAdmin(db: D1Binding | undefined, username: string, passwordHash: string): Promise<boolean> {
  if (!db) return false
  await ensureSchema(db)
  try {
    const res = await db
      .prepare('UPDATE admins SET username = ?, password_hash = ? WHERE id = 1')
      .bind(username, passwordHash)
      .run()
    return (res?.meta?.changes ?? 1) > 0
  } catch {
    return false
  }
}

export async function deleteDonation(db: D1Binding | undefined, id: string): Promise<boolean> {
  if (!db || !id) return false
  await ensureSchema(db)
  const res = await db.prepare('DELETE FROM donations WHERE id = ?').bind(id).run()
  return (res?.meta?.changes ?? 1) > 0
}

export async function getDonationStats(db: D1Binding | undefined): Promise<{ count: number; totalAmount: number }> {
  if (!db) return { count: 0, totalAmount: 0 }
  await ensureSchema(db)
  const row = (await db
    .prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as totalAmount FROM donations WHERE type != 'test'")
    .first()) as any
  return {
    count: Number(row?.count || 0),
    totalAmount: Number(row?.totalAmount || 0)
  }
}

export async function isSlipUsed(db: D1Binding | undefined, transRef: string): Promise<boolean> {
  if (!db || !transRef) return false
  await ensureSchema(db)
  const row = await db.prepare('SELECT 1 FROM donations WHERE trans_ref = ? LIMIT 1').bind(transRef).first()
  return Boolean(row)
}

export async function insertDonation(db: D1Binding | undefined, ev: DonateEvent): Promise<boolean> {
  if (!db) return true
  await ensureSchema(db)
  try {
    const res = await db
      .prepare(
        'INSERT OR IGNORE INTO donations (id, donor, amount, message, type, trans_ref, created_at, audio_base64, sample_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(
        ev.id,
        ev.donor,
        ev.amount,
        ev.message,
        ev.type || 'bank-image',
        ev.transRef,
        ev.createdAt,
        ev.audioBase64 || null,
        ev.ttsEnabled === false ? 0 : ev.sampleRate || 24000
      )
      .run()
    return (res?.meta?.changes ?? 1) > 0
  } catch {
    return false
  }
}

export async function listDonations(
  db: D1Binding | undefined,
  limit = 100,
  since = 0,
  includeTest = false
): Promise<DonateEvent[]> {
  if (!db) return []
  await ensureSchema(db)
  const sql = includeTest
    ? 'SELECT id, donor, amount, message, type, trans_ref as transRef, created_at as createdAt, audio_base64 as audioBase64, sample_rate as sampleRate FROM donations WHERE created_at > ? ORDER BY created_at DESC LIMIT ?'
    : "SELECT id, donor, amount, message, type, trans_ref as transRef, created_at as createdAt, audio_base64 as audioBase64, sample_rate as sampleRate FROM donations WHERE created_at > ? AND type != 'test' ORDER BY created_at DESC LIMIT ?"
  const { results } = await db.prepare(sql).bind(since, limit).all()
  return (results || []).map((r: any) => {
    const sr = r.sampleRate === null || r.sampleRate === undefined ? 24000 : Number(r.sampleRate)
    return {
      id: r.id,
      donor: r.donor,
      amount: Number(r.amount),
      message: r.message,
      type: r.type,
      transRef: r.transRef,
      audioBase64: r.audioBase64 || undefined,
      sampleRate: sr || 24000,
      ttsEnabled: sr > 0,
      createdAt: Number(r.createdAt)
    }
  })
}

export type LeaderboardEntry = {
  donor: string
  total: number
  count: number
}

export async function getLeaderboard(
  db: D1Binding | undefined,
  limit = 5
): Promise<LeaderboardEntry[]> {
  if (!db) return []
  await ensureSchema(db)
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 5))
  const { results } = await db
    .prepare(
      "SELECT donor, SUM(amount) as total, COUNT(*) as count FROM donations WHERE type != 'test' GROUP BY donor ORDER BY total DESC LIMIT ?"
    )
    .bind(safeLimit)
    .all()
  return (results || []).map((r: any) => ({
    donor: String(r.donor || 'Anonymous'),
    total: Number(r.total || 0),
    count: Number(r.count || 0)
  }))
}

export const SUBATHON_GRACE_SECONDS = 180

export type SubathonState = {
  title: string
  endMsg: string
  initialSeconds: number
  remainingSeconds: number
  targetEpoch: number
  isRunning: boolean
  isGracePeriod?: boolean
  graceRemainingSeconds?: number
  isEnded?: boolean
  rateCoins: number
  rateSeconds: number
  secPerThb: number
  maxHours: number
  totalAddedSecs: number
  totalDonations: number
  tiktokUsername?: string
  tiktokAutoSync?: boolean
  tiktokIsLive?: boolean
  updatedAt: number
}

let memorySubathonState: SubathonState | null = null

function createDefaultSubathonState(now = Date.now()): SubathonState {
  return {
    title: 'SUBATHON',
    endMsg: 'TIME UP',
    initialSeconds: 600,
    remainingSeconds: 600,
    targetEpoch: 0,
    isRunning: false,
    isGracePeriod: false,
    graceRemainingSeconds: SUBATHON_GRACE_SECONDS,
    isEnded: false,
    rateCoins: 10,
    rateSeconds: 60,
    secPerThb: 6,
    maxHours: 24,
    totalAddedSecs: 0,
    totalDonations: 0,
    tiktokUsername: '',
    tiktokAutoSync: true,
    tiktokIsLive: false,
    updatedAt: now
  }
}

export function computeLiveSubathonState(state: SubathonState, now = Date.now()): SubathonState {
  if (state.targetEpoch > 0) {
    const diffSecs = Math.round((state.targetEpoch - now) / 1000)
    if (diffSecs > 0) {
      return {
        ...state,
        remainingSeconds: diffSecs,
        isRunning: true,
        isGracePeriod: false,
        graceRemainingSeconds: SUBATHON_GRACE_SECONDS,
        isEnded: false
      }
    }
    const graceRem = Math.max(0, SUBATHON_GRACE_SECONDS + diffSecs)
    return {
      ...state,
      remainingSeconds: 0,
      isRunning: false,
      isGracePeriod: graceRem > 0,
      graceRemainingSeconds: graceRem,
      isEnded: graceRem <= 0
    }
  }
  const isEnded = state.remainingSeconds <= 0
  return {
    ...state,
    isGracePeriod: false,
    graceRemainingSeconds: isEnded ? 0 : SUBATHON_GRACE_SECONDS,
    isEnded
  }
}

export async function getSubathonState(db: D1Binding | undefined): Promise<SubathonState> {
  const now = Date.now()
  if (!db) {
    if (!memorySubathonState) {
      memorySubathonState = createDefaultSubathonState(now)
    }
    return computeLiveSubathonState(memorySubathonState, now)
  }

  await ensureSchema(db)
  const row = (await db.prepare('SELECT * FROM subathon_state WHERE id = 1').first()) as any
  if (!row) {
    const def = memorySubathonState ? computeLiveSubathonState(memorySubathonState, now) : createDefaultSubathonState(now)
    await saveSubathonState(db, def)
    return def
  }

  const rateCoins = Number(row.rate_coins) > 0 ? Number(row.rate_coins) : 10
  const rateSeconds = Number(row.rate_seconds) > 0 ? Number(row.rate_seconds) : (Number(row.sec_per_thb || 6) * rateCoins)
  const secPerThb = Number((rateSeconds / rateCoins).toFixed(4)) || 6

  const parsed: SubathonState = {
    title: String(row.title || 'SUBATHON'),
    endMsg: String(row.end_msg || 'TIME UP'),
    initialSeconds: Number(row.initial_seconds ?? 600),
    remainingSeconds: Number(row.remaining_seconds ?? 600),
    targetEpoch: Number(row.target_epoch ?? 0),
    isRunning: Number(row.is_running ?? 1) !== 0,
    rateCoins,
    rateSeconds,
    secPerThb,
    maxHours: Number(row.max_hours || 24),
    totalAddedSecs: Number(row.total_added_secs || 0),
    totalDonations: Number(row.total_donations || 0),
    tiktokUsername: String(row.tiktok_username || ''),
    tiktokAutoSync: row.tiktok_auto_sync === null || row.tiktok_auto_sync === undefined ? true : Number(row.tiktok_auto_sync) !== 0,
    tiktokIsLive: Number(row.tiktok_is_live ?? 0) !== 0,
    updatedAt: Number(row.updated_at || now)
  }
  const live = computeLiveSubathonState(parsed, now)
  memorySubathonState = live
  return live
}

export async function saveSubathonState(db: D1Binding | undefined, state: SubathonState): Promise<SubathonState> {
  const now = Date.now()
  const rateCoins = Math.max(0.01, Number(state.rateCoins) || 10)
  const rateSeconds = Math.max(1, Math.round(Number(state.rateSeconds) || 60))
  const secPerThb = Number((rateSeconds / rateCoins).toFixed(4)) || 6
  const updated: SubathonState = {
    ...state,
    rateCoins,
    rateSeconds,
    secPerThb,
    tiktokUsername: String(state.tiktokUsername || '').replace(/^@+/, '').trim(),
    tiktokAutoSync: state.tiktokAutoSync ?? true,
    tiktokIsLive: Boolean(state.tiktokIsLive),
    updatedAt: now
  }
  memorySubathonState = updated
  if (!db) return computeLiveSubathonState(updated, now)

  await ensureSchema(db)
  await db
    .prepare(
      'INSERT INTO subathon_state (id, title, end_msg, initial_seconds, remaining_seconds, target_epoch, is_running, rate_coins, rate_seconds, sec_per_thb, max_hours, total_added_secs, total_donations, tiktok_username, tiktok_auto_sync, tiktok_is_live, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, end_msg = excluded.end_msg, initial_seconds = excluded.initial_seconds, remaining_seconds = excluded.remaining_seconds, target_epoch = excluded.target_epoch, is_running = excluded.is_running, rate_coins = excluded.rate_coins, rate_seconds = excluded.rate_seconds, sec_per_thb = excluded.sec_per_thb, max_hours = excluded.max_hours, total_added_secs = excluded.total_added_secs, total_donations = excluded.total_donations, tiktok_username = excluded.tiktok_username, tiktok_auto_sync = excluded.tiktok_auto_sync, tiktok_is_live = excluded.tiktok_is_live, updated_at = excluded.updated_at'
    )
    .bind(
      updated.title,
      updated.endMsg,
      updated.initialSeconds,
      updated.remainingSeconds,
      updated.targetEpoch,
      updated.isRunning ? 1 : 0,
      updated.rateCoins,
      updated.rateSeconds,
      updated.secPerThb,
      updated.maxHours,
      updated.totalAddedSecs,
      updated.totalDonations,
      updated.tiktokUsername || '',
      updated.tiktokAutoSync ? 1 : 0,
      updated.tiktokIsLive ? 1 : 0,
      updated.updatedAt
    )
    .run()

  return computeLiveSubathonState(updated, now)
}

export async function applySubathonCommand(
  db: D1Binding | undefined,
  cmd: Record<string, any>
): Promise<SubathonState> {
  const now = Date.now()
  const current = await getSubathonState(db)
  const sub = String(cmd.cmd || 'set')
  const next: SubathonState = { ...current }

  const applyRateFields = () => {
    if (typeof cmd.rateCoins === 'number' && cmd.rateCoins > 0 && typeof cmd.rateSeconds === 'number' && cmd.rateSeconds > 0) {
      next.rateCoins = cmd.rateCoins
      next.rateSeconds = Math.round(cmd.rateSeconds)
      next.secPerThb = Number((next.rateSeconds / next.rateCoins).toFixed(4))
    } else if (typeof cmd.secPerThb === 'number' && cmd.secPerThb > 0) {
      next.rateCoins = 1
      next.rateSeconds = Math.max(1, Math.round(cmd.secPerThb))
      next.secPerThb = cmd.secPerThb
    }
    if (typeof cmd.maxHours === 'number' && cmd.maxHours > 0) {
      next.maxHours = cmd.maxHours
    }
  }

  if (sub === 'set') {
    if (typeof cmd.minutes === 'number') {
      const secs = Math.max(0, Math.round(cmd.minutes * 60 + (Number(cmd.seconds) || 0)))
      next.initialSeconds = secs
      if (cmd.keepRemaining !== true) {
        next.remainingSeconds = secs
      }
    }
    if (typeof cmd.title === 'string' && cmd.title.trim()) {
      next.title = cmd.title.trim()
    }
    if (typeof cmd.endMsg === 'string' && cmd.endMsg.trim()) {
      next.endMsg = cmd.endMsg.trim()
    }
    applyRateFields()
    if (cmd.keepRemaining !== true) {
      const shouldRun = next.remainingSeconds > 0 && (!next.tiktokAutoSync || Boolean(next.tiktokIsLive))
      next.isRunning = shouldRun
      next.targetEpoch = shouldRun ? now + next.remainingSeconds * 1000 : 0
    }
  } else if (sub === 'rate') {
    applyRateFields()
  } else if (sub === 'tiktok_live') {
    if (typeof cmd.tiktokUsername === 'string') {
      next.tiktokUsername = cmd.tiktokUsername.replace(/^@+/, '').trim()
    }
    if (typeof cmd.tiktokAutoSync === 'boolean') {
      next.tiktokAutoSync = cmd.tiktokAutoSync
    }
    if (typeof cmd.tiktokIsLive === 'boolean') {
      next.tiktokIsLive = cmd.tiktokIsLive
    }
    if (next.tiktokAutoSync) {
      if (next.tiktokIsLive) {
        if (!next.isRunning && next.remainingSeconds > 0) {
          next.isRunning = true
          next.targetEpoch = now + next.remainingSeconds * 1000
        }
      } else {
        next.isRunning = false
        next.targetEpoch = 0
      }
    }
  } else if (sub === 'pause') {
    next.isRunning = false
    next.targetEpoch = 0
  } else if (sub === 'start' || sub === 'resume') {
    if (next.remainingSeconds > 0) {
      next.isRunning = true
      next.targetEpoch = now + next.remainingSeconds * 1000
    }
  } else if (sub === 'reset') {
    next.remainingSeconds = next.initialSeconds
    next.totalAddedSecs = 0
    next.totalDonations = 0
    const shouldRun = next.remainingSeconds > 0 && (!next.tiktokAutoSync || Boolean(next.tiktokIsLive))
    next.isRunning = shouldRun
    next.targetEpoch = shouldRun ? now + next.remainingSeconds * 1000 : 0
  } else if (sub === 'adjust') {
    const delta = Number(cmd.delta) || 0
    const maxCapSecs = Math.max(1, next.maxHours) * 3600
    next.remainingSeconds = Math.max(0, Math.min(maxCapSecs, next.remainingSeconds + delta))
    if (next.remainingSeconds === 0) {
      next.isRunning = false
      next.targetEpoch = now
    } else if (next.isRunning || next.isGracePeriod) {
      next.isRunning = true
      next.targetEpoch = now + next.remainingSeconds * 1000
    }
  }

  return await saveSubathonState(db, next)
}

export async function addSubathonDonation(
  db: D1Binding | undefined,
  amount: number
): Promise<SubathonState> {
  const now = Date.now()
  const current = await getSubathonState(db)
  const amt = Number(amount) || 0
  if (amt <= 0) return current
  if (current.isEnded) return current

  const rateCoins = Math.max(0.01, current.rateCoins || 1)
  const steps = Math.floor(amt / rateCoins)
  if (steps <= 0) return current
  const rateSeconds = Math.max(1, current.rateSeconds || current.secPerThb || 6)
  const addedSecs = Math.round(steps * rateSeconds)
  if (addedSecs <= 0) return current

  const maxCapSecs = Math.max(1, current.maxHours) * 3600
  const baseRemaining = current.isGracePeriod ? 0 : current.remainingSeconds
  const newRemaining = Math.min(maxCapSecs, baseRemaining + addedSecs)
  const shouldRun = newRemaining > 0 && (!current.tiktokAutoSync || Boolean(current.tiktokIsLive))

  const next: SubathonState = {
    ...current,
    remainingSeconds: newRemaining,
    isRunning: shouldRun,
    isGracePeriod: false,
    graceRemainingSeconds: SUBATHON_GRACE_SECONDS,
    isEnded: false,
    targetEpoch: shouldRun ? now + newRemaining * 1000 : 0,
    totalAddedSecs: current.totalAddedSecs + addedSecs,
    totalDonations: current.totalDonations + amt,
    updatedAt: now
  }

  return await saveSubathonState(db, next)
}
