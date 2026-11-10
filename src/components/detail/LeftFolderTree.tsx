import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Box,
  Layers,
  FileCode,
  File,
} from 'lucide-react';
import { ModelFile, Folder as FolderType } from '../../types/electron';

interface LeftFolderTreeProps {
  currentModel: ModelFile;
  onSelectModelId: (id: number) => void;
}

interface TreeNode {
  folder: FolderType;
  children: TreeNode[];
  files: ModelFile[];
}

export const LeftFolderTree: React.FC<LeftFolderTreeProps> = ({
  currentModel,
  onSelectModelId,
}) => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [projectFiles, setProjectFiles] = useState<ModelFile[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadProjectTree();
  }, [currentModel.project_id]);

  const loadProjectTree = async () => {
    try {
      const fList = await window.api.getFolders(currentModel.project_id);
      const files = await window.api.getFiles({ projectId: currentModel.project_id });
      setFolders(fList);
      setProjectFiles(files);

      // Auto-expand current model's folder and root folders
      const exp: Record<number, boolean> = {};
      fList.forEach((f: FolderType) => {
        exp[f.id] = true;
      });
      setExpandedFolders(exp);
    } catch (err) {
      console.error('Tree load error:', err);
    }
  };

  const toggleExpand = (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'stl':
        return <Box className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
      case '3mf':
        return <Layers className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />;
      case 'gcode':
        return <FileCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      default:
        return <File className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
    }
  };

  // Build hierarchical folder tree from flat list
  const rootFolder = folders.find((f) => f.relative_path === '/');
  const subFolders = folders.filter((f) => f.relative_path !== '/');

  return (
    <div className="w-72 bg-[#0a0f1d] border-r border-slate-800 flex flex-col h-full select-none">
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <h3 className="text-xs font-bold text-slate-200 truncate" title={currentModel.project_name}>
            {currentModel.project_name}
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 font-semibold">
          {projectFiles.length} dosya
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {/* Files directly under root */}
        {rootFolder && (
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 px-2 py-1 text-slate-400 text-[11px] font-semibold">
              <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>/ (Kök Dizin)</span>
            </div>
            <div className="pl-4 space-y-0.5">
              {projectFiles
                .filter((f) => f.folder_id === rootFolder.id)
                .map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onSelectModelId(file.id)}
                    className={`flex items-center space-x-2 px-2 py-1 rounded-lg cursor-pointer transition ${
                      file.id === currentModel.id
                        ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {getFileIcon(file.file_type)}
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Subfolders */}
        {subFolders.map((folder) => {
          const isExpanded = expandedFolders[folder.id] ?? true;
          const filesInFolder = projectFiles.filter((f) => f.folder_id === folder.id);

          return (
            <div key={folder.id} className="space-y-0.5">
              <div
                onClick={(e) => toggleExpand(folder.id, e)}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg text-slate-300 hover:bg-slate-900 cursor-pointer font-medium"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="truncate">{folder.relative_path.replace(/^\//, '')}</span>
                <span className="text-[10px] text-slate-400 ml-auto font-mono">
                  ({filesInFolder.length})
                </span>
              </div>

              {isExpanded && (
                <div className="pl-5 space-y-0.5">
                  {filesInFolder.length === 0 ? (
                    <div className="text-[10px] text-slate-400 py-0.5 pl-2">Boş klasör</div>
                  ) : (
                    filesInFolder.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => onSelectModelId(file.id)}
                        className={`flex items-center space-x-2 px-2 py-1 rounded-lg cursor-pointer transition ${
                          file.id === currentModel.id
                            ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/40'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {getFileIcon(file.file_type)}
                        <span className="truncate">{file.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

