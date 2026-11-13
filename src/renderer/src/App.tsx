import { useEffect, useState } from 'react'
import ImportData from './components/ImportData'
import CardBrowse from './components/CardBrowse'
import type { CardDatabaseStatus } from '../../shared/card-db'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<CardDatabaseStatus | null>(null)
  const [importing, setImporting] = useState(false)

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

  return <CardBrowse />
}

export default App
