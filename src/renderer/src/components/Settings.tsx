import type { CardDatabaseStatus } from '../../../shared/card-db'
import type { CardImageProgress, CardImageStatus } from '../../../shared/card-image'

interface SettingsProps {
  status: CardDatabaseStatus
  importing: boolean
  onImport: () => void
  imageStatus: CardImageStatus
  imageProgress: CardImageProgress | null
  imageImporting: boolean
  onImportImages: () => void
  onCancelImages: () => void
}

function Settings({
  status,
  importing,
  onImport,
  imageStatus,
  imageProgress,
  imageImporting,
  onImportImages,
  onCancelImages
}: SettingsProps): React.JSX.Element {
  const sourceText =
    status.source === 'imported'
      ? '用户导入'
      : status.source === 'bundled'
        ? '开发/外部数据'
        : '未知'
  const progressPercent = imageProgress
    ? imageProgress.total > 0
      ? Math.round((imageProgress.processed / imageProgress.total) * 100)
      : 0
    : 0

  return (
    <section className="settings">
      <header className="settings__header">
        <h1>设置</h1>
        <p>管理牌库数据库和本地卡图资源。</p>
      </header>

      <div className="settings__card">
        <div className="settings__card-heading">
          <div>
            <h2>牌库数据库</h2>
            <p>导入成功后会覆盖此前导入的 deck.db，并立即使用新数据。</p>
          </div>
          <span className={`settings__status${status.ok ? ' settings__status--ok' : ''}`}>
            {status.ok ? '已加载' : '不可用'}
          </span>
        </div>

        <dl className="settings__details">
          <dt>当前文件</dt>
          <dd>
            <code>{status.path || '尚未导入'}</code>
          </dd>
          <dt>数据来源</dt>
          <dd>{sourceText}</dd>
        </dl>

        <div className="settings__actions">
          <button
            className="settings__import"
            type="button"
            disabled={importing}
            onClick={onImport}
          >
            {importing && !imageImporting ? '正在导入…' : '选择并导入 DB'}
          </button>
          <p>支持 .db / .sqlite 文件，导入前会校验数据库格式和核心数据表。</p>
        </div>

        {status.error && <p className="settings__error">错误信息：{status.error}</p>}
      </div>

      <div className="settings__card settings__card--images">
        <div className="settings__card-heading">
          <div>
            <h2>卡牌图片</h2>
            <p>选择包含 img 的文件夹，应用会复制数据库引用的卡图和卡包封面。</p>
          </div>
          <span className={`settings__status${imageStatus.ok ? ' settings__status--ok' : ''}`}>
            {imageStatus.ok ? '已导入' : '未导入'}
          </span>
        </div>

        <dl className="settings__details">
          <dt>存储位置</dt>
          <dd>
            <code>{imageStatus.path || '尚未导入'}</code>
          </dd>
          <dt>导入结果</dt>
          <dd>
            {imageStatus.importedAt
              ? `已复制 ${imageStatus.imported} / ${imageStatus.total} 张，缺失 ${imageStatus.missing} 张`
              : '尚未导入图片'}
          </dd>
          {imageStatus.importedAt && (
            <>
              <dt>导入时间</dt>
              <dd>{formatDate(imageStatus.importedAt)}</dd>
            </>
          )}
        </dl>

        {imageImporting && imageProgress && (
          <div className="settings__progress" aria-live="polite">
            <div className="settings__progress-heading">
              <span>
                {imageProgress.phase === 'finalizing'
                  ? '正在启用新图片版本…'
                  : `正在复制 ${imageProgress.processed} / ${imageProgress.total}`}
              </span>
              <span>{imageProgress.phase === 'finalizing' ? '请稍候' : `${progressPercent}%`}</span>
            </div>
            <progress
              aria-label="图片导入进度"
              max={imageProgress.total || 1}
              value={imageProgress.processed}
            />
            <p>
              已复制 {imageProgress.imported} 张，缺失 {imageProgress.missing}{' '}
              张。导入期间旧图片继续可用。
            </p>
          </div>
        )}

        <div className="settings__actions">
          <button
            className="settings__import"
            type="button"
            disabled={importing}
            onClick={onImportImages}
          >
            {imageImporting ? '正在导入…' : imageStatus.ok ? '重新导入并替换' : '选择并导入图片'}
          </button>
          {imageImporting && (
            <button
              className="settings__secondary"
              type="button"
              disabled={imageProgress?.phase === 'finalizing'}
              onClick={onCancelImages}
            >
              取消导入
            </button>
          )}
          <p>再次导入会完整替换当前版本；失败或取消不会影响原有图片。</p>
        </div>

        {imageStatus.missingSamples.length > 0 && (
          <details className="settings__missing">
            <summary>查看缺失路径示例</summary>
            <ul>
              {imageStatus.missingSamples.map((path) => (
                <li key={path}>
                  <code>{path}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
        {imageStatus.error && <p className="settings__error">{imageStatus.error}</p>}
      </div>
    </section>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

export default Settings
