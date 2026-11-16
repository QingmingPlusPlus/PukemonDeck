import { useEffect } from 'react'
import type { CardDetail } from '../../../shared/card-query'
import CardImage from './CardImage'
import Icon from './Icon'

interface CardDetailModalProps {
  detail: CardDetail | null
  loading: boolean
  error: string | null
  onClose: () => void
}

function CardDetailModal({
  detail,
  loading,
  error,
  onClose
}: CardDetailModalProps): React.JSX.Element {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="card-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        className="card-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
      >
        <button
          className="card-modal__close"
          type="button"
          onClick={onClose}
          aria-label="关闭"
          title="关闭"
        >
          <Icon name="close" size={18} />
        </button>
        {loading && !detail && (
          <div className="card-modal__status">
            <span className="spinner" />
            <span className="sr-only">正在加载卡牌详情</span>
          </div>
        )}
        {error && !detail && (
          <p className="card-modal__error">
            <Icon name="alert" size={18} />
            <span>{error}</span>
          </p>
        )}
        {detail && <CardDetailBody detail={detail} />}
      </div>
    </div>
  )
}

function CardDetailBody({ detail }: { detail: CardDetail }): React.JSX.Element {
  const typeLine = [
    detail.cardTypeText,
    detail.attributeText,
    detail.evolveText,
    detail.trainerTypeText,
    detail.energyTypeText,
    ...detail.pokemonTypeLabels,
    ...detail.specialCardLabels
  ].filter(Boolean)

  return (
    <div className="card-modal__body">
      <div className="card-modal__layout">
        <div className="card-modal__visual">
          <CardImage
            src={detail.imageUrl}
            alt={detail.name}
            className="card-modal__image"
            eager
            fallback={
              <div className="card-modal__image-placeholder">
                <Icon name="image" size={28} />
                <span className="sr-only">暂无卡图</span>
              </div>
            }
          />
        </div>
        <div className="card-modal__details">
          <header className="card-modal__header">
            <p className="card-modal__set">
              {detail.collectionName}
              {detail.seriesText ? ` · ${detail.seriesText}` : ''}
            </p>
            <h2 id="card-modal-title" className="card-modal__title">
              {detail.name}
            </h2>
            <p className="card-modal__meta">
              <span className="chip">{detail.collectionNumber}</span>
              <span className="chip" title="稀有度">
                {detail.rarityText}
              </span>
              {detail.regulationMarkText && (
                <span className="chip" title="规则标记">
                  {detail.regulationMarkText}
                </span>
              )}
              {detail.hp != null && <span className="chip chip--accent">HP {detail.hp}</span>}
            </p>
            {typeLine.length > 0 && <p className="card-modal__types">{typeLine.join(' / ')}</p>}
          </header>

          {detail.ruleText && (
            <section className="card-modal__section">
              <h3>规则</h3>
              <p>{detail.ruleText}</p>
            </section>
          )}

          {detail.features.length > 0 && (
            <section className="card-modal__section">
              <h3>特性</h3>
              {detail.features.map((feature) => (
                <article key={feature.name} className="card-modal__move">
                  <h4>{feature.name}</h4>
                  <p>{feature.description}</p>
                </article>
              ))}
            </section>
          )}

          {detail.abilities.length > 0 && (
            <section className="card-modal__section">
              <h3>招式</h3>
              {detail.abilities.map((ability) => (
                <article key={ability.name} className="card-modal__move">
                  <div className="card-modal__move-head">
                    <h4>{ability.name}</h4>
                    {ability.cost.length > 0 && (
                      <span className="chip chip--muted">{ability.cost.join(' ')}</span>
                    )}
                    {ability.damage && <span className="card-modal__damage">{ability.damage}</span>}
                  </div>
                  {ability.text && <p>{ability.text}</p>}
                </article>
              ))}
            </section>
          )}

          {detail.skills.length > 0 && (
            <section className="card-modal__section">
              <h3>技能</h3>
              {detail.skills.map((skill) => (
                <article key={skill.name} className="card-modal__move">
                  <div className="card-modal__move-head">
                    <h4>{skill.name}</h4>
                    {skill.related && <span className="chip chip--muted">{skill.related}</span>}
                    {skill.cost.length > 0 && (
                      <span className="chip chip--muted">{skill.cost.join(' ')}</span>
                    )}
                    {skill.damage && <span className="card-modal__damage">{skill.damage}</span>}
                  </div>
                  <p>{skill.description}</p>
                </article>
              ))}
            </section>
          )}

          {(detail.weaknessTypeText ||
            detail.resistanceTypeText ||
            detail.retreatCost != null ||
            detail.pokedexText ||
            detail.pokemonCategory) && (
            <section className="card-modal__section">
              <h3>卡牌信息</h3>
              <dl className="card-modal__facts">
                {detail.weaknessTypeText && (
                  <>
                    <dt>弱点</dt>
                    <dd>
                      {detail.weaknessTypeText}
                      {detail.weaknessFormula ? ` ${detail.weaknessFormula}` : ''}
                    </dd>
                  </>
                )}
                {detail.resistanceTypeText && (
                  <>
                    <dt>抵抗力</dt>
                    <dd>
                      {detail.resistanceTypeText}
                      {detail.resistanceFormula ? ` ${detail.resistanceFormula}` : ''}
                    </dd>
                  </>
                )}
                {detail.retreatCost != null && (
                  <>
                    <dt>撤退</dt>
                    <dd>{detail.retreatCost}</dd>
                  </>
                )}
                {detail.pokemonCategory && (
                  <>
                    <dt>分类</dt>
                    <dd>{detail.pokemonCategory}</dd>
                  </>
                )}
                {detail.pokedexCode && (
                  <>
                    <dt>图鉴编号</dt>
                    <dd>{detail.pokedexCode}</dd>
                  </>
                )}
                {detail.yorenCode && (
                  <>
                    <dt>关联编码</dt>
                    <dd>{detail.yorenCode}</dd>
                  </>
                )}
                {detail.height != null && (
                  <>
                    <dt>身高</dt>
                    <dd>{detail.height} m</dd>
                  </>
                )}
                {detail.weight != null && (
                  <>
                    <dt>体重</dt>
                    <dd>{detail.weight} kg</dd>
                  </>
                )}
              </dl>
              {detail.pokedexText && <p className="card-modal__pokedex">{detail.pokedexText}</p>}
            </section>
          )}

          {detail.illustrators.length > 0 && (
            <section className="card-modal__section">
              <h3>画师</h3>
              <p>{detail.illustrators.join('、')}</p>
            </section>
          )}

          {detail.commodities.length > 0 && (
            <section className="card-modal__section">
              <h3>关联商品</h3>
              <ul className="card-modal__commodities">
                {detail.commodities.map((item, index) => (
                  <li key={`${item.code}-${index}`}>
                    {item.name}
                    <code>{item.code}</code>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default CardDetailModal
