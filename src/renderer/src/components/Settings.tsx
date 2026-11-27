import type { CardDatabaseStatus } from '../../../shared/card-db'
import type { CardImageProgress, CardImageStatus } from '../../../shared/card-image'
import Icon from './Icon'

interface SettingsProps {
  status: CardDatabaseStatus
  busy: boolean
  importing: boolean
  clearing: boolean
  onImport: () => void
  onClear: () => void
  imageStatus: CardImageStatus
  imageProgress: CardImageProgress | null
  imageImporting: boolean
  onImportImages: () => void
  onCancelImages: () => void
}

function Settings({
  status,
  busy,
  importing,
  clearing,
  onImport,
  onClear,
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
      <div className="settings__card">
        <div className="settings__card-heading">
          <div className="settings__card-title">
            <Icon name="database" size={18} className="settings__card-icon" />
            <h2>牌库数据库</h2>
            <span className={`status-pill${status.ok ? ' status-pill--ok' : ''}`}>
              {status.ok ? '已加载' : '不可用'}
            </span>
          </div>
          <div className="settings__actions">
            <button
              className="button button--danger"
              type="button"
              disabled={busy || status.source !== 'imported'}
              title="删除已导入的数据库副本"
              onClick={onClear}
            >
              {clearing ? '清除中…' : '清除'}
            </button>
            <button
              className="button button--primary"
              type="button"
              disabled={busy}
              title={status.ok ? '选择新的数据库文件并覆盖当前数据' : '选择数据库文件'}
              onClick={onImport}
            >
              {importing ? '导入中…' : status.ok ? '更换' : '导入'}
            </button>
          </div>
        </div>

        <dl className="settings__details">
          <dt>文件</dt>
          <dd>
            <code>{status.path || '—'}</code>
          </dd>
          <dt>来源</dt>
          <dd>{sourceText}</dd>
        </dl>

        {status.error && (
          <p className="settings__error" role="alert">
            <Icon name="alert" size={14} />
            <span>{status.error}</span>
          </p>
        )}
      </div>

      <div className="settings__card">
        <div className="settings__card-heading">
          <div className="settings__card-title">
            <Icon name="image" size={18} className="settings__card-icon" />
            <h2>卡牌图片</h2>
            <span className={`status-pill${imageStatus.ok ? ' status-pill--ok' : ''}`}>
              {imageStatus.ok ? '已导入' : '未导入'}
            </span>
          </div>
          <div className="settings__actions">
            {imageImporting && (
              <button
                className="button"
                type="button"
                disabled={imageProgress?.phase === 'finalizing'}
                onClick={onCancelImages}
              >
                取消
              </button>
            )}
            <button
              className="button button--primary"
              type="button"
              disabled={busy || !status.ok}
              title="选择包含 img 的文件夹；再次导入会替换当前图片"
              onClick={onImportImages}
            >
              {imageImporting ? '导入中…' : imageStatus.ok ? '替换' : '导入'}
            </button>
          </div>
        </div>

        {imageStatus.path && (
          <dl className="settings__details">
            <dt>存储</dt>
            <dd>
              <code>{imageStatus.path}</code>
            </dd>
            {imageStatus.importedAt && (
              <>
                <dt>图片</dt>
                <dd className="settings__counts">
                  <span>
                    {imageStatus.imported} / {imageStatus.total}
                  </span>
                  {imageStatus.missing > 0 && (
                    <span className="chip chip--warn">缺 {imageStatus.missing}</span>
                  )}
                </dd>
                <dt>导入</dt>
                <dd>{formatDate(imageStatus.importedAt)}</dd>
              </>
            )}
          </dl>
        )}

        {imageImporting && imageProgress && (
          <div className="settings__progress" aria-live="polite">
            <div className="settings__progress-heading">
              <span>
                {imageProgress.phase === 'finalizing'
                  ? '正在启用新版本'
                  : `${imageProgress.processed} / ${imageProgress.total}`}
              </span>
              <span>{imageProgress.phase === 'finalizing' ? '' : `${progressPercent}%`}</span>
            </div>
            <progress
              aria-label="图片导入进度"
              max={imageProgress.total || 1}
              value={imageProgress.processed}
            />
            {imageProgress.missing > 0 && (
              <p>
                已复制 {imageProgress.imported} 张，缺失 {imageProgress.missing} 张
              </p>
            )}
          </div>
        )}

        {imageStatus.missingSamples.length > 0 && (
          <details className="settings__missing">
            <summary>缺失路径</summary>
            <ul>
              {imageStatus.missingSamples.map((path) => (
                <li key={path}>
                  <code>{path}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
        {imageStatus.error && (
          <p className="settings__error" role="alert">
            <Icon name="alert" size={14} />
            <span>{imageStatus.error}</span>
          </p>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

export default Settings
