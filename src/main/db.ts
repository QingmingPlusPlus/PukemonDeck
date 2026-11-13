import Database from 'better-sqlite3'
import { app, dialog, type BrowserWindow } from 'electron'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
  renameSync,
  unlinkSync
} from 'fs'
import { dirname, join } from 'path'
import type { CardDatabaseSource, CardDatabaseStatus } from '../shared/card-db'

/** 导入时必须存在的核心表，见 docs/db/deck.sql。 */
const REQUIRED_TABLES = ['ptcg_card', 'ptcg_dict'] as const

const SQLITE_HEADER = 'SQLite format 3\0'

let cardDb: Database.Database | null = null
let cardDbError: string | null = null
let cardDbPath: string | null = null
let cardDbSource: CardDatabaseSource | null = null
let userDb: Database.Database | null = null

/**
 * 用户导入的卡牌库路径。位于每用户数据目录，重启后仍保留，
 * 优先于随应用分发的打包副本。
 */
export function getImportedCardDatabasePath(): string {
  return join(app.getPath('userData'), 'data', 'deck.db')
}

/**
 * 随应用分发的卡牌库路径（打包时由 scripts/after-pack.cjs 写入）。
 * - 开发/预览：项目根的 data/deck.db
 * - 打包后：<resourcesPath>/db/deck.db
 */
export function getBundledCardDatabasePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'db', 'deck.db')
  }
  return join(__dirname, '../../data/deck.db')
}

/**
 * 按解析顺序得到当前应使用的卡牌库路径：
 * 1. 用户导入的副本（userData/data/deck.db）
 * 2. 随应用分发的副本
 * 两者都不存在时返回打包/开发期的分发路径，便于在状态中提示。
 */
export function getCardDatabasePath(): string {
  const imported = getImportedCardDatabasePath()
  if (existsSync(imported)) return imported
  return getBundledCardDatabasePath()
}

function getOpenPath(): string {
  return cardDbPath ?? getCardDatabasePath()
}

/**
 * 打开只读卡牌库。失败时不抛异常，而是记录原因，
 * 由渲染进程根据 getCardDatabaseStatus() 显示导入页。
 *
 * 解析顺序：用户导入副本 → 随应用分发的副本。
 * 若导入副本存在但无法打开，不会回退到分发副本，以免掩盖损坏文件。
 */
export function openCardDatabase(): CardDatabaseStatus {
  closeCardDatabase()

  const imported = getImportedCardDatabasePath()
  if (existsSync(imported)) {
    return tryOpenCardDatabase(imported, 'imported')
  }

  const bundled = getBundledCardDatabasePath()
  if (existsSync(bundled)) {
    return tryOpenCardDatabase(bundled, 'bundled')
  }

  cardDbError = '未找到卡牌数据库文件'
  cardDbPath = bundled
  cardDbSource = null
  return getCardDatabaseStatus()
}

function tryOpenCardDatabase(path: string, source: CardDatabaseSource): CardDatabaseStatus {
  try {
    cardDb = openReadonlyCardDatabase(path)
    cardDbError = null
    cardDbPath = path
    cardDbSource = source
  } catch (error) {
    cardDb = null
    cardDbError = toCardDbError(error)
    cardDbPath = path
    cardDbSource = null
  }

  return getCardDatabaseStatus()
}

export function getCardDatabaseStatus(): CardDatabaseStatus {
  return {
    ok: cardDb !== null,
    path: getOpenPath(),
    error: cardDbError,
    source: cardDbSource
  }
}

/**
 * 查询入口。数据缺失时主动抛错，避免上层静默拿到空结果。
 */
export function getCardDatabase(): Database.Database {
  if (!cardDb) {
    throw new Error(cardDbError ?? `卡牌数据库未打开：${getOpenPath()}`)
  }
  return cardDb
}

/**
 * 弹出系统文件选择框并导入所选数据库。
 * 用户取消时返回当前状态，并带上 cancelled: true。
 */
export async function pickAndImportCardDatabase(
  browserWindow?: BrowserWindow | null
): Promise<CardDatabaseStatus> {
  const options: Electron.OpenDialogOptions = {
    title: '选择卡牌数据库',
    properties: ['openFile'],
    filters: [
      { name: '卡牌数据库', extensions: ['db', 'sqlite'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  }

  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return { ...getCardDatabaseStatus(), cancelled: true }
  }

  return importCardDatabase(result.filePaths[0])
}

/**
 * 校验源文件后复制到 userData/data/deck.db（先拷到临时文件再重命名），
 * 然后重新以只读方式打开。
 */
export function importCardDatabase(sourcePath: string): CardDatabaseStatus {
  if (typeof sourcePath !== 'string' || sourcePath.trim() === '') {
    return {
      ok: false,
      path: getOpenPath(),
      error: '无效的文件路径',
      source: cardDbSource
    }
  }

  const source = sourcePath.trim()
  if (!existsSync(source)) {
    return {
      ok: false,
      path: source,
      error: '未找到所选文件',
      source: cardDbSource
    }
  }

  try {
    assertValidCardDatabase(source)
  } catch (error) {
    return {
      ok: false,
      path: source,
      error: toCardDbError(error),
      source: cardDbSource
    }
  }

  // 校验通过后再关闭已打开的句柄，避免校验失败时中断当前连接。
  closeCardDatabase()

  const dest = getImportedCardDatabasePath()
  const destDir = dirname(dest)
  mkdirSync(destDir, { recursive: true })
  const temp = join(destDir, `deck.db.${process.pid}.${Date.now()}.tmp`)

  try {
    copyFileSync(source, temp)
    if (existsSync(dest)) {
      unlinkSync(dest)
    }
    renameSync(temp, dest)
  } catch (error) {
    if (existsSync(temp)) {
      try {
        unlinkSync(temp)
      } catch {
        // 忽略清理失败，下面会返回复制错误。
      }
    }
    cardDbError = `导入卡牌数据库失败：${toCardDbError(error)}`
    cardDbPath = dest
    cardDbSource = null
    return getCardDatabaseStatus()
  }

  return tryOpenCardDatabase(dest, 'imported')
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
  cardDbPath = null
  cardDbSource = null
  cardDbError = null
}

export function closeDatabases(): void {
  closeCardDatabase()
  userDb?.close()
  userDb = null
}

function assertValidCardDatabase(path: string): void {
  const db = openReadonlyCardDatabase(path)
  db.close()
}

function openReadonlyCardDatabase(path: string): Database.Database {
  assertSqliteHeader(path)

  const db = new Database(path, { readonly: true, fileMustExist: true })
  db.pragma('foreign_keys = ON')
  db.pragma('query_only = ON')

  const missing = REQUIRED_TABLES.filter((name) => {
    const row = db
      .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(name)
    return !row
  })

  if (missing.length > 0) {
    db.close()
    throw new Error(`不是有效的卡牌数据库：缺少数据表 ${missing.join('、')}`)
  }

  return db
}

function assertSqliteHeader(path: string): void {
  const fd = openSync(path, 'r')
  try {
    const buffer = Buffer.alloc(SQLITE_HEADER.length)
    const bytesRead = readSync(fd, buffer, 0, buffer.length, 0)
    if (bytesRead < buffer.length || buffer.toString('utf8') !== SQLITE_HEADER) {
      throw new Error('所选文件不是有效的 SQLite 数据库')
    }
  } finally {
    closeSync(fd)
  }
}

function toCardDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/not a database|SQLITE_NOTADB|file is not a database/i.test(message)) {
    return '所选文件不是有效的 SQLite 数据库'
  }
  if (/ENOENT|no such file/i.test(message)) {
    return '未找到卡牌数据库文件'
  }
  return message
}
