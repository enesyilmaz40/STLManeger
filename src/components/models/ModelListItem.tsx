import React from 'react';
import { Box, Star, HardDrive } from 'lucide-react';
import { ModelFile } from '../../types/electron';
import { useAppStore } from '../../store/useAppStore';
import { getAssetUrl } from '../../utils/assetUrl';

interface ModelListItemProps {
  model: ModelFile;
}

export const ModelListItem: React.FC<ModelListItemProps> = ({ model }) => {
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
      className="flex items-center justify-between p-3 rounded-xl bg-[#0e1526] hover:bg-[#131c31] border border-slate-800/80 hover:border-blue-500/40 cursor-pointer transition select-none"
    >
      <div className="flex items-center space-x-3.5 min-w-0">
        {/* Tiny thumbnail */}
        <div className="w-12 h-12 rounded-lg bg-slate-950 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-800">
          {model.thumbnail_path ? (
            <img
              src={getAssetUrl(model.thumbnail_path)}
              alt={model.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Box className="w-5 h-5 text-slate-600" />
          )}
        </div>

        {/* Title and path */}
        <div className="min-w-0 truncate">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white truncate hover:text-blue-400">
              {model.name}
            </span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {model.file_type}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">
            <span className="text-blue-400 font-medium">{model.project_name}</span>
            {model.folder_relative_path && model.folder_relative_path !== '/' && (
              <span className="text-slate-500"> {model.folder_relative_path}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right meta details */}
      <div className="flex items-center space-x-6 flex-shrink-0">
        {model.dim_x && model.dim_y && model.dim_z ? (
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {Math.round(model.dim_x)}×{Math.round(model.dim_y)}×{Math.round(model.dim_z)} mm
          </span>
        ) : null}

        <span className="text-xs text-slate-300 font-medium min-w-[70px] text-right">
          {formatSize(model.size)}
        </span>

        <span className="text-xs text-slate-400 hidden sm:inline min-w-[80px] text-right">
          {new Date(model.mtime).toLocaleDateString('tr-TR')}
        </span>

        {/* Favorite */}
        <button
          onClick={handleFavoriteClick}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
            model.is_favorite
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Star className={`w-4 h-4 ${model.is_favorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
};

