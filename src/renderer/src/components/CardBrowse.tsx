import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CardBrowseScope,
  CardFilterOptions,
  CardFilters,
  CardSummary,
  DictOption
} from '../../../shared/card-query'
import { CardResultPane } from './CardGrid'
import Icon from './Icon'

const PAGE_SIZE = 48
const KEYWORD_DELAY_MS = 300

const EMPTY_FILTERS: CardFilters = {}

interface CardBrowseProps {
  scope?: CardBrowseScope
  title: string
  onAddCard: (card: CardSummary) => void
}

function CardBrowse({ scope, title, onAddCard }: CardBrowseProps): React.JSX.Element {
  const [options, setOptions] = useState<CardFilterOptions | null>(null)
  const [filters, setFilters] = useState<CardFilters>(EMPTY_FILTERS)
  const [keywordInput, setKeywordInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [items, setItems] = useState<CardSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    window.api.cardDb
      .getFilterOptions(scope)
      .then(setOptions)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '无法加载筛选条件')
      })
  }, [scope])

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

  const loadPage = useCallback(
    (nextFilters: CardFilters, offset: number): void => {
      const requestId = ++requestIdRef.current
      void (async () => {
        if (offset === 0) setLoading(true)
        else setLoadingMore(true)
        setError(null)
        try {
          const result = await window.api.cardDb.searchCards({
            scope,
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
    },
    [scope]
  )

  useEffect(() => {
    void loadPage(filters, 0)
  }, [filters, loadPage])

  const hasMore = items.length < total

  const collections = useMemo(() => {
    if (!options) return []
    if (!filters.series) return options.collections
    return options.collections.filter((item) => item.series === filters.series)
  }, [options, filters.series])

  let categories = options?.categories
  let categoryLabel = '类别'
  if (scope === 'trainer') {
    categories = categories?.filter(
      ({ code }) => code.startsWith('trainer:') && code !== 'trainer:1'
    )
    categoryLabel = '训练家类型'
  }
  if (scope === 'energy') {
    categories = categories?.filter(({ code }) => code.startsWith('energy:'))
    categoryLabel = '能量类型'
  }

  const hiddenFilterCount = [
    scope === 'pokemon' ? undefined : filters.attribute,
    filters.weaknessType,
    filters.resistanceType,
    filters.evolution,
    filters.pokemonType,
    filters.hp,
    filters.retreatCost,
    scope === 'item' ? undefined : filters.specialCard,
    filters.rarity,
    filters.regulationMark
  ].filter((value) => value !== undefined).length

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

  const filterActive = Object.keys(filters).length > 0 || keywordInput.length > 0

  return (
    <div className="browse">
      <header className="browse__toolbar">
        <h1 className="sr-only">{title}</h1>
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
          {scope !== 'pokemon' && scope !== 'item' && (
            <DictSelect
              label={categoryLabel}
              value={filters.category}
              options={categories}
              onChange={(value) => updateFilter('category', value)}
            />
          )}
          {scope === 'pokemon' && (
            <DictSelect
              label="属性"
              value={filters.attribute}
              options={options?.attributes}
              onChange={(value) => updateFilter('attribute', value)}
            />
          )}
          {scope === 'item' && (
            <DictSelect
              label="特殊分类"
              value={filters.specialCard}
              options={options?.specialCards}
              onChange={(value) => updateFilter('specialCard', value)}
            />
          )}
          <select
            className="browse__select browse__select--wide"
            aria-label="合并相同卡牌"
            title="合并相同卡牌"
            value={filters.merge ?? ''}
            onChange={(event) =>
              updateFilter(
                'merge',
                event.target.value === 'lowest' || event.target.value === 'highest'
                  ? event.target.value
                  : undefined
              )
            }
          >
            <option value="">合并相同卡牌</option>
            <option value="lowest">只显示最低稀有度</option>
            <option value="highest">只显示最高稀有度</option>
          </select>

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
            {(!scope || scope === 'energy') && (
              <DictSelect
                label="属性"
                value={filters.attribute}
                options={options?.attributes}
                onChange={(value) => updateFilter('attribute', value)}
              />
            )}
            {(!scope || scope === 'pokemon') && (
              <>
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
              </>
            )}
            {scope === 'pokemon' && (
              <>
                <DictSelect
                  label="抵抗力"
                  value={filters.resistanceType}
                  options={options?.resistanceTypes}
                  onChange={(value) => updateFilter('resistanceType', value)}
                />
                <DictSelect
                  label="HP"
                  value={filters.hp?.toString()}
                  options={options?.hpValues}
                  onChange={(value) =>
                    updateFilter('hp', value == null ? undefined : Number(value))
                  }
                />
                <DictSelect
                  label="撤退费用"
                  value={filters.retreatCost?.toString()}
                  options={options?.retreatCosts}
                  onChange={(value) =>
                    updateFilter('retreatCost', value == null ? undefined : Number(value))
                  }
                />
              </>
            )}
            {scope && scope !== 'item' && (
              <DictSelect
                label="特殊分类"
                value={filters.specialCard}
                options={options?.specialCards}
                onChange={(value) => updateFilter('specialCard', value)}
              />
            )}
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

      <CardResultPane
        items={items}
        onAddCard={onAddCard}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        hasMore={hasMore}
        emptyIcon={filterActive ? 'search' : 'database'}
        emptyText={filterActive ? '没有符合条件的卡牌' : '暂无卡牌'}
        emptyAction={
          filterActive ? (
            <button className="button button--ghost" type="button" onClick={handleReset}>
              清除筛选
            </button>
          ) : undefined
        }
        onRetry={() => void loadPage(filters, 0)}
        onLoadMore={() => void loadPage(filters, items.length)}
      />
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
      disabled={!options?.length}
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

export default CardBrowse
