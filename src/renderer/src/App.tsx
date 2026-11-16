import { useEffect, useState } from 'react'
import ImportData from './components/ImportData'
import CardBrowse from './components/CardBrowse'
import Settings from './components/Settings'
import type { CardDatabaseStatus } from '../../shared/card-db'

type AppTab = 'cards' | 'settings'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<CardDatabaseStatus | null>(null)
  const [importing, setImporting] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>('cards')

  useEffect(() => {
    window.api.cardDb.status().then(setStatus)
  }, [])

  const applyImportResult = (result: CardDatabaseStatus): void => {
    if (result.cancelled) return
    setStatus(result)
  }

  const handlePick = async (): Promise<void> => {
    if (importing) return
    setImporting(true)
    try {
      applyImportResult(await window.api.cardDb.pickAndImport())
    } finally {
      setImporting(false)
    }
  }

  const handleDropFile = async (file: File): Promise<void> => {
    if (importing) return
    setImporting(true)
    try {
      const filePath = window.api.cardDb.getPathForFile(file)
      if (!filePath) {
        setStatus((current) => ({
          ok: false,
          path: current?.path ?? '',
          error: '无法获取文件路径，请改用点击上传区域选择文件',
          source: current?.source ?? null
        }))
        return
      }
      applyImportResult(await window.api.cardDb.importFromPath(filePath))
    } finally {
      setImporting(false)
    }
  }

  if (!status) {
    return (
      <div className="app-centered">
        <p className="tip">正在加载卡牌数据…</p>
      </div>
    )
  }

  if (!status.ok) {
    return (
      <div className="app-centered">
        <ImportData
          status={status}
          importing={importing}
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
          disabled={importing}
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
          disabled={importing}
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
          <Settings status={status} importing={importing} onImport={handlePick} />
        )}
      </div>
    </div>
  )
}

export default App
