import { ElectronAPI } from '../../electron/preload';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export interface LibraryRoot {
  id: number;
  path: string;
  created_at: string;
  last_scanned_at?: string;
  scan_status: 'idle' | 'scanning' | 'error';
}

export interface Project {
  id: number;
  root_id: number;
  name: string;
  path: string;
  description: string;
  cover_file_id?: number | null;
  cover_thumbnail?: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
  total_files: number;
  stl_count: number;
  total_size: number;
  root_path?: string;
}

export interface Folder {
  id: number;
  project_id: number;
  path: string;
  relative_path: string;
  description: string;
  created_at: string;
}

export interface ModelFile {
  id: number;
  project_id: number;
  folder_id: number;
  path: string;
  name: string;
  extension: string;
  file_type: 'stl' | '3mf' | 'gcode' | 'obj' | 'step' | 'f3d' | 'amf' | 'ply' | 'other';
  size: number;
  mtime: number;
  created_at: string;
  is_favorite: number;
  description: string;
  dim_x?: number | null;
  dim_y?: number | null;
  dim_z?: number | null;
  triangles?: number | null;
  vertices?: number | null;
  thumbnail_path?: string | null;
  thumbnail_status: 'pending' | 'processing' | 'ready' | 'failed';
  project_name?: string;
  project_description?: string;
  folder_relative_path?: string;
  folder_description?: string;
  tags?: string[];
}

export interface DashboardStats {
  totalProjects: number;
  totalSTL: number;
  total3MF: number;
  totalGcode: number;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  favoriteCount: number;
  recentCount7Days: number;
  lastScanTime: string | null;
  formatDistribution: Array<{ file_type: string; count: number; total_size: number }>;
  largestProjects: Array<{ id: number; name: string; file_count: number; total_size: number; cover_thumbnail?: string }>;
  recentFiles: ModelFile[];
  scanErrors: Array<{ id: number; path: string; error_message: string; created_at: string }>;
}

