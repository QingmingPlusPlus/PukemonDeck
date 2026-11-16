import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CardImageProgress } from '../shared/card-image'
import type { PukemonDeckApi } from './index.d'

// Custom APIs for renderer
const api: PukemonDeckApi = {
  cardDb: {
    status: () => ipcRenderer.invoke('card-db:status'),
    reload: () => ipcRenderer.invoke('card-db:reload'),
    pickAndImport: () => ipcRenderer.invoke('card-db:pick-and-import'),
    importFromPath: (filePath: string) => ipcRenderer.invoke('card-db:import-from-path', filePath),
    clearImported: () => ipcRenderer.invoke('card-db:clear-imported'),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
    getFilterOptions: (scope) => ipcRenderer.invoke('card-db:filter-options', scope),
    listCollections: (query) => ipcRenderer.invoke('card-db:collections', query),
    searchCards: (query) => ipcRenderer.invoke('card-db:search', query),
    getCardDetail: (collectionId, cardId) =>
      ipcRenderer.invoke('card-db:detail', collectionId, cardId)
  },
  decks: {
    list: () => ipcRenderer.invoke('decks:list'),
    create: (name) => ipcRenderer.invoke('decks:create', name),
    setDefault: (deckId) => ipcRenderer.invoke('decks:set-default', deckId),
    getCards: (deckId) => ipcRenderer.invoke('decks:cards', deckId),
    addCard: (collectionId, cardId) => ipcRenderer.invoke('decks:add-card', collectionId, cardId)
  },
  cardImage: {
    status: () => ipcRenderer.invoke('card-image:status'),
    pickAndImport: () => ipcRenderer.invoke('card-image:pick-and-import'),
    cancel: () => ipcRenderer.invoke('card-image:cancel'),
    onProgress: (callback) => {
      const listener = (_event: IpcRendererEvent, progress: CardImageProgress): void => {
        callback(progress)
      }
      ipcRenderer.on('card-image:progress', listener)
      return () => ipcRenderer.removeListener('card-image:progress', listener)
    }
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
