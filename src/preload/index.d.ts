import type { ElectronAPI } from '@electron-toolkit/preload'
import type { CardDatabaseApi } from '../shared/card-db'
import type { CardImageApi } from '../shared/card-image'
import type { DeckApi } from '../shared/decks'

export interface PukemonDeckApi {
  cardDb: CardDatabaseApi
  cardImage: CardImageApi
  decks: DeckApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PukemonDeckApi
  }
}
