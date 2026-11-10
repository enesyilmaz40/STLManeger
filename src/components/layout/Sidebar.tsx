import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Box,
  Star,
  Clock,
  Settings,
  FolderPlus,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    setSelectedProjectFilter,
    addLibraryFolder,
    isScanning,
    scanProgress,
    stats,
    roots,
  } = useAppStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projeler', icon: FolderKanban },
    { id: 'models', label: 'Tüm Modeller', icon: Box },
    { id: 'favorites', label: 'Favoriler', icon: Star },
    { id: 'recent', label: 'Son Eklenenler', icon: Clock },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ] as const;

  const handleNavClick = (id: typeof currentView) => {
    setSelectedProjectFilter(null);
    setCurrentView(id);
  };

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between select-none h-full z-20">
      <div>
        {/* App Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60 space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">STL Manager</h1>
            <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block">
              3D Model Library
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'models' && stats?.totalSTL ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {stats.totalSTL}
                  </span>
                ) : null}
                {item.id === 'projects' && stats?.totalProjects ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {stats.totalProjects}
                  </span>
                ) : null}
                {item.id === 'favorites' && stats?.favoriteCount ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                    {stats.favoriteCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-800/60 space-y-3">
        {/* Scanning indicator */}
        {isScanning && (
          <div className="p-3 bg-blue-950/40 border border-blue-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-300">
              <span className="flex items-center gap-1.5 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                Taranıyor...
              </span>
              <span className="text-[10px] text-blue-400 font-semibold">
                {scanProgress?.filesFound || 0} dosya
              </span>
            </div>
            {scanProgress?.currentFolder && (
              <p className="text-[11px] text-slate-400 truncate" title={scanProgress.currentFolder}>
                {scanProgress.currentFolder}
              </p>
            )}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse rounded-full w-2/3" />
            </div>
          </div>
        )}

        {/* Quick Add Folder */}
        <button
          onClick={addLibraryFolder}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition active:scale-[0.98]"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Klasör Ekle</span>
        </button>

        {/* Storage Summary */}
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            {roots.length} Kök Klasör
          </span>
          <span>
            {stats?.totalSize ? (stats.totalSize / (1024 * 1024)).toFixed(1) + ' MB' : '0 MB'}
          </span>
        </div>
      </div>
    </aside>
  );
};

