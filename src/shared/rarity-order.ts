/**
 * 简中版 PTCG 稀有度顺序（低 → 高），供「合并相同卡牌」取最低/最高稀有度，
 * 以及稀有度筛选下拉的排序。这是唯一的顺序定义处。
 *
 * 设计：
 * - 先比「稀有度档」（印刷符号 / 官方稀有度类别），再比同一档内的工艺后缀。
 * - C★ / C★★、无标记★ / 无标记★★ 等是同一稀有度的闪卡工艺，不是更高一档。
 *   官方对应：平卡 < 精灵球纹样 < 大师球纹样（大师球更难抽）。
 * - ptcg_dict.dict_sort 不能直接用：无标记被排在 SSR 之后（10），且缺少 ACE、RGB。
 *
 * 依据（官方与百科）：
 * - 稀有度名称与补充包结构：https://wiki.52poke.com/wiki/稀有度（TCG）
 * - 闪卡工艺：https://wiki.52poke.com/wiki/闪卡（TCG）
 * - 简中补充包 C/U/R 随机闪卡：https://www.pokemon.cn/tcg/product/16377.html
 * - 收集啦151 精灵球 / 大师球纹样：https://special.pokemon.cn/151/
 * - 嗨皮包封入（49 平卡 / 49 精灵球 10.5% / 49 大师球 1.05%）：
 *   https://www.pokemon.cn/tcg/product/23939.html
 * - 嗨皮组合 平卡卡组 vs 闪卡卡组（约 1.6%）：https://www.pokemon.cn/tcg/product/22630.html
 * - 宝石包五种标记与封入（每包 4 张：3 张 ● 或 ◆，1 张 ★ / ★★ / ★★★）：
 *   https://www.pokemon.cn/tcg/product/15582.html
 *   https://www.pokemon.cn/tcg/product/15518.html
 *
 * 与 data/deck.db 对照：
 * - 嗨皮包（集合 529）恰好 49 无标记 + 49 无标记★ + 49 无标记★★，对应官方平卡 / 精灵球 / 大师球。
 * - 收集啦151、各补充包的 C/U/R 普遍带 C★ / C★★，且 C★★ 数量明显少于 C★，与大师球更稀缺一致。
 * - 宝石包每种宝可梦 7 种印刷：●×2、◆×2、★、★★、★★★（编号 01/07–07/07）。
 * - A：璀璨反击 / 浓墨重彩中的传说、幻之宝可梦，对应 Amazing Rare（奇幻稀有）。
 * - FUR：30周年庆典仅 超梦ex、梦幻ex，对应 Futuristic Rare。
 * - 编码 96、rarity_text 为空格：30周年庆典梦幻，编号 B/RGB、G/RGB、R/RGB，为 RGB 稀有。
 *
 * 尚不确定、已做实用约定：
 * - 无标记✦ / ✦✦ / ✦✦✦ / ✧ / ◇ / ◇◇ / ◇◇◇ 未见官方工艺名。主要出现在嗨皮组合训练家卡上，
 *   按库内数量与 special_shiny_type（0–9）从常见到稀少排列。
 * - 宝石包 ★★、★★★ 与补充包 RR / HR 的精确对应未公布（★/★★/★★★ 同属每包 1 张的稀有槽）；
 *   按五级标记梯子把 ★ 与 R、★★ 与 RR 同档，★★★ 单独放在 HR 与 FUR 之间。
 */

import type { DictOption } from './card-query'

/** 同一档内编码从左到右仅影响下拉排列；合并时档位相同，再比工艺后缀。 */
export const RARITY_CLASS_GROUPS: readonly {
  codes: readonly string[]
  remark: string
}[] = [
  {
    codes: ['1', '17', '10'],
    remark: '常见档：C、宝石包 ●、无印刷标记（起始卡组 / 特典 / 嗨皮平卡）'
  },
  {
    codes: ['2', '18'],
    remark: '不常见档：U、宝石包 ◆（与 ● 同属每包 3 张的常见槽，◆ 略高）'
  },
  {
    codes: ['3', '19'],
    remark: '稀有档：R、宝石包 ★（进入每包 1 张的稀有槽）'
  },
  {
    codes: ['4'],
    remark: 'PR 棱镜之星（SM 特殊机制，介于 R 与 RR）'
  },
  {
    codes: ['5', '20'],
    remark: '双重稀有：RR（ex / V / GX），宝石包 ★★ 为稀有槽中档'
  },
  {
    codes: ['6'],
    remark: 'RRR 三重稀有（VMAX / VSTAR）'
  },
  {
    codes: ['16'],
    remark: 'K 光辉宝可梦（Radiant）'
  },
  {
    codes: ['12'],
    remark: 'A 奇幻稀有（Amazing Rare）'
  },
  {
    codes: ['7'],
    remark: 'S 异色稀有'
  },
  {
    codes: ['14'],
    remark: 'AR 宝可梦艺术插画闪卡'
  },
  {
    codes: ['11'],
    remark: 'CHR 训练家特别插画闪卡'
  },
  {
    codes: ['22'],
    remark: 'ACE SPEC（一副限制 1 张；字典缺此编码）'
  },
  {
    codes: ['8'],
    remark: 'SR 非常稀有'
  },
  {
    codes: ['13'],
    remark: 'CSR 角色非常稀有'
  },
  {
    codes: ['15'],
    remark: 'SAR 特殊艺术稀有'
  },
  {
    codes: ['9'],
    remark: 'SSR 异色非常稀有'
  },
  {
    codes: ['98'],
    remark: 'HR 超级稀有（金卡）'
  },
  {
    codes: ['21'],
    remark: '宝石包 ★★★，该商品最高档，对标金卡但官方未给分项概率'
  },
  {
    codes: ['97'],
    remark: 'FUR 未来主义稀有（30周年庆典仅 2 张）'
  },
  {
    codes: ['99'],
    remark: 'UR 极其稀有'
  },
  {
    codes: ['96'],
    remark: 'RGB 稀有：30周年庆典梦幻（编号 */RGB；字典缺此编码）'
  }
]

/**
 * 同一稀有度档内的工艺后缀，低 → 高。
 * 平卡 < 精灵球纹样★ < 大师球纹样★★；其余符号依 special_shiny_type 与库内数量。
 * 最长匹配优先（★★★ 不能当成 ★）。
 */
export const RARITY_SUFFIX_RANKS: readonly { suffix: string; rank: number }[] = [
  { suffix: '★★★', rank: 3 },
  { suffix: '★★', rank: 2 },
  { suffix: '★', rank: 1 },
  { suffix: '✦✦✦', rank: 5 },
  { suffix: '✦✦', rank: 4 },
  { suffix: '✦', rank: 3 },
  { suffix: '✧', rank: 6 },
  { suffix: '◇◇◇', rank: 9 },
  { suffix: '◇◇', rank: 8 },
  { suffix: '◇', rank: 7 }
]

const UNKNOWN_CLASS_RANK = 10000

export const RARITY_CLASS_RANK: Record<string, number> = Object.fromEntries(
  RARITY_CLASS_GROUPS.flatMap((group, index) => group.codes.map((code) => [code, (index + 1) * 10]))
)

/** 字典没有、但库里存在的稀有度，用于筛选下拉。 */
export const EXTRA_RARITY_OPTIONS: readonly DictOption[] = [
  { code: '22', label: 'ACE' },
  { code: '96', label: 'RGB' }
]

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** 合并排序用：稀有度档位 CASE。未知编码落到最后。 */
export function rarityClassRankSql(rarityColumn = 'c.rarity'): string {
  const whens = Object.entries(RARITY_CLASS_RANK)
    .map(([code, rank]) => `WHEN ${rarityColumn} = ${sqlString(code)} THEN ${rank}`)
    .join('\n    ')
  return `CASE\n    ${whens}\n    ELSE ${UNKNOWN_CLASS_RANK}\n  END`
}

/** 合并排序用：rarity_text 工艺后缀 CASE。须最长匹配优先。 */
export function raritySuffixRankSql(textColumn = 'c.rarity_text'): string {
  const whens = RARITY_SUFFIX_RANKS.map(
    ({ suffix, rank }) => `WHEN ${textColumn} GLOB ${sqlString('*' + suffix)} THEN ${rank}`
  ).join('\n    ')
  return `CASE\n    ${whens}\n    ELSE 0\n  END`
}

export function compareRarityCodes(a: string, b: string): number {
  const rankA = RARITY_CLASS_RANK[a] ?? UNKNOWN_CLASS_RANK
  const rankB = RARITY_CLASS_RANK[b] ?? UNKNOWN_CLASS_RANK
  if (rankA !== rankB) {
    return rankA - rankB
  }
  const indexA = RARITY_CLASS_GROUPS.find((group) => group.codes.includes(a))?.codes.indexOf(a) ?? 0
  const indexB = RARITY_CLASS_GROUPS.find((group) => group.codes.includes(b))?.codes.indexOf(b) ?? 0
  return indexA - indexB
}

/** 按本模块顺序排列筛选选项，并补上字典缺失的 ACE、RGB。 */
export function sortRarityOptions(options: DictOption[]): DictOption[] {
  const byCode = new Map(options.map((option) => [option.code, option]))
  for (const extra of EXTRA_RARITY_OPTIONS) {
    if (!byCode.has(extra.code)) {
      byCode.set(extra.code, extra)
    }
  }
  return [...byCode.values()].sort((left, right) => compareRarityCodes(left.code, right.code))
}
