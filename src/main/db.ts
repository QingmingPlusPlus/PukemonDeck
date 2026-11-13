import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

let cardDb: Database.Database | null = null
let userDb: Database.Database | null = null

/**
 * 运行时资源根目录。
 * - 开发/预览：仓库内的 resources/
 * - 打包后：安装目录下的 resources/（即 process.resourcesPath）
 */
function resourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')
}

/** 随版本发布的只读卡牌数据库路径（整库替换，勿在运行时写入）。 */
export function getCardDatabasePath(): string {
  return join(resourcesDir(), 'db', 'deck.db')
}

/**
 * 只读卡牌数据库连接。数据随应用版本整体替换，
 * 因此以 readonly 方式打开，避免误写以及并发锁问题。
 */
export function getCardDatabase(): Database.Database {
  if (cardDb) return cardDb

  const file = getCardDatabasePath()
  if (!existsSync(file)) {
    throw new Error(`卡牌数据库不存在：${file}`)
  }

  cardDb = new Database(file, { readonly: true, fileMustExist: true })
  cardDb.pragma('foreign_keys = ON')
  cardDb.pragma('query_only = ON')

  return cardDb
}

/**
 * 用户数据数据库连接，位于每用户数据目录，可读写，
 * 升级应用时不会被覆盖。
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

export function closeDatabases(): void {
  cardDb?.close()
  cardDb = null
  userDb?.close()
  userDb = null
}
