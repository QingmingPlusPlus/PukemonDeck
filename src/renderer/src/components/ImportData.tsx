import { useState } from 'react'
import type { CardDatabaseStatus } from '../../../shared/card-db'
import Icon from './Icon'

interface ImportDataProps {
  status: CardDatabaseStatus
  importing: boolean
  onPick: () => void
  onDropFile: (file: File) => void
}

/**
 * 卡牌库缺失或无法打开时展示的导入页。
 * 支持打开系统文件选择框，也支持将数据库文件拖放到上传区域。
 */
function ImportData({ status, importing, onPick, onDropFile }: ImportDataProps): React.JSX.Element {
  const [dragging, setDragging] = useState(false)

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    if (!importing) setDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    if (importing) return

    const file = event.dataTransfer.files[0]
    if (file) onDropFile(file)
  }

  const handleZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (importing) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onPick()
    }
  }

  const zoneClass = [
    'import-data__dropzone',
    dragging ? 'import-data__dropzone--dragging' : '',
    importing ? 'import-data__dropzone--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="import-data">
      <span className="import-data__icon">
        <Icon name="database" size={26} />
      </span>
      <h1 className="import-data__title">导入卡牌数据</h1>
      <div
        className={zoneClass}
        role="button"
        tabIndex={importing ? -1 : 0}
        aria-disabled={importing}
        aria-label="导入卡牌数据库"
        onClick={importing ? undefined : onPick}
        onKeyDown={handleZoneKeyDown}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="import-data__drop-icon">
          {importing ? <span className="spinner" /> : <Icon name="upload" size={22} />}
        </span>
        <p className="import-data__drop-title">
          {importing ? '正在导入…' : dragging ? '松开以导入' : '拖放或点击选择'}
        </p>
        <p className="import-data__drop-types">.db / .sqlite</p>
      </div>
      {status.error && (
        <p className="import-data__error" role="alert">
          <Icon name="alert" size={14} />
          <span>{status.error}</span>
        </p>
      )}
    </div>
  )
}

export default ImportData
