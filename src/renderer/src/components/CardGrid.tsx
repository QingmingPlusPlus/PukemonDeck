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
  card: CardGridItem
  onSelect: (card: CardSummary) => void
  onAddCard?: (card: CardSummary) => void
}

type CardGridItem = CardSummary & { quantity?: number; unavailable?: boolean }

function CardTile({ card, onSelect, onAddCard }: CardTileProps): React.JSX.Element {
  const kind =
    card.attributeText ?? card.trainerTypeText ?? card.energyTypeText ?? card.cardTypeText
  const meta = [card.rarityText, card.evolveText].filter(Boolean).join(' · ')

  return (
    <div className="card-tile-wrap">
      <button
        type="button"
        className="card-tile"
        title={card.name}
        disabled={card.unavailable}
        onClick={() => onSelect(card)}
      >
        <div className="card-tile__visual">
          <CardImage
            src={card.imageUrl}
            alt={card.name}
            className="card-tile__image"
            fallback={
              <span className="card-tile__placeholder">
                <Icon name="image" size={22} />
                {card.unavailable ? (
                  <span>当前牌库缺失</span>
                ) : (
                  <span className="sr-only">暂无卡图</span>
                )}
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
      {onAddCard && (
        <button
          type="button"
          className="icon-button card-tile__action"
          aria-label={`将${card.name}添加到默认牌组`}
          title="添加到默认牌组"
          onClick={() => onAddCard(card)}
        >
          <Icon name="plus" size={18} />
        </button>
      )}
      {card.quantity != null && (
        <span className="card-tile__quantity" aria-label={`${card.name} ${card.quantity} 张`}>
          ×{card.quantity}
        </span>
      )}
    </div>
  )
}

export interface CardResultPaneProps {
  items: CardGridItem[]
  loading: boolean
  loadingMore?: boolean
  error: string | null
  hasMore?: boolean
  emptyIcon?: IconName
  emptyText: string
  emptyAction?: ReactNode
  onRetry: () => void
  onLoadMore?: () => void
  onAddCard?: (card: CardSummary) => void
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
  onLoadMore,
  onAddCard
}: CardResultPaneProps): React.JSX.Element {
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || !onLoadMore || error) return
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
              onAddCard={onAddCard}
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
          onAddCard={onAddCard}
        />
      )}
    </div>
  )
}
