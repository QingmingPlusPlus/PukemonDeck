// ==========================================
// 环境变量类型
// ==========================================
export interface Env {
  DB: D1Database;
}

// ==========================================
// API 响应类型
// ==========================================
export interface ApiSuccessResponse<T> {
  status: 'success';
  tables: T[];
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==========================================
// 词典表 (dicts)
// ==========================================
export interface Dict {
  id: number;
  raw_id: number;
  typeCode: string;
  dictCode: string;
  dictValue: string;
  dictSort: number;
  status: number;
}

// ==========================================
// 集合表 (collections)
// ==========================================
export interface Collection {
  id: number;
  raw_id: number;
  name: string;
  commodityCode: string;
  salesDate: string;
  series: string | null;
  seriesText: string | null;
  image: string | null;
  cards: string; // JSON string
}

// ==========================================
// 卡片表 (cards)
// ==========================================
export interface Card {
  id: number;
  raw_id: number;
  yorenCode: string;
  cardType: string;
  nameSamePokemonId: number | null;
  details: string; // JSON string
  name: string;
  image: string;
  hash: string;
  pokemonType: string | null;
  energyType: string | null;
  specialCard: string | null;
  // 以下为计算列 (GENERATED ALWAYS AS)
  evolveText: string | null;
  cardName: string | null;
  regulationMarkText: string | null;
  collectionNumber: string | null;
  rarity: string | null;
  rarityText: string | null;
  hp: number | null;
  attribute: string | null;
  cardTypeText: string | null;
  featureFlag: string | null;
  abilityItemList: string | null; // JSON string
  pokemonCategory: string | null;
  weaknessType: string | null;
  weaknessFormula: string | null;
  retreatCost: number | null;
  pokedexCode: string | null;
  pokedexText: string | null;
  height: number | null;
  weight: number | null;
  illustratorName: string | null;
  commodityList: string | null; // JSON string
  collectionFlag: number | null;
  special_shiny_type: number | null;
  cardFeatureItemList: string | null; // JSON string
  ruleText: string | null;
  resistanceType: string | null;
  resistanceFormula: string | null;
  skills: string | null; // JSON string
  trainerType: string | null;
  trainerTypeText: string | null;
  energyTypeText: string | null;
}

// ==========================================
// 卡片详情 (details JSON 解析后的类型)
// ==========================================
export interface CardDetails {
  evolveText?: string;
  cardName?: string;
  regulationMarkText?: string;
  collectionNumber?: string;
  rarity?: string;
  rarityText?: string;
  hp?: number;
  attribute?: string;
  cardTypeText?: string;
  featureFlag?: string;
  abilityItemList?: AbilityItem[];
  pokemonCategory?: string;
  weaknessType?: string;
  weaknessFormula?: string;
  retreatCost?: number;
  pokedexCode?: string;
  pokedexText?: string;
  height?: number;
  weight?: number;
  illustratorName?: string;
  commodityList?: Commodity[];
  collectionFlag?: number;
  special_shiny_type?: number;
  cardFeatureItemList?: CardFeatureItem[];
  ruleText?: string;
  resistanceType?: string;
  resistanceFormula?: string;
  skills?: Skill[];
  trainerType?: string;
  trainerTypeText?: string;
  energyTypeText?: string;
}

// ==========================================
// 嵌套类型定义
// ==========================================
export interface AbilityItem {
  name?: string;
  text?: string;
  type?: string;
}

export interface Commodity {
  code?: string;
  name?: string;
}

export interface CardFeatureItem {
  code?: string;
  text?: string;
}

export interface Skill {
  name?: string;
  text?: string;
  damage?: string;
  energyCost?: string[];
}
