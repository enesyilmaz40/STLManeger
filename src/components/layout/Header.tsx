import React from 'react';
import { Search, RefreshCw, FolderPlus } from 'lucide-react';
import { WindowControls } from './WindowControls';
import { useAppStore } from '../../store/useAppStore';

export const Header: React.FC = () => {
  const {
    currentView,
    searchQuery,
    setSearchQuery,
    fetchModels,
    fetchProjects,
    isScanning,
    refreshAll,
    addLibraryFolder,
    selectedProjectFilter,
    projects,
  } = useAppStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    fetchModels();
    fetchProjects();
  };

  const getTitle = () => {
    if (selectedProjectFilter) {
      const proj = projects.find((p) => p.id === selectedProjectFilter);
      return proj ? `Proje: ${proj.name}` : 'Proje Modelleri';
    }
    switch (currentView) {
      case 'dashboard':
        return 'Yönetim Paneli';
      case 'projects':
        return 'Projeler';
      case 'models':
        return 'Tüm Modeller';
      case 'favorites':
        return 'Favori Modeller';
      case 'recent':
        return 'Son Eklenen Modeller';
      case 'settings':
        return 'Ayarlar';
      default:
        return 'STL Manager';
    }
  };

  return (
    <header className="h-16 bg-[#0b101d] border-b border-slate-800/80 px-6 flex items-center justify-between window-drag-region select-none z-10">
      {/* View Title */}
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">{getTitle()}</h2>
      </div>

      {/* Center Search Input */}
      <div className="w-96 window-no-drag">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Model adı, proje adı veya etiket ara..."
            className="w-full bg-slate-900/80 border border-slate-800 focus:border-blue-500/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                fetchModels();
                fetchProjects();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* Right Actions & Window Controls */}
      <div className="flex items-center space-x-4 window-no-drag">
        <button
          onClick={() => refreshAll()}
          disabled={isScanning}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs font-medium transition ${
            isScanning ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="Kütüphaneyi Yeniden Tara"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-400' : ''}`} />
          <span>Yenile</span>
        </button>

        <button
          onClick={addLibraryFolder}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white text-xs font-semibold transition"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Klasör Ekle</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <WindowControls />
      </div>
    </header>
  );
};

