import type { ElectronAPI } from '@electron-toolkit/preload'
import type { CardDatabaseApi } from '../shared/card-db'
import type { CardImageApi } from '../shared/card-image'

export interface PukemonDeckApi {
  cardDb: CardDatabaseApi
  cardImage: CardImageApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PukemonDeckApi
  }
}
