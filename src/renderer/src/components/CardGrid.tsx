import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CardDetail, CardSummary } from '../../../shared/card-query'
import CardDetailModal from './CardDetailModal'
import CardImage from './CardImage'
import Icon, { type IconName } from './Icon'

export function CardGridSkeleton(): React.JSX.Element {
  return (
    <div className="card-grid" aria-hidden="true">
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="card-skeleton">
          <div className="card-skeleton__visual" />
          <div className="card-skeleton__line card-skeleton__line--title" />
          <div className="card-skeleton__line" />
        </div>
      ))}
    </div>
  )
}

interface CardTileProps {
  card: CardSummary
  onSelect: (card: CardSummary) => void
}

function CardTile({ card, onSelect }: CardTileProps): React.JSX.Element {
  const kind =
    card.attributeText ?? card.trainerTypeText ?? card.energyTypeText ?? card.cardTypeText
  const meta = [card.rarityText, card.evolveText].filter(Boolean).join(' · ')

  return (
    <button type="button" className="card-tile" title={card.name} onClick={() => onSelect(card)}>
      <div className="card-tile__visual">
        <CardImage
          src={card.imageUrl}
          alt={card.name}
          className="card-tile__image"
          fallback={
            <span className="card-tile__placeholder">
              <Icon name="image" size={22} />
              <span className="sr-only">暂无卡图</span>
            </span>
          }
        />
      </div>
      <h2 className="card-tile__name">{card.name}</h2>
      <div className="card-tile__meta-row">
        {kind && <span className="card-tile__kind">{kind}</span>}
        {meta && <span className="card-tile__meta">{meta}</span>}
        {card.hp != null && <span className="card-tile__hp">HP {card.hp}</span>}
      </div>
      <div className="card-tile__footer">
        <span className="card-tile__set" title={card.collectionName}>
          {card.collectionName}
        </span>
        <span className="card-tile__number">
          {card.collectionNumber}
          {card.regulationMarkText ? ` · ${card.regulationMarkText}` : ''}
        </span>
      </div>
    </button>
  )
}

export interface CardResultPaneProps {
  items: CardSummary[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  emptyIcon?: IconName
  emptyText: string
  emptyAction?: ReactNode
  onRetry: () => void
  onLoadMore: () => void
}

export function CardResultPane({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  emptyIcon = 'database',
  emptyText,
  emptyAction,
  onRetry,
  onLoadMore
}: CardResultPaneProps): React.JSX.Element {
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || error) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loading && !loadingMore) {
          onLoadMore()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [error, hasMore, loading, loadingMore, onLoadMore])

  const openDetail = async (card: CardSummary): Promise<void> => {
    setDetailOpen(true)
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const next = await window.api.cardDb.getCardDetail(card.collectionId, card.id)
      if (!next) {
        setDetailError('未找到该卡牌的详细信息')
        return
      }
      setDetail(next)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '加载卡牌详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = (): void => {
    setDetailOpen(false)
    setDetail(null)
    setDetailError(null)
  }

  return (
    <div className="browse__results">
      {error && (
        <div className="browse__error" role="alert">
          <Icon name="alert" size={22} />
          <p>{error}</p>
          <button className="button button--ghost" type="button" onClick={onRetry}>
            重试
          </button>
        </div>
      )}

      {!error && loading && items.length === 0 && <CardGridSkeleton />}

      {!error && !loading && items.length === 0 && (
        <div className="browse__empty">
          <Icon name={emptyIcon} size={26} />
          <p>{emptyText}</p>
          {emptyAction}
        </div>
      )}

      {items.length > 0 && (
        <div className="card-grid">
          {items.map((card) => (
            <CardTile
              key={`${card.collectionId}-${card.id}`}
              card={card}
              onSelect={(item) => void openDetail(item)}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="browse__sentinel" />
      {hasMore && (
        <div className="browse__more">
          <button
            type="button"
            className="button button--ghost"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
        </div>
      )}

      {detailOpen && (
        <CardDetailModal
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
        />
      )}
    </div>
  )
}
