import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  FolderOpen,
  Copy,
  Check,
  Star,
  Image,
  Tag,
  Plus,
  X,
  FileText,
  Printer,
  Calendar,
  HardDrive,
  Info,
} from 'lucide-react';
import { ModelFile } from '../../types/electron';
import { useAppStore } from '../../store/useAppStore';

interface RightInfoPanelProps {
  model: ModelFile;
  onModelUpdated?: () => void;
}

export const RightInfoPanel: React.FC<RightInfoPanelProps> = ({ model, onModelUpdated }) => {
  const {
    toggleFileFavorite,
    updateFileDescription,
    updateProjectDescription,
    updateFolderDescription,
    updateProjectCover,
    addTag,
    removeTag,
  } = useAppStore();

  const [copied, setCopied] = useState(false);
  const [slicerError, setSlicerError] = useState<string | null>(null);
  const [slicerSuccess, setSlicerSuccess] = useState(false);

  // Description inputs
  const [modelDesc, setModelDesc] = useState(model.description || '');
  const [folderDesc, setFolderDesc] = useState(model.folder_description || '');
  const [projectDesc, setProjectDesc] = useState(model.project_description || '');

  // Tag input
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setModelDesc(model.description || '');
    setFolderDesc(model.folder_description || '');
    setProjectDesc(model.project_description || '');
    setSlicerError(null);
    setSlicerSuccess(false);
  }, [model.id]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const handleCopyPath = async () => {
    await window.api.copyPathToClipboard(model.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenCreality = async () => {
    setSlicerError(null);
    setSlicerSuccess(false);
    const res = await window.api.openInCrealityPrint(model.path);
    if (!res.success) {
      setSlicerError(res.message || 'Creality Print açılamadı.');
    } else {
      setSlicerSuccess(true);
      setTimeout(() => setSlicerSuccess(false), 3000);
    }
  };

  const handleOpenDefault = async () => {
    const res = await window.api.openWithDefaultApp(model.path);
    if (!res.success) {
      setSlicerError(res.message || 'Varsayılan uygulama başlatılamadı.');
    }
  };

  const handleShowInFolder = async () => {
    await window.api.showInFolder(model.path);
  };

  const handleSetCover = async () => {
    await updateProjectCover(model.project_id, model.id);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    await addTag(model.id, newTag.trim());
    setNewTag('');
    if (onModelUpdated) onModelUpdated();
  };

  const handleRemoveTag = async (tag: string) => {
    await removeTag(model.id, tag);
    if (onModelUpdated) onModelUpdated();
  };

  return (
    <div className="w-84 bg-[#0a0f1d] border-l border-slate-800 flex flex-col h-full overflow-y-auto select-none p-4 space-y-5 text-xs">
      {/* Top Header: Name and Favorite */}
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white break-words" title={model.name}>
            {model.name}
          </h3>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 mt-1 inline-block">
            {model.file_type} Formatı
          </span>
        </div>
        <button
          onClick={() => toggleFileFavorite(model.id)}
          className={`p-2 rounded-xl border transition flex-shrink-0 ${
            model.is_favorite
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={model.is_favorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
        >
          <Star className={`w-4 h-4 ${model.is_favorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleOpenCreality}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-500/20 active:scale-[0.98] transition"
        >
          <Printer className="w-4 h-4" />
          <span>Creality Print ile Aç</span>
        </button>

        <button
          onClick={handleOpenDefault}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-medium transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Varsayılan Uygulamayla Aç</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShowInFolder}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium transition"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Klasörde Göster</span>
          </button>

          <button
            onClick={handleCopyPath}
            className="flex items-center justify-center space-x-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopyalandı' : 'Yolu Kopyala'}</span>
          </button>
        </div>

        {model.file_type === 'stl' && (
          <button
            onClick={handleSetCover}
            className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition"
          >
            <Image className="w-3.5 h-3.5" />
            <span>Proje Kapağı Olarak Ayarla</span>
          </button>
        )}

        {/* Slicer status feedback */}
        {slicerError && (
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[11px] leading-relaxed">
            {slicerError}
          </div>
        )}
        {slicerSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px]">
            Creality Print başlatıldı.
          </div>
        )}
      </div>

      {/* File Metadata Details */}
      <div className="space-y-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Dosya Detayları</span>
        </h4>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Dosya Boyutu:</span>
            <span className="text-slate-200 font-semibold">{formatSize(model.size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Proje:</span>
            <span className="text-blue-400 font-semibold truncate max-w-[140px]">{model.project_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Alt Klasör:</span>
            <span className="text-slate-200 truncate max-w-[140px]">{model.folder_relative_path || '/'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Değiştirilme:</span>
            <span className="text-slate-200">{new Date(model.mtime).toLocaleDateString('tr-TR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Eklenme:</span>
            <span className="text-slate-200">{new Date(model.created_at).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-400" />
          <span>Etiketler</span>
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {model.tags && model.tags.length > 0 ? (
            model.tags.map((t) => (
              <span
                key={t}
                className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]"
              >
                <span>#{t}</span>
                <button onClick={() => handleRemoveTag(t)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-[11px]">Henüz etiket eklenmemiş.</span>
          )}
        </div>
        <form onSubmit={handleAddTag} className="flex space-x-1.5 mt-1.5">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Yeni etiket..."
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 3-Level Descriptions & Notes */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Açıklama ve Notlar</span>
        </h4>

        {/* 1. Model Description */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">Model Notu</label>
          <textarea
            value={modelDesc}
            onChange={(e) => setModelDesc(e.target.value)}
            onBlur={() => updateFileDescription(model.id, modelDesc)}
            placeholder="Bu STL için baskı parametreleri, filament türü veya özel not..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none resize-none"
          />
        </div>

        {/* 2. Folder Description */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">
            Klasör Notu ({model.folder_relative_path || '/'})
          </label>
          <textarea
            value={folderDesc}
            onChange={(e) => setFolderDesc(e.target.value)}
            onBlur={() => updateFolderDescription(model.folder_id, folderDesc)}
            placeholder="Bu klasördeki revizyon veya parça grubu hakkında not..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none resize-none"
          />
        </div>

        {/* 3. Project Description */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-300">
            Proje Açıklaması ({model.project_name})
          </label>
          <textarea
            value={projectDesc}
            onChange={(e) => setProjectDesc(e.target.value)}
            onBlur={() => updateProjectDescription(model.project_id, projectDesc)}
            placeholder="Projenin genel amacı, montaj talimatları veya baskı detayları..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-400 focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};

