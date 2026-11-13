import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'fs'
import { join } from 'path'

let db: Database.Database | null = null

/**
 * Get the shared SQLite connection. The database file lives in the
 * per-user data directory so it survives app updates.
 */
export function getDatabase(): Database.Database {
  if (db) return db

  const dir = join(app.getPath('userData'), 'data')
  mkdirSync(dir, { recursive: true })

  db = new Database(join(dir, 'pukemondeck.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}
