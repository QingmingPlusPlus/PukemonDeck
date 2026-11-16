/**
 * 主进程、preload、渲染进程共用的卡牌库类型。
 */
import type {
  CardBrowseScope,
  CardDetail,
  CardFilterOptions,
  CardListQuery,
  CardListResult,
  CollectionListQuery,
  CollectionOption
} from './card-query'

/** 当前打开的卡牌库来源。 */
export type CardDatabaseSource = 'imported' | 'bundled'

export interface CardDatabaseStatus {
  /** 是否成功打开卡牌库 */
  ok: boolean
  /** 当前使用（或尝试打开）的卡牌库绝对路径 */
  path: string
  /** 打开失败的原因；成功时为 null */
  error: string | null
  /** 成功打开时的来源；未打开时为 null */
  source: CardDatabaseSource | null
  /** 用户取消了系统对话框中的操作 */
  cancelled?: boolean
}

/** 通过 preload 暴露给渲染进程的卡牌库接口。 */
export interface CardDatabaseApi {
  /** 读取当前连接状态（不会重新打开文件） */
  status: () => Promise<CardDatabaseStatus>
  /** 按解析顺序重新检测并打开卡牌库 */
  reload: () => Promise<CardDatabaseStatus>
  /** 打开系统文件选择框并导入所选数据库；取消选择时 cancelled 为 true */
  pickAndImport: () => Promise<CardDatabaseStatus>
  /** 导入给定路径的数据库文件（用于拖放） */
  importFromPath: (filePath: string) => Promise<CardDatabaseStatus>
  /** 确认后删除应用保存的导入副本，并重新检测卡牌库 */
  clearImported: () => Promise<CardDatabaseStatus>
  /** 将拖放的 File 解析为本地绝对路径（Electron webUtils） */
  getPathForFile: (file: File) => string
  /** 筛选项（字典与卡包列表） */
  getFilterOptions: (scope?: CardBrowseScope) => Promise<CardFilterOptions>
  /** 按发行顺序列出集合；可选按赛制码筛选 */
  listCollections: (query?: CollectionListQuery) => Promise<CollectionOption[]>
  /** 按条件分页查询卡牌摘要 */
  searchCards: (query: CardListQuery) => Promise<CardListResult>
  /** 读取单张卡牌的完整详情 */
  getCardDetail: (collectionId: number, cardId: number) => Promise<CardDetail | null>
}
