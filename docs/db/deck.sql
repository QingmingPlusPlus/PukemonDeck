-- data/ptcg_chs_infos.json 的 SQLite 表结构。
-- 编码字段使用 TEXT 以保留前导零；JSON 数组拆为子表，键均使用源数据字段。
-- 同一卡牌 id 可出现在多个商品中，因此卡牌及子表使用 collection_id + card_id 关联。
-- 枚举注释以 JSON 字典为准；仅出现在卡牌数据、但未收入字典的值单独标明。

-- 启用外键约束。
PRAGMA foreign_keys = ON;

-- 字典表：保存 dict 下所有分类的字典项。
CREATE TABLE ptcg_dict (
    id          INTEGER PRIMARY KEY,                 -- 字典记录 ID
    type_code   TEXT NOT NULL,                       -- 字典类型；可选值：regulation_mark、pokemon_type、trainer_type、card_type、energy_type、special_card、ability_cost、evolve、regulation、resistance_type、series、attribute、weakness_type、rarity、special_trainer
    dict_code   TEXT NOT NULL,                       -- 字典编码
    dict_value  TEXT NOT NULL,                       -- 字典显示值
    dict_sort   INTEGER NOT NULL,                    -- 排序号
    status      INTEGER NOT NULL,                    -- 状态，保留原始值；当前数据可选值：1
    UNIQUE (type_code, dict_code)                    -- 同一字典类型下的编码唯一
);

-- 商品/卡包表：对应 collections 数组。
CREATE TABLE ptcg_collection (
    id              INTEGER PRIMARY KEY,             -- 商品 ID
    commodity_code  TEXT NOT NULL UNIQUE,            -- 商品编码
    name            TEXT NOT NULL,                   -- 商品名称
    sales_date      TEXT NOT NULL,                   -- 发售日期，格式为 YYYY-MM-DD
    series          TEXT,                            -- 系列编码；可选值：1=太阳&月亮、2=剑&盾、3=朱&紫、99=其他
    series_text     TEXT,                            -- 系列名称；可选值：太阳&月亮、剑&盾、朱&紫、其他
    goods_type      TEXT,                            -- 商品类型编码；当前数据可选值：1、2、3，源数据未提供对应字典文本
    link_type       INTEGER,                         -- 链接类型，保留原始值；当前数据可选值：0
    image           TEXT                             -- 商品封面图片相对路径
);

-- 卡牌表：合并 cards 中的通用字段和 details 中的标量详情字段。
CREATE TABLE ptcg_card (
    collection_id         INTEGER NOT NULL,           -- 所属商品 ID，即 JSON 外层 collections.id
    id                    INTEGER NOT NULL,           -- 原始卡牌 ID，仅在同一商品内唯一
    name                  TEXT NOT NULL,              -- 卡牌名称
    yoren_code            TEXT NOT NULL,              -- 关联宝可梦编码，如 P0155
    card_type             TEXT NOT NULL,              -- 卡牌类型编码；可选值：1=宝可梦、2=训练家、3=能量
    card_type_text        TEXT NOT NULL,              -- 卡牌类型名称；可选值：宝可梦、训练家、能量
    name_same_pokemon_id  INTEGER,                    -- 同名宝可梦关联 ID
    commodity_code        TEXT NOT NULL,              -- 卡牌原始商品编码，可能与外层商品编码不同
    image                 TEXT NOT NULL,              -- 卡牌图片相对路径
    hash                  TEXT NOT NULL,              -- 原始哈希值
    collection_number     TEXT NOT NULL,              -- 收集编号，如 004/054
    rarity                TEXT NOT NULL,              -- 稀有度编码；可选值：1=C、2=U、3=R、4=PR、5=RR、6=RRR、7=S、8=SR、9=SSR、10=无标记、11=CHR、12=A、13=CSR、14=AR、15=SAR、16=K、17=●、18=◆、19=★、20=★★、21=★★★、97=FUR、98=HR、99=UR；源数据补充值：22=ACE、96=空白
    rarity_text           TEXT NOT NULL,              -- 稀有度显示文本，可在基础稀有度后带 ★ 等标记
    regulation_mark       TEXT,                       -- 规则标记编码；可选值：1=A、2=B、3=C、4=D、5=E、6=F、7=G、8=H、9=I、10=J、99=无标记
    regulation_mark_text  TEXT,                       -- 规则标记显示文本；可选值：A、B、C、D、E、F、G、H、I、J、无标记
    collection_flag       INTEGER NOT NULL,           -- 收集标记，保留原始值；当前数据可选值：0
    special_shiny_type    INTEGER NOT NULL,           -- 特殊闪卡类型，保留原始值；当前数据可选值：0、1、2、3、4、5、6、7、8、9，源数据未提供对应字典文本
    pokemon_type          TEXT,                       -- 宝可梦类型编码；单项可选值：1=宝可梦V、2=宝可梦VMAX、3=宝可梦VSTAR、4=宝可梦GX、5=究极异兽、6=阿罗拉宝可梦、7=光辉宝可梦、8=V-UNION、9=伽勒尔宝可梦、10=洗翠宝可梦、11=宝可梦ex；源数据补充值：12=字典未定义；多项使用 | 分隔
    special_card          TEXT,                       -- 特殊卡牌分类编码；单项可选值：1=一击、2=连击、3=汇流、4=棱镜之星、5=TAG TEAM、6=太晶、7=古代、8=未来、9=ACE SPEC；多项使用英文逗号分隔
    feature_flag          TEXT,                       -- 特性标记，保留原始值；当前数据可选值：0、1、2，源数据未提供对应字典文本
    rule_text             TEXT,                       -- 规则文本
    evolve_text           TEXT,                       -- 进化阶段文本；当前数据可选值：基础、1阶进化、2阶进化、V进化、LV.X、传说、M进化、BREAK进化、V-UNION
    hp                    INTEGER,                    -- HP
    attribute             TEXT,                       -- 宝可梦属性编码；可选值：1=草、2=火、3=水、4=雷、5=超、6=斗、7=恶、8=钢、9=妖、10=龙、11=无色
    pokemon_category      TEXT,                       -- 宝可梦分类
    pokedex_code          TEXT,                       -- 图鉴编号
    pokedex_text          TEXT,                       -- 图鉴描述
    height                REAL,                       -- 身高，单位为米
    weight                REAL,                       -- 体重，单位为千克
    weakness_type         TEXT,                       -- 弱点属性编码；可选值：1=草、2=火、3=水、4=雷、5=超、6=斗、7=恶、8=钢、9=妖、10=龙、11=无色
    weakness_formula      TEXT,                       -- 弱点伤害计算公式；当前数据可选值：+20、×2
    resistance_type       TEXT,                       -- 抵抗力属性编码；可选值：1=草、2=火、3=水、4=雷、5=超、6=斗、7=恶、8=钢、9=妖、10=龙、11=无色
    resistance_formula    TEXT,                       -- 抵抗力伤害计算公式；当前数据可选值：空字符串、-20、-30
    retreat_cost          INTEGER,                    -- 撤退所需无色能量数量
    trainer_type          TEXT,                       -- 训练家卡类型编码；可选值：1=物品、2=支援者、3=竞技场、4=宝可梦道具；源数据补充值：99=空白
    trainer_type_text     TEXT,                       -- 训练家卡类型名称；当前数据可选值：物品、支援者、竞技场、宝可梦道具、空白
    energy_type           TEXT,                       -- 能量类型编码；可选值：1=基本能量、2=特殊能量
    energy_type_text      TEXT,                       -- 能量类型名称；可选值：基本能量、特殊能量
    anniversary_code      TEXT,                       -- 周年纪念编号；当前数据可选值：01/30、02/30、03/30、04/30、05/30、06/30、07/30、08/30、09/30、10/30、11/30、12/30、13/30、14/30、15/30、16/30、17/30、18/30、19/30、20/30、21/30、22/30、23/30、24/30、25/30、26/30、27/30、28/30、29/30、30/30
    PRIMARY KEY (collection_id, id),                  -- 商品与原始卡牌 ID 组成联合主键
    FOREIGN KEY (collection_id) REFERENCES ptcg_collection (id) ON DELETE CASCADE
);

-- 卡牌招式表：对应 details.abilityItemList 数组。
CREATE TABLE ptcg_card_ability (
    collection_id  INTEGER NOT NULL,                  -- 所属商品 ID
    card_id        INTEGER NOT NULL,                  -- 原始卡牌 ID
    ability_name   TEXT NOT NULL,                     -- 招式名称；在同一卡牌内唯一
    ability_text   TEXT NOT NULL,                     -- 招式效果文本
    ability_cost   TEXT,                              -- 招式能量费用编码；单项可选值：1=草、2=火、3=水、4=雷、5=超、6=斗、7=恶、8=钢、9=妖、11=无色、12=+；多项使用英文逗号分隔，同一编码可重复出现
    ability_damage TEXT NOT NULL,                     -- 招式伤害文本
    PRIMARY KEY (collection_id, card_id, ability_name),
    FOREIGN KEY (collection_id, card_id)
        REFERENCES ptcg_card (collection_id, id) ON DELETE CASCADE
);

-- 卡牌特性表：对应 details.cardFeatureItemList 数组。
CREATE TABLE ptcg_card_feature (
    collection_id  INTEGER NOT NULL,                  -- 所属商品 ID
    card_id        INTEGER NOT NULL,                  -- 原始卡牌 ID
    feature_name   TEXT NOT NULL,                     -- 特性名称；在同一卡牌内唯一
    feature_desc   TEXT NOT NULL,                     -- 特性描述
    PRIMARY KEY (collection_id, card_id, feature_name),
    FOREIGN KEY (collection_id, card_id)
        REFERENCES ptcg_card (collection_id, id) ON DELETE CASCADE
);

-- 卡牌技能表：对应 details.skills 数组。
CREATE TABLE ptcg_card_skill (
    collection_id  INTEGER NOT NULL,                  -- 所属商品 ID
    card_id        INTEGER NOT NULL,                  -- 原始卡牌 ID
    name           TEXT NOT NULL,                     -- 技能名称；在同一卡牌内唯一
    description    TEXT NOT NULL,                     -- 技能描述，对应源字段 desc
    cost           TEXT,                              -- 技能费用编码；单项可选值：1=草、2=火、3=水、4=雷、5=超、6=斗、7=恶、8=钢、9=妖、11=无色、12=+；多项使用英文逗号分隔，同一编码可重复出现
    damage         TEXT,                              -- 技能伤害文本
    related        TEXT NOT NULL,                     -- 关联信息，保留原始值；当前数据可选值：vstar
    type           TEXT NOT NULL,                     -- 技能类型，保留原始值；当前数据可选值：ability、feature
    PRIMARY KEY (collection_id, card_id, name),
    FOREIGN KEY (collection_id, card_id)
        REFERENCES ptcg_card (collection_id, id) ON DELETE CASCADE
);

-- 卡牌画师表：对应 details.illustratorName 数组。
CREATE TABLE ptcg_card_illustrator (
    collection_id     INTEGER NOT NULL,               -- 所属商品 ID
    card_id           INTEGER NOT NULL,               -- 原始卡牌 ID
    illustrator_name  TEXT NOT NULL,                  -- 画师姓名；在同一卡牌内唯一
    PRIMARY KEY (collection_id, card_id, illustrator_name),
    FOREIGN KEY (collection_id, card_id)
        REFERENCES ptcg_card (collection_id, id) ON DELETE CASCADE
);

-- 卡牌关联商品表：对应 details.commodityList 数组。
-- 源数据存在同一张卡重复关联同一商品的记录，因此不设置主键，以保留全部原始记录。
CREATE TABLE ptcg_card_commodity (
    collection_id   INTEGER NOT NULL,                 -- 所属商品 ID
    card_id         INTEGER NOT NULL,                 -- 原始卡牌 ID
    commodity_name  TEXT NOT NULL,                    -- 关联商品名称
    commodity_code  TEXT NOT NULL,                    -- 关联商品编码
    FOREIGN KEY (collection_id, card_id)
        REFERENCES ptcg_card (collection_id, id) ON DELETE CASCADE
);

-- 常用查询条件索引。
CREATE INDEX idx_ptcg_card_commodity_code ON ptcg_card (commodity_code);
CREATE INDEX idx_ptcg_card_card_type ON ptcg_card (card_type);
CREATE INDEX idx_ptcg_card_name_same_pokemon_id ON ptcg_card (name_same_pokemon_id);
CREATE INDEX idx_ptcg_card_commodity_card
    ON ptcg_card_commodity (collection_id, card_id);
CREATE INDEX idx_ptcg_card_commodity_commodity_code
    ON ptcg_card_commodity (commodity_code);
