import type { ElectronAPI } from '@electron-toolkit/preload'
import type { CardDatabaseApi } from '../shared/card-db'

export interface PukemonDeckApi {
  cardDb: CardDatabaseApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PukemonDeckApi
  }
}
