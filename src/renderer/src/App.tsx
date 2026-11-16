import { useEffect, useState } from 'react'
import ImportData from './components/ImportData'
import CardBrowse from './components/CardBrowse'
import Settings from './components/Settings'
import type { CardDatabaseStatus } from '../../shared/card-db'
import type { CardImageProgress, CardImageStatus } from '../../shared/card-image'

type AppTab = 'cards' | 'settings'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<CardDatabaseStatus | null>(null)
  const [imageStatus, setImageStatus] = useState<CardImageStatus | null>(null)
  const [imageProgress, setImageProgress] = useState<CardImageProgress | null>(null)
  const [importing, setImporting] = useState(false)
  const [imageImporting, setImageImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('cards')
  const imageBusy = imageImporting || Boolean(imageStatus?.importing)
  const busy = importing || imageBusy

  useEffect(() => {
    window.api.cardDb.status().then(setStatus)
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

  if (!status || !imageStatus) {
    return (
      <div className="app-centered">
        <span className="spinner spinner--lg" role="status" aria-label="正在加载卡牌数据" />
      </div>
    )
  }

  if (!status.ok) {
    return (
      <div className="app-centered">
        <ImportData
          status={status}
          importing={busy}
          onPick={handlePick}
          onDropFile={handleDropFile}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <nav className="app-tabs" aria-label="主导航" role="tablist">
        <span className="app-tabs__brand">PukemonDeck</span>
        <button
          id="cards-tab"
          className={`app-tabs__tab${activeTab === 'cards' ? ' app-tabs__tab--active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'cards'}
          aria-controls="cards-panel"
          disabled={busy}
          onClick={() => setActiveTab('cards')}
        >
          牌库
        </button>
        <button
          id="settings-tab"
          className={`app-tabs__tab${activeTab === 'settings' ? ' app-tabs__tab--active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'settings'}
          aria-controls="settings-panel"
          disabled={busy}
          onClick={() => setActiveTab('settings')}
        >
          设置
        </button>
      </nav>
      <div
        id={`${activeTab}-panel`}
        className="app-content"
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
      >
        {activeTab === 'cards' ? (
          <CardBrowse />
        ) : (
          <Settings
            status={status}
            importing={busy}
            onImport={handlePick}
            imageStatus={imageStatus}
            imageProgress={imageProgress}
            imageImporting={imageBusy}
            onImportImages={handleImagePick}
            onCancelImages={handleImageCancel}
          />
        )}
      </div>
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
