import fs from 'fs';
import path from 'path';
import {
  upsertProject,
  upsertFolder,
  upsertFile,
  recordScanError,
  recordScanHistory,
  cleanOrphanedRecords,
  updateLibraryRootStatus,
  updateProjectCover,
  getDb,
} from '../db';

export interface ScanProgressCallback {
  (progress: {
    rootPath: string;
    currentFolder: string;
    foldersScanned: number;
    filesFound: number;
  }): void;
}

const EXTENSION_TYPE_MAP: Record<string, string> = {
  '.stl': 'stl',
  '.3mf': '3mf',
  '.gcode': 'gcode',
  '.gco': 'gcode',
  '.obj': 'obj',
  '.step': 'step',
  '.stp': 'step',
  '.f3d': 'f3d',
  '.amf': 'amf',
  '.ply': 'ply',
};

export class ScannerService {
  private isScanning = false;

  public getIsScanning(): boolean {
    return this.isScanning;
  }

  public async scanRoot(
    rootId: number,
    rootPath: string,
    onProgress?: ScanProgressCallback
  ): Promise<{ filesFound: number; foldersScanned: number }> {
    const normRoot = path.normalize(rootPath);
    if (!fs.existsSync(normRoot)) {
      throw new Error(`Klasör bulunamadı: ${normRoot}`);
    }

    this.isScanning = true;
    updateLibraryRootStatus(rootId, 'scanning');

    let foldersScanned = 0;
    let filesFound = 0;
    const visitedRealPaths = new Set<string>();
    const scannedFilePaths = new Set<string>();
    const scannedFolderPaths = new Set<string>();

    try {
      const rootReal = fs.realpathSync(normRoot);
      visitedRealPaths.add(rootReal);

      // Check direct items in root
      const rootEntries = fs.readdirSync(normRoot, { withFileTypes: true });

      // First check if there are direct files in root folder itself
      const directRootFiles = rootEntries.filter((e) => e.isFile());
      if (directRootFiles.length > 0) {
        const rootProjectName = path.basename(normRoot) || 'Kök Klasör';
        const rootProjectId = upsertProject(rootId, rootProjectName, normRoot);
        const rootFolderId = upsertFolder(rootProjectId, normRoot, '/');
        scannedFolderPaths.add(normRoot);

        for (const fileDirent of directRootFiles) {
          const filePath = path.join(normRoot, fileDirent.name);
          const res = this.indexFile(rootProjectId, rootFolderId, filePath);
          if (res) {
            scannedFilePaths.add(path.normalize(filePath));
            filesFound++;
          }
        }
      }

      // Now process each subfolder under root as a Project
      const subdirs = rootEntries.filter((e) => e.isDirectory());
      for (const dir of subdirs) {
        const projectPath = path.join(normRoot, dir.name);
        const projectName = dir.name;

        try {
          const realDirPath = fs.realpathSync(projectPath);
          if (visitedRealPaths.has(realDirPath)) {
            continue; // Prevent circular symlinks
          }
          visitedRealPaths.add(realDirPath);

          const projectId = upsertProject(rootId, projectName, projectPath);
          const rootProjectFolderId = upsertFolder(projectId, projectPath, '/');
          scannedFolderPaths.add(projectPath);
          foldersScanned++;

          if (onProgress) {
            onProgress({
              rootPath: normRoot,
              currentFolder: projectName,
              foldersScanned,
              filesFound,
            });
          }

          // Recursively scan this project folder
          const subResult = await this.scanProjectFolder(
            projectId,
            projectPath,
            projectPath,
            visitedRealPaths,
            scannedFilePaths,
            scannedFolderPaths,
            (curr) => {
              foldersScanned++;
              if (onProgress) {
                onProgress({
                  rootPath: normRoot,
                  currentFolder: curr,
                  foldersScanned,
                  filesFound,
                });
              }
            },
            () => {
              filesFound++;
              if (onProgress) {
                onProgress({
                  rootPath: normRoot,
                  currentFolder: projectName,
                  foldersScanned,
                  filesFound,
                });
              }
            }
          );

          // Auto-assign cover if none selected
          this.ensureProjectCover(projectId);
        } catch (err: any) {
          recordScanError(projectPath, err.message || String(err));
        }
      }

      // Cleanup files and folders that no longer exist on disk
      cleanOrphanedRecords(rootId, scannedFilePaths, scannedFolderPaths);

      const now = new Date().toISOString();
      updateLibraryRootStatus(rootId, 'idle', now);
      recordScanHistory(rootId, 'completed', filesFound, foldersScanned);

      return { filesFound, foldersScanned };
    } catch (err: any) {
      updateLibraryRootStatus(rootId, 'error');
      recordScanHistory(rootId, 'failed', filesFound, foldersScanned, err.message || String(err));
      throw err;
    } finally {
      this.isScanning = false;
    }
  }

  private async scanProjectFolder(
    projectId: number,
    projectBasePath: string,
    currentPath: string,
    visitedRealPaths: Set<string>,
    scannedFilePaths: Set<string>,
    scannedFolderPaths: Set<string>,
    onFolderScanned: (folderName: string) => void,
    onFileFound: () => void
  ): Promise<void> {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (err: any) {
      recordScanError(currentPath, err.message || String(err));
      return;
    }

    // Determine current folder's relative path inside the project
    let relPath = path.relative(projectBasePath, currentPath);
    if (!relPath || relPath === '.') {
      relPath = '/';
    } else {
      relPath = '/' + relPath.replace(/\\/g, '/');
    }

    const currentFolderId = upsertFolder(projectId, currentPath, relPath);
    scannedFolderPaths.add(path.normalize(currentPath));

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        try {
          const real = fs.realpathSync(fullPath);
          if (visitedRealPaths.has(real)) {
            continue; // Symlink cycle protection
          }
          visitedRealPaths.add(real);

          onFolderScanned(entry.name);
          await this.scanProjectFolder(
            projectId,
            projectBasePath,
            fullPath,
            visitedRealPaths,
            scannedFilePaths,
            scannedFolderPaths,
            onFolderScanned,
            onFileFound
          );
        } catch (err: any) {
          recordScanError(fullPath, err.message || String(err));
        }
      } else if (entry.isFile()) {
        const indexed = this.indexFile(projectId, currentFolderId, fullPath);
        if (indexed) {
          scannedFilePaths.add(path.normalize(fullPath));
          onFileFound();
        }
      }
    }
  }

  public indexFile(projectId: number, folderId: number, filePath: string): boolean {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const stats = fs.statSync(filePath);
      const name = path.basename(filePath);
      const fileType = EXTENSION_TYPE_MAP[ext] || 'other';

      upsertFile({
        projectId,
        folderId,
        filePath,
        name,
        extension: ext,
        fileType,
        size: stats.size,
        mtime: Math.floor(stats.mtimeMs),
      });

      return true;
    } catch (err: any) {
      recordScanError(filePath, err.message || String(err));
      return false;
    }
  }

  private ensureProjectCover(projectId: number) {
    const d = getDb();
    const proj = d.prepare('SELECT cover_file_id FROM projects WHERE id = ?').get(projectId) as
      | { cover_file_id: number | null }
      | undefined;
    if (proj && !proj.cover_file_id) {
      const stl = d.prepare("SELECT id FROM files WHERE project_id = ? AND file_type = 'stl' LIMIT 1").get(projectId) as
        | { id: number }
        | undefined;
      if (stl) {
        updateProjectCover(projectId, stl.id);
      }
    }
  }
}

export const scannerService = new ScannerService();

