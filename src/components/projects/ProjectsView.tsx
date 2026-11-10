import React from 'react';
import { ProjectCard } from './ProjectCard';
import { FolderKanban, Star, FolderPlus } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ProjectsView: React.FC = () => {
  const { projects, addLibraryFolder } = useAppStore();
  const [filterFav, setFilterFav] = React.useState(false);

  const displayedProjects = filterFav ? projects.filter((p) => p.is_favorite === 1) : projects;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* View Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100">Katalog Projeleri</h2>
          <p className="text-xs text-slate-400">
            Toplam {projects.length} proje indekslendi
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setFilterFav(!filterFav)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filterFav
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterFav ? 'fill-current text-amber-400' : ''}`} />
            <span>Sadece Favoriler</span>
          </button>
        </div>
      </div>

      {/* Grid of Projects */}
      {displayedProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <FolderKanban className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Proje Bulunamadı</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {filterFav
                ? 'Henüz favorilere eklenmiş bir proje bulunmuyor.'
                : 'Kütüphanede taranmış proje bulunmuyor. Yeni bir klasör ekleyerek başlayabilirsiniz.'}
            </p>
          </div>
          {!filterFav && (
            <button
              onClick={addLibraryFolder}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Klasör Ekle</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedProjects.map((proj) => (
            <ProjectCard key={proj.id} project={proj} />
          ))}
        </div>
      )}
    </div>
  );
};

