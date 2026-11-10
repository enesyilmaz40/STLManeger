import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export const WindowControls: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 window-no-drag">
      <button
        onClick={() => window.api.minimizeWindow()}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
        title="Simge Durumuna Küçült"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => window.api.maximizeWindow()}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
        title="Ekranı Kapla"
      >
        <Square className="w-3 h-3" />
      </button>
      <button
        onClick={() => window.api.closeWindow()}
        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 rounded transition"
        title="Kapat"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

