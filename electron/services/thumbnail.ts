import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  getFilesNeedingThumbnail,
  updateFileThumbnail,
  getDb,
} from '../db';

interface QueueItem {
  id: number;
  path: string;
  mtime: number;
  size: number;
}

export class ThumbnailService {
  private workerWindow: BrowserWindow | null = null;
  private cacheDir: string = '';
  private isProcessing = false;
  private queue: QueueItem[] = [];
  private watchdogTimer: NodeJS.Timeout | null = null;
  private onThumbnailReadyCallback?: (data: { fileId: number; thumbnailPath: string }) => void;

  public init(userDataPath: string) {
    this.cacheDir = path.join(userDataPath, 'thumbnails');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    this.createWorkerWindow();
    this.registerIpcHandlers();
  }

  public setOnThumbnailReady(cb: (data: { fileId: number; thumbnailPath: string }) => void) {
    this.onThumbnailReadyCallback = cb;
  }

  public getCacheDir(): string {
    return this.cacheDir;
  }

  private getWorkerPaths() {
    const candidatesPreload = [
      path.join(__dirname, 'workers/thumbnail-preload.js'),
      path.join(__dirname, '../dist-electron/workers/thumbnail-preload.js'),
      path.join(__dirname, '../workers/thumbnail-preload.js'),
      path.join(process.cwd(), 'dist-electron/workers/thumbnail-preload.js'),
    ];
    const preloadPath = candidatesPreload.find((p) => fs.existsSync(p)) || candidatesPreload[0];

    const candidatesHtml = [
      path.join(__dirname, 'workers/thumbnail-worker.html'),
      path.join(__dirname, '../dist-electron/workers/thumbnail-worker.html'),
      path.join(__dirname, '../workers/thumbnail-worker.html'),
      path.join(process.cwd(), 'dist-electron/workers/thumbnail-worker.html'),
    ];
    const workerHtml = candidatesHtml.find((p) => fs.existsSync(p)) || candidatesHtml[0];

    return { preloadPath, workerHtml };
  }

  private createWorkerWindow() {
    const { preloadPath, workerHtml } = this.getWorkerPaths();

    this.workerWindow = new BrowserWindow({
      width: 384,
      height: 384,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        backgroundThrottling: false,
      },
    });

    this.workerWindow.webContents.on('console-message', (_e, _level, message, line, sourceId) => {
      console.log(`[ThumbnailWorker] ${message} (${path.basename(sourceId)}:${line})`);
    });

    this.workerWindow.webContents.on('did-fail-load', (_e, code, desc) => {
      console.error(`[ThumbnailWorker] Load failed (${code}): ${desc}`);
    });

    this.workerWindow.webContents.on('did-finish-load', () => {
      this.processNextInQueue();
    });

    this.workerWindow.on('closed', () => {
      this.workerWindow = null;
    });

    this.workerWindow.loadFile(workerHtml);
  }

  private registerIpcHandlers() {
    ipcMain.on('thumbnail-rendered', (_event, data) => {
      this.clearWatchdog();
      this.handleRenderSuccess(data);
    });

    ipcMain.on('thumbnail-error', (_event, data) => {
      this.clearWatchdog();
      this.handleRenderError(data);
    });
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private getCachePath(filePath: string, mtime: number, size: number): string {
    const hash = crypto
      .createHash('md5')
      .update(`${filePath}_${mtime}_${size}`)
      .digest('hex');
    return path.join(this.cacheDir, `${hash}.png`);
  }

  public triggerThumbnailGeneration() {
    const pending = getFilesNeedingThumbnail(100);
    for (const item of pending) {
      if (!this.queue.some((q) => q.id === item.id)) {
        this.queue.push(item);
      }
    }

    if (!this.isProcessing) {
      this.processNextInQueue();
    }
  }

  public enqueueFile(id: number, filePath: string, mtime: number, size: number) {
    if (!this.queue.some((q) => q.id === id)) {
      this.queue.push({ id, path: filePath, mtime, size });
    }
    if (!this.isProcessing) {
      this.processNextInQueue();
    }
  }

  private processNextInQueue() {
    if (!this.workerWindow || this.workerWindow.isDestroyed()) {
      this.createWorkerWindow();
      return;
    }

    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;

    // Check if source file exists
    if (!fs.existsSync(item.path)) {
      updateFileThumbnail(item.id, '', undefined, undefined, undefined, 'failed');
      this.processNextInQueue();
      return;
    }

    // Check if cached thumbnail already exists and is valid
    const cachePath = this.getCachePath(item.path, item.mtime, item.size);
    if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 0) {
      updateFileThumbnail(item.id, cachePath, undefined, undefined, undefined, 'ready');
      if (this.onThumbnailReadyCallback) {
        this.onThumbnailReadyCallback({ fileId: item.id, thumbnailPath: cachePath });
      }
      this.processNextInQueue();
      return;
    }

    try {
      const buffer = fs.readFileSync(item.path);

      // Start 15s watchdog so a corrupt/stalled file never hangs the entire queue
      this.watchdogTimer = setTimeout(() => {
        console.warn(`[ThumbnailService] Zaman aşımı (15s): ${path.basename(item.path)}`);
        updateFileThumbnail(item.id, '', undefined, undefined, undefined, 'failed');
        this.processNextInQueue();
      }, 15000);

      this.workerWindow.webContents.send('render-stl', {
        id: item.id,
        buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      });
    } catch (err: any) {
      console.error('File read error for thumbnail:', err);
      updateFileThumbnail(item.id, '', undefined, undefined, undefined, 'failed');
      this.processNextInQueue();
    }
  }

  private handleRenderSuccess(data: {
    id: number;
    dataUrl: string;
    dims: { x: number; y: number; z: number };
    triangles: number;
    vertices: number;
  }) {
    try {
      const d = getDb();
      const file = d.prepare('SELECT path, mtime, size FROM files WHERE id = ?').get(data.id) as
        | { path: string; mtime: number; size: number }
        | undefined;

      if (!file) {
        this.processNextInQueue();
        return;
      }

      const cachePath = this.getCachePath(file.path, file.mtime, file.size);
      const base64Data = data.dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(cachePath, Buffer.from(base64Data, 'base64'));

      updateFileThumbnail(data.id, cachePath, data.dims, data.triangles, data.vertices, 'ready');

      if (this.onThumbnailReadyCallback) {
        this.onThumbnailReadyCallback({ fileId: data.id, thumbnailPath: cachePath });
      }
    } catch (err) {
      console.error('Error saving thumbnail:', err);
      updateFileThumbnail(data.id, '', undefined, undefined, undefined, 'failed');
    } finally {
      this.processNextInQueue();
    }
  }

  private handleRenderError(data: { id: number; error: string }) {
    console.warn(`[ThumbnailService] Model işlenemedi (ID ${data.id}):`, data.error);
    updateFileThumbnail(data.id, '', undefined, undefined, undefined, 'failed');
    this.processNextInQueue();
  }

  public clearCache() {
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const f of files) {
          fs.unlinkSync(path.join(this.cacheDir, f));
        }
      }
      const d = getDb();
      d.prepare("UPDATE files SET thumbnail_path = NULL, thumbnail_status = 'pending' WHERE file_type = 'stl'").run();
      this.triggerThumbnailGeneration();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || String(err) };
    }
  }
}

export const thumbnailService = new ThumbnailService();
