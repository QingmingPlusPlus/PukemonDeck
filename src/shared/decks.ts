import type { CardSummary } from './card-query'

export const MAX_DECK_NAME_LENGTH = 80

export interface DeckSummary {
  id: number
  name: string
  isDefault: boolean
  cardCount: number
}

export interface DeckCard extends CardSummary {
  quantity: number
  unavailable: boolean
}

export interface DeckApi {
  list: () => Promise<DeckSummary[]>
  create: (name: string) => Promise<DeckSummary>
  setDefault: (deckId: number) => Promise<void>
  getCards: (deckId: number) => Promise<DeckCard[]>
  addCard: (collectionId: number, cardId: number) => Promise<string | null>
}
