import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Library roots
  getRoots: () => Promise<any[]>;
  selectDirectory: () => Promise<string | null>;
  addRoot: (rootPath: string) => Promise<number>;
  removeRoot: (id: number) => Promise<any>;
  scanRoot: (id: number, rootPath: string) => Promise<any>;
  scanAll: () => Promise<any>;

  // Projects
  getProjects: (filter?: { favoriteOnly?: boolean; search?: string }) => Promise<any[]>;
  getProject: (id: number) => Promise<any>;
  updateProjectDescription: (id: number, desc: string) => Promise<any>;
  updateProjectCover: (projectId: number, fileId: number) => Promise<any>;
  toggleProjectFavorite: (id: number) => Promise<any>;

  // Folders
  getFolders: (projectId: number) => Promise<any[]>;
  updateFolderDescription: (id: number, desc: string) => Promise<any>;

  // Files
  getFiles: (options?: any) => Promise<any[]>;
  getFile: (id: number) => Promise<any>;
  toggleFileFavorite: (id: number) => Promise<any>;
  updateFileDescription: (id: number, desc: string) => Promise<any>;
  readFileBuffer: (filePath: string) => Promise<ArrayBuffer>;

  // Tags
  getAllTags: () => Promise<any[]>;
  addTag: (fileId: number, tagName: string) => Promise<any>;
  removeTag: (fileId: number, tagName: string) => Promise<any>;

  // Dashboard & stats
  getDashboardStats: () => Promise<any>;
  getScanErrors: () => Promise<any[]>;
  clearScanErrors: () => Promise<any>;

  // Settings & System
  getSettings: () => Promise<Record<string, string>>;
  setSetting: (key: string, value: string) => Promise<any>;
  selectCrealityExe: () => Promise<string | null>;
  clearThumbnailCache: () => Promise<any>;
  reindexAll: () => Promise<any>;
  getSystemPaths: () => Promise<{ dbPath: string; cacheDir: string; appVersion: string }>;

  // Launcher
  openInCrealityPrint: (filePath: string) => Promise<{ success: boolean; message?: string }>;
  openWithDefaultApp: (filePath: string) => Promise<{ success: boolean; message?: string }>;
  showInFolder: (filePath: string) => Promise<{ success: boolean; message?: string }>;
  copyPathToClipboard: (filePath: string) => Promise<{ success: boolean }>;

  // Events
  onScanProgress: (callback: (progress: any) => void) => () => void;
  onThumbnailReady: (callback: (data: { fileId: number; thumbnailPath: string }) => void) => () => void;
  onLibraryChanged: (callback: () => void) => () => void;

  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

const api: ElectronAPI = {
  getRoots: () => ipcRenderer.invoke('get-roots'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  addRoot: (rootPath: string) => ipcRenderer.invoke('add-root', rootPath),
  removeRoot: (id: number) => ipcRenderer.invoke('remove-root', id),
  scanRoot: (id: number, rootPath: string) => ipcRenderer.invoke('scan-root', id, rootPath),
  scanAll: () => ipcRenderer.invoke('scan-all'),

  getProjects: (filter) => ipcRenderer.invoke('get-projects', filter),
  getProject: (id: number) => ipcRenderer.invoke('get-project', id),
  updateProjectDescription: (id: number, desc: string) => ipcRenderer.invoke('update-project-description', id, desc),
  updateProjectCover: (projectId: number, fileId: number) => ipcRenderer.invoke('update-project-cover', projectId, fileId),
  toggleProjectFavorite: (id: number) => ipcRenderer.invoke('toggle-project-favorite', id),

  getFolders: (projectId: number) => ipcRenderer.invoke('get-folders', projectId),
  updateFolderDescription: (id: number, desc: string) => ipcRenderer.invoke('update-folder-description', id, desc),

  getFiles: (options) => ipcRenderer.invoke('get-files', options),
  getFile: (id: number) => ipcRenderer.invoke('get-file', id),
  toggleFileFavorite: (id: number) => ipcRenderer.invoke('toggle-file-favorite', id),
  updateFileDescription: (id: number, desc: string) => ipcRenderer.invoke('update-file-description', id, desc),
  readFileBuffer: (filePath: string) => ipcRenderer.invoke('read-file-buffer', filePath),

  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  addTag: (fileId: number, tagName: string) => ipcRenderer.invoke('add-tag', fileId, tagName),
  removeTag: (fileId: number, tagName: string) => ipcRenderer.invoke('remove-tag', fileId, tagName),

  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getScanErrors: () => ipcRenderer.invoke('get-scan-errors'),
  clearScanErrors: () => ipcRenderer.invoke('clear-scan-errors'),

  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  selectCrealityExe: () => ipcRenderer.invoke('select-creality-exe'),
  clearThumbnailCache: () => ipcRenderer.invoke('clear-thumbnail-cache'),
  reindexAll: () => ipcRenderer.invoke('reindex-all'),
  getSystemPaths: () => ipcRenderer.invoke('get-system-paths'),

  openInCrealityPrint: (filePath: string) => ipcRenderer.invoke('open-in-creality-print', filePath),
  openWithDefaultApp: (filePath: string) => ipcRenderer.invoke('open-with-default-app', filePath),
  showInFolder: (filePath: string) => ipcRenderer.invoke('show-in-folder', filePath),
  copyPathToClipboard: (filePath: string) => ipcRenderer.invoke('copy-path-to-clipboard', filePath),

  onScanProgress: (callback) => {
    const handler = (_e: any, progress: any) => callback(progress);
    ipcRenderer.on('scan-progress', handler);
    return () => ipcRenderer.removeListener('scan-progress', handler);
  },
  onThumbnailReady: (callback) => {
    const handler = (_e: any, data: any) => callback(data);
    ipcRenderer.on('thumbnail-ready', handler);
    return () => ipcRenderer.removeListener('thumbnail-ready', handler);
  },
  onLibraryChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('library-changed', handler);
    return () => ipcRenderer.removeListener('library-changed', handler);
  },

  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
};

contextBridge.exposeInMainWorld('api', api);

