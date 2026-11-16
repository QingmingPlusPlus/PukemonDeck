import type { CardSummary } from '../shared/card-query'
import { MAX_DECK_NAME_LENGTH, type DeckCard, type DeckSummary } from '../shared/decks'
import { getCardSummaries } from './card-query'
import { getUserDatabase } from './db'

interface DeckRow {
  id: number
  name: string
  isDefault: number
  cardCount: number
}

interface DeckCardRow {
  collectionId: number
  id: number
  snapshot: string
  quantity: number
}

export function listDecks(): DeckSummary[] {
  const rows = getUserDatabase()
    .prepare(
      `SELECT d.id, d.name, d.is_default AS isDefault, COALESCE(SUM(c.quantity), 0) AS cardCount
       FROM user_deck d
       LEFT JOIN user_deck_card c ON c.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.id`
    )
    .all() as DeckRow[]
  return rows.map((deck) => ({ ...deck, isDefault: Boolean(deck.isDefault) }))
}

export function createDeck(rawName: unknown): DeckSummary {
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  if (!name || name.length > MAX_DECK_NAME_LENGTH) throw new Error('无效的牌组名称')

  const deck = getUserDatabase()
    .prepare(
      `INSERT INTO user_deck (name, is_default)
       VALUES (?, NOT EXISTS (SELECT 1 FROM user_deck WHERE is_default = 1))
       RETURNING id, name, is_default AS isDefault`
    )
    .get(name) as Omit<DeckRow, 'cardCount'>
  return { ...deck, isDefault: Boolean(deck.isDefault), cardCount: 0 }
}

export function setDefaultDeck(id: unknown): void {
  const deckId = validateDeckId(id)
  const db = getUserDatabase()
  db.transaction(() => {
    db.prepare('UPDATE user_deck SET is_default = 0 WHERE is_default = 1').run()
    const result = db.prepare('UPDATE user_deck SET is_default = 1 WHERE id = ?').run(deckId)
    if (result.changes === 0) throw new Error('未找到该牌组')
  })()
}

export function getDeckCards(id: unknown): DeckCard[] {
  const rows = getUserDatabase()
    .prepare(
      `SELECT collection_id AS collectionId, card_id AS id, snapshot, quantity
       FROM user_deck_card
       WHERE deck_id = ?
       ORDER BY rowid`
    )
    .all(validateDeckId(id)) as DeckCardRow[]

  const currentCards = getCardSummaries(rows.map(({ collectionId, id }) => ({ collectionId, id })))
  const cardsById = new Map(currentCards.map((card) => [`${card.collectionId}:${card.id}`, card]))

  return rows.map(({ collectionId, id, snapshot, quantity }) => {
    const card = cardsById.get(`${collectionId}:${id}`)
    const summary = card ?? (JSON.parse(snapshot) as CardSummary)
    return { ...summary, quantity, unavailable: !card }
  })
}

export function addCardToDefaultDeck(collectionId: unknown, cardId: unknown): string | null {
  if (
    typeof collectionId !== 'number' ||
    typeof cardId !== 'number' ||
    !Number.isSafeInteger(collectionId) ||
    !Number.isSafeInteger(cardId)
  ) {
    throw new Error('无效的卡牌编号')
  }

  const db = getUserDatabase()
  return db
    .transaction(() => {
      const deck = db.prepare('SELECT id, name FROM user_deck WHERE is_default = 1').get() as
        { id: number; name: string } | undefined
      if (!deck) return null

      const [card] = getCardSummaries([{ collectionId, id: cardId }])
      if (!card) throw new Error('未找到该卡牌')

      db.prepare(
        `INSERT INTO user_deck_card (deck_id, collection_id, card_id, snapshot, quantity)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT (deck_id, collection_id, card_id) DO UPDATE SET
         quantity = quantity + 1, snapshot = excluded.snapshot`
      ).run(deck.id, collectionId, cardId, JSON.stringify({ ...card, imageUrl: null }))
      return deck.name
    })
    .immediate()
}

function validateDeckId(id: unknown): number {
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new Error('无效的牌组编号')
  }
  return id
}
