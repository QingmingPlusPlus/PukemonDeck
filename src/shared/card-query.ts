/**
 * 卡牌检索 / 详情的共用类型。
 * 列表只返回摘要字段；详情再按需加载关联表。
 */

export interface CardFilters {
  /** 名称、收集编号或卡包名的模糊搜索 */
  keyword?: string
  /** 系列编码，对应 ptcg_collection.series / ptcg_dict.series */
  series?: string
  /** 卡包（商品）ID */
  collectionId?: number
  /** 卡牌类型编码：1 宝可梦 / 2 训练家 / 3 能量 */
  cardType?: string
  /** 宝可梦属性编码（草、火、水等） */
  attribute?: string
  /** 宝可梦种类编码（V、ex、VMAX 等，源字段可多值） */
  pokemonType?: string
  /** 稀有度编码 */
  rarity?: string
  /** 规则标记编码 */
  regulationMark?: string
}

export interface CardListQuery {
  filters: CardFilters
  offset: number
  limit: number
}

export interface CardSummary {
  collectionId: number
  id: number
  name: string
  collectionName: string
  seriesText: string | null
  collectionNumber: string
  cardType: string
  cardTypeText: string
  rarityText: string
  regulationMarkText: string | null
  hp: number | null
  attributeText: string | null
  evolveText: string | null
  trainerTypeText: string | null
  energyTypeText: string | null
}

export interface CardListResult {
  total: number
  offset: number
  limit: number
  items: CardSummary[]
}

export interface DictOption {
  code: string
  label: string
}

export interface CollectionOption {
  id: number
  name: string
  series: string | null
  seriesText: string | null
  salesDate: string
}

export interface CardFilterOptions {
  series: DictOption[]
  cardTypes: DictOption[]
  attributes: DictOption[]
  pokemonTypes: DictOption[]
  rarities: DictOption[]
  regulationMarks: DictOption[]
  collections: CollectionOption[]
}

export interface CardAbilityInfo {
  name: string
  text: string | null
  /** 已解析为中文标签的费用，例如 ['火', '无色'] */
  cost: string[]
  damage: string | null
}

export interface CardFeatureInfo {
  name: string
  description: string
}

export interface CardSkillInfo {
  name: string
  description: string
  cost: string[]
  damage: string | null
  related: string
  type: string
}

export interface CardCommodityInfo {
  name: string
  code: string
}

export interface CardDetail extends CardSummary {
  yorenCode: string
  pokedexCode: string | null
  pokedexText: string | null
  pokemonCategory: string | null
  height: number | null
  weight: number | null
  ruleText: string | null
  pokemonTypeLabels: string[]
  specialCardLabels: string[]
  weaknessTypeText: string | null
  weaknessFormula: string | null
  resistanceTypeText: string | null
  resistanceFormula: string | null
  retreatCost: number | null
  illustrators: string[]
  features: CardFeatureInfo[]
  abilities: CardAbilityInfo[]
  skills: CardSkillInfo[]
  commodities: CardCommodityInfo[]
}
