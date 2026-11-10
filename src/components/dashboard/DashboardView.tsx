import React from 'react';
import {
  FolderKanban,
  Box,
  Layers,
  FileCode,
  HardDrive,
  Star,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAssetUrl } from '../../utils/assetUrl';

export const DashboardView: React.FC = () => {
  const { stats, setCurrentView, setSelectedProjectFilter, setSelectedModelId } = useAppStore();

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">İstatistikler yükleniyor...</div>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const statCards = [
    {
      title: 'Toplam Proje',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'from-blue-500/20 to-blue-600/5',
      iconColor: 'text-blue-400',
      action: () => setCurrentView('projects'),
    },
    {
      title: 'Toplam STL',
      value: stats.totalSTL,
      icon: Box,
      color: 'from-indigo-500/20 to-indigo-600/5',
      iconColor: 'text-indigo-400',
      action: () => {
        useAppStore.getState().setFileTypeFilter('stl');
        setCurrentView('models');
      },
    },
    {
      title: 'Toplam 3MF',
      value: stats.total3MF,
      icon: Layers,
      color: 'from-sky-500/20 to-sky-600/5',
      iconColor: 'text-sky-400',
      action: () => {
        useAppStore.getState().setFileTypeFilter('3mf');
        setCurrentView('models');
      },
    },
    {
      title: 'Toplam G-code',
      value: stats.totalGcode,
      icon: FileCode,
      color: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-400',
      action: () => {
        useAppStore.getState().setFileTypeFilter('gcode');
        setCurrentView('models');
      },
    },
    {
      title: 'Toplam Dosya',
      value: stats.totalFiles,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-emerald-600/5',
      iconColor: 'text-emerald-400',
      action: () => setCurrentView('models'),
    },
    {
      title: 'Taranan Klasör',
      value: stats.totalFolders,
      icon: FolderTree,
      color: 'from-violet-500/20 to-violet-600/5',
      iconColor: 'text-violet-400',
    },
    {
      title: 'Toplam Boyut',
      value: formatSize(stats.totalSize),
      icon: HardDrive,
      color: 'from-teal-500/20 to-teal-600/5',
      iconColor: 'text-teal-400',
    },
    {
      title: 'Favori Modeller',
      value: stats.favoriteCount,
      icon: Star,
      color: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-400',
      action: () => setCurrentView('favorites'),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Banner with Last Scan Info */}
      <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Kütüphane Durumu</h3>
            <p className="text-xs text-slate-400">
              {stats.lastScanTime
                ? `Son tarama: ${new Date(stats.lastScanTime).toLocaleString('tr-TR')}`
                : 'Henüz tarama yapılmadı'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <span className="font-semibold text-blue-400">{stats.recentCount7Days}</span>
          <span>yeni model son 7 günde eklendi</span>
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.action}
              className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition shadow-sm ${
                card.action ? 'cursor-pointer hover:scale-[1.02]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{card.title}</span>
                <Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Two Columns: Format Distribution & Largest Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Format Distribution */}
        <div className="p-5 rounded-2xl bg-[#0e1526] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200">Dosya Formatı Dağılımı</h4>
            <span className="text-xs text-slate-400">{stats.totalFiles} dosya</span>
          </div>

          <div className="space-y-3">
            {stats.formatDistribution.map((item) => {
              const pct = stats.totalFiles > 0 ? Math.round((item.count / stats.totalFiles) * 100) : 0;
              return (
                <div key={item.file_type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 uppercase">{item.file_type}</span>
                    <span className="text-slate-400">
                      {item.count} dosya ({pct}%) • {formatSize(item.total_size)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Largest Projects */}
        <div className="p-5 rounded-2xl bg-[#0e1526] border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200">En Büyük Projeler</h4>
            <button
              onClick={() => setCurrentView('projects')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <span>Tümünü Gör</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {stats.largestProjects.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Henüz proje bulunmuyor.</p>
            ) : (
              stats.largestProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectFilter(p.id);
                    setCurrentView('models');
                  }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 cursor-pointer transition"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-200 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-400">{p.file_count} dosya</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    {formatSize(p.total_size)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Models Section */}
      <div className="p-5 rounded-2xl bg-[#0e1526] border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200">Son Eklenen Modeller</h4>
          <button
            onClick={() => setCurrentView('recent')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>Kataloga Git</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {stats.recentFiles.length === 0 ? (
            <div className="col-span-6 text-center text-xs text-slate-500 py-6">
              Model bulunamadı.
            </div>
          ) : (
            stats.recentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedModelId(file.id)}
                className="group p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/70 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition space-y-2"
              >
                <div className="w-full aspect-square rounded-lg bg-slate-950/70 flex items-center justify-center overflow-hidden relative">
                  {file.thumbnail_path ? (
                    <img
                      src={getAssetUrl(file.thumbnail_path)}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <Box className="w-8 h-8 text-slate-600" />
                  )}
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase bg-slate-900/80 px-1.5 py-0.5 rounded text-slate-300">
                    {file.file_type}
                  </span>
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-blue-400 transition" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{file.project_name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scan Errors Panel (if any) */}
      {stats.scanErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Tarama Sırasında Atlanan Dosyalar / Hatalar ({stats.scanErrors.length})</span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-slate-400">
            {stats.scanErrors.map((err) => (
              <div key={err.id} className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded">
                <span className="truncate max-w-lg font-mono text-slate-300">{err.path}</span>
                <span className="text-amber-300/80">{err.error_message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

