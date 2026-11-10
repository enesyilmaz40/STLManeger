-- STL Manager SQLite Database Schema

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

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(is_favorite);
CREATE INDEX IF NOT EXISTS idx_files_mtime ON files(mtime);
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_root_id ON projects(root_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_favorite ON projects(is_favorite);

