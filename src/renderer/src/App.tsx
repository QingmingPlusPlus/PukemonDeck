import { useEffect, useLayoutEffect, useState, type KeyboardEvent } from 'react'
import ImportData from './components/ImportData'
import CardBrowse from './components/CardBrowse'
import CollectionBrowse from './components/CollectionBrowse'
import DeckBrowse from './components/DeckBrowse'
import Icon from './components/Icon'
import Settings from './components/Settings'
import type { CardDatabaseStatus } from '../../shared/card-db'
import type { CardImageProgress, CardImageStatus } from '../../shared/card-image'
import type { CardSummary } from '../../shared/card-query'

const HOME_PAGES = {
  decks: { label: '牌组', icon: 'deck' },
  settings: { label: '设置', icon: 'settings' },
  temp: { label: '测试 Temp', icon: 'database' }
} as const

type HomePage = keyof typeof HOME_PAGES
const HOME_LINKS = Object.keys(HOME_PAGES) as HomePage[]

const TAB_LABELS = {
  cards: '牌库',
  pokemon: '宝可梦',
  trainer: '训练家',
  item: '物品',
  energy: '能量',
  collections: '集合',
  decks: '牌组'
}

type AppTab = keyof typeof TAB_LABELS
const APP_TABS = Object.keys(TAB_LABELS) as AppTab[]

interface AddFeedback {
  kind: 'added' | 'no-deck' | 'error'
  message: string
}

function App(): React.JSX.Element {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
  )
  const [status, setStatus] = useState<CardDatabaseStatus | null>(null)
  const [imageStatus, setImageStatus] = useState<CardImageStatus | null>(null)
  const [imageProgress, setImageProgress] = useState<CardImageProgress | null>(null)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [imageImporting, setImageImporting] = useState(false)
  const [page, setPage] = useState<'home' | HomePage>('home')
  const [activeTab, setActiveTab] = useState<AppTab>('cards')
  const [addFeedback, setAddFeedback] = useState<AddFeedback | null>(null)
  const imageBusy = imageImporting || Boolean(imageStatus?.importing)
  const busy = importing || clearing || imageBusy

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!addFeedback) return
    const timer = window.setTimeout(
      () => setAddFeedback(null),
      addFeedback.kind === 'no-deck' ? 8000 : 3500
    )
    return () => window.clearTimeout(timer)
  }, [addFeedback])

  useEffect(() => {
    window.api.cardDb
      .status()
      .then(setStatus)
      .catch((error: unknown) => {
        setStatus({
          ok: false,
          path: '',
          source: null,
          error: error instanceof Error ? error.message : '读取牌库状态失败'
        })
      })
    window.api.cardImage
      .status()
      .then(setImageStatus)
      .catch((error: unknown) => setImageStatus(unavailableImageStatus(error)))
    return window.api.cardImage.onProgress(setImageProgress)
  }, [])

  useEffect(() => {
    if (!imageStatus?.importing || imageImporting) return
    const timer = window.setInterval(() => {
      window.api.cardImage
        .status()
        .then(setImageStatus)
        .catch((error: unknown) => {
          setImageStatus((current) => ({
            ...(current ?? unavailableImageStatus(error)),
            importing: false,
            error: error instanceof Error ? error.message : '读取图片状态失败'
          }))
        })
    }, 500)
    return () => window.clearInterval(timer)
  }, [imageImporting, imageStatus?.importing])

  const applyImportResult = (result: CardDatabaseStatus): void => {
    if (result.cancelled) return
    setStatus(result)
  }

  const handlePick = async (): Promise<void> => {
    if (busy) return
    setImporting(true)
    try {
      applyImportResult(await window.api.cardDb.pickAndImport())
    } finally {
      setImporting(false)
    }
  }

  const handleDropFile = async (file: File): Promise<void> => {
    if (busy) return
    setImporting(true)
    try {
      const filePath = window.api.cardDb.getPathForFile(file)
      if (!filePath) {
        setStatus((current) => ({
          ok: false,
          path: current?.path ?? '',
          error: '无法读取拖入的文件，请手动选择',
          source: current?.source ?? null
        }))
        return
      }
      applyImportResult(await window.api.cardDb.importFromPath(filePath))
    } finally {
      setImporting(false)
    }
  }

  const handleClear = async (): Promise<void> => {
    if (busy) return
    setClearing(true)
    try {
      const result = await window.api.cardDb.clearImported()
      if (result.cancelled) return
      setStatus(result)
      if (!result.ok) setActiveTab('cards')
    } catch (error) {
      setStatus((current) =>
        current
          ? { ...current, error: error instanceof Error ? error.message : '清除牌库数据库失败' }
          : current
      )
    } finally {
      setClearing(false)
    }
  }

  const handleImagePick = async (): Promise<void> => {
    if (busy) return
    setImageImporting(true)
    setImageProgress(null)
    try {
      setImageStatus(await window.api.cardImage.pickAndImport())
    } catch (error) {
      setImageStatus((current) =>
        current
          ? {
              ...current,
              error: error instanceof Error ? error.message : '导入图片失败'
            }
          : current
      )
    } finally {
      setImageImporting(false)
      setImageProgress(null)
    }
  }

  const handleImageCancel = (): void => {
    void window.api.cardImage.cancel()
  }

  const handleAddCard = (card: CardSummary): void => {
    window.api.decks.addCard(card.collectionId, card.id).then(
      (deckName) =>
        setAddFeedback(
          deckName === null
            ? { kind: 'no-deck', message: '请先创建牌组' }
            : { kind: 'added', message: `已添加到「${deckName}」` }
        ),
      () => setAddFeedback({ kind: 'error', message: '添加卡牌失败，请重试' })
    )
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (busy || event.altKey || event.ctrlKey || event.metaKey) return
    const index = APP_TABS.indexOf(activeTab)
    let nextTab: AppTab
    switch (event.key) {
      case 'ArrowLeft':
        nextTab = APP_TABS[(index + APP_TABS.length - 1) % APP_TABS.length]
        break
      case 'ArrowRight':
        nextTab = APP_TABS[(index + 1) % APP_TABS.length]
        break
      case 'Home':
        nextTab = APP_TABS[0]
        break
      case 'End':
        nextTab = APP_TABS[APP_TABS.length - 1]
        break
      default:
        return
    }
    event.preventDefault()
    event.currentTarget.querySelector<HTMLButtonElement>(`#${nextTab}-tab`)?.focus()
    setActiveTab(nextTab)
  }

  if (page === 'home') {
    return (
      <main className="app-centered">
        <div className="home">
          <h1 className="home__title">PukemonDeck</h1>
          <nav className="home__links" aria-label="主导航">
            {HOME_LINKS.map((destination) => (
              <button
                key={destination}
                className="button home__link"
                type="button"
                onClick={() => setPage(destination)}
              >
                <span className="home__icon">
                  <Icon name={HOME_PAGES[destination].icon} size={24} />
                </span>
                {HOME_PAGES[destination].label}
              </button>
            ))}
          </nav>
        </div>
      </main>
    )
  }

  let pageContent: React.ReactNode = null
  if (page !== 'decks') {
    if (!status || !imageStatus) {
      pageContent = (
        <div className="app-centered">
          <span className="spinner spinner--lg" role="status" aria-label="正在加载卡牌数据" />
        </div>
      )
    } else if (page === 'settings') {
      pageContent = (
        <Settings
          status={status}
          busy={busy}
          importing={importing}
          clearing={clearing}
          onImport={handlePick}
          onClear={handleClear}
          imageStatus={imageStatus}
          imageProgress={imageProgress}
          imageImporting={imageBusy}
          onImportImages={handleImagePick}
          onCancelImages={handleImageCancel}
        />
      )
    } else if (!status.ok) {
      pageContent = (
        <div className="app-centered">
          <ImportData
            status={status}
            importing={busy}
            onPick={handlePick}
            onDropFile={handleDropFile}
          />
        </div>
      )
    } else {
      pageContent = (
        <div id="app-panel" role="tabpanel" aria-labelledby={`${activeTab}-tab`}>
          {activeTab === 'decks' ? (
            <DeckBrowse onBrowseCards={() => setActiveTab('cards')} />
          ) : activeTab === 'collections' ? (
            <CollectionBrowse onAddCard={handleAddCard} />
          ) : (
            <CardBrowse
              key={activeTab}
              scope={activeTab === 'cards' ? undefined : activeTab}
              title={TAB_LABELS[activeTab]}
              onAddCard={handleAddCard}
            />
          )}
        </div>
      )
    }
  }

  const showTabs = page === 'temp' && status?.ok === true && imageStatus !== null
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const themeLabel = nextTheme === 'light' ? '切换到浅色主题' : '切换到深色主题'

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="button button--ghost app-header__home"
          type="button"
          onClick={() => setPage('home')}
        >
          <Icon name="arrow-left" />
          首页
        </button>
        {showTabs ? (
          <nav
            className="app-tabs"
            aria-label="卡牌浏览"
            role="tablist"
            onKeyDown={handleTabKeyDown}
          >
            {APP_TABS.map((tab) => (
              <button
                key={tab}
                id={`${tab}-tab`}
                className={`app-tabs__tab${activeTab === tab ? ' app-tabs__tab--active' : ''}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="app-panel"
                tabIndex={activeTab === tab ? 0 : -1}
                disabled={busy}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </nav>
        ) : (
          <h1 className="app-header__title">{HOME_PAGES[page].label}</h1>
        )}
        {page !== 'decks' && (
          <button
            className="icon-button theme-toggle"
            type="button"
            aria-label={themeLabel}
            title={themeLabel}
            onClick={() => setTheme(nextTheme)}
          >
            <Icon name={nextTheme === 'light' ? 'sun' : 'moon'} size={18} />
          </button>
        )}
      </header>
      <main className="app-content">{pageContent}</main>
      {showTabs && (
        <div className="deck-feedback" role="status">
          {addFeedback && (
            <div className="deck-feedback__notice">
              <Icon name={addFeedback.kind === 'added' ? 'check' : 'alert'} />
              <span>{addFeedback.message}</span>
              {addFeedback.kind === 'no-deck' && (
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => {
                    setActiveTab('decks')
                    setAddFeedback(null)
                  }}
                >
                  前往牌组
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function unavailableImageStatus(error: unknown): CardImageStatus {
  return {
    ok: false,
    path: '',
    generation: null,
    total: 0,
    imported: 0,
    missing: 0,
    missingSamples: [],
    importedAt: null,
    importing: false,
    error: error instanceof Error ? error.message : '图片功能不可用'
  }
}

export default App
