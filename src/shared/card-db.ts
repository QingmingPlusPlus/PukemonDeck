/**
 * 主进程、preload、渲染进程共用的卡牌库类型。
 */
export interface CardDatabaseStatus {
  /** 是否成功打开卡牌库 */
  ok: boolean
  /** 卡牌库文件的绝对路径，用于在界面上提示用户 */
  path: string
  /** 打开失败的原因；成功时为 null */
  error: string | null
}

/** 通过 preload 暴露给渲染进程的卡牌库接口。 */
export interface CardDatabaseApi {
  /** 读取当前连接状态（不会重新打开文件） */
  status: () => Promise<CardDatabaseStatus>
  /** 重新检测并打开卡牌库，用于用户补上 deck.db 后重试 */
  reload: () => Promise<CardDatabaseStatus>
}
