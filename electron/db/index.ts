import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Veritabanı henüz başlatılmadı.');
  }
  return db;
}

export function initDatabase(dbFilePath: string): Database.Database {
  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbFilePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Load and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  let schemaSql = '';
  if (fs.existsSync(schemaPath)) {
    schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  } else {
    // Fallback inline schema
    schemaSql = `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS library_roots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL,
          last_scanned_at TEXT,
          scan_status TEXT DEFAULT 'idle'
      );
      CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          root_id INTEGER NOT NULL REFERENCES library_roots(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          path TEXT UNIQUE NOT NULL,
          description TEXT DEFAULT '',
          cover_file_id INTEGER,
          is_favorite INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          path TEXT UNIQUE NOT NULL,
          relative_path TEXT NOT NULL,
          description TEXT DEFAULT '',
          created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
          path TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          extension TEXT NOT NULL,
          file_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          mtime INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          is_favorite INTEGER DEFAULT 0,
          description TEXT DEFAULT '',
          dim_x REAL DEFAULT NULL,
          dim_y REAL DEFAULT NULL,
          dim_z REAL DEFAULT NULL,
          triangles INTEGER DEFAULT NULL,
          vertices INTEGER DEFAULT NULL,
          thumbnail_path TEXT DEFAULT NULL,
          thumbnail_status TEXT DEFAULT 'pending'
      );
      CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
      );
      CREATE TABLE IF NOT EXISTS file_tags (
          file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (file_id, tag_id)
      );
      CREATE TABLE IF NOT EXISTS application_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS scan_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          root_id INTEGER REFERENCES library_roots(id) ON DELETE SET NULL,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          files_found INTEGER DEFAULT 0,
          folders_scanned INTEGER DEFAULT 0,
          status TEXT DEFAULT 'running',
          error_message TEXT
      );
      CREATE TABLE IF NOT EXISTS scan_errors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          error_message TEXT NOT NULL,
          created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
      CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
      CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
      CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_files_mtime ON files(mtime);
      CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
      CREATE INDEX IF NOT EXISTS idx_projects_root_id ON projects(root_id);
      CREATE INDEX IF NOT EXISTS idx_projects_is_favorite ON projects(is_favorite);
    `;
  }
  db.exec(schemaSql);

  // Initialize default settings if missing
  initDefaultSettings();

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ----------------- SETTINGS -----------------
export function getSetting(key: string, defaultValue = ''): string {
  const d = getDb();
  const row = d.prepare('SELECT value FROM application_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function setSetting(key: string, value: string): void {
  const d = getDb();
  d.prepare(`
    INSERT INTO application_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const d = getDb();
  const rows = d.prepare('SELECT key, value FROM application_settings').all() as Array<{ key: string; value: string }>;
  const res: Record<string, string> = {};
  for (const r of rows) {
    res[r.key] = r.value;
  }
  return res;
}

function initDefaultSettings() {
  const defaults: Record<string, string> = {
    theme: 'dark',
    crealityPrintPath: 'C:\\Program Files\\Creality\\Creality Print 5.1\\CrealityPrint.exe',
    defaultSlicer: 'creality',
    cardSize: 'normal',
    defaultView: 'grid',
    thumbnailQuality: 'high',
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (!getSetting(k)) {
      setSetting(k, v);
    }
  }
}

// ----------------- LIBRARY ROOTS -----------------
export function getLibraryRoots() {
  const d = getDb();
  return d.prepare('SELECT * FROM library_roots ORDER BY created_at DESC').all();
}

export function addLibraryRoot(rootPath: string) {
  const d = getDb();
  const norm = path.normalize(rootPath);
  const now = new Date().toISOString();
  const info = d.prepare(`
    INSERT INTO library_roots (path, created_at, scan_status)
    VALUES (?, ?, 'idle')
    ON CONFLICT(path) DO UPDATE SET last_scanned_at = excluded.last_scanned_at
  `).run(norm, now);
  return info.lastInsertRowid;
}

export function removeLibraryRoot(id: number) {
  const d = getDb();
  return d.prepare('DELETE FROM library_roots WHERE id = ?').run(id);
}

export function updateLibraryRootStatus(id: number, status: string, lastScannedAt?: string) {
  const d = getDb();
  if (lastScannedAt) {
    d.prepare('UPDATE library_roots SET scan_status = ?, last_scanned_at = ? WHERE id = ?').run(status, lastScannedAt, id);
  } else {
    d.prepare('UPDATE library_roots SET scan_status = ? WHERE id = ?').run(status, id);
  }
}

// ----------------- PROJECTS -----------------
export function upsertProject(rootId: number, name: string, projectPath: string) {
  const d = getDb();
  const norm = path.normalize(projectPath);
  const now = new Date().toISOString();
  const existing = d.prepare('SELECT id FROM projects WHERE path = ?').get(norm) as { id: number } | undefined;
  if (existing) {
    d.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(name, now, existing.id);
    return existing.id;
  } else {
    const info = d.prepare(`
      INSERT INTO projects (root_id, name, path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(rootId, name, norm, now, now);
    return info.lastInsertRowid as number;
  }
}

export function getProjects(filter?: { favoriteOnly?: boolean; search?: string }) {
  const d = getDb();
  let sql = `
    SELECT 
      p.*,
      lr.path as root_path,
      COUNT(DISTINCT f.id) as total_files,
      COUNT(DISTINCT CASE WHEN f.file_type = 'stl' THEN f.id END) as stl_count,
      COALESCE(SUM(f.size), 0) as total_size,
      cover.thumbnail_path as cover_thumbnail
    FROM projects p
    JOIN library_roots lr ON p.root_id = lr.id
    LEFT JOIN files f ON f.project_id = p.id
    LEFT JOIN files cover ON p.cover_file_id = cover.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter?.favoriteOnly) {
    sql += ' AND p.is_favorite = 1';
  }
  if (filter?.search) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const term = `%${filter.search}%`;
    params.push(term, term);
  }

  sql += ' GROUP BY p.id ORDER BY p.is_favorite DESC, p.updated_at DESC';
  return d.prepare(sql).all(...params);
}

export function getProjectById(id: number) {
  const d = getDb();
  return d.prepare(`
    SELECT 
      p.*,
      lr.path as root_path,
      COUNT(DISTINCT f.id) as total_files,
      COUNT(DISTINCT CASE WHEN f.file_type = 'stl' THEN f.id END) as stl_count,
      COALESCE(SUM(f.size), 0) as total_size,
      cover.thumbnail_path as cover_thumbnail
    FROM projects p
    JOIN library_roots lr ON p.root_id = lr.id
    LEFT JOIN files f ON f.project_id = p.id
    LEFT JOIN files cover ON p.cover_file_id = cover.id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(id);
}

export function updateProjectDescription(id: number, description: string) {
  const d = getDb();
  const now = new Date().toISOString();
  return d.prepare('UPDATE projects SET description = ?, updated_at = ? WHERE id = ?').run(description, now, id);
}

export function updateProjectCover(projectId: number, fileId: number) {
  const d = getDb();
  const now = new Date().toISOString();
  return d.prepare('UPDATE projects SET cover_file_id = ?, updated_at = ? WHERE id = ?').run(fileId, now, projectId);
}

export function toggleProjectFavorite(id: number) {
  const d = getDb();
  return d.prepare('UPDATE projects SET is_favorite = (CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END) WHERE id = ?').run(id);
}

// ----------------- FOLDERS -----------------
export function upsertFolder(projectId: number, folderPath: string, relativePath: string) {
  const d = getDb();
  const norm = path.normalize(folderPath);
  const now = new Date().toISOString();
  const existing = d.prepare('SELECT id FROM folders WHERE path = ?').get(norm) as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }
  const info = d.prepare(`
    INSERT INTO folders (project_id, path, relative_path, created_at)
    VALUES (?, ?, ?, ?)
  `).run(projectId, norm, relativePath, now);
  return info.lastInsertRowid as number;
}

export function getFoldersByProject(projectId: number) {
  const d = getDb();
  return d.prepare('SELECT * FROM folders WHERE project_id = ? ORDER BY relative_path ASC').all(projectId);
}

export function updateFolderDescription(id: number, description: string) {
  const d = getDb();
  return d.prepare('UPDATE folders SET description = ? WHERE id = ?').run(description, id);
}

// ----------------- FILES -----------------
export function upsertFile(data: {
  projectId: number;
  folderId: number;
  filePath: string;
  name: string;
  extension: string;
  fileType: string;
  size: number;
  mtime: number;
}) {
  const d = getDb();
  const norm = path.normalize(data.filePath);
  const now = new Date().toISOString();
  const existing = d.prepare('SELECT id, mtime, size, thumbnail_status FROM files WHERE path = ?').get(norm) as
    | { id: number; mtime: number; size: number; thumbnail_status: string }
    | undefined;

  if (existing) {
    // If file has been modified, mark thumbnail pending to re-generate
    const modified = existing.mtime !== data.mtime || existing.size !== data.size;
    const thumbStatus = modified ? 'pending' : existing.thumbnail_status;

    d.prepare(`
      UPDATE files 
      SET name = ?, extension = ?, file_type = ?, size = ?, mtime = ?, folder_id = ?, thumbnail_status = ?
      WHERE id = ?
    `).run(data.name, data.extension, data.fileType, data.size, data.mtime, data.folderId, thumbStatus, existing.id);
    return existing.id;
  } else {
    const info = d.prepare(`
      INSERT INTO files (
        project_id, folder_id, path, name, extension, file_type, size, mtime, created_at, thumbnail_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.projectId,
      data.folderId,
      norm,
      data.name,
      data.extension,
      data.fileType,
      data.size,
      data.mtime,
      now,
      data.fileType === 'stl' ? 'pending' : 'ready'
    );
    return info.lastInsertRowid as number;
  }
}

export function removeFileByPath(filePath: string) {
  const d = getDb();
  const norm = path.normalize(filePath);
  return d.prepare('DELETE FROM files WHERE path = ?').run(norm);
}

export function getFiles(options?: {
  projectId?: number;
  folderId?: number;
  fileType?: string;
  favoriteOnly?: boolean;
  search?: string;
  tag?: string;
  sortBy?: 'name' | 'size' | 'mtime' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  const d = getDb();
  let sql = `
    SELECT 
      f.*,
      p.name as project_name,
      fol.relative_path as folder_relative_path,
      GROUP_CONCAT(t.name) as tags_string
    FROM files f
    JOIN projects p ON f.project_id = p.id
    JOIN folders fol ON f.folder_id = fol.id
    LEFT JOIN file_tags ft ON f.id = ft.file_id
    LEFT JOIN tags t ON ft.tag_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.projectId) {
    sql += ' AND f.project_id = ?';
    params.push(options.projectId);
  }
  if (options?.folderId) {
    sql += ' AND f.folder_id = ?';
    params.push(options.folderId);
  }
  if (options?.fileType && options.fileType !== 'all') {
    sql += ' AND f.file_type = ?';
    params.push(options.fileType);
  }
  if (options?.favoriteOnly) {
    sql += ' AND f.is_favorite = 1';
  }
  if (options?.search) {
    sql += ' AND (f.name LIKE ? OR p.name LIKE ? OR fol.relative_path LIKE ?)';
    const term = `%${options.search}%`;
    params.push(term, term, term);
  }
  if (options?.tag) {
    sql += ' AND f.id IN (SELECT ft2.file_id FROM file_tags ft2 JOIN tags t2 ON ft2.tag_id = t2.id WHERE t2.name = ?)';
    params.push(options.tag);
  }

  sql += ' GROUP BY f.id';

  // Sorting
  const sortBy = options?.sortBy || 'mtime';
  const sortOrder = (options?.sortOrder || 'desc').toUpperCase();
  sql += ` ORDER BY f.${sortBy} ${sortOrder}`;

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
    if (options?.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const rows = d.prepare(sql).all(...params) as any[];
  return rows.map((r) => ({
    ...r,
    tags: r.tags_string ? r.tags_string.split(',') : [],
  }));
}

export function getFileById(id: number) {
  const d = getDb();
  const row = d.prepare(`
    SELECT 
      f.*,
      p.name as project_name,
      p.description as project_description,
      fol.relative_path as folder_relative_path,
      fol.description as folder_description,
      GROUP_CONCAT(t.name) as tags_string
    FROM files f
    JOIN projects p ON f.project_id = p.id
    JOIN folders fol ON f.folder_id = fol.id
    LEFT JOIN file_tags ft ON f.id = ft.file_id
    LEFT JOIN tags t ON ft.tag_id = t.id
    WHERE f.id = ?
    GROUP BY f.id
  `).get(id) as any;

  if (!row) return null;
  return {
    ...row,
    tags: row.tags_string ? row.tags_string.split(',') : [],
  };
}

export function toggleFileFavorite(id: number) {
  const d = getDb();
  return d.prepare('UPDATE files SET is_favorite = (CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END) WHERE id = ?').run(id);
}

export function updateFileDescription(id: number, description: string) {
  const d = getDb();
  return d.prepare('UPDATE files SET description = ? WHERE id = ?').run(description, id);
}

export function updateFileThumbnail(
  id: number,
  thumbnailPath: string,
  dims?: { x: number; y: number; z: number },
  triangles?: number,
  vertices?: number,
  status = 'ready'
) {
  const d = getDb();
  if (dims) {
    d.prepare(`
      UPDATE files 
      SET thumbnail_path = ?, dim_x = ?, dim_y = ?, dim_z = ?, triangles = ?, vertices = ?, thumbnail_status = ?
      WHERE id = ?
    `).run(thumbnailPath, dims.x, dims.y, dims.z, triangles || 0, vertices || 0, status, id);
  } else {
    d.prepare(`
      UPDATE files 
      SET thumbnail_path = ?, thumbnail_status = ?
      WHERE id = ?
    `).run(thumbnailPath, status, id);
  }
}

export function getFilesNeedingThumbnail(limit = 20) {
  const d = getDb();
  return d.prepare(`
    SELECT id, path, mtime, size 
    FROM files 
    WHERE file_type = 'stl' AND (thumbnail_status = 'pending' OR thumbnail_path IS NULL)
    LIMIT ?
  `).all(limit) as Array<{ id: number; path: string; mtime: number; size: number }>;
}

// ----------------- TAGS -----------------
export function getAllTags() {
  const d = getDb();
  return d.prepare(`
    SELECT t.id, t.name, COUNT(ft.file_id) as count 
    FROM tags t
    LEFT JOIN file_tags ft ON t.id = ft.tag_id
    GROUP BY t.id
    ORDER BY count DESC, t.name ASC
  `).all();
}

export function addTagToFile(fileId: number, tagName: string) {
  const d = getDb();
  const cleanName = tagName.trim().toLowerCase();
  if (!cleanName) return;

  d.transaction(() => {
    let tag = d.prepare('SELECT id FROM tags WHERE name = ?').get(cleanName) as { id: number } | undefined;
    if (!tag) {
      const info = d.prepare('INSERT INTO tags (name) VALUES (?)').run(cleanName);
      tag = { id: info.lastInsertRowid as number };
    }
    d.prepare('INSERT OR IGNORE INTO file_tags (file_id, tag_id) VALUES (?, ?)').run(fileId, tag.id);
  })();
}

export function removeTagFromFile(fileId: number, tagName: string) {
  const d = getDb();
  const cleanName = tagName.trim().toLowerCase();
  const tag = d.prepare('SELECT id FROM tags WHERE name = ?').get(cleanName) as { id: number } | undefined;
  if (tag) {
    d.prepare('DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?').run(fileId, tag.id);
  }
}

// ----------------- DASHBOARD STATS -----------------
export function getDashboardStats() {
  const d = getDb();

  const counts = d.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_projects,
      COUNT(DISTINCT CASE WHEN f.file_type = 'stl' THEN f.id END) as total_stl,
      COUNT(DISTINCT CASE WHEN f.file_type = '3mf' THEN f.id END) as total_3mf,
      COUNT(DISTINCT CASE WHEN f.file_type = 'gcode' THEN f.id END) as total_gcode,
      COUNT(DISTINCT f.id) as total_files,
      COUNT(DISTINCT fol.id) as total_folders,
      COALESCE(SUM(f.size), 0) as total_size,
      COUNT(DISTINCT CASE WHEN f.is_favorite = 1 THEN f.id END) as favorite_count
    FROM library_roots lr
    LEFT JOIN projects p ON p.root_id = lr.id
    LEFT JOIN folders fol ON fol.project_id = p.id
    LEFT JOIN files f ON f.project_id = p.id
  `).get() as any;

  // 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent7Days = d.prepare(`
    SELECT COUNT(*) as count FROM files WHERE created_at >= ?
  `).get(sevenDaysAgo) as { count: number };

  const lastRoot = d.prepare('SELECT last_scanned_at FROM library_roots WHERE last_scanned_at IS NOT NULL ORDER BY last_scanned_at DESC LIMIT 1').get() as { last_scanned_at: string } | undefined;

  // Format distribution
  const formatDist = d.prepare(`
    SELECT file_type, COUNT(*) as count, COALESCE(SUM(size), 0) as total_size
    FROM files
    GROUP BY file_type
    ORDER BY count DESC
  `).all();

  // Largest projects
  const largestProjects = d.prepare(`
    SELECT p.id, p.name, COUNT(f.id) as file_count, COALESCE(SUM(f.size), 0) as total_size, cover.thumbnail_path as cover_thumbnail
    FROM projects p
    LEFT JOIN files f ON f.project_id = p.id
    LEFT JOIN files cover ON p.cover_file_id = cover.id
    GROUP BY p.id
    ORDER BY total_size DESC
    LIMIT 5
  `).all();

  // Recent files
  const recentFiles = d.prepare(`
    SELECT f.*, p.name as project_name
    FROM files f
    JOIN projects p ON f.project_id = p.id
    ORDER BY f.created_at DESC
    LIMIT 6
  `).all();

  // Scan errors count
  const scanErrors = d.prepare('SELECT * FROM scan_errors ORDER BY created_at DESC LIMIT 10').all();

  return {
    totalProjects: counts?.total_projects || 0,
    totalSTL: counts?.total_stl || 0,
    total3MF: counts?.total_3mf || 0,
    totalGcode: counts?.total_gcode || 0,
    totalFiles: counts?.total_files || 0,
    totalFolders: counts?.total_folders || 0,
    totalSize: counts?.total_size || 0,
    favoriteCount: counts?.favorite_count || 0,
    recentCount7Days: recent7Days?.count || 0,
    lastScanTime: lastRoot?.last_scanned_at || null,
    formatDistribution: formatDist,
    largestProjects,
    recentFiles,
    scanErrors,
  };
}

// ----------------- SCAN ERRORS & HISTORY -----------------
export function recordScanError(filePath: string, errorMessage: string) {
  const d = getDb();
  d.prepare('INSERT INTO scan_errors (path, error_message, created_at) VALUES (?, ?, ?)').run(
    filePath,
    errorMessage,
    new Date().toISOString()
  );
}

export function getScanErrors() {
  const d = getDb();
  return d.prepare('SELECT * FROM scan_errors ORDER BY created_at DESC LIMIT 50').all();
}

export function clearScanErrors() {
  const d = getDb();
  return d.prepare('DELETE FROM scan_errors').run();
}

export function recordScanHistory(rootId: number, status: string, filesFound: number, foldersScanned: number, errorMsg?: string) {
  const d = getDb();
  const now = new Date().toISOString();
  d.prepare(`
    INSERT INTO scan_history (root_id, started_at, completed_at, files_found, folders_scanned, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(rootId, now, now, filesFound, foldersScanned, status, errorMsg || null);
}

// ----------------- CLEAN ORPHANED RECORDS -----------------
export function cleanOrphanedRecords(rootId: number, scannedFilePaths: Set<string>, scannedFolderPaths: Set<string>) {
  const d = getDb();
  d.transaction(() => {
    // Get all projects for this root
    const projects = d.prepare('SELECT id, path FROM projects WHERE root_id = ?').all(rootId) as Array<{ id: number; path: string }>;
    for (const proj of projects) {
      const files = d.prepare('SELECT id, path FROM files WHERE project_id = ?').all(proj.id) as Array<{ id: number; path: string }>;
      for (const f of files) {
        if (!scannedFilePaths.has(f.path)) {
          d.prepare('DELETE FROM files WHERE id = ?').run(f.id);
        }
      }

      const folders = d.prepare('SELECT id, path FROM folders WHERE project_id = ?').all(proj.id) as Array<{ id: number; path: string }>;
      for (const fol of folders) {
        if (!scannedFolderPaths.has(fol.path)) {
          d.prepare('DELETE FROM folders WHERE id = ?').run(fol.id);
        }
      }

      // Check if project directory still exists
      if (!fs.existsSync(proj.path)) {
        d.prepare('DELETE FROM projects WHERE id = ?').run(proj.id);
      }
    }
  })();
}

