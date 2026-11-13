# data — 外部数据目录

此目录用于存放**不纳入 git 版本控制**的运行时数据文件，内容不会被打进 `app.asar`。

## deck.db

卡牌只读数据库（SQLite，约 18 MB，2 万多张卡牌）。表结构见 [`docs/db/deck.sql`](../docs/db/deck.sql)。

### 使用方式

1. 把新的 `deck.db` 放到本目录：

   ```
   data/deck.db
   ```

2. 开发时直接 `npm run dev`，主进程会读取 `data/deck.db`。
3. 打包时 `scripts/after-pack.cjs` 会把该文件拷贝到安装包的
   `<resources>/db/deck.db`（位于 `app.asar` 之外）。

### 说明

- 文件缺失时不会导致构建或启动失败，应用会显示「缺失卡牌数据」提示页。
- 卡牌数据随应用版本整体替换，运行时以**只读**方式打开，不做迁移。
- 用户数据保存在 `app.getPath('userData')/data/`，与本目录无关。
