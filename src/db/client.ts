import postgres from 'postgres'
import { drizzle as d1Drizzle } from 'drizzle-orm/d1'
import { drizzle as proxyDrizzle } from 'drizzle-orm/pg-proxy'
import { admins, discordWhitelist, donations, subathonState } from './schema'

const schema = { admins, donations, subathonState, discordWhitelist }

// ponytail: minimal controller contract both backends satisfy; db.ts codes only against this so the D1/sqlite
// and pg/pg-proxy query builders never leak into business code.
type Row = Record<string, unknown>
type SelectChain = PromiseLike<Row[]> & {
  where(c: unknown): SelectChain
  groupBy(c: unknown): SelectChain
  orderBy(c: unknown): SelectChain
  limit(n: number): SelectChain
  offset(n: number): SelectChain
}
type MutateChain = PromiseLike<Row[]> & { returning(f?: unknown): MutateChain }

export type D1Like = {
  prepare(q: string): {
    bind(...args: unknown[]): {
      run(): Promise<unknown>
      all(): Promise<unknown>
      first(): Promise<unknown>
      raw(): Promise<unknown>
    }
  }
}

export type AppDatabase = {
  dialect: 'd1' | 'pg'
  select(fields?: Record<string, unknown>): { from(t: unknown): SelectChain }
  insert(t: unknown): {
    values(row: Record<string, unknown>): MutateChain & {
      onConflictDoNothing(): MutateChain
      onConflictDoUpdate(c: unknown): MutateChain
    }
  }
  update(t: unknown): { set(row: Record<string, unknown>): { where(c: unknown): MutateChain } }
  delete(t: unknown): { where(c: unknown): MutateChain }
  execute(q: unknown): Promise<unknown>
}

let appDb: AppDatabase | null = null

// ponytail: lazy init — a workerd isolate can be created before D1/Postgres is reachable.
// Precedence: POSTGRES_URL (Postgres) > D1 binding > error (no DB configured).
export function getDb(env?: { DB?: D1Like | null; POSTGRES_URL?: string }): AppDatabase {
  if (!appDb) {
    const url = String(env?.POSTGRES_URL || '').trim()
    appDb = url ? createPgDb(url) : env?.DB ? createD1Db(env.DB) : (() => {
      throw new Error('No database configured: set POSTGRES_URL or a Cloudflare D1 binding')
    })()
  }
  return appDb
}

function createD1Db(client: D1Like): AppDatabase {
  // ponytail: delegate through the instance (bound this) instead of destructuring methods — drizzle builders need the db instance as this.
  const d1 = d1Drizzle(client as never, { schema })
  const d1WithRun = d1 as typeof d1 & { run?: (q: unknown) => Promise<unknown> }
  return {
    dialect: 'd1',
    select: (f) => ({ from: (t: unknown) => d1.select(f as never).from(t as never) }),
    insert: (t: unknown) => d1.insert(t as never),
    update: (t: unknown) => d1.update(t as never),
    delete: (t: unknown) => d1.delete(t as never),
    execute: (q) => d1WithRun.run?.(q)
  }
}

function createPgDb(connectionString: string): AppDatabase {
  if (!connectionString) throw new Error('POSTGRES_URL is not set')
  // ponytail: pg-proxy only needs client(sqlText, params, method) => { rows }; postgres() has first-class
  // workerd support via cloudflare:sockets (resolved by the `workerd` export condition at build time).
  // ponytail: one short-lived connection per query — fine for this app's low QPS; use a shared pool with
  // max_lifetime 0 if QPS ever grows.
  const client = async (sqlText: string, params: unknown[], _method: 'all' | 'execute') => {
    const sql = postgres(connectionString, { max: 1, max_lifetime: 0, onnotice: () => {} })
    try {
      // ponytail: drizzle emits ? placeholders; porsager wants $n — renumber both sides.
      let n = 0
      const pgSql = sqlText.replace(/\?/g, () => `$${++n}`)
      const rows = (await sql.unsafe(pgSql, params, { prepare: false })) as Row[]
      // ponytail: pg-proxy maps results positionally (rowMode:'array' contract); porsager returns objects
      // in server column order, so convert to arrays in that same order.
      return { rows: rows.map((r) => Object.values(r)) }
    } finally {
      await sql.end({ timeout: 3 })
    }
  }
  // ponytail: delegate through the instance (bound this) instead of destructuring methods — drizzle builders need the db instance as this.
  const pg = proxyDrizzle(client as never, { schema })
  return {
    dialect: 'pg',
    select: (f) => ({ from: (t: unknown) => pg.select(f as never).from(t as never) }),
    insert: (t: unknown) => pg.insert(t as never),
    update: (t: unknown) => pg.update(t as never),
    delete: (t: unknown) => pg.delete(t as never),
    execute: (q) => (pg as typeof pg & { execute?: (q: unknown) => Promise<unknown> }).execute?.(q)
  }
}
