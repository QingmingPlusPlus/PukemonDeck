# data — 外部数据目录

此目录用于存放**不纳入 git 版本控制**的运行时数据文件，内容不会被打进 `app.asar`。

## deck.db

卡牌只读数据库（SQLite，约 18 MB，2 万多张卡牌）。表结构见 [`docs/db/deck.sql`](../docs/db/deck.sql)。

### 使用方式

1. 把新的 `deck.db` 放到本目录（仅作为开发与打包时的分发副本）：

   ```
   data/deck.db
   ```

2. 开发时 `npm run dev` 会在没有用户导入副本时读取 `data/deck.db`。
3. 打包时 `scripts/after-pack.cjs` 会把该文件拷贝到安装包的
   `<resources>/db/deck.db`（位于 `app.asar` 之外）。
   若本文件不存在，打包仍会成功，只是安装包中不含卡牌数据。

### 运行时解析顺序

应用启动时按以下顺序查找卡牌库，并以只读方式打开：

1. 用户导入的副本：`app.getPath('userData')/data/deck.db`（持久保存，升级应用时保留）。
2. 随应用分发的副本：开发期为本目录的 `deck.db`，打包后为 `<resources>/db/deck.db`。

若两处都不存在（或文件损坏），应用会显示导入页，用户可以通过文件选择框或拖放导入
`.db` / `.sqlite` 文件。导入通过校验后会复制到用户数据目录，重启后仍然可用。

### 说明

- 文件缺失时不会导致构建或启动失败。
- 卡牌数据随应用版本整体替换分发副本；运行时始终以**只读**方式打开，不做迁移。
- 用户库 `pukemondeck.db` 也保存在 `app.getPath('userData')/data/`，与卡牌库文件相互独立。
