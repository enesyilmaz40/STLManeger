import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import fs from 'fs';
import { scannerService } from './scanner';
import {
  getLibraryRoots,
  removeFileByPath,
  upsertFolder,
  upsertProject,
  getDb,
} from '../db';

export class WatcherService {
  private watchers = new Map<number, FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private onFileChangedCallback?: () => void;

  public setOnChangedCallback(cb: () => void) {
    this.onFileChangedCallback = cb;
  }

  public initWatchers() {
    this.stopAll();
    const roots = getLibraryRoots() as Array<{ id: number; path: string }>;
    for (const r of roots) {
      this.watchRoot(r.id, r.path);
    }
  }

  public watchRoot(rootId: number, rootPath: string) {
    if (this.watchers.has(rootId)) {
      this.unwatchRoot(rootId);
    }

    if (!fs.existsSync(rootPath)) return;

    const watcher = chokidar.watch(rootPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      depth: 99,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 200,
      },
    });

    watcher.on('add', (filePath) => this.debounceEvent(filePath, () => this.handleAdd(rootId, rootPath, filePath)));
    watcher.on('change', (filePath) => this.debounceEvent(filePath, () => this.handleChange(rootId, rootPath, filePath)));
    watcher.on('unlink', (filePath) => this.debounceEvent(filePath, () => this.handleUnlink(filePath)));
    watcher.on('addDir', (dirPath) => this.debounceEvent(dirPath, () => this.handleAddDir(rootId, rootPath, dirPath)));
    watcher.on('unlinkDir', (dirPath) => this.debounceEvent(dirPath, () => this.handleUnlinkDir(dirPath)));

    this.watchers.set(rootId, watcher);
  }

  public unwatchRoot(rootId: number) {
    const watcher = this.watchers.get(rootId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(rootId);
    }
  }

  public stopAll() {
    for (const [id, watcher] of this.watchers.entries()) {
      watcher.close();
    }
    this.watchers.clear();
  }

  private debounceEvent(key: string, fn: () => void) {
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      try {
        fn();
        if (this.onFileChangedCallback) {
          this.onFileChangedCallback();
        }
      } catch (err) {
        console.error('Watcher event error:', err);
      }
    }, 500);
    this.debounceTimers.set(key, timer);
  }

  private resolveProjectAndFolder(rootId: number, rootPath: string, targetPath: string) {
    const relToRoot = path.relative(rootPath, targetPath);
    const parts = relToRoot.split(path.sep);

    let projectName = parts[0];
    let projectPath = path.join(rootPath, projectName);

    if (parts.length === 1 && !fs.statSync(targetPath).isDirectory()) {
      // Direct file in root
      projectName = path.basename(rootPath) || 'Kök Klasör';
      projectPath = rootPath;
    }

    const projectId = upsertProject(rootId, projectName, projectPath);

    const folderDir = fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);
    let relToProj = path.relative(projectPath, folderDir);
    if (!relToProj || relToProj === '.') {
      relToProj = '/';
    } else {
      relToProj = '/' + relToProj.replace(/\\/g, '/');
    }

    const folderId = upsertFolder(projectId, folderDir, relToProj);
    return { projectId, folderId };
  }

  private handleAdd(rootId: number, rootPath: string, filePath: string) {
    if (!fs.existsSync(filePath)) return;
    try {
      const { projectId, folderId } = this.resolveProjectAndFolder(rootId, rootPath, filePath);
      scannerService.indexFile(projectId, folderId, filePath);
    } catch (e) {
      console.error('Error handling add watcher event:', e);
    }
  }

  private handleChange(rootId: number, rootPath: string, filePath: string) {
    if (!fs.existsSync(filePath)) return;
    try {
      const { projectId, folderId } = this.resolveProjectAndFolder(rootId, rootPath, filePath);
      scannerService.indexFile(projectId, folderId, filePath);
    } catch (e) {
      console.error('Error handling change watcher event:', e);
    }
  }

  private handleUnlink(filePath: string) {
    removeFileByPath(filePath);
  }

  private handleAddDir(rootId: number, rootPath: string, dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    try {
      this.resolveProjectAndFolder(rootId, rootPath, dirPath);
    } catch (e) {
      console.error('Error handling addDir watcher event:', e);
    }
  }

  private handleUnlinkDir(dirPath: string) {
    const d = getDb();
    const norm = path.normalize(dirPath);
    // Delete folders under or matching this path
    d.prepare("DELETE FROM folders WHERE path = ? OR path LIKE ?").run(norm, norm + path.sep + '%');
    // If project was this dir, delete it
    d.prepare("DELETE FROM projects WHERE path = ?").run(norm);
  }
}

export const watcherService = new WatcherService();

