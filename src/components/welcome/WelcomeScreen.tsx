import React from 'react';
import { Box, FolderPlus, Layers, Eye, Cpu, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const WelcomeScreen: React.FC = () => {
  const { addLibraryFolder, isScanning, scanProgress } = useAppStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-radial from-slate-900/60 to-transparent">
      {/* Icon Badge */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-[1px] shadow-2xl shadow-blue-500/20 mb-6">
        <div className="w-full h-full bg-[#090d16] rounded-2xl flex items-center justify-center">
          <Box className="w-10 h-10 text-blue-400" />
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">
        3D Model Kütüphanene Hoş Geldin
      </h2>
      <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
        STL ve 3D baskı dosyalarını tek bir yerden yönet. Başlamak için modellerinin bulunduğu
        klasörü seç.
      </p>

      {/* Primary Action Button */}
      <button
        onClick={addLibraryFolder}
        disabled={isScanning}
        className="flex items-center space-x-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 active:scale-95 transition-all"
      >
        <FolderPlus className="w-5 h-5" />
        <span>Kütüphane Klasörü Ekle</span>
      </button>

      {/* Scanning status banner */}
      {isScanning && (
        <div className="mt-8 p-4 bg-slate-900/90 border border-blue-500/40 rounded-xl max-w-md w-full text-left space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span>Klasör Taranıyor...</span>
            <span>{scanProgress?.filesFound || 0} dosya bulundu</span>
          </div>
          {scanProgress?.currentFolder && (
            <p className="text-xs text-slate-300 truncate">{scanProgress.currentFolder}</p>
          )}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mt-12 text-left">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">Otomatik Proje Keşfi</h4>
          <p className="text-[11px] text-slate-400 leading-normal">
            İç içe V2, V3 ve Final klasörleriniz hiyerarşisi bozulmadan tek projede toplanır.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">Gerçek 3D Önizleme</h4>
          <p className="text-[11px] text-slate-400 leading-normal">
            Three.js geometrisiyle gerçek stüdyo aydınlatmalı 3D modeller ve thumbnail'ler oluşturulur.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="text-xs font-bold text-slate-200 mb-1">Yerel ve Güvenli</h4>
          <p className="text-[11px] text-slate-400 leading-normal">
            Dosyalarınız taşınmaz, kopyalanmaz. Tamamen offline SQLite veritabanı kullanılır.
          </p>
        </div>
      </div>
    </div>
  );
};

