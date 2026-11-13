import { useEffect, useState } from 'react'
import Versions from './components/Versions'
import ImportData from './components/ImportData'
import electronLogo from './assets/electron.svg'
import type { CardDatabaseStatus } from '../../shared/card-db'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<CardDatabaseStatus | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    window.api.cardDb.status().then(setStatus)
  }, [])

  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

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
    return <p className="tip">正在加载卡牌数据…</p>
  }

  if (!status.ok) {
    return (
      <ImportData
        status={status}
        importing={importing}
        onPick={handlePick}
        onDropFile={handleDropFile}
      />
    )
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
