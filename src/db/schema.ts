import { sql } from 'drizzle-orm'
import { boolean, check, customType, integer, numeric, pgTable, text } from 'drizzle-orm/pg-core'

// ponytail: D1/sqlite INTEGER is 64-bit but PG integer is int4 — millisecond epochs overflow int4.
// customType keeps one schema for both dialects (sqlite-core has no bigint()).
const int64 = customType<{ data: number; driver: number }>({
  dataType() { return 'bigint' },
  toDriver(value) { return value }
})

export const donations = pgTable('donations', {
  id: text('id').primaryKey(),
  donor: text('donor').notNull(),
  amount: numeric('amount', { mode: 'number' }).notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('bank-image'),
  transRef: text('trans_ref').notNull().unique(),
  createdAt: int64('created_at').notNull(),
  audioBase64: text('audio_base64'),
  sampleRate: integer('sample_rate', { mode: 'number' })
})

export const admins = pgTable('admins', {
  id: integer('id').notNull().primaryKey().default(1).$defaultFn(() => 1),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: int64('created_at').notNull(),
  ttsEnabled: boolean('tts_enabled'),
  ttsVoice: text('tts_voice').notNull().default('th-TH-NiwatNeural'),
  ttsRate: text('tts_rate').notNull().default('+0%'),
  ttsPitch: text('tts_pitch').notNull().default('+0Hz'),
  filterEnabled: boolean('filter_enabled').notNull().default(true),
  filterWords: text('filter_words').notNull().default(''),
  filterAction: text('filter_action').notNull().default('censor'),
  tokenVersion: integer('token_version', { mode: 'number' }).notNull().default(1),
  apiEnabled: boolean('api_enabled').notNull().default(true),
  discordId: text('discord_id').notNull().default(''),
  donateEnabled: boolean('donate_enabled').notNull().default(false)
}, (t) => [check('admins_id_is_1', sql`${t.id} = 1`)])

export const subathonState = pgTable('subathon_state', {
  id: integer('id').notNull().primaryKey().default(1).$defaultFn(() => 1),
  title: text('title').notNull().default('SUBATHON'),
  endMsg: text('end_msg').notNull().default('TIME UP'),
  initialSeconds: integer('initial_seconds', { mode: 'number' }).notNull().default(600),
  remainingSeconds: integer('remaining_seconds', { mode: 'number' }).notNull().default(600),
  targetEpoch: int64('target_epoch').notNull().default(0),
  isRunning: boolean('is_running').notNull().default(true),
  rateCoins: numeric('rate_coins', { mode: 'number' }).notNull().default(10),
  rateSeconds: integer('rate_seconds', { mode: 'number' }).notNull().default(60),
  secPerThb: numeric('sec_per_thb', { mode: 'number' }).notNull().default(6),
  maxHours: integer('max_hours', { mode: 'number' }).notNull().default(24),
  totalAddedSecs: integer('total_added_secs', { mode: 'number' }).notNull().default(0),
  totalDonations: numeric('total_donations', { mode: 'number' }).notNull().default(0),
  tiktokUsername: text('tiktok_username').notNull().default(''),
  tiktokAutoSync: boolean('tiktok_auto_sync').notNull().default(true),
  tiktokIsLive: boolean('tiktok_is_live').notNull().default(false),
  updatedAt: int64('updated_at').notNull()
}, (t) => [check('subathon_state_id_is_1', sql`${t.id} = 1`)])

export const discordWhitelist = pgTable('discord_whitelist', {
  discordId: text('discord_id').primaryKey(),
  note: text('note').notNull().default(''),
  createdAt: int64('created_at').notNull()
})
