import { getCardDatabase } from './db'
import { getCardImageUrl } from './image-library'
import type {
  CardAbilityInfo,
  CardCommodityInfo,
  CardDetail,
  CardFeatureInfo,
  CardFilterOptions,
  CardFilters,
  CardListQuery,
  CardListResult,
  CardMergeMode,
  CardSkillInfo,
  CardSummary,
  CollectionOption,
  DictOption
} from '../shared/card-query'

export const DEFAULT_PAGE_SIZE = 48
export const MAX_PAGE_SIZE = 100

interface DictRow {
  dict_code: string
  dict_value: string
}

interface CollectionRow {
  id: number
  name: string
  series: string | null
  series_text: string | null
  sales_date: string
}

interface CardSummaryRow {
  collection_id: number
  id: number
  name: string
  collection_name: string
  series_text: string | null
  collection_number: string
  card_type: string
  card_type_text: string
  rarity_text: string
  regulation_mark_text: string | null
  hp: number | null
  attribute_text: string | null
  evolve_text: string | null
  trainer_type_text: string | null
  energy_type_text: string | null
  image: string
}

interface CardDetailRow extends CardSummaryRow {
  yoren_code: string
  pokedex_code: string | null
  pokedex_text: string | null
  pokemon_category: string | null
  height: number | null
  weight: number | null
  rule_text: string | null
  pokemon_type: string | null
  special_card: string | null
  weakness_type: string | null
  weakness_formula: string | null
  resistance_type: string | null
  resistance_formula: string | null
  retreat_cost: number | null
}

const SUMMARY_COLUMNS = `
  c.collection_id,
  c.id,
  c.name,
  col.name AS collection_name,
  col.series_text,
  c.collection_number,
  c.card_type,
  c.card_type_text,
  c.rarity_text,
  c.regulation_mark_text,
  c.hp,
  attr.dict_value AS attribute_text,
  c.evolve_text,
  c.trainer_type_text,
  c.energy_type_text,
  c.image
`

const FROM_JOIN = `
  FROM ptcg_card c
  INNER JOIN ptcg_collection col ON col.id = c.collection_id
  LEFT JOIN ptcg_dict attr
    ON attr.type_code = 'attribute' AND attr.dict_code = c.attribute
`

/**
 * 相同卡牌签名：玩法字段 + 招式/特性/技能文本。
 * 不使用 name_same_pokemon_id（同名但 HP/招式可能不同，如不同的皮卡丘）。
 * 也不纳入 special_shiny_type（C / C★ 等印刷差）。
 */
const CARD_SIGNATURE_CTE = `
ability_sig AS (
  SELECT
    collection_id,
    card_id,
    group_concat(
      ability_name || char(31) || ifnull(ability_text, '') || char(31) || ifnull(ability_cost, '') || char(31) || ifnull(ability_damage, ''),
      char(30) ORDER BY ability_name
    ) AS sig
  FROM ptcg_card_ability
  GROUP BY collection_id, card_id
),
feature_sig AS (
  SELECT
    collection_id,
    card_id,
    group_concat(
      feature_name || char(31) || feature_desc,
      char(30) ORDER BY feature_name
    ) AS sig
  FROM ptcg_card_feature
  GROUP BY collection_id, card_id
),
skill_sig AS (
  SELECT
    collection_id,
    card_id,
    group_concat(
      name || char(31) || description || char(31) || ifnull(cost, '') || char(31) || ifnull(damage, ''),
      char(30) ORDER BY name
    ) AS sig
  FROM ptcg_card_skill
  GROUP BY collection_id, card_id
)
`

const MERGE_FROM_JOIN = `
  ${FROM_JOIN}
  LEFT JOIN ability_sig ab
    ON ab.collection_id = c.collection_id AND ab.card_id = c.id
  LEFT JOIN feature_sig ft
    ON ft.collection_id = c.collection_id AND ft.card_id = c.id
  LEFT JOIN skill_sig sk
    ON sk.collection_id = c.collection_id AND sk.card_id = c.id
  LEFT JOIN ptcg_dict rarity_dict
    ON rarity_dict.type_code = 'rarity' AND rarity_dict.dict_code = c.rarity
`

const IDENTITY_COLUMNS = `
  c.name AS ident_name,
  c.card_type AS ident_card_type,
  ifnull(c.hp, -1) AS ident_hp,
  ifnull(c.attribute, '') AS ident_attribute,
  ifnull(c.evolve_text, '') AS ident_evolve,
  ifnull(c.pokemon_type, '') AS ident_pokemon_type,
  ifnull(c.rule_text, '') AS ident_rule_text,
  ifnull(c.trainer_type, '') AS ident_trainer_type,
  ifnull(c.energy_type, '') AS ident_energy_type,
  ifnull(c.weakness_type, '') AS ident_weakness_type,
  ifnull(c.weakness_formula, '') AS ident_weakness_formula,
  ifnull(c.resistance_type, '') AS ident_resistance_type,
  ifnull(c.resistance_formula, '') AS ident_resistance_formula,
  ifnull(c.retreat_cost, -1) AS ident_retreat_cost,
  ifnull(c.special_card, '') AS ident_special_card,
  ifnull(c.pokemon_category, '') AS ident_pokemon_category,
  ifnull(ab.sig, '') AS ident_abilities,
  ifnull(ft.sig, '') AS ident_features,
  ifnull(sk.sig, '') AS ident_skills
`

const IDENTITY_PARTITION = `
  ident_name, ident_card_type, ident_hp, ident_attribute, ident_evolve,
  ident_pokemon_type, ident_rule_text, ident_trainer_type, ident_energy_type,
  ident_weakness_type, ident_weakness_formula, ident_resistance_type,
  ident_resistance_formula, ident_retreat_cost, ident_special_card,
  ident_pokemon_category, ident_abilities, ident_features, ident_skills
`

// 稀有度主序用 ptcg_dict.dict_sort；字典没有的 22=ACE、96=空白回退到数字编码。
// 同一编码下再比较 rarity_text 后缀：无 < ★ < ★★ < ★★★ < ◇ < ✦ < ✧。
const RARITY_SORT_SQL = `coalesce(rarity_dict.dict_sort, cast(c.rarity AS INTEGER), 1000)`

const RARITY_SUFFIX_SQL = `
  CASE
    WHEN c.rarity_text GLOB '*✦✦✦' THEN 23
    WHEN c.rarity_text GLOB '*✦✦' THEN 22
    WHEN c.rarity_text GLOB '*✦' THEN 21
    WHEN c.rarity_text GLOB '*✧' THEN 31
    WHEN c.rarity_text GLOB '*◇◇◇' THEN 13
    WHEN c.rarity_text GLOB '*◇◇' THEN 12
    WHEN c.rarity_text GLOB '*◇' THEN 11
    WHEN c.rarity_text GLOB '*★★★' THEN 3
    WHEN c.rarity_text GLOB '*★★' THEN 2
    WHEN c.rarity_text GLOB '*★' THEN 1
    ELSE 0
  END
`

export function getFilterOptions(): CardFilterOptions {
  const db = getCardDatabase()

  const loadDict = (typeCode: string): DictOption[] => {
    const rows = db
      .prepare(
        `SELECT dict_code, dict_value
         FROM ptcg_dict
         WHERE type_code = ?
         ORDER BY dict_sort, dict_code`
      )
      .all(typeCode) as DictRow[]
    return rows.map((row) => ({ code: row.dict_code, label: row.dict_value }))
  }

  const collections = db
    .prepare(
      `SELECT id, name, series, series_text, sales_date
       FROM ptcg_collection
       ORDER BY sales_date DESC, id DESC`
    )
    .all() as CollectionRow[]

  return {
    series: loadDict('series'),
    categories: buildCategoryOptions(loadDict),
    attributes: loadDict('attribute'),
    weaknessTypes: [{ code: 'none', label: '无弱点' }, ...loadDict('weakness_type')],
    evolutions: buildEvolutionOptions(db, loadDict),
    pokemonTypes: loadDict('pokemon_type'),
    rarities: loadDict('rarity'),
    regulationMarks: loadDict('regulation_mark'),
    collections: collections.map((row): CollectionOption => ({
      id: row.id,
      name: row.name,
      series: row.series,
      seriesText: row.series_text,
      salesDate: row.sales_date
    }))
  }
}

export function searchCards(query: CardListQuery): CardListResult {
  const db = getCardDatabase()
  const { filters, offset, limit } = sanitizeQuery(query)
  const { clause, params } = buildFilterClause(filters)

  if (filters.merge) {
    return searchMergedCards(db, filters.merge, clause, params, offset, limit)
  }

  const totalRow = db.prepare(`SELECT COUNT(*) AS total ${FROM_JOIN} ${clause}`).get(...params) as {
    total: number
  }

  const items = db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS}
       ${FROM_JOIN}
       ${clause}
       ORDER BY col.sales_date DESC, c.collection_id DESC, c.collection_number ASC, c.id ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as CardSummaryRow[]

  return {
    total: totalRow.total,
    offset,
    limit,
    items: items.map(toSummary)
  }
}

function searchMergedCards(
  db: ReturnType<typeof getCardDatabase>,
  merge: CardMergeMode,
  clause: string,
  params: unknown[],
  offset: number,
  limit: number
): CardListResult {
  const direction = merge === 'highest' ? 'DESC' : 'ASC'
  const rankedCte = `
    WITH ${CARD_SIGNATURE_CTE},
    filtered AS (
      SELECT
        ${SUMMARY_COLUMNS},
        ${IDENTITY_COLUMNS},
        ${RARITY_SORT_SQL} AS rarity_sort,
        ${RARITY_SUFFIX_SQL} AS rarity_suffix,
        col.sales_date AS sales_date
      ${MERGE_FROM_JOIN}
      ${clause}
    ),
    ranked AS (
      SELECT *
      FROM (
        SELECT
          filtered.*,
          row_number() OVER (
            PARTITION BY ${IDENTITY_PARTITION}
            ORDER BY
              rarity_sort ${direction},
              rarity_suffix ${direction},
              sales_date DESC,
              collection_id DESC,
              collection_number ASC,
              id ASC
          ) AS rn
        FROM filtered
      )
      WHERE rn = 1
    )
  `

  const totalRow = db
    .prepare(`${rankedCte} SELECT COUNT(*) AS total FROM ranked`)
    .get(...params) as {
    total: number
  }

  const items = db
    .prepare(
      `${rankedCte}
       SELECT
         collection_id,
         id,
         name,
         collection_name,
         series_text,
         collection_number,
         card_type,
         card_type_text,
         rarity_text,
         regulation_mark_text,
         hp,
         attribute_text,
         evolve_text,
         trainer_type_text,
         energy_type_text,
         image
       FROM ranked
       ORDER BY sales_date DESC, collection_id DESC, collection_number ASC, id ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as CardSummaryRow[]

  return {
    total: totalRow.total,
    offset,
    limit,
    items: items.map(toSummary)
  }
}

export function getCardDetail(collectionId: number, cardId: number): CardDetail | null {
  if (!Number.isInteger(collectionId) || !Number.isInteger(cardId)) return null

  const db = getCardDatabase()
  const row = db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS},
              c.yoren_code,
              c.pokedex_code,
              c.pokedex_text,
              c.pokemon_category,
              c.height,
              c.weight,
              c.rule_text,
              c.pokemon_type,
              c.special_card,
              c.weakness_type,
              c.weakness_formula,
              c.resistance_type,
              c.resistance_formula,
              c.retreat_cost
       ${FROM_JOIN}
       WHERE c.collection_id = ? AND c.id = ?`
    )
    .get(collectionId, cardId) as CardDetailRow | undefined

  if (!row) return null

  const costMap = loadDictMap(db, 'ability_cost')
  const attrMap = loadDictMap(db, 'attribute')
  const pokemonTypeMap = loadDictMap(db, 'pokemon_type')
  const specialMap = loadDictMap(db, 'special_card')

  const features = (
    db
      .prepare(
        `SELECT feature_name, feature_desc
         FROM ptcg_card_feature
         WHERE collection_id = ? AND card_id = ?
         ORDER BY feature_name`
      )
      .all(collectionId, cardId) as { feature_name: string; feature_desc: string }[]
  ).map((item): CardFeatureInfo => ({
    name: item.feature_name,
    description: item.feature_desc
  }))

  const abilities = (
    db
      .prepare(
        `SELECT ability_name, ability_text, ability_cost, ability_damage
         FROM ptcg_card_ability
         WHERE collection_id = ? AND card_id = ?
         ORDER BY ability_name`
      )
      .all(collectionId, cardId) as {
      ability_name: string
      ability_text: string
      ability_cost: string | null
      ability_damage: string
    }[]
  ).map((item): CardAbilityInfo => ({
    name: item.ability_name,
    text: blankToNull(item.ability_text),
    cost: resolveCodes(costMap, item.ability_cost, ','),
    damage: blankToNull(item.ability_damage)
  }))

  const skills = (
    db
      .prepare(
        `SELECT name, description, cost, damage, related, type
         FROM ptcg_card_skill
         WHERE collection_id = ? AND card_id = ?
         ORDER BY name`
      )
      .all(collectionId, cardId) as {
      name: string
      description: string
      cost: string | null
      damage: string | null
      related: string
      type: string
    }[]
  ).map((item): CardSkillInfo => ({
    name: item.name,
    description: item.description,
    cost: resolveCodes(costMap, item.cost, ','),
    damage: blankToNull(item.damage),
    related: item.related,
    type: item.type
  }))

  const illustrators = (
    db
      .prepare(
        `SELECT illustrator_name
         FROM ptcg_card_illustrator
         WHERE collection_id = ? AND card_id = ?
         ORDER BY illustrator_name`
      )
      .all(collectionId, cardId) as { illustrator_name: string }[]
  ).map((item) => item.illustrator_name)

  const commodities = (
    db
      .prepare(
        `SELECT commodity_name, commodity_code
         FROM ptcg_card_commodity
         WHERE collection_id = ? AND card_id = ?
         ORDER BY commodity_name`
      )
      .all(collectionId, cardId) as { commodity_name: string; commodity_code: string }[]
  ).map((item): CardCommodityInfo => ({
    name: item.commodity_name,
    code: item.commodity_code
  }))

  return {
    ...toSummary(row),
    yorenCode: row.yoren_code,
    pokedexCode: blankToNull(row.pokedex_code),
    pokedexText: blankToNull(row.pokedex_text),
    pokemonCategory: blankToNull(row.pokemon_category),
    height: row.height,
    weight: row.weight,
    ruleText: blankToNull(row.rule_text),
    pokemonTypeLabels: resolveCodes(pokemonTypeMap, row.pokemon_type, '|'),
    specialCardLabels: resolveCodes(specialMap, row.special_card, ','),
    weaknessTypeText: resolveOne(attrMap, row.weakness_type),
    weaknessFormula: blankToNull(row.weakness_formula),
    resistanceTypeText: resolveOne(attrMap, row.resistance_type),
    resistanceFormula: blankToNull(row.resistance_formula),
    retreatCost: row.retreat_cost,
    illustrators,
    features,
    abilities,
    skills,
    commodities
  }
}

export function sanitizeQuery(input: unknown): CardListQuery {
  const raw = isRecord(input) ? input : {}
  const filters = isRecord(raw.filters) ? raw.filters : {}
  return {
    offset: clampInt(raw.offset, 0, 1_000_000, 0),
    limit: clampInt(raw.limit, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
    filters: {
      keyword: optString(filters.keyword, 80),
      series: optString(filters.series, 16),
      collectionId: optInt(filters.collectionId),
      category: optCategory(filters.category),
      attribute: optString(filters.attribute, 16),
      weaknessType: optWeaknessType(filters.weaknessType),
      evolution: optEvolution(filters.evolution),
      pokemonType: optString(filters.pokemonType, 16),
      rarity: optString(filters.rarity, 16),
      regulationMark: optString(filters.regulationMark, 16),
      merge: optMerge(filters.merge)
    }
  }
}

function buildCategoryOptions(loadDict: (typeCode: string) => DictOption[]): DictOption[] {
  const options: DictOption[] = []
  for (const item of loadDict('card_type')) {
    options.push({ code: `card:${item.code}`, label: item.label })
    if (item.code === '2') {
      for (const trainer of loadDict('trainer_type')) {
        if (!trainer.label.trim()) continue
        options.push({ code: `trainer:${trainer.code}`, label: trainer.label })
      }
    }
    if (item.code === '3') {
      for (const energy of loadDict('energy_type')) {
        options.push({ code: `energy:${energy.code}`, label: energy.label })
      }
    }
  }
  return options
}

function buildEvolutionOptions(
  db: ReturnType<typeof getCardDatabase>,
  loadDict: (typeCode: string) => DictOption[]
): DictOption[] {
  const options: DictOption[] = [
    { code: 'basic', label: '未进化' },
    { code: 'evolved', label: '已进化' }
  ]
  const seen = new Set(['基础'])
  for (const item of loadDict('evolve')) {
    if (seen.has(item.label)) continue
    seen.add(item.label)
    options.push({ code: `text:${item.label}`, label: item.label })
  }
  const extras = db
    .prepare(
      `SELECT DISTINCT evolve_text AS label
       FROM ptcg_card
       WHERE evolve_text IS NOT NULL AND evolve_text != ''
       ORDER BY evolve_text`
    )
    .all() as { label: string }[]
  for (const item of extras) {
    if (seen.has(item.label)) continue
    seen.add(item.label)
    options.push({ code: `text:${item.label}`, label: item.label })
  }
  return options
}

function applyCategoryFilter(category: string, where: string[], params: unknown[]): void {
  const [kind, code] = category.split(':')
  if (kind === 'card') {
    where.push('c.card_type = ?')
    params.push(code)
    return
  }
  if (kind === 'trainer') {
    where.push('c.trainer_type = ?')
    params.push(code)
    return
  }
  if (kind === 'energy') {
    where.push('c.energy_type = ?')
    params.push(code)
  }
}

function applyEvolutionFilter(evolution: string, where: string[], params: unknown[]): void {
  if (evolution === 'basic') {
    where.push(`c.evolve_text = '基础'`)
    return
  }
  if (evolution === 'evolved') {
    where.push(`c.evolve_text IS NOT NULL AND c.evolve_text != '' AND c.evolve_text != '基础'`)
    return
  }
  if (evolution.startsWith('text:')) {
    where.push('c.evolve_text = ?')
    params.push(evolution.slice('text:'.length))
  }
}

function optCategory(value: unknown): string | undefined {
  const raw = optString(value, 24)
  if (!raw) return undefined
  return /^(card|trainer|energy):[A-Za-z0-9]+$/.test(raw) ? raw : undefined
}

function optWeaknessType(value: unknown): string | undefined {
  const raw = optString(value, 16)
  if (!raw) return undefined
  if (raw === 'none' || /^\d+$/.test(raw)) return raw
  return undefined
}

function optEvolution(value: unknown): string | undefined {
  const raw = optString(value, 32)
  if (!raw) return undefined
  if (raw === 'basic' || raw === 'evolved') return raw
  if (raw.startsWith('text:') && raw.length > 5) return raw
  return undefined
}

function buildFilterClause(filters: CardFilters): { clause: string; params: unknown[] } {
  const where: string[] = []
  const params: unknown[] = []

  if (filters.keyword) {
    const pattern = `%${escapeLike(filters.keyword)}%`
    where.push(
      `(c.name LIKE ? ESCAPE '\\' OR c.collection_number LIKE ? ESCAPE '\\' OR col.name LIKE ? ESCAPE '\\')`
    )
    params.push(pattern, pattern, pattern)
  }
  if (filters.series) {
    where.push('col.series = ?')
    params.push(filters.series)
  }
  if (filters.collectionId != null) {
    where.push('c.collection_id = ?')
    params.push(filters.collectionId)
  }
  if (filters.category) {
    applyCategoryFilter(filters.category, where, params)
  }
  if (filters.attribute) {
    where.push('c.attribute = ?')
    params.push(filters.attribute)
  }
  if (filters.weaknessType) {
    if (filters.weaknessType === 'none') {
      where.push(`(c.weakness_type IS NULL OR c.weakness_type = '')`)
    } else {
      where.push('c.weakness_type = ?')
      params.push(filters.weaknessType)
    }
  }
  if (filters.evolution) {
    applyEvolutionFilter(filters.evolution, where, params)
  }
  if (filters.pokemonType) {
    // pokemon_type 使用 | 连接多个编码，例如 1|2
    where.push(`instr('|' || IFNULL(c.pokemon_type, '') || '|', '|' || ? || '|') > 0`)
    params.push(filters.pokemonType)
  }
  if (filters.rarity) {
    where.push('c.rarity = ?')
    params.push(filters.rarity)
  }
  if (filters.regulationMark) {
    where.push('c.regulation_mark = ?')
    params.push(filters.regulationMark)
  }

  return {
    clause: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
    params
  }
}

function toSummary(row: CardSummaryRow): CardSummary {
  return {
    collectionId: row.collection_id,
    id: row.id,
    name: row.name,
    collectionName: row.collection_name,
    seriesText: row.series_text,
    collectionNumber: row.collection_number,
    cardType: row.card_type,
    cardTypeText: row.card_type_text,
    rarityText: row.rarity_text,
    regulationMarkText: row.regulation_mark_text,
    hp: row.hp,
    attributeText: row.attribute_text,
    evolveText: row.evolve_text,
    trainerTypeText: row.trainer_type_text,
    energyTypeText: row.energy_type_text,
    imageUrl: getCardImageUrl(row.image)
  }
}

function loadDictMap(
  db: ReturnType<typeof getCardDatabase>,
  typeCode: string
): Map<string, string> {
  const rows = db
    .prepare(`SELECT dict_code, dict_value FROM ptcg_dict WHERE type_code = ?`)
    .all(typeCode) as DictRow[]
  return new Map(rows.map((row) => [row.dict_code, row.dict_value]))
}

function resolveCodes(map: Map<string, string>, raw: string | null, separator: string): string[] {
  if (!raw) return []
  return raw
    .split(separator)
    .map((code) => code.trim())
    .filter((code) => code.length > 0)
    .map((code) => map.get(code) ?? code)
}

function resolveOne(map: Map<string, string>, code: string | null): string | null {
  if (!code) return null
  return map.get(code) ?? code
}

function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'none') return null
  return trimmed
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  return trimmed.slice(0, maxLength)
}

function optMerge(value: unknown): CardMergeMode | undefined {
  return value === 'lowest' || value === 'highest' ? value : undefined
}

function optInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return undefined
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}
