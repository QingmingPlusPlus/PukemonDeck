import type { CardDatabaseStatus } from '../../../shared/card-db'

interface MissingDataProps {
  status: CardDatabaseStatus
  checking: boolean
  onReload: () => void
}

/**
 * 卡牌库缺失或无法打开时展示的提示页。
 * 卡牌库属于外部数据，用户可以补上文件后直接点击重试，无需重启应用。
 */
function MissingData({ status, checking, onReload }: MissingDataProps): React.JSX.Element {
  return (
    <div className="missing-data">
      <h1 className="missing-data__title">缺失卡牌数据</h1>
      <p className="missing-data__desc">未找到可用的卡牌数据库文件，暂时无法加载卡牌内容。</p>
      <p className="missing-data__label">应放置的位置</p>
      <p className="missing-data__path">
        <code>{status.path}</code>
      </p>
      {status.error && <p className="missing-data__error">错误信息：{status.error}</p>}
      <p className="missing-data__hint">
        请将 <code>deck.db</code> 放入上述目录后点击「重新检测」。
        若通过安装包安装，可重新安装应用或向分发者获取卡牌数据文件。
      </p>
      <button className="missing-data__button" type="button" onClick={onReload} disabled={checking}>
        {checking ? '检测中…' : '重新检测'}
      </button>
    </div>
  )
}

export default MissingData
