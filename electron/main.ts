import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

import {
  initDatabase,
  closeDatabase,
  getLibraryRoots,
  addLibraryRoot,
  removeLibraryRoot,
  getProjects,
  getProjectById,
  updateProjectDescription,
  updateProjectCover,
  toggleProjectFavorite,
  getFoldersByProject,
  updateFolderDescription,
  getFiles,
  getFileById,
  toggleFileFavorite,
  updateFileDescription,
  getAllTags,
  addTagToFile,
  removeTagFromFile,
  getDashboardStats,
  getScanErrors,
  clearScanErrors,
  getAllSettings,
  setSetting,
} from './db';

import { scannerService } from './services/scanner';
import { watcherService } from './services/watcher';
import { thumbnailService } from './services/thumbnail';
import { launcherService } from './services/launcher';

let mainWindow: BrowserWindow | null = null;
let dbPath = '';
let userDataPath = '';

// Register protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      corsEnabled: true,
    },
  },
]);

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#090d16',
    title: 'STL Manager',
    show: false,
    frame: false, // Sleek modern desktop window with custom title bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.close());

  // Setup thumbnail callback
  thumbnailService.setOnThumbnailReady((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('thumbnail-ready', data);
    }
  });

  // Setup watcher callback
  watcherService.setOnChangedCallback(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('library-changed');
    }
    thumbnailService.triggerThumbnailGeneration();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    await mainWindow.loadFile(indexPath);
  }

  // Trigger thumbnail generation on launch for any pending items
  thumbnailService.triggerThumbnailGeneration();
}

function setupProtocol() {
  // Register app-asset:// protocol to serve thumbnails and files securely
  protocol.handle('app-asset', async (request) => {
    try {
      const url = new URL(request.url);
      let targetPath = url.searchParams.get('path');

      if (!targetPath) {
        // Fallback for direct pathname (stripping host and leading slashes)
        let raw = request.url.replace(/^app-asset:\/\/[^\/]*\//, '');
        raw = decodeURIComponent(raw);
        if (/^\/?[a-zA-Z]:/.test(raw)) {
          targetPath = raw.startsWith('/') ? raw.substring(1) : raw;
        } else {
          targetPath = raw;
        }
      }

      if (!targetPath) {
        return new Response('Geçersiz dosya yolu', { status: 400 });
      }

      const norm = path.normalize(targetPath);
      if (!fs.existsSync(norm)) {
        return new Response('Dosya Bulunamadı', { status: 404 });
      }

      const buffer = fs.readFileSync(norm);
      const ext = path.extname(norm).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';

      return new Response(buffer, {
        headers: {
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (err: any) {
      console.error('Protocol handle error:', err);
      return new Response(err.message || 'Error', { status: 500 });
    }
  });
}

function registerIpc() {
  // Library roots
  ipcMain.handle('get-roots', async () => getLibraryRoots());

  ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Kütüphane Klasörü Seç',
      properties: ['openDirectory'],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });

  ipcMain.handle('add-root', async (_e, rootPath: string) => {
    const rootId = addLibraryRoot(rootPath);
    watcherService.watchRoot(rootId as number, rootPath);
    // Start initial scan
    runScan(rootId as number, rootPath);
    return rootId;
  });

  ipcMain.handle('remove-root', async (_e, id: number) => {
    watcherService.unwatchRoot(id);
    return removeLibraryRoot(id);
  });

  ipcMain.handle('scan-root', async (_e, id: number, rootPath: string) => {
    return runScan(id, rootPath);
  });

  ipcMain.handle('scan-all', async () => {
    const roots = getLibraryRoots() as Array<{ id: number; path: string }>;
    for (const r of roots) {
      await runScan(r.id, r.path);
    }
    return { success: true };
  });

  // Projects
  ipcMain.handle('get-projects', async (_e, filter) => getProjects(filter));
  ipcMain.handle('get-project', async (_e, id: number) => getProjectById(id));
  ipcMain.handle('update-project-description', async (_e, id: number, desc: string) =>
    updateProjectDescription(id, desc)
  );
  ipcMain.handle('update-project-cover', async (_e, projectId: number, fileId: number) =>
    updateProjectCover(projectId, fileId)
  );
  ipcMain.handle('toggle-project-favorite', async (_e, id: number) => toggleProjectFavorite(id));

  // Folders
  ipcMain.handle('get-folders', async (_e, projectId: number) => getFoldersByProject(projectId));
  ipcMain.handle('update-folder-description', async (_e, id: number, desc: string) =>
    updateFolderDescription(id, desc)
  );

  // Files
  ipcMain.handle('get-files', async (_e, options) => getFiles(options));
  ipcMain.handle('get-file', async (_e, id: number) => getFileById(id));
  ipcMain.handle('toggle-file-favorite', async (_e, id: number) => toggleFileFavorite(id));
  ipcMain.handle('update-file-description', async (_e, id: number, desc: string) =>
    updateFileDescription(id, desc)
  );

  ipcMain.handle('read-file-buffer', async (_e, filePath: string) => {
    const norm = path.normalize(filePath);
    if (!fs.existsSync(norm)) {
      throw new Error(`Dosya bulunamadı: ${norm}`);
    }
    const buf = fs.readFileSync(norm);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  });

  // Tags
  ipcMain.handle('get-all-tags', async () => getAllTags());
  ipcMain.handle('add-tag', async (_e, fileId: number, tagName: string) => addTagToFile(fileId, tagName));
  ipcMain.handle('remove-tag', async (_e, fileId: number, tagName: string) => removeTagFromFile(fileId, tagName));

  // Dashboard & stats
  ipcMain.handle('get-dashboard-stats', async () => getDashboardStats());
  ipcMain.handle('get-scan-errors', async () => getScanErrors());
  ipcMain.handle('clear-scan-errors', async () => clearScanErrors());

  // Settings
  ipcMain.handle('get-settings', async () => getAllSettings());
  ipcMain.handle('set-setting', async (_e, key: string, value: string) => setSetting(key, value));

  ipcMain.handle('select-creality-exe', async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Creality Print Çalıştırılabilir Dosyasını Seç (CrealityPrint.exe)',
      filters: [{ name: 'Çalıştırılabilir Dosyalar', extensions: ['exe'] }],
      properties: ['openFile'],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    const exePath = res.filePaths[0];
    setSetting('crealityPrintPath', exePath);
    return exePath;
  });

  ipcMain.handle('clear-thumbnail-cache', async () => {
    return thumbnailService.clearCache();
  });

  ipcMain.handle('reindexAll', async () => {
    const roots = getLibraryRoots() as Array<{ id: number; path: string }>;
    for (const r of roots) {
      await runScan(r.id, r.path);
    }
    thumbnailService.triggerThumbnailGeneration();
    return { success: true };
  });

  ipcMain.handle('get-system-paths', async () => {
    return {
      dbPath,
      cacheDir: thumbnailService.getCacheDir(),
      appVersion: app.getVersion(),
    };
  });

  // Launcher
  ipcMain.handle('open-in-creality-print', async (_e, filePath: string) =>
    launcherService.openInCrealityPrint(filePath)
  );
  ipcMain.handle('open-with-default-app', async (_e, filePath: string) =>
    launcherService.openWithDefaultApp(filePath)
  );
  ipcMain.handle('show-in-folder', async (_e, filePath: string) => launcherService.showInFolder(filePath));
  ipcMain.handle('copy-path-to-clipboard', async (_e, filePath: string) =>
    launcherService.copyPathToClipboard(filePath)
  );
}

async function runScan(rootId: number, rootPath: string) {
  try {
    const result = await scannerService.scanRoot(rootId, rootPath, (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('scan-progress', progress);
      }
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('library-changed');
    }

    // Trigger thumbnail generation for newly found files
    thumbnailService.triggerThumbnailGeneration();
    return result;
  } catch (err) {
    console.error('Scan error:', err);
    throw err;
  }
}

// App lifecycle
app.whenReady().then(() => {
  userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'stlmanager.db');

  initDatabase(dbPath);
  setupProtocol();
  thumbnailService.init(userDataPath);
  watcherService.initWatchers();
  registerIpc();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  watcherService.stopAll();
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

