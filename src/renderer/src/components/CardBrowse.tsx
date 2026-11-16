import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CardDetail,
  CardFilterOptions,
  CardFilters,
  CardSummary,
  DictOption
} from '../../../shared/card-query'
import CardDetailModal from './CardDetailModal'
import CardImage from './CardImage'
import Icon from './Icon'

const PAGE_SIZE = 48
const KEYWORD_DELAY_MS = 300

const EMPTY_FILTERS: CardFilters = {}

function CardBrowse(): React.JSX.Element {
  const [options, setOptions] = useState<CardFilterOptions | null>(null)
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS)
  const [keywordInput, setKeywordInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [items, setItems] = useState<CardSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<CardDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const requestIdRef = useRef(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    window.api.cardDb
      .getFilterOptions()
      .then(setOptions)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '无法加载筛选条件')
      })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => {
        const nextKeyword = keywordInput.trim()
        if ((current.keyword ?? '') === nextKeyword) return current
        const next = { ...current }
        if (nextKeyword) next.keyword = nextKeyword
        else delete next.keyword
        return next
      })
    }, KEYWORD_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [keywordInput])

  const loadPage = useCallback((nextFilters: CardFilters, offset: number): void => {
    const requestId = ++requestIdRef.current
    void (async () => {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      try {
        const result = await window.api.cardDb.searchCards({
          filters: nextFilters,
          offset,
          limit: PAGE_SIZE
        })
        if (requestId !== requestIdRef.current) return
        setTotal(result.total)
        setItems((current) => (offset === 0 ? result.items : current.concat(result.items)))
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err.message : '查询卡牌失败')
        if (offset === 0) {
          setItems([])
          setTotal(0)
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    })()
  }, [])

  useEffect(() => {
    void loadPage(filters, 0)
  }, [filters, loadPage])

  const hasMore = items.length < total

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore || error) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loading && !loadingMore) {
          void loadPage(filters, items.length)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [error, filters, hasMore, items.length, loadPage, loading, loadingMore])

  const collections = useMemo(() => {
    if (!options) return []
    if (!filters.series) return options.collections
    return options.collections.filter((item) => item.series === filters.series)
  }, [options, filters.series])

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== ''
  ).length
  const hiddenFilterCount = [
    filters.attribute,
    filters.weaknessType,
    filters.evolution,
    filters.pokemonType,
    filters.rarity,
    filters.regulationMark
  ].filter(Boolean).length

  const updateFilter = <K extends keyof CardFilters>(key: K, value: CardFilters[K]): void => {
    setFilters((current) => {
      const next = { ...current }
      if (value === undefined || value === '') delete next[key]
      else next[key] = value
      if (key === 'series' && next.collectionId != null && options) {
        const selected = options.collections.find((item) => item.id === next.collectionId)
        if (selected && value && selected.series !== value) delete next.collectionId
      }
      return next
    })
  }

  const clearKeyword = (): void => {
    setKeywordInput('')
    setFilters((current) => {
      if (!current.keyword) return current
      const next = { ...current }
      delete next.keyword
      return next
    })
  }

  const handleReset = (): void => {
    setKeywordInput('')
    setFilters(EMPTY_FILTERS)
  }

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

  const filterActive = activeFilterCount > 0 || keywordInput.length > 0

  return (
    <div className="browse">
      <header className="browse__toolbar">
        <h1 className="sr-only">牌库</h1>
        <div className="browse__bar">
          <div className="browse__search">
            <Icon name="search" size={16} className="browse__search-icon" />
            <input
              type="search"
              aria-label="搜索卡牌"
              placeholder="名称 / 编号 / 卡包"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
            {keywordInput && (
              <button
                className="browse__search-clear"
                type="button"
                title="清除搜索"
                aria-label="清除搜索"
                onClick={clearKeyword}
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <DictSelect
            label="系列"
            value={filters.series}
            options={options?.series}
            onChange={(value) => updateFilter('series', value)}
          />
          <select
            className="browse__select browse__select--wide"
            aria-label="卡包"
            title="卡包"
            value={filters.collectionId ?? ''}
            onChange={(event) =>
              updateFilter(
                'collectionId',
                event.target.value ? Number(event.target.value) : undefined
              )
            }
          >
            <option value="">卡包</option>
            {collections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <DictSelect
            label="类别"
            value={filters.category}
            options={options?.categories}
            onChange={(value) => updateFilter('category', value)}
          />

          <button
            className={`icon-button${showAdvanced ? ' icon-button--active' : ''}`}
            type="button"
            title="更多筛选"
            aria-label="更多筛选"
            aria-expanded={showAdvanced}
            aria-controls="browse-advanced"
            onClick={() => setShowAdvanced((current) => !current)}
          >
            <Icon name="filter" size={17} />
            {hiddenFilterCount > 0 && (
              <span className="icon-button__badge">{hiddenFilterCount}</span>
            )}
          </button>

          {filterActive && (
            <button
              className="icon-button"
              type="button"
              title="清除筛选"
              aria-label="清除筛选"
              onClick={handleReset}
            >
              <Icon name="reset" size={16} />
            </button>
          )}

          <span className="browse__count" title="匹配卡牌总数">
            {loading && items.length === 0 ? '—' : `${total.toLocaleString('zh-CN')} 张`}
          </span>
        </div>

        {showAdvanced && (
          <div id="browse-advanced" className="browse__advanced">
            <DictSelect
              label="属性"
              value={filters.attribute}
              options={options?.attributes}
              onChange={(value) => updateFilter('attribute', value)}
            />
            <DictSelect
              label="弱点"
              value={filters.weaknessType}
              options={options?.weaknessTypes}
              onChange={(value) => updateFilter('weaknessType', value)}
            />
            <DictSelect
              label="进化"
              value={filters.evolution}
              options={options?.evolutions}
              onChange={(value) => updateFilter('evolution', value)}
            />
            <DictSelect
              label="种类"
              value={filters.pokemonType}
              options={options?.pokemonTypes}
              onChange={(value) => updateFilter('pokemonType', value)}
            />
            <DictSelect
              label="稀有度"
              value={filters.rarity}
              options={options?.rarities}
              onChange={(value) => updateFilter('rarity', value)}
            />
            <DictSelect
              label="规则标记"
              value={filters.regulationMark}
              options={options?.regulationMarks}
              onChange={(value) => updateFilter('regulationMark', value)}
            />
          </div>
        )}
      </header>

      <div className="browse__results">
        {error && (
          <div className="browse__error" role="alert">
            <Icon name="alert" size={22} />
            <p>{error}</p>
            <button
              className="button button--ghost"
              type="button"
              onClick={() => void loadPage(filters, 0)}
            >
              重试
            </button>
          </div>
        )}

        {!error && loading && items.length === 0 && <CardGridSkeleton />}

        {!error && !loading && items.length === 0 && (
          <div className="browse__empty">
            <Icon name={filterActive ? 'search' : 'database'} size={26} />
            <p>{filterActive ? '没有符合条件的卡牌' : '暂无卡牌'}</p>
            {filterActive && (
              <button className="button button--ghost" type="button" onClick={handleReset}>
                清除筛选
              </button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className="card-grid">
            {items.map((card) => {
              const kind =
                card.attributeText ??
                card.trainerTypeText ??
                card.energyTypeText ??
                card.cardTypeText
              const meta = [card.rarityText, card.evolveText].filter(Boolean).join(' · ')

              return (
                <button
                  key={`${card.collectionId}-${card.id}`}
                  type="button"
                  className="card-tile"
                  title={card.name}
                  onClick={() => void openDetail(card)}
                >
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
            })}
          </div>
        )}

        <div ref={sentinelRef} className="browse__sentinel" />
        {hasMore && (
          <div className="browse__more">
            <button
              type="button"
              className="button button--ghost"
              disabled={loadingMore}
              onClick={() => void loadPage(filters, items.length)}
            >
              {loadingMore ? '加载中…' : '加载更多'}
            </button>
          </div>
        )}
      </div>

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

interface DictSelectProps {
  label: string
  value: string | undefined
  options: DictOption[] | undefined
  onChange: (value: string | undefined) => void
}

function DictSelect({ label, value, options, onChange }: DictSelectProps): React.JSX.Element {
  return (
    <select
      className="browse__select"
      aria-label={label}
      title={label}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <option value="">{label}</option>
      {options?.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  )
}

function CardGridSkeleton(): React.JSX.Element {
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

export default CardBrowse
