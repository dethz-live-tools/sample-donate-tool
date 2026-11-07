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
    .prepare('SELECT username, password_hash, token_version, api_enabled FROM admins WHERE id = 1')
    .first()) as any
  if (!row) return null
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    tokenVersion: Number(row.token_version || 1),
    apiEnabled: row.api_enabled === null || row.api_enabled === undefined ? true : Number(row.api_enabled) !== 0
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

export async function createAdmin(db: D1Binding | undefined, username: string, passwordHash: string): Promise<boolean> {
  if (!db) return false
  await ensureSchema(db)
  try {
    await db
      .prepare('INSERT INTO admins (id, username, password_hash, created_at) VALUES (1, ?, ?, ?)')
      .bind(username, passwordHash, Date.now())
      .run()
    return true
  } catch {
    return false
  }
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
