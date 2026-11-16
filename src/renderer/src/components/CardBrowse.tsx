import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CardDetail,
  CardFilterOptions,
  CardFilters,
  CardSummary
} from '../../../shared/card-query'
import CardDetailModal from './CardDetailModal'

const PAGE_SIZE = 48
const KEYWORD_DELAY_MS = 300

const EMPTY_FILTERS: CardFilters = {}

function CardBrowse(): React.JSX.Element {
  const [options, setOptions] = useState<CardFilterOptions | null>(null)
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS)
  const [keywordInput, setKeywordInput] = useState('')
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
    if (!node || !hasMore) return
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
  }, [filters, hasMore, items.length, loadPage, loading, loadingMore])

  const collections = useMemo(() => {
    if (!options) return []
    if (!filters.series) return options.collections
    return options.collections.filter((item) => item.series === filters.series)
  }, [options, filters.series])

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

  return (
    <div className="browse">
      <header className="browse__toolbar">
        <div className="browse__title-row">
          <h1 className="browse__title">牌库</h1>
          <p className="browse__count">
            {loading && items.length === 0
              ? '正在查询…'
              : `共 ${total} 张，已显示 ${items.length} 张`}
          </p>
        </div>
        <div className="browse__filters">
          <label className="browse__field browse__field--search">
            <span>搜索</span>
            <input
              type="search"
              value={keywordInput}
              placeholder="名称、收集编号或卡包"
              onChange={(event) => setKeywordInput(event.target.value)}
            />
          </label>
          <label className="browse__field">
            <span>系列</span>
            <select
              value={filters.series ?? ''}
              onChange={(event) => updateFilter('series', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.series.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field browse__field--wide">
            <span>卡包</span>
            <select
              value={filters.collectionId ?? ''}
              onChange={(event) =>
                updateFilter(
                  'collectionId',
                  event.target.value ? Number(event.target.value) : undefined
                )
              }
            >
              <option value="">全部</option>
              {collections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.seriesText ? `（${item.seriesText}）` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>卡牌类别</span>
            <select
              value={filters.category ?? ''}
              onChange={(event) => updateFilter('category', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.categories.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>属性</span>
            <select
              value={filters.attribute ?? ''}
              onChange={(event) => updateFilter('attribute', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.attributes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>弱点</span>
            <select
              value={filters.weaknessType ?? ''}
              onChange={(event) => updateFilter('weaknessType', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.weaknessTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>是否进化</span>
            <select
              value={filters.evolution ?? ''}
              onChange={(event) => updateFilter('evolution', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.evolutions.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>宝可梦种类</span>
            <select
              value={filters.pokemonType ?? ''}
              onChange={(event) => updateFilter('pokemonType', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.pokemonTypes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>稀有度</span>
            <select
              value={filters.rarity ?? ''}
              onChange={(event) => updateFilter('rarity', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.rarities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="browse__field">
            <span>规则标记</span>
            <select
              value={filters.regulationMark ?? ''}
              onChange={(event) => updateFilter('regulationMark', event.target.value || undefined)}
            >
              <option value="">全部</option>
              {options?.regulationMarks.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button className="browse__reset" type="button" onClick={handleReset}>
            重置
          </button>
        </div>
      </header>

      <div className="browse__results">
        {error && <p className="browse__error">{error}</p>}
        {!error && !loading && items.length === 0 && (
          <p className="browse__empty">没有符合条件的卡牌，请调整筛选条件后再试。</p>
        )}
        {items.length > 0 && (
          <div className="card-grid">
            {items.map((card) => (
              <button
                key={`${card.collectionId}-${card.id}`}
                type="button"
                className="card-tile"
                onClick={() => void openDetail(card)}
              >
                <div className="card-tile__top">
                  <span className="card-tile__rarity">{card.rarityText}</span>
                  <span className="card-tile__kind">
                    {card.attributeText ??
                      card.trainerTypeText ??
                      card.energyTypeText ??
                      card.cardTypeText}
                  </span>
                </div>
                <h2 className="card-tile__name">{card.name}</h2>
                <p className="card-tile__line">
                  {card.cardTypeText}
                  {card.evolveText ? ` · ${card.evolveText}` : ''}
                  {card.hp != null ? ` · HP ${card.hp}` : ''}
                </p>
                <div className="card-tile__footer">
                  <span className="card-tile__set">{card.collectionName}</span>
                  <span className="card-tile__number">
                    {card.collectionNumber}
                    {card.regulationMarkText ? ` · ${card.regulationMarkText}` : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="browse__sentinel" />
        {hasMore && (
          <div className="browse__more">
            <button
              type="button"
              className="browse__more-button"
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

export default CardBrowse
