/** 主进程、preload、渲染进程共用的卡图资源类型。 */

export interface CardImageStatus {
  /** 当前是否存在可用的图片版本。 */
  ok: boolean
  /** 应用内当前图片版本目录；尚未导入时为空字符串。 */
  path: string
  /** 当前版本 ID。 */
  generation: string | null
  /** 数据库引用且应导入的图片总数（含卡包封面）。 */
  total: number
  /** 上次成功复制的图片数。 */
  imported: number
  /** 上次导入时缺失的图片数。 */
  missing: number
  /** 少量缺失路径示例，便于排查。 */
  missingSamples: string[]
  /** 上次成功导入时间（ISO 字符串）。 */
  importedAt: string | null
  /** 是否有复制任务正在执行。 */
  importing: boolean
  /** 最近一次操作错误。 */
  error: string | null
  /** 用户取消了目录选择或复制任务。 */
  cancelled?: boolean
}

export interface CardImageProgress {
  phase: 'copying' | 'finalizing'
  total: number
  processed: number
  imported: number
  missing: number
}

export interface CardImageApi {
  status: () => Promise<CardImageStatus>
  /** 选择目录并复制导入；成功后完整替换当前图片版本。 */
  pickAndImport: () => Promise<CardImageStatus>
  /** 请求取消当前复制任务，不会破坏当前已启用版本。 */
  cancel: () => Promise<boolean>
  /** 订阅复制进度，返回取消订阅函数。 */
  onProgress: (callback: (progress: CardImageProgress) => void) => () => void
}
