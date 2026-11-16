import { useEffect, useState, type FormEvent } from 'react'
import { MAX_DECK_NAME_LENGTH, type DeckCard, type DeckSummary } from '../../../shared/decks'
import { CardResultPane } from './CardGrid'
import Icon from './Icon'

interface DeckBrowseProps {
  onBrowseCards: () => void
}

export default function DeckBrowse({ onBrowseCards }: DeckBrowseProps): React.JSX.Element {
  const [decks, setDecks] = useState<DeckSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [newName, setNewName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    window.api.decks.list().then(
      (items) => {
        if (active) setDecks(items)
      },
      () => {
        if (active) setLoadError(true)
      }
    )
    return () => {
      active = false
    }
  }, [attempt])

  const selected = decks?.find((deck) => deck.id === selectedId) ?? decks?.find((d) => d.isDefault)

  const create = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const name = newName?.trim()
    if (!name || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const created = await window.api.decks.create(name)
      setDecks((current) => [...(current ?? []), created])
      setSelectedId(created.id)
      setNewName(null)
    } catch {
      setActionError('创建牌组失败')
    } finally {
      setBusy(false)
    }
  }

  const setDefault = async (deck: DeckSummary): Promise<void> => {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      await window.api.decks.setDefault(deck.id)
      setDecks(
        (current) => current?.map((item) => ({ ...item, isDefault: item.id === deck.id })) ?? null
      )
    } catch {
      setActionError('设置默认牌组失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="decks">
      <aside className="decks__sidebar" aria-label="牌组列表">
        {newName === null ? (
          <button
            className="button button--primary"
            type="button"
            disabled={!decks || busy}
            onClick={() => setNewName('')}
          >
            <Icon name="plus" />
            新建牌组
          </button>
        ) : (
          <form className="decks__form" onSubmit={(event) => void create(event)}>
            <input
              type="text"
              aria-label="牌组名称"
              placeholder="牌组名称"
              maxLength={MAX_DECK_NAME_LENGTH}
              value={newName}
              autoFocus
              disabled={busy}
              onChange={(event) => setNewName(event.target.value)}
            />
            <div className="decks__form-actions">
              <button
                className="button button--ghost"
                type="button"
                disabled={busy}
                onClick={() => {
                  setNewName(null)
                  setActionError(null)
                }}
              >
                取消
              </button>
              <button className="button button--primary" disabled={busy || !newName.trim()}>
                创建
              </button>
            </div>
          </form>
        )}
        {decks && decks.length > 0 && (
          <ul className="decks__list">
            {decks.map((deck) => (
              <li key={deck.id}>
                <button
                  className="decks__option"
                  type="button"
                  aria-pressed={deck.id === selected?.id}
                  disabled={busy}
                  onClick={() => {
                    setSelectedId(deck.id)
                    setActionError(null)
                  }}
                >
                  <Icon name="deck" />
                  <span className="decks__name" title={deck.name}>
                    {deck.name}
                  </span>
                  {deck.isDefault && <span className="chip chip--accent">默认</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {actionError && (
          <p className="decks__error" role="alert">
            {actionError}
          </p>
        )}
      </aside>

      <section className="decks__main" aria-label="牌组内容">
        {loadError ? (
          <div className="browse__error" role="alert">
            <Icon name="alert" size={22} />
            <p>加载牌组失败</p>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => {
                setLoadError(false)
                setAttempt((current) => current + 1)
              }}
            >
              重试
            </button>
          </div>
        ) : !decks ? (
          <div className="browse__empty">
            <span className="spinner" role="status" aria-label="正在加载牌组" />
          </div>
        ) : selected ? (
          <>
            <header className="decks__header">
              <h1 className="decks__name" title={selected.name}>
                {selected.name}
              </h1>
              <span className="browse__count">{selected.cardCount.toLocaleString('zh-CN')} 张</span>
              {!selected.isDefault && (
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={() => void setDefault(selected)}
                >
                  <Icon name="star" />
                  设为默认
                </button>
              )}
            </header>
            <DeckContents key={selected.id} deckId={selected.id} onBrowseCards={onBrowseCards} />
          </>
        ) : (
          <div className="browse__empty">
            <Icon name="deck" size={28} />
            <p>暂无牌组</p>
          </div>
        )}
      </section>
    </div>
  )
}

function DeckContents({
  deckId,
  onBrowseCards
}: DeckBrowseProps & { deckId: number }): React.JSX.Element {
  const [items, setItems] = useState<DeckCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    window.api.decks.getCards(deckId).then(
      (cards) => {
        if (active) setItems(cards)
      },
      () => {
        if (active) setError('加载牌组卡牌失败')
      }
    )
    return () => {
      active = false
    }
  }, [deckId, attempt])

  return (
    <CardResultPane
      items={items ?? []}
      loading={!items && !error}
      error={error}
      emptyIcon="deck"
      emptyText="暂无卡牌"
      emptyAction={
        <button className="button button--ghost" type="button" onClick={onBrowseCards}>
          浏览牌库
        </button>
      }
      onRetry={() => {
        setError(null)
        setAttempt((current) => current + 1)
      }}
    />
  )
}
