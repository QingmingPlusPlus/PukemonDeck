import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CardDatabaseApi } from '../shared/card-db'

// Custom APIs for renderer
const api: { cardDb: CardDatabaseApi } = {
  cardDb: {
    status: () => ipcRenderer.invoke('card-db:status'),
    reload: () => ipcRenderer.invoke('card-db:reload'),
    pickAndImport: () => ipcRenderer.invoke('card-db:pick-and-import'),
    importFromPath: (filePath: string) => ipcRenderer.invoke('card-db:import-from-path', filePath),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
    getFilterOptions: () => ipcRenderer.invoke('card-db:filter-options'),
    searchCards: (query) => ipcRenderer.invoke('card-db:search', query),
    getCardDetail: (collectionId, cardId) =>
      ipcRenderer.invoke('card-db:detail', collectionId, cardId)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
