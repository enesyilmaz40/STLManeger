import React from 'react';
import { Box, Star, Folder, HardDrive, RefreshCw, AlertCircle } from 'lucide-react';
import { ModelFile } from '../../types/electron';
import { useAppStore } from '../../store/useAppStore';
import { getAssetUrl } from '../../utils/assetUrl';

interface ModelCardProps {
  model: ModelFile;
}

export const ModelCard: React.FC<ModelCardProps> = ({ model }) => {
  const { setSelectedModelId, toggleFileFavorite } = useAppStore();

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFileFavorite(model.id);
  };

  return (
    <div
      onClick={() => setSelectedModelId(model.id)}
      className="group relative flex flex-col bg-[#0e1526] hover:bg-[#131c31] border border-slate-800/80 hover:border-blue-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
    >
      {/* Thumbnail Area */}
      <div className="w-full aspect-square bg-[#080d18] relative flex items-center justify-center overflow-hidden border-b border-slate-800/60">
        {model.thumbnail_path ? (
          <img
            src={getAssetUrl(model.thumbnail_path)}
            alt={model.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : model.thumbnail_status === 'pending' ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-blue-400/80">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-[10px] text-slate-500">3D Oluşturuluyor...</span>
          </div>
        ) : model.thumbnail_status === 'failed' ? (
          <div className="flex flex-col items-center justify-center space-y-2 text-rose-400/80">
            <AlertCircle className="w-8 h-8" />
            <span className="text-[10px] text-slate-500">Önizleme Üretilemedi</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 text-slate-600">
            <Box className="w-10 h-10 stroke-[1.5]" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">{model.file_type}</span>
          </div>
        )}

        {/* Format Badge */}
        <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300">
          {model.file_type}
        </span>

        {/* Favorite Star */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md transition ${
            model.is_favorite
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
          title={model.is_favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
        >
          <Star className={`w-4 h-4 ${model.is_favorite ? 'fill-current' : ''}`} />
        </button>

        {/* Dimensions badge if available */}
        {model.dim_x && model.dim_y && model.dim_z ? (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-[10px] text-slate-400 font-mono">
            {Math.round(model.dim_x)}×{Math.round(model.dim_y)}×{Math.round(model.dim_z)} mm
          </div>
        ) : null}
      </div>

      {/* Info Area */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate" title={model.name}>
            {model.name}
          </h4>
          <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-400 truncate">
            <span className="text-blue-400 font-semibold truncate">{model.project_name}</span>
            {model.folder_relative_path && model.folder_relative_path !== '/' && (
              <>
                <span>/</span>
                <span className="truncate text-slate-500">{model.folder_relative_path.replace(/^\//, '')}</span>
              </>
            )}
          </div>
        </div>

        {/* Tags (if any) */}
        {model.tags && model.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {model.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                #{t}
              </span>
            ))}
            {model.tags.length > 2 && (
              <span className="text-[9px] text-slate-500">+{model.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatSize(model.size)}</span>
          </span>
          {model.triangles ? (
            <span className="text-[10px] text-slate-400 font-medium">
              {model.triangles.toLocaleString('tr-TR')} ▲
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">
              {new Date(model.mtime).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

