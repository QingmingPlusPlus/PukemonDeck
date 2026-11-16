import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  closeDatabases,
  getCardDatabaseStatus,
  importCardDatabase,
  openCardDatabase,
  pickAndImportCardDatabase
} from './db'
import {
  getCardDetail,
  getFilterOptions,
  listCollections,
  sanitizeQuery,
  searchCards
} from './card-query'
import {
  cancelCardImageImport,
  cleanupCardImageLibrary,
  getCardImageStatus,
  isCardImageImporting,
  pickAndImportCardImages,
  registerCardImageProtocol,
  registerCardImageScheme
} from './image-library'

registerCardImageScheme()

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()
else {
  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0]
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.focus()
  })
}

let cardDbImporting = false

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.pukemondeck.app')

  // 打开只读卡牌库。缺失或损坏时不会中断启动，
  // 渲染进程会通过 IPC 拿到状态并显示导入页。
  openCardDatabase()
  cleanupCardImageLibrary()
  registerCardImageProtocol()

  ipcMain.handle('card-db:status', () => getCardDatabaseStatus())
  ipcMain.handle('card-db:reload', () => {
    if (cardDbImporting || isCardImageImporting()) {
      return { ...getCardDatabaseStatus(), error: '数据导入期间不能重新加载卡牌数据库' }
    }
    return openCardDatabase()
  })
  ipcMain.handle('card-db:pick-and-import', async (event) => {
    if (cardDbImporting || isCardImageImporting()) {
      return { ...getCardDatabaseStatus(), error: '已有数据导入任务正在进行' }
    }
    cardDbImporting = true
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      return await pickAndImportCardDatabase(window)
    } finally {
      cardDbImporting = false
    }
  })
  ipcMain.handle('card-db:import-from-path', (_event, filePath: unknown) => {
    if (cardDbImporting || isCardImageImporting()) {
      return { ...getCardDatabaseStatus(), error: '已有数据导入任务正在进行' }
    }
    if (typeof filePath !== 'string') {
      return {
        ok: false,
        path: '',
        error: '无效的文件路径',
        source: null
      }
    }
    return importCardDatabase(filePath)
  })
  ipcMain.handle('card-image:status', () => getCardImageStatus())
  ipcMain.handle('card-image:pick-and-import', (event) => {
    if (cardDbImporting) {
      return { ...getCardImageStatus(), error: '请先完成卡牌数据库导入' }
    }
    const window = BrowserWindow.fromWebContents(event.sender)
    return pickAndImportCardImages(window)
  })
  ipcMain.handle('card-image:cancel', () => cancelCardImageImport())
  ipcMain.handle('card-db:filter-options', () => getFilterOptions())
  ipcMain.handle('card-db:collections', (_event, query: unknown) => listCollections(query))
  ipcMain.handle('card-db:search', (_event, query: unknown) => searchCards(sanitizeQuery(query)))
  ipcMain.handle('card-db:detail', (_event, collectionId: unknown, cardId: unknown) => {
    if (!Number.isInteger(collectionId) || !Number.isInteger(cardId)) return null
    return getCardDetail(collectionId as number, cardId as number)
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Close database connections before the app exits.
app.on('will-quit', () => {
  closeDatabases()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
