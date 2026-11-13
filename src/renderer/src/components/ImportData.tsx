import { useState } from 'react'
import type { CardDatabaseStatus } from '../../../shared/card-db'

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
      <h1 className="import-data__title">缺失卡牌数据</h1>
      <p className="import-data__desc">
        未找到可用的卡牌数据库，暂时无法加载卡牌内容。你可以手动导入卡牌数据，导入后会保存在本机，下次启动无需重新导入。
      </p>
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
        <p className="import-data__drop-title">
          {importing ? '正在导入…' : dragging ? '松开鼠标以导入文件' : '将卡牌数据库拖到此处'}
        </p>
        <p className="import-data__drop-hint">
          {importing ? '请稍候，正在校验并保存数据库' : '也可以点击此处打开系统文件选择框'}
        </p>
        <p className="import-data__drop-types">支持 .db / .sqlite</p>
      </div>
      {status.error && <p className="import-data__error">错误信息：{status.error}</p>}
    </div>
  )
}

export default ImportData
