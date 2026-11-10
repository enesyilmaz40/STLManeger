import React, { useEffect, useState } from 'react';
import { X, ArrowLeft, Box } from 'lucide-react';
import { ModelFile } from '../../types/electron';
import { useAppStore } from '../../store/useAppStore';
import { LeftFolderTree } from './LeftFolderTree';
import { MiddleViewer } from './MiddleViewer';
import { RightInfoPanel } from './RightInfoPanel';

interface ModelDetailModalProps {
  modelId: number;
  onClose: () => void;
}

export const ModelDetailModal: React.FC<ModelDetailModalProps> = ({ modelId, onClose }) => {
  const [currentModel, setCurrentModel] = useState<ModelFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModel(modelId);
  }, [modelId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadModel = async (id: number) => {
    setLoading(true);
    try {
      const data = await window.api.getFile(id);
      setCurrentModel(data);
    } catch (err) {
      console.error('Failed to load model details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentModel && loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Model Detayları Yükleniyor...</div>
      </div>
    );
  }

  if (!currentModel) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* Top Modal Navigation Bar */}
      <div className="h-14 bg-[#0a0f1d] border-b border-slate-800 px-4 flex items-center justify-between z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Geri Dön</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <Box className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-md">
              {currentModel.name}
            </h2>
            <span className="text-[10px] text-slate-400">({currentModel.project_name})</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-600/80 text-slate-400 hover:text-white transition"
          title="Kapat (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3-Panel Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Folder Tree */}
        <LeftFolderTree
          currentModel={currentModel}
          onSelectModelId={(id) => loadModel(id)}
        />

        {/* Middle Panel: Interactive Three.js 3D Viewer */}
        <MiddleViewer key={currentModel.id} model={currentModel} />

        {/* Right Panel: Metadata, Actions & Notes */}
        <RightInfoPanel
          model={currentModel}
          onModelUpdated={() => loadModel(currentModel.id)}
        />
      </div>
    </div>
  );
};

