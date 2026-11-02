import type { DonateEvent } from './events'

export type D1Binding = {
  prepare(query: string): any
  exec(query: string): Promise<any>
}

export type AdminRecord = {
  username: string
  passwordHash: string
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
      'CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)'
    )
    .run()
  initialized = true
}

export async function getAdmin(db: D1Binding | undefined): Promise<AdminRecord | null> {
  if (!db) return null
  await ensureSchema(db)
  const row = (await db.prepare('SELECT username, password_hash FROM admins WHERE id = 1').first()) as any
  if (!row) return null
  return { username: String(row.username), passwordHash: String(row.password_hash) }
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
        ev.sampleRate || 24000
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
  return (results || []).map((r: any) => ({
    id: r.id,
    donor: r.donor,
    amount: Number(r.amount),
    message: r.message,
    type: r.type,
    transRef: r.transRef,
    audioBase64: r.audioBase64 || undefined,
    sampleRate: Number(r.sampleRate || 24000),
    createdAt: Number(r.createdAt)
  }))
}
