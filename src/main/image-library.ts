import { app, dialog, net, protocol, type BrowserWindow, type WebContents } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, readdirSync, rmSync } from 'fs'
import { copyFile, mkdir, readdir, realpath, rename, rm, stat } from 'fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { getCardDatabase, getUserDatabase } from './db'
import type { CardImageProgress, CardImageStatus } from '../shared/card-image'

const IMAGE_SCHEME = 'card-image'
const SETTINGS_KEY = 'card_image_library'
const IMAGE_PATH_PATTERN = /^img\/\d+\/(?:\d+|cover)\.png$/
const GENERATION_PATTERN = /^generation-\d+-[0-9a-f-]{36}$/
const COPY_CONCURRENCY = 8
const MISSING_SAMPLE_LIMIT = 20
const PROGRESS_INTERVAL_MS = 100

interface StoredImageState {
  generation: string
  total: number
  imported: number
  missing: number
  missingSamples: string[]
  importedAt: string
}

interface ImportOperation {
  cancelled: boolean
  finalizing: boolean
  sender: WebContents | null
}

class ImportCancelledError extends Error {
  constructor() {
    super('图片导入已取消')
  }
}

let cachedState: StoredImageState | null | undefined
let lastError: string | null = null
let activeOperation: ImportOperation | null = null

/** 必须在 app ready 之前调用。 */
export function registerCardImageScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: IMAGE_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** 注册只读卡图协议。文件只能来自应用管理的图片版本目录。 */
export function registerCardImageProtocol(): void {
  protocol.handle(IMAGE_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'card') return new Response('Not found', { status: 404 })

      const segments = url.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment))
      const generation = segments.shift() ?? ''
      const imagePath = segments.join('/')
      if (!GENERATION_PATTERN.test(generation) || !isValidImagePath(imagePath)) {
        return new Response('Bad request', { status: 400 })
      }

      const generationRoot = getGenerationPath(generation)
      const requestedPath = resolveInside(generationRoot, imagePath)
      const [realRoot, realFile] = await Promise.all([
        realpath(generationRoot),
        realpath(requestedPath)
      ])
      if (!isInside(realRoot, realFile) || !(await stat(realFile)).isFile()) {
        return new Response('Not found', { status: 404 })
      }

      return await net.fetch(pathToFileURL(realFile).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

export function isCardImageImporting(): boolean {
  return activeOperation !== null
}

export function getCardImageStatus(): CardImageStatus {
  const state = getStoredState()
  const generation = state?.generation ?? null
  const path = generation ? getGenerationPath(generation) : ''
  const ok = Boolean(generation && existsSync(path))

  return {
    ok,
    path,
    generation,
    total: state?.total ?? 0,
    imported: state?.imported ?? 0,
    missing: state?.missing ?? 0,
    missingSamples: state?.missingSamples ?? [],
    importedAt: state?.importedAt ?? null,
    importing: activeOperation !== null,
    error: lastError ?? (state && !ok ? '当前图片版本目录不可用，请重新导入图片' : null)
  }
}

/** 为卡牌查询生成带版本号的受控 URL，避免再次导入后命中旧图缓存。 */
export function getCardImageUrl(imagePath: string | null): string | null {
  if (!imagePath || !isValidImagePath(imagePath)) return null
  try {
    const generation = getStoredState()?.generation
    if (!generation) return null

    const encodedPath = imagePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
    return `${IMAGE_SCHEME}://card/${encodeURIComponent(generation)}/${encodedPath}`
  } catch {
    // 用户设置库不可用时只禁用图片，不影响卡牌查询。
    return null
  }
}

export function cancelCardImageImport(): boolean {
  if (!activeOperation || activeOperation.finalizing) return false
  activeOperation.cancelled = true
  return true
}

export async function pickAndImportCardImages(
  browserWindow?: BrowserWindow | null
): Promise<CardImageStatus> {
  if (activeOperation) {
    return { ...getCardImageStatus(), error: '已有图片导入任务正在进行' }
  }

  const operation: ImportOperation = {
    cancelled: false,
    finalizing: false,
    sender: browserWindow?.webContents ?? null
  }
  activeOperation = operation
  lastError = null
  let cancelled = false

  try {
    const options: Electron.OpenDialogOptions = {
      title: '选择卡牌图片文件夹',
      buttonLabel: '导入图片',
      properties: ['openDirectory']
    }
    const result = browserWindow
      ? await dialog.showOpenDialog(browserWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || result.filePaths.length === 0 || operation.cancelled) {
      cancelled = true
    } else {
      const outcome = await importCardImages(result.filePaths[0], operation)
      cancelled = outcome.cancelled
    }
  } catch (error) {
    if (error instanceof ImportCancelledError || operation.cancelled) cancelled = true
    else lastError = toImageError(error)
  } finally {
    activeOperation = null
  }

  return { ...getCardImageStatus(), cancelled }
}

/** 清理上次崩溃留下的临时目录，以及已切换后未能删除的旧版本。 */
export function cleanupCardImageLibrary(): void {
  const root = getImageLibraryRoot()
  if (!existsSync(root)) return

  let activeGeneration: string | null
  try {
    activeGeneration = getStoredState()?.generation ?? null
  } catch {
    return
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const temporary = entry.name.startsWith('importing-')
    const inactive = GENERATION_PATTERN.test(entry.name) && entry.name !== activeGeneration
    if (!temporary && !inactive) continue

    try {
      rmSync(join(root, entry.name), { recursive: true, force: true })
    } catch {
      // 文件占用时留待下次启动或导入后清理。
    }
  }
}

async function importCardImages(
  selectedPath: string,
  operation: ImportOperation
): Promise<{ cancelled: boolean }> {
  const sourceRoot = await resolveSourceRoot(selectedPath)
  const imagePaths = readExpectedImagePaths()
  const libraryRoot = getImageLibraryRoot()
  const stagingPath = join(libraryRoot, `importing-${randomUUID()}`)
  const generation = `generation-${Date.now()}-${randomUUID()}`
  const generationPath = join(libraryRoot, generation)
  let committed = false
  let processed = 0
  let imported = 0
  let missing = 0
  let lastProgressAt = 0
  const missingSamples: string[] = []

  await mkdir(stagingPath, { recursive: true })

  const emitProgress = (phase: CardImageProgress['phase'], force = false): void => {
    const now = Date.now()
    if (!force && now - lastProgressAt < PROGRESS_INTERVAL_MS) return
    lastProgressAt = now
    const progress: CardImageProgress = {
      phase,
      total: imagePaths.length,
      processed,
      imported,
      missing
    }
    if (operation.sender && !operation.sender.isDestroyed()) {
      operation.sender.send('card-image:progress', progress)
    }
  }

  try {
    emitProgress('copying', true)
    let cursor = 0
    let failure: unknown = null
    const createdDirectories = new Set<string>([stagingPath])

    const worker = async (): Promise<void> => {
      while (!failure) {
        if (operation.cancelled) throw new ImportCancelledError()
        const index = cursor++
        if (index >= imagePaths.length) return
        const imagePath = imagePaths[index]
        const source = resolveInside(sourceRoot, imagePath)
        const destination = resolveInside(stagingPath, imagePath)

        try {
          const sourceStat = await stat(source).catch((error: unknown) => {
            if (isMissingFileError(error)) return null
            throw error
          })
          if (!sourceStat?.isFile()) {
            missing++
            if (missingSamples.length < MISSING_SAMPLE_LIMIT) missingSamples.push(imagePath)
          } else {
            const directory = dirname(destination)
            if (!createdDirectories.has(directory)) {
              await mkdir(directory, { recursive: true })
              createdDirectories.add(directory)
            }
            // 源文件在复制时消失或目标目录异常都终止导入，避免误提交不完整版本。
            await copyFile(source, destination)
            imported++
          }
        } catch (error) {
          failure = error
        } finally {
          processed++
          emitProgress('copying')
        }
      }
    }

    const workers = Array.from({ length: Math.min(COPY_CONCURRENCY, imagePaths.length) }, () =>
      worker()
    )
    const results = await Promise.allSettled(workers)
    const cancelled = results.some(
      (result) => result.status === 'rejected' && result.reason instanceof ImportCancelledError
    )
    if (operation.cancelled || cancelled) throw new ImportCancelledError()
    if (!failure) {
      const rejected = results.find((result) => result.status === 'rejected')
      if (rejected) failure = rejected.reason
    }
    if (failure) throw failure
    if (imported === 0) throw new Error('所选文件夹中没有匹配数据库记录的图片')

    if (operation.cancelled) throw new ImportCancelledError()
    operation.finalizing = true
    emitProgress('finalizing', true)
    await rename(stagingPath, generationPath)

    const nextState: StoredImageState = {
      generation,
      total: imagePaths.length,
      imported,
      missing,
      missingSamples,
      importedAt: new Date().toISOString()
    }
    saveStoredState(nextState)
    cachedState = nextState
    committed = true
    lastError = null
    void cleanupInactiveGenerations(generation)
    return { cancelled: false }
  } finally {
    await Promise.all([
      rm(stagingPath, { recursive: true, force: true }).catch(() => undefined),
      committed
        ? Promise.resolve()
        : rm(generationPath, { recursive: true, force: true }).catch(() => undefined)
    ])
  }
}

function readExpectedImagePaths(): string[] {
  const rows = getCardDatabase()
    .prepare(
      `SELECT image FROM ptcg_card
       UNION
       SELECT image FROM ptcg_collection WHERE image IS NOT NULL`
    )
    .all() as { image: string }[]
  const paths = [...new Set(rows.map((row) => row.image))]
  const invalid = paths.find((path) => !isValidImagePath(path))
  if (invalid) throw new Error(`数据库包含无效图片路径：${invalid}`)
  if (paths.length === 0) throw new Error('数据库中没有可导入的图片路径')
  return paths
}

async function resolveSourceRoot(selectedPath: string): Promise<string> {
  if (!(await isDirectory(selectedPath))) throw new Error('请选择图片文件夹')
  if (await isDirectory(join(selectedPath, 'img'))) return realpath(selectedPath)
  if (basename(selectedPath).toLowerCase() === 'img') return realpath(dirname(selectedPath))
  throw new Error('所选文件夹中未找到 img 目录')
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch (error) {
    if (isMissingFileError(error)) return false
    throw error
  }
}

function getImageLibraryRoot(): string {
  return join(app.getPath('userData'), 'data', 'card-images')
}

function getGenerationPath(generation: string): string {
  if (!GENERATION_PATTERN.test(generation)) throw new Error('无效的图片版本')
  return join(getImageLibraryRoot(), generation)
}

function getStoredState(): StoredImageState | null {
  if (cachedState !== undefined) return cachedState
  ensureSettingsTable()
  const row = getUserDatabase()
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(SETTINGS_KEY) as { value: string } | undefined
  if (!row) {
    cachedState = null
    return cachedState
  }

  try {
    const value = JSON.parse(row.value) as Partial<StoredImageState>
    if (typeof value.generation !== 'string' || !GENERATION_PATTERN.test(value.generation)) {
      throw new Error('Invalid generation')
    }
    cachedState = {
      generation: value.generation,
      total: nonNegativeInt(value.total),
      imported: nonNegativeInt(value.imported),
      missing: nonNegativeInt(value.missing),
      missingSamples: Array.isArray(value.missingSamples)
        ? value.missingSamples
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 20)
        : [],
      importedAt: typeof value.importedAt === 'string' ? value.importedAt : ''
    }
  } catch {
    cachedState = null
  }
  return cachedState
}

function saveStoredState(state: StoredImageState): void {
  ensureSettingsTable()
  getUserDatabase()
    .prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(SETTINGS_KEY, JSON.stringify(state))
}

function ensureSettingsTable(): void {
  getUserDatabase()
    .prepare(
      `CREATE TABLE IF NOT EXISTS app_settings (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`
    )
    .run()
}

async function cleanupInactiveGenerations(activeGeneration: string): Promise<void> {
  const root = getImageLibraryRoot()
  try {
    const entries = await readdir(root, { withFileTypes: true })
    await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.isDirectory() &&
            ((GENERATION_PATTERN.test(entry.name) && entry.name !== activeGeneration) ||
              entry.name.startsWith('importing-'))
        )
        .map((entry) =>
          rm(join(root, entry.name), { recursive: true, force: true }).catch(() => undefined)
        )
    )
  } catch {
    // 清理失败不影响已经启用的新版本。
  }
}

function isValidImagePath(path: string): boolean {
  return IMAGE_PATH_PATTERN.test(path)
}

function resolveInside(root: string, imagePath: string): string {
  if (!isValidImagePath(imagePath)) throw new Error('无效的图片相对路径')
  const target = resolve(root, ...imagePath.split('/'))
  if (!isInside(root, target)) throw new Error('图片路径超出允许目录')
  return target
}

function isInside(root: string, target: string): boolean {
  const path = relative(root, target)
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  )
}

function nonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0
}

function toImageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/ENOSPC|not enough space|disk full/i.test(message)) {
    return '磁盘空间不足，图片导入失败，原有图片未受影响'
  }
  if (/ENOENT|no such file/i.test(message)) return '未找到所选图片文件夹'
  if (/EPERM|EACCES|permission/i.test(message)) return '没有读取或保存图片所需的权限'
  return `导入图片失败：${message}`
}
