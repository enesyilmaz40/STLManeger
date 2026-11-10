import React from 'react';
import { FolderKanban, Box, Layers, HardDrive, Star, Calendar } from 'lucide-react';
import { Project } from '../../types/electron';
import { useAppStore } from '../../store/useAppStore';
import { getAssetUrl } from '../../utils/assetUrl';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { setSelectedProjectFilter, setCurrentView, toggleProjectFavorite } = useAppStore();

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleClick = () => {
    setSelectedProjectFilter(project.id);
    setCurrentView('models');
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleProjectFavorite(project.id);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col bg-[#0e1526] hover:bg-[#121b30] border border-slate-800/80 hover:border-blue-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/10"
    >
      {/* Cover / 3D Image */}
      <div className="w-full h-44 bg-slate-950/80 relative flex items-center justify-center overflow-hidden border-b border-slate-800/60">
        {project.cover_thumbnail ? (
          <img
            src={getAssetUrl(project.cover_thumbnail)}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 space-y-2">
            <Box className="w-12 h-12 stroke-[1.5]" />
            <span className="text-[11px] font-medium text-slate-500">3D Önizleme Yok</span>
          </div>
        )}

        {/* Favorite Button Overlay */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md transition ${
            project.is_favorite
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
          title={project.is_favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
        >
          <Star className={`w-4 h-4 ${project.is_favorite ? 'fill-current' : ''}`} />
        </button>

        {/* STL Count Badge */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-semibold text-blue-400">
          <Box className="w-3.5 h-3.5" />
          <span>{project.stl_count} STL</span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition truncate" title={project.name}>
            {project.name}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1">
            {project.description || 'Henüz proje açıklaması eklenmemiş.'}
          </p>
        </div>

        {/* Meta details footer */}
        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>{project.total_files} Dosya</span>
          </span>
          <span className="flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatSize(project.total_size)}</span>
          </span>
          <span className="flex items-center space-x-1" title="Güncellenme">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(project.updated_at).toLocaleDateString('tr-TR')}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

