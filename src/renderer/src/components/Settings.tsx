import type { CardDatabaseStatus } from '../../../shared/card-db'

interface SettingsProps {
  status: CardDatabaseStatus
  importing: boolean
  onImport: () => void
}

function Settings({ status, importing, onImport }: SettingsProps): React.JSX.Element {
  const sourceText =
    status.source === 'imported'
      ? '用户导入'
      : status.source === 'bundled'
        ? '开发/外部数据'
        : '未知'

  return (
    <section className="settings">
      <header className="settings__header">
        <h1>设置</h1>
        <p>查看当前牌库数据，或导入新的 SQLite 数据库。</p>
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
            {importing ? '正在导入…' : '选择并导入 DB'}
          </button>
          <p>支持 .db / .sqlite 文件，导入前会校验数据库格式和核心数据表。</p>
        </div>

        {status.error && <p className="settings__error">错误信息：{status.error}</p>}
      </div>
    </section>
  )
}

export default Settings
