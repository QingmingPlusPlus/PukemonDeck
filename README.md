# PukemonDeck

基于 **Electron + React + TypeScript + Vite** 的桌面应用，使用 [electron-vite](https://electron-vite.org/) 构建。

## 技术栈

| 用途 | 技术 |
| --- | --- |
| 桌面运行时 | Electron 44 |
| UI 框架 | React 19 |
| 语言 | TypeScript 5.9 |
| 构建 / 开发服务器 | Vite 8 + electron-vite 6 |
| 打包 | electron-builder |
| 代码规范 | ESLint + Prettier |

## 开始使用

```bash
npm install    # 安装依赖
npm run dev    # 启动开发模式（支持热更新）
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式，渲染进程支持 HMR |
| `npm run build` | 类型检查 + 构建到 `out/` |
| `npm start` | 预览已构建的应用 |
| `npm run typecheck` | 主进程 / 渲染进程 TypeScript 类型检查 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |
| `npm run build:win` | 打包 Windows 安装包 |
| `npm run build:mac` | 打包 macOS 安装包 |
| `npm run build:linux` | 打包 Linux 安装包 |
| `npm run build:unpack` | 打包为免安装目录 |

## 目录结构

```
├─ build/                  # 打包资源（图标、entitlements）
├─ resources/              # 应用运行时资源（如图标）
├─ src/
│  ├─ main/                # 主进程代码
│  │  └─ index.ts          # 应用入口、窗口创建
│  ├─ preload/             # 预加载脚本（安全地向渲染进程暴露 API）
│  │  ├─ index.ts
│  │  └─ index.d.ts
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

## 打包配置

打包配置位于 `electron-builder.yml`：

- `appId`: `com.pukemondeck.app`
- `productName`: `PukemonDeck`

按需修改应用图标（`build/icon.png` / `build/icon.ico` / `build/icon.icns`）后再执行打包命令。
