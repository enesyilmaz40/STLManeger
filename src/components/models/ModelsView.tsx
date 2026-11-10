import React from 'react';
import { ModelCard } from './ModelCard';
import { ModelListItem } from './ModelListItem';
import {
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  Box,
  Tag,
  X,
  FolderKanban,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ModelsView: React.FC = () => {
  const {
    models,
    fileTypeFilter,
    setFileTypeFilter,
    fetchModels,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    tagFilter,
    setTagFilter,
    tags,
    selectedProjectFilter,
    setSelectedProjectFilter,
    projects,
    currentView,
  } = useAppStore();

  const handleTypeChange = (type: string) => {
    setFileTypeFilter(type);
    fetchModels();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as any);
    fetchModels();
  };

  const toggleOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    fetchModels();
  };

  const currentProject = selectedProjectFilter
    ? projects.find((p) => p.id === selectedProjectFilter)
    : null;

  const fileTypes = [
    { id: 'all', label: 'Tümü' },
    { id: 'stl', label: 'STL' },
    { id: '3mf', label: '3MF' },
    { id: 'gcode', label: 'G-code' },
    { id: 'obj', label: 'OBJ' },
    { id: 'step', label: 'STEP' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Active Project Filter Banner (if filtering by a specific project) */}
      {currentProject && (
        <div className="flex items-center justify-between p-3.5 bg-blue-950/40 border border-blue-500/40 rounded-xl">
          <div className="flex items-center space-x-2 text-xs text-blue-300">
            <FolderKanban className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400">Aktif Proje Filtresi:</span>
            <span className="font-bold text-white">{currentProject.name}</span>
            <span className="text-slate-400">({models.length} dosya)</span>
          </div>
          <button
            onClick={() => {
              setSelectedProjectFilter(null);
              fetchModels();
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Filtreyi Temizle</span>
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#0d1424] border border-slate-800/80 rounded-2xl">
        {/* Left: File Type Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {fileTypes.map((ft) => (
            <button
              key={ft.id}
              onClick={() => handleTypeChange(ft.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                fileTypeFilter === ft.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>

        {/* Right: Tags, Sorting & View Mode Switch */}
        <div className="flex items-center space-x-3">
          {/* Tag Filter */}
          {tags.length > 0 && (
            <div className="relative">
              <select
                value={tagFilter || ''}
                onChange={(e) => {
                  setTagFilter(e.target.value || null);
                  fetchModels();
                }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="">Tüm Etiketler</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.name}>
                    #{t.name} ({t.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="mtime">Değiştirilme Tarihi</option>
              <option value="created_at">Eklenme Tarihi</option>
              <option value="name">Dosya Adı</option>
              <option value="size">Dosya Boyutu</option>
            </select>
            <button
              onClick={toggleOrder}
              className="p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition"
              title={sortOrder === 'asc' ? 'Artan' : 'Azalan'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Grid / List Switch */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Kart Görünümü"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Liste Görünümü"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Models Content */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Box className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Model Bulunamadı</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Filtrelerinize veya arama kriterlerinize uyan herhangi bir dosya bulunamadı.
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <ModelListItem key={model.id} model={model} />
          ))}
        </div>
      )}
    </div>
  );
};

