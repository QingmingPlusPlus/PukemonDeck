import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { CardDatabaseStatus } from '../shared/card-db'

let cardDb: Database.Database | null = null
let cardDbError: string | null = null
let userDb: Database.Database | null = null

/**
 * 卡牌库路径（外部只读数据，整库替换，不做迁移）。
 * - 开发/预览：项目根的 data/deck.db
 * - 打包后：<resourcesPath>/db/deck.db（由 scripts/after-pack.cjs 拷贝）
 */
export function getCardDatabasePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'db', 'deck.db')
  }
  return join(__dirname, '../../data/deck.db')
}

/**
 * 打开只读卡牌库。失败时不抛异常，而是记录原因，
 * 由渲染进程根据 getCardDatabaseStatus() 显示「缺失卡牌数据」提示页。
 */
export function openCardDatabase(): CardDatabaseStatus {
  closeCardDatabase()

  const path = getCardDatabasePath()
  try {
    if (!existsSync(path)) {
      throw new Error('未找到卡牌数据库文件')
    }

    const db = new Database(path, { readonly: true, fileMustExist: true })
    db.pragma('foreign_keys = ON')
    db.pragma('query_only = ON')

    cardDb = db
    cardDbError = null
  } catch (error) {
    cardDbError = error instanceof Error ? error.message : String(error)
  }

  return getCardDatabaseStatus()
}

export function getCardDatabaseStatus(): CardDatabaseStatus {
  return { ok: cardDb !== null, path: getCardDatabasePath(), error: cardDbError }
}

/**
 * 查询入口。数据缺失时主动抛错，避免上层静默拿到空结果。
 */
export function getCardDatabase(): Database.Database {
  if (!cardDb) {
    throw new Error(cardDbError ?? `卡牌数据库未打开：${getCardDatabasePath()}`)
  }
  return cardDb
}

/**
 * 用户数据数据库连接，位于每用户数据目录，可读写，
 * 升级应用或替换卡牌库时都不会被覆盖。
 */
export function getUserDatabase(): Database.Database {
  if (userDb) return userDb

  const dir = join(app.getPath('userData'), 'data')
  mkdirSync(dir, { recursive: true })

  userDb = new Database(join(dir, 'pukemondeck.db'))
  userDb.pragma('journal_mode = WAL')
  userDb.pragma('foreign_keys = ON')

  return userDb
}

function closeCardDatabase(): void {
  cardDb?.close()
  cardDb = null
}

export function closeDatabases(): void {
  closeCardDatabase()
  userDb?.close()
  userDb = null
}
