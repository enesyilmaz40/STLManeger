import { create } from 'zustand';
import { LibraryRoot, Project, ModelFile, DashboardStats } from '../types/electron';

interface AppState {
  currentView: 'dashboard' | 'projects' | 'models' | 'favorites' | 'recent' | 'settings';
  selectedProjectFilter: number | null;
  searchQuery: string;
  fileTypeFilter: string;
  tagFilter: string | null;
  sortBy: 'name' | 'size' | 'mtime' | 'created_at';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';

  roots: LibraryRoot[];
  projects: Project[];
  models: ModelFile[];
  stats: DashboardStats | null;
  tags: Array<{ id: number; name: string; count: number }>;
  settings: Record<string, string>;

  selectedModelId: number | null;
  isScanning: boolean;
  scanProgress: { currentFolder: string; foldersScanned: number; filesFound: number } | null;

  // Actions
  setCurrentView: (view: AppState['currentView']) => void;
  setSelectedProjectFilter: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
  setFileTypeFilter: (type: string) => void;
  setTagFilter: (tag: string | null) => void;
  setSortBy: (sort: AppState['sortBy']) => void;
  setSortOrder: (order: AppState['sortOrder']) => void;
  setViewMode: (mode: AppState['viewMode']) => void;
  setSelectedModelId: (id: number | null) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: any) => void;

  // Async data loaders
  fetchRoots: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchModels: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  refreshAll: () => Promise<void>;

  addLibraryFolder: () => Promise<void>;
  toggleFileFavorite: (id: number) => Promise<void>;
  toggleProjectFavorite: (id: number) => Promise<void>;
  updateFileDescription: (id: number, desc: string) => Promise<void>;
  updateProjectDescription: (id: number, desc: string) => Promise<void>;
  updateFolderDescription: (id: number, desc: string) => Promise<void>;
  updateProjectCover: (projectId: number, fileId: number) => Promise<void>;
  addTag: (fileId: number, tag: string) => Promise<void>;
  removeTag: (fileId: number, tag: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  selectedProjectFilter: null,
  searchQuery: '',
  fileTypeFilter: 'all',
  tagFilter: null,
  sortBy: 'mtime',
  sortOrder: 'desc',
  viewMode: 'grid',

  roots: [],
  projects: [],
  models: [],
  stats: null,
  tags: [],
  settings: {},

  selectedModelId: null,
  isScanning: false,
  scanProgress: null,

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedProjectFilter: (id) => set({ selectedProjectFilter: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFileTypeFilter: (type) => set({ fileTypeFilter: type }),
  setTagFilter: (tag) => set({ tagFilter: tag }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setIsScanning: (isScanning) => set({ isScanning }),
  setScanProgress: (scanProgress) => set({ scanProgress }),

  fetchRoots: async () => {
    try {
      const roots = await window.api.getRoots();
      set({ roots });
    } catch (err) {
      console.error('fetchRoots error:', err);
    }
  },

  fetchProjects: async () => {
    try {
      const { searchQuery } = get();
      const projects = await window.api.getProjects({ search: searchQuery });
      set({ projects });
    } catch (err) {
      console.error('fetchProjects error:', err);
    }
  },

  fetchModels: async () => {
    try {
      const { selectedProjectFilter, fileTypeFilter, tagFilter, sortBy, sortOrder, searchQuery, currentView } = get();
      const options: any = {
        projectId: selectedProjectFilter || undefined,
        fileType: fileTypeFilter,
        tag: tagFilter || undefined,
        sortBy,
        sortOrder,
        search: searchQuery || undefined,
      };

      if (currentView === 'favorites') {
        options.favoriteOnly = true;
      }

      const models = await window.api.getFiles(options);
      set({ models });
    } catch (err) {
      console.error('fetchModels error:', err);
    }
  },

  fetchStats: async () => {
    try {
      const stats = await window.api.getDashboardStats();
      set({ stats });
    } catch (err) {
      console.error('fetchStats error:', err);
    }
  },

  fetchTags: async () => {
    try {
      const tags = await window.api.getAllTags();
      set({ tags });
    } catch (err) {
      console.error('fetchTags error:', err);
    }
  },

  fetchSettings: async () => {
    try {
      const settings = await window.api.getSettings();
      set({ settings });
    } catch (err) {
      console.error('fetchSettings error:', err);
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchRoots(),
      get().fetchProjects(),
      get().fetchModels(),
      get().fetchStats(),
      get().fetchTags(),
      get().fetchSettings(),
    ]);
  },

  addLibraryFolder: async () => {
    const dir = await window.api.selectDirectory();
    if (!dir) return;
    set({ isScanning: true });
    try {
      await window.api.addRoot(dir);
      await get().refreshAll();
    } catch (err) {
      console.error('addLibraryFolder error:', err);
    } finally {
      set({ isScanning: false, scanProgress: null });
    }
  },

  toggleFileFavorite: async (id: number) => {
    await window.api.toggleFileFavorite(id);
    await get().fetchModels();
    await get().fetchStats();
  },

  toggleProjectFavorite: async (id: number) => {
    await window.api.toggleProjectFavorite(id);
    await get().fetchProjects();
    await get().fetchStats();
  },

  updateFileDescription: async (id: number, desc: string) => {
    await window.api.updateFileDescription(id, desc);
    await get().fetchModels();
  },

  updateProjectDescription: async (id: number, desc: string) => {
    await window.api.updateProjectDescription(id, desc);
    await get().fetchProjects();
  },

  updateFolderDescription: async (id: number, desc: string) => {
    await window.api.updateFolderDescription(id, desc);
  },

  updateProjectCover: async (projectId: number, fileId: number) => {
    await window.api.updateProjectCover(projectId, fileId);
    await get().fetchProjects();
  },

  addTag: async (fileId: number, tag: string) => {
    await window.api.addTag(fileId, tag);
    await get().fetchModels();
    await get().fetchTags();
  },

  removeTag: async (fileId: number, tag: string) => {
    await window.api.removeTag(fileId, tag);
    await get().fetchModels();
    await get().fetchTags();
  },
}));

