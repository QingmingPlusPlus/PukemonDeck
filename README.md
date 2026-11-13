# PukemonDeck

基于 **Electron + React + TypeScript + Vite** 的桌面应用，使用 [electron-vite](https://electron-vite.org/) 构建。

## 技术栈

| 用途              | 技术                     |
| ----------------- | ------------------------ |
| 桌面运行时        | Electron 44              |
| UI 框架           | React 19                 |
| 语言              | TypeScript 5.9           |
| 构建 / 开发服务器 | Vite 8 + electron-vite 6 |
| 打包              | electron-builder         |
| 代码规范          | ESLint + Prettier        |

## 开始使用

```bash
npm install    # 安装依赖
npm run dev    # 启动开发模式（支持热更新）
```

## 常用脚本

| 命令                   | 说明                                  |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | 开发模式，渲染进程支持 HMR            |
| `npm run build`        | 类型检查 + 构建到 `out/`              |
| `npm start`            | 预览已构建的应用                      |
| `npm run typecheck`    | 主进程 / 渲染进程 TypeScript 类型检查 |
| `npm run lint`         | ESLint 检查                           |
| `npm run format`       | Prettier 格式化                       |
| `npm run build:win`    | 打包 Windows 安装包                   |
| `npm run build:mac`    | 打包 macOS 安装包                     |
| `npm run build:linux`  | 打包 Linux 安装包                     |
| `npm run build:unpack` | 打包为免安装目录                      |

## 目录结构

```
├─ build/                  # 打包资源（图标、entitlements）
├─ resources/              # 应用运行时资源
│  └─ icon.png
├─ data/                   # 外部数据（不入 git，不打包进 asar）
│  ├─ README.md
│  └─ deck.db              # 只读卡牌数据库，需手动放置
├─ docs/
│  └─ db/
│     └─ deck.sql          # 卡牌库建表语句（仅参考，不随应用打包）
├─ scripts/
│  └─ after-pack.cjs       # 打包后把 data/deck.db 拷入应用资源目录
├─ src/
│  ├─ main/                # 主进程代码
│  │  ├─ index.ts          # 应用入口、窗口创建、IPC
│  │  └─ db.ts             # SQLite 连接管理
│  ├─ preload/             # 预加载脚本（安全地向渲染进程暴露 API）
│  │  ├─ index.ts
│  │  └─ index.d.ts
│  ├─ shared/              # 主进程 / preload / 渲染进程共用的类型
│  │  └─ card-db.ts
│  └─ renderer/            # 渲染进程（React）
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        ├─ components/
│        └─ assets/
├─ electron.vite.config.ts # electron-vite 配置（main/preload/renderer）
├─ electron-builder.yml    # electron-builder 打包配置
├─ tsconfig.json           # 根 tsconfig（引用 node/web 配置）
├─ tsconfig.node.json      # 主进程 + preload 的 TS 配置
└─ tsconfig.web.json       # 渲染进程的 TS 配置
```

## 架构说明

- **主进程**（`src/main`）：负责窗口管理、系统能力、IPC。
- **预加载脚本**（`src/preload`）：通过 `contextBridge` 暴露受限 API，避免在渲染进程中开启 Node 集成。
- **渲染进程**（`src/renderer`）：React 应用，通过 `window.electron` 与主进程通信。

渲染进程中使用 `@renderer` 别名指向 `src/renderer/src`。

## 数据与存储

应用使用两个互相独立的 SQLite 数据库：

| 数据库                  | 位置                                                       | 访问方式 | 说明                                         |
| ----------------------- | ---------------------------------------------------------- | -------- | -------------------------------------------- |
| 卡牌库 `deck.db`        | 开发：`data/deck.db`<br>打包：`<resourcesPath>/db/deck.db` | 只读     | 外部数据，随版本整库替换，运行时禁止写入     |
| 用户库 `pukemondeck.db` | `app.getPath('userData')/data/`                            | 读写     | 用户数据，升级应用时保留（当前版本暂未使用） |

### 卡牌库（外部数据）

`deck.db` 体积约 18 MB，且每个版本整体替换，因此**不纳入 git**（见 `.gitignore`），
需要手动放到 `data/` 目录：

```
data/deck.db
```

- 开发时主进程直接读取 `data/deck.db`。
- 打包时由 `scripts/after-pack.cjs`（electron-builder `afterPack` 钩子）拷贝到
  `<resources>/db/deck.db`。该位置在 `app.asar` 之外，因为 `better-sqlite3`
  属于原生模块，无法读取 asar 内的文件。
- 若 `data/deck.db` 不存在，打包不会失败（安装包中不含卡牌数据），
  应用启动后会显示「缺失卡牌数据」提示页。
- 安装后也可以直接替换 `resources/db/deck.db` 来更新卡牌数据，无需重新打包。
- 文件缺失或损坏时应用仍会正常启动，但会显示**「缺失卡牌数据」提示页**，
  其中给出目标路径和「重新检测」按钮。

连接代码见 `src/main/db.ts`：

```ts
import { openCardDatabase, getCardDatabase, getUserDatabase } from './db'

openCardDatabase() // 启动时尝试打开；失败只记录状态，不抛异常
const cards = getCardDatabase() // 查询入口，未打开时抛错
const user = getUserDatabase() // 可读写，持久保存在用户目录
```

渲染进程通过 preload 暴露的 `window.api.cardDb` 读取状态：

```ts
const status = await window.api.cardDb.status() // { ok, path, error }
const next = await window.api.cardDb.reload() // 用户补上文件后重试
```

`docs/db/deck.sql` 仅作为表结构参考，不会被包含进安装包。

## 打包配置

打包配置位于 `electron-builder.yml`：

- `appId`: `com.pukemondeck.app`
- `productName`: `PukemonDeck`

按需修改应用图标（`build/icon.png` / `build/icon.ico` / `build/icon.icns`）后再执行打包命令。
