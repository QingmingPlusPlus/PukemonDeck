import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CollectionOption, CardSummary } from '../../../shared/card-query'
import { CardResultPane } from './CardGrid'
import Icon from './Icon'

const PAGE_SIZE = 48

interface CollectionGroup {
  label: string
  items: CollectionOption[]
}

const TAIL_GROUP_LABELS = ['其他', '未分类']

function groupCollections(collections: CollectionOption[]): CollectionGroup[] {
  const groups = new Map<string, CollectionOption[]>()
  const order: string[] = []
  for (const item of collections) {
    const label = item.seriesText?.trim() || '未分类'
    if (!groups.has(label)) {
      order.push(label)
      groups.set(label, [])
    }
    groups.get(label)?.push(item)
  }
  const labels = [
    ...order.filter((label) => !TAIL_GROUP_LABELS.includes(label)),
    ...TAIL_GROUP_LABELS.filter((label) => groups.has(label))
  ]
  return labels.map((label) => ({ label, items: groups.get(label) ?? [] }))
}

function CollectionBrowse(): React.JSX.Element {
  const [collections, setCollections] = useState<CollectionOption[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [keyword, setKeyword] = useState('')
  const [items, setItems] = useState<CardSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    window.api.cardDb
      .getFilterOptions()
      .then((options) => setCollections(options.collections))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '无法加载集合')
      })
  }, [])

  const resetResults = useCallback((): void => {
    requestIdRef.current += 1
    setItems([])
    setTotal(0)
    setLoading(false)
    setLoadingMore(false)
    setError(null)
  }, [])

  const loadPage = useCallback((collectionIds: number[], offset: number): void => {
    if (collectionIds.length === 0) return

    const requestId = ++requestIdRef.current
    void (async () => {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      try {
        const result = await window.api.cardDb.searchCards({
          filters: { collectionIds },
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
    if (selectedIds.length === 0) return
    void loadPage(selectedIds, 0)
  }, [selectedIds, loadPage])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const hasMore = items.length < total
  const hasSelection = selectedIds.length > 0

  const visibleGroups = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    const source = query
      ? collections.filter((item) => {
          const haystack = `${item.name} ${item.seriesText ?? ''}`.toLowerCase()
          return haystack.includes(query)
        })
      : collections
    return groupCollections(source)
  }, [collections, keyword])

  const toggleCollection = (id: number): void => {
    setSelectedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : current.concat(id)
      if (next.length === 0) resetResults()
      return next
    })
  }

  const clearSelection = (): void => {
    setSelectedIds([])
    resetResults()
  }

  const clearKeyword = (): void => {
    setKeyword('')
  }

  return (
    <div className="collections">
      <h1 className="sr-only">集合</h1>
      <aside className="collections__picker" aria-label="集合">
        <div className="collections__picker-bar">
          <div className="browse__search">
            <Icon name="search" size={16} className="browse__search-icon" />
            <input
              type="search"
              aria-label="搜索集合"
              placeholder="搜索集合"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            {keyword && (
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
          {hasSelection && (
            <button
              className="icon-button"
              type="button"
              title="清除选择"
              aria-label="清除选择"
              onClick={clearSelection}
            >
              <Icon name="reset" size={16} />
            </button>
          )}
        </div>

        <div className="collections__groups" role="group" aria-label="全部集合">
          {visibleGroups.length === 0 ? (
            <div className="collections__none">没有匹配的集合</div>
          ) : (
            visibleGroups.map((group) => (
              <section key={group.label} className="collections__group">
                <h2 className="collections__group-label">{group.label}</h2>
                <div className="collections__toggles">
                  {group.items.map((item) => {
                    const selected = selectedSet.has(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`collection-toggle${selected ? ' collection-toggle--on' : ''}`}
                        aria-pressed={selected}
                        title={item.seriesText ? `${item.name} · ${item.seriesText}` : item.name}
                        onClick={() => toggleCollection(item.id)}
                      >
                        {item.name}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </aside>

      <div className="collections__main">
        <div className="collections__main-bar">
          <span className="browse__count" title="已选集合与卡牌数量">
            {hasSelection
              ? loading && items.length === 0
                ? '—'
                : `${selectedIds.length.toLocaleString('zh-CN')} 个集合 · ${total.toLocaleString('zh-CN')} 张`
              : ''}
          </span>
        </div>
        <CardResultPane
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          emptyIcon={hasSelection ? 'search' : 'database'}
          emptyText={hasSelection ? '没有符合条件的卡牌' : '选择集合'}
          emptyAction={
            hasSelection ? (
              <button className="button button--ghost" type="button" onClick={clearSelection}>
                清除选择
              </button>
            ) : undefined
          }
          onRetry={() => void loadPage(selectedIds, 0)}
          onLoadMore={() => void loadPage(selectedIds, items.length)}
        />
      </div>
    </div>
  )
}

export default CollectionBrowse
