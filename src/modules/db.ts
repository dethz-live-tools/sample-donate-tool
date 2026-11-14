import { and, desc, eq, gt, ne, sql } from 'drizzle-orm'
import { admins, donations, subathonState } from '../db/schema'
import { getDb, type AppDatabase } from '../db/client'
import type { DonateEvent } from './events'

export type { AppDatabase }

export type AdminRecord = {
  username: string
  passwordHash: string
  tokenVersion: number
  apiEnabled: boolean
  discordId?: string
}

// ponytail: drizzle re-keys full-table selects to camelCase property names; decode defensively since D1/sqlite
// and Postgres return different native types for the same column (int/numeric/bool).
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v))
const bool = (v: unknown, fallback: boolean): boolean =>
  v === null || v === undefined ? fallback : v === true || v === 1 || v === '1' || v === 't' || v === 'true'

// ponytail: auto-init tables on first use instead of a migration framework (as before); DDL is dialect-portable.
let schemaReady: Promise<void> | null = null
function ensureSchema(db: AppDatabase): Promise<void> {
  schemaReady ??= (async () => {
    await db.execute(
      sql`create table if not exists donations (
        id text primary key,
        donor text not null,
        amount numeric not null,
        message text not null,
        type text not null default 'bank-image',
        trans_ref text unique not null,
        created_at bigint not null,
        audio_base64 text,
        sample_rate integer
      )`
    )
    await db.execute(
      sql`create table if not exists admins (
        id integer primary key,
        username text not null,
        password_hash text not null,
        created_at bigint not null,
        tts_enabled boolean,
        tts_voice text not null default 'th-TH-NiwatNeural',
        tts_rate text not null default '+0%',
        tts_pitch text not null default '+0Hz',
        filter_enabled boolean not null default true,
        filter_words text not null default '',
        filter_action text not null default 'censor',
        token_version integer not null default 1,
        api_enabled boolean not null default true,
        discord_id text not null default ''
      )`
    )
    await db.execute(
      sql`create table if not exists subathon_state (
        id integer primary key,
        title text not null default 'SUBATHON',
        end_msg text not null default 'TIME UP',
        initial_seconds integer not null default 600,
        remaining_seconds integer not null default 600,
        target_epoch bigint not null default 0,
        is_running boolean not null default true,
        rate_coins numeric not null default 10,
        rate_seconds integer not null default 60,
        sec_per_thb numeric not null default 6,
        max_hours integer not null default 24,
        total_added_secs integer not null default 0,
        total_donations numeric not null default 0,
        tiktok_username text not null default '',
        tiktok_auto_sync boolean not null default true,
        tiktok_is_live boolean not null default false,
        updated_at bigint not null
      )`
    )
  })()
  return schemaReady
}

export type FilterSettings = {
  enabled: boolean
  words: string
  action: 'censor' | 'mute'
}

export async function getFilterConfig(db: AppDatabase): Promise<FilterSettings> {
  const def: FilterSettings = { enabled: true, words: '', action: 'censor' }
  await ensureSchema(db)
  const [row] = await db.select().from(admins).where(eq(admins.id, 1)).limit(1)
  if (!row) return def
  return {
    enabled: bool(row.filterEnabled, true),
    words: str(row.filterWords),
    action: row.filterAction === 'mute' ? 'mute' : 'censor'
  }
}

export async function setFilterConfig(db: AppDatabase, config: Partial<FilterSettings>): Promise<FilterSettings> {
  const current = await getFilterConfig(db)
  const updated: FilterSettings = {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : current.enabled,
    words: typeof config.words === 'string' ? config.words : current.words,
    action: config.action === 'mute' ? 'mute' : 'censor'
  }
  await db
    .update(admins)
    .set({ filterEnabled: updated.enabled, filterWords: updated.words, filterAction: updated.action })
    .where(eq(admins.id, 1))
    .returning({ id: admins.id })
  return updated
}

export type TtsSettings = {
  enabled: boolean
  voice: string
  rate: string
  pitch: string
}

export async function getTtsConfig(db: AppDatabase, fallbackEnabled = true): Promise<TtsSettings> {
  const def: TtsSettings = { enabled: fallbackEnabled, voice: 'th-TH-NiwatNeural', rate: '+0%', pitch: '+0Hz' }
  await ensureSchema(db)
  const [row] = await db.select().from(admins).where(eq(admins.id, 1)).limit(1)
  if (!row) return def
  return {
    enabled: bool(row.ttsEnabled, fallbackEnabled),
    voice: str(row.ttsVoice) || 'th-TH-NiwatNeural',
    rate: str(row.ttsRate) || '+0%',
    pitch: str(row.ttsPitch) || '+0Hz'
  }
}

export async function setTtsConfig(db: AppDatabase, config: Partial<TtsSettings>): Promise<TtsSettings> {
  const current = await getTtsConfig(db)
  const updated: TtsSettings = {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : current.enabled,
    voice: typeof config.voice === 'string' && config.voice ? config.voice : current.voice,
    rate: typeof config.rate === 'string' ? config.rate : current.rate,
    pitch: typeof config.pitch === 'string' ? config.pitch : current.pitch
  }
  await db
    .update(admins)
    .set({ ttsEnabled: updated.enabled, ttsVoice: updated.voice, ttsRate: updated.rate, ttsPitch: updated.pitch })
    .where(eq(admins.id, 1))
    .returning({ id: admins.id })
  return updated
}

export async function getTtsSetting(db: AppDatabase, fallback = true): Promise<boolean> {
  const cfg = await getTtsConfig(db, fallback)
  return cfg.enabled
}

export async function setTtsSetting(db: AppDatabase, enabled: boolean): Promise<boolean> {
  const updated = await setTtsConfig(db, { enabled })
  return updated.enabled
}

export async function getAdmin(db: AppDatabase): Promise<AdminRecord | null> {
  await ensureSchema(db)
  const [row] = await db.select().from(admins).where(eq(admins.id, 1)).limit(1)
  if (!row) return null
  return {
    username: str(row.username),
    passwordHash: str(row.passwordHash),
    tokenVersion: num(row.tokenVersion, 1),
    apiEnabled: bool(row.apiEnabled, true),
    discordId: row.discordId ? str(row.discordId) : undefined
  }
}

export async function bumpTokenVersion(db: AppDatabase): Promise<number> {
  await ensureSchema(db)
  await db
    .update(admins)
    .set({ tokenVersion: sql`${admins.tokenVersion} + 1` })
    .where(eq(admins.id, 1))
    .returning({ id: admins.id })
  const admin = await getAdmin(db)
  return admin?.tokenVersion || 1
}

export async function setApiEnabled(db: AppDatabase, enabled: boolean): Promise<boolean> {
  await ensureSchema(db)
  await db.update(admins).set({ apiEnabled: enabled }).where(eq(admins.id, 1)).returning({ id: admins.id })
  return enabled
}

export async function createAdmin(
  db: AppDatabase,
  username: string,
  passwordHash: string,
  discordId = ''
): Promise<boolean> {
  await ensureSchema(db)
  try {
    const rows = await db
      .insert(admins)
      .values({ id: 1, username, passwordHash, createdAt: Date.now(), discordId })
      .onConflictDoNothing()
      .returning({ id: admins.id })
    return rows.length > 0
  } catch {
    return false
  }
}

export async function saveAdminDiscord(
  db: AppDatabase,
  username: string,
  discordId: string
): Promise<boolean> {
  await ensureSchema(db)
  const existing = await getAdmin(db)
  if (existing) {
    await db
      .update(admins)
      .set({ discordId, username })
      .where(eq(admins.id, 1))
      .returning({ id: admins.id })
    return true
  }
  return createAdmin(db, username, `discord:${discordId}`, discordId)
}

export async function updateAdmin(db: AppDatabase, username: string, passwordHash: string): Promise<boolean> {
  await ensureSchema(db)
  try {
    await db.update(admins).set({ username, passwordHash }).where(eq(admins.id, 1)).returning({ id: admins.id })
    return true
  } catch {
    return false
  }
}

export async function deleteDonation(db: AppDatabase, id: string): Promise<boolean> {
  if (!id) return false
  await ensureSchema(db)
  const rows = await db.delete(donations).where(eq(donations.id, id)).returning({ id: donations.id })
  return rows.length > 0
}

export async function getDonationStats(db: AppDatabase): Promise<{ count: number; totalAmount: number }> {
  await ensureSchema(db)
  const [row] = await db
    .select({
      count: sql`count(*)`.as('count'),
      totalAmount: sql`coalesce(sum(${donations.amount}), 0)`.as('totalAmount')
    })
    .from(donations)
    .where(ne(donations.type, 'test'))
  return {
    count: num(row?.count),
    totalAmount: num(row?.totalAmount)
  }
}

export async function isSlipUsed(db: AppDatabase, transRef: string): Promise<boolean> {
  if (!transRef) return false
  await ensureSchema(db)
  const rows = await db
    .select({ id: donations.id })
    .from(donations)
    .where(eq(donations.transRef, transRef))
    .limit(1)
  return rows.length > 0
}

export async function insertDonation(db: AppDatabase, ev: DonateEvent): Promise<boolean> {
  await ensureSchema(db)
  try {
    const rows = await db
      .insert(donations)
      .values({
        id: ev.id,
        donor: ev.donor,
        amount: ev.amount,
        message: ev.message,
        type: ev.type || 'bank-image',
        transRef: ev.transRef,
        createdAt: ev.createdAt,
        audioBase64: ev.audioBase64 || null,
        sampleRate: ev.ttsEnabled === false ? 0 : ev.sampleRate || 24000
      })
      .onConflictDoNothing()
      .returning({ id: donations.id })
    return rows.length > 0
  } catch {
    return false
  }
}

export async function listDonations(
  db: AppDatabase,
  limit = 100,
  since = 0,
  includeTest = false
): Promise<DonateEvent[]> {
  await ensureSchema(db)
  const base = and(gt(donations.createdAt, since), includeTest ? undefined : ne(donations.type, 'test'))
  const rows = await db
    .select()
    .from(donations)
    .where(base)
    .orderBy(desc(donations.createdAt))
    .limit(limit)
  return rows.map((r) => {
    const sr = r.sampleRate === null || r.sampleRate === undefined ? 24000 : num(r.sampleRate)
    return {
      id: str(r.id),
      donor: str(r.donor),
      amount: num(r.amount),
      message: str(r.message),
      type: str(r.type),
      transRef: str(r.transRef),
      audioBase64: r.audioBase64 ? str(r.audioBase64) : undefined,
      sampleRate: sr || 24000,
      ttsEnabled: sr > 0,
      createdAt: num(r.createdAt)
    }
  })
}

export type LeaderboardEntry = {
  donor: string
  total: number
  count: number
}

export async function getLeaderboard(db: AppDatabase, limit = 5): Promise<LeaderboardEntry[]> {
  await ensureSchema(db)
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 5))
  const rows = await db
    .select({
      donor: donations.donor,
      total: sql`sum(${donations.amount})`.as('total'),
      count: sql`count(*)`.as('count')
    })
    .from(donations)
    .where(ne(donations.type, 'test'))
    .groupBy(donations.donor)
    .orderBy(desc(sql`sum(${donations.amount})`))
    .limit(safeLimit)
  return rows.map((r) => ({
    donor: str(r.donor) || 'Anonymous',
    total: num(r.total),
    count: num(r.count)
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

export async function getSubathonState(db: AppDatabase): Promise<SubathonState> {
  const now = Date.now()
  if (!memorySubathonState) {
    memorySubathonState = createDefaultSubathonState(now)
  }
  await ensureSchema(db)
  const [row] = await db.select().from(subathonState).where(eq(subathonState.id, 1)).limit(1)
  if (!row) {
    const def = computeLiveSubathonState(memorySubathonState, now)
    await saveSubathonState(db, def)
    return def
  }

  const rateCoins = num(row.rateCoins) > 0 ? num(row.rateCoins) : 10
  const rateSeconds = num(row.rateSeconds) > 0 ? num(row.rateSeconds) : num(row.secPerThb, 6) * rateCoins
  const secPerThb = Number((rateSeconds / rateCoins).toFixed(4)) || 6

  const parsed: SubathonState = {
    title: str(row.title) || 'SUBATHON',
    endMsg: str(row.endMsg) || 'TIME UP',
    initialSeconds: num(row.initialSeconds, 600),
    remainingSeconds: num(row.remainingSeconds, 600),
    targetEpoch: num(row.targetEpoch),
    isRunning: bool(row.isRunning, true),
    rateCoins,
    rateSeconds,
    secPerThb,
    maxHours: num(row.maxHours, 24),
    totalAddedSecs: num(row.totalAddedSecs),
    totalDonations: num(row.totalDonations),
    tiktokUsername: str(row.tiktokUsername),
    tiktokAutoSync: bool(row.tiktokAutoSync, true),
    tiktokIsLive: bool(row.tiktokIsLive, false),
    updatedAt: num(row.updatedAt, now)
  }
  const live = computeLiveSubathonState(parsed, now)
  memorySubathonState = live
  return live
}

export async function saveSubathonState(db: AppDatabase, state: SubathonState): Promise<SubathonState> {
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
  await ensureSchema(db)
  await db
    .insert(subathonState)
    .values({
      id: 1,
      title: updated.title,
      endMsg: updated.endMsg,
      initialSeconds: updated.initialSeconds,
      remainingSeconds: updated.remainingSeconds,
      targetEpoch: updated.targetEpoch,
      isRunning: updated.isRunning,
      rateCoins: updated.rateCoins,
      rateSeconds: updated.rateSeconds,
      secPerThb: updated.secPerThb,
      maxHours: updated.maxHours,
      totalAddedSecs: updated.totalAddedSecs,
      totalDonations: updated.totalDonations,
      tiktokUsername: updated.tiktokUsername || '',
      tiktokAutoSync: updated.tiktokAutoSync,
      tiktokIsLive: updated.tiktokIsLive,
      updatedAt: updated.updatedAt
    })
    .onConflictDoUpdate({
      target: subathonState.id,
      set: {
        title: updated.title,
        endMsg: updated.endMsg,
        initialSeconds: updated.initialSeconds,
        remainingSeconds: updated.remainingSeconds,
        targetEpoch: updated.targetEpoch,
        isRunning: updated.isRunning,
        rateCoins: updated.rateCoins,
        rateSeconds: updated.rateSeconds,
        secPerThb: updated.secPerThb,
        maxHours: updated.maxHours,
        totalAddedSecs: updated.totalAddedSecs,
        totalDonations: updated.totalDonations,
        tiktokUsername: updated.tiktokUsername || '',
        tiktokAutoSync: updated.tiktokAutoSync,
        tiktokIsLive: updated.tiktokIsLive,
        updatedAt: updated.updatedAt
      }
    })
    .returning({ id: subathonState.id })
  return computeLiveSubathonState(updated, now)
}

export async function applySubathonCommand(
  db: AppDatabase,
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
  db: AppDatabase,
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
