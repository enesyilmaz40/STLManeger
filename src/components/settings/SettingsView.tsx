import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Trash2,
  RefreshCw,
  FolderOpen,
  Printer,
  Sliders,
  HardDrive,
  Info,
  CheckCircle,
  AlertTriangle,
  Database,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const SettingsView: React.FC = () => {
  const {
    roots,
    fetchRoots,
    addLibraryFolder,
    settings,
    fetchSettings,
    refreshAll,
  } = useAppStore();

  const [systemPaths, setSystemPaths] = useState<{
    dbPath: string;
    cacheDir: string;
    appVersion: string;
  } | null>(null);

  const [cacheClearStatus, setCacheClearStatus] = useState<string | null>(null);
  const [reindexStatus, setReindexStatus] = useState<string | null>(null);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      const paths = await window.api.getSystemPaths();
      setSystemPaths(paths);
    } catch (err) {
      console.error('getSystemPaths error:', err);
    }
  };

  const handleSelectCrealityExe = async () => {
    const exe = await window.api.selectCrealityExe();
    if (exe) {
      await fetchSettings();
    }
  };

  const handleRemoveRoot = async (id: number) => {
    if (
      confirm(
        'Bu klasörü katalogdan kaldırmak istediğinize emin misiniz? Fiziksel dosyalarınız silinmeyecek, yalnızca katalogdan çıkarılacaktır.'
      )
    ) {
      await window.api.removeRoot(id);
      await refreshAll();
    }
  };

  const handleRescanRoot = async (id: number, path: string) => {
    await window.api.scanRoot(id, path);
    await refreshAll();
  };

  const handleClearCache = async () => {
    setCacheClearStatus('Temizleniyor...');
    const res = await window.api.clearThumbnailCache();
    if (res.success) {
      setCacheClearStatus('Önbellek temizlendi ve yeniden oluşturma başlatıldı.');
    } else {
      setCacheClearStatus(`Hata: ${res.message}`);
    }
    setTimeout(() => setCacheClearStatus(null), 4000);
  };

  const handleReindex = async () => {
    setReindexStatus('Yeniden indeksleme başlatıldı...');
    await window.api.reindexAll();
    await refreshAll();
    setReindexStatus('İndeksleme tamamlandı.');
    setTimeout(() => setReindexStatus(null), 3000);
  };

  const handleSettingChange = async (key: string, value: string) => {
    await window.api.setSetting(key, value);
    await fetchSettings();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none max-w-5xl">
      {/* 1. Kütüphane Klasörleri */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>Kütüphane Klasörleri</span>
            </h3>
            <p className="text-xs text-slate-400">
              Modellerinizin bulunduğu ana klasörleri yönetin.
            </p>
          </div>
          <button
            onClick={addLibraryFolder}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Yeni Klasör Ekle</span>
          </button>
        </div>

        <div className="space-y-2">
          {roots.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
              Henüz kütüphane klasörü eklenmedi.
            </div>
          ) : (
            roots.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#0e1526] border border-slate-800/80"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-bold text-slate-200 truncate font-mono">{r.path}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Son tarama:{' '}
                    {r.last_scanned_at
                      ? new Date(r.last_scanned_at).toLocaleString('tr-TR')
                      : 'Henüz taranmadı'}{' '}
                    • Durum:{' '}
                    <span
                      className={`font-semibold ${
                        r.scan_status === 'scanning'
                          ? 'text-blue-400'
                          : r.scan_status === 'error'
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {r.scan_status === 'scanning'
                        ? 'Taranıyor...'
                        : r.scan_status === 'error'
                        ? 'Hata'
                        : 'Hazır'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleRescanRoot(r.id, r.path)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition"
                    title="Klasörü Yeniden Tara"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveRoot(r.id)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700/80 transition"
                    title="Katalogdan Kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 2. Dilimleyici Entegrasyonu (Slicers) */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>3D Dilimleyici (Slicer) Entegrasyonu</span>
          </h3>
          <p className="text-xs text-slate-400">
            STL dosyalarını doğrudan masaüstü dilimleyicinizde açın.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1526] border border-slate-800/80 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Creality Print Kurulum Konumu (EXE)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={settings.crealityPrintPath || ''}
                placeholder="Örn: C:\Program Files\Creality\Creality Print 5.1\CrealityPrint.exe"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
              />
              <button
                onClick={handleSelectCrealityExe}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Seç...</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Bilgisayarınızda Creality Print kurulu olduğu dizini seçin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Varsayılan Dilimleyici
              </label>
              <select
                value={settings.defaultSlicer || 'creality'}
                onChange={(e) => handleSettingChange('defaultSlicer', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="creality">Creality Print</option>
                <option value="orca">OrcaSlicer (Gelecek Sürüm)</option>
                <option value="bambu">Bambu Studio (Gelecek Sürüm)</option>
                <option value="prusa">PrusaSlicer (Gelecek Sürüm)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Görünüm Ayarları */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Görünüm ve Tercihler</span>
          </h3>
          <p className="text-xs text-slate-400">
            Katalog kartlarının ve arayüzün düzenini özelleştirin.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1526] border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Tema
            </label>
            <select
              value={settings.theme || 'dark'}
              onChange={(e) => handleSettingChange('theme', e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="dark">Koyu Tema (Varsayılan)</option>
              <option value="slate">Antrasit Gece</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Varsayılan Görünüm
            </label>
            <select
              value={settings.defaultView || 'grid'}
              onChange={(e) => handleSettingChange('defaultView', e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="grid">Kart Izgarası (Grid)</option>
              <option value="list">Kompakt Liste</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Thumbnail Çözünürlüğü
            </label>
            <select
              value={settings.thumbnailQuality || 'high'}
              onChange={(e) => handleSettingChange('thumbnailQuality', e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="high">384×384 (Yüksek Kalite)</option>
              <option value="standard">256×256 (Standart)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Sistem ve Veritabanı */}
      <section className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Sistem ve Veritabanı Bilgileri</span>
          </h3>
          <p className="text-xs text-slate-400">
            Yerel SQLite veritabanı konumu ve thumbnail önbelleği.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e1526] border border-slate-800/80 space-y-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">SQLite Veritabanı Yolu:</span>
            <p className="text-xs font-mono text-slate-200 bg-slate-900 p-2 rounded-lg border border-slate-800 select-all">
              {systemPaths?.dbPath || 'Yükleniyor...'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400">Thumbnail Cache Dizini:</span>
            <p className="text-xs font-mono text-slate-200 bg-slate-900 p-2 rounded-lg border border-slate-800 select-all">
              {systemPaths?.cacheDir || 'Yükleniyor...'}
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleClearCache}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              Thumbnail Önbelleğini Temizle
            </button>

            <button
              onClick={handleReindex}
              className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition"
            >
              Tüm Kütüphaneyi Yeniden İndeksle
            </button>

            {cacheClearStatus && (
              <span className="text-xs text-emerald-400">{cacheClearStatus}</span>
            )}
            {reindexStatus && (
              <span className="text-xs text-blue-400">{reindexStatus}</span>
            )}
          </div>
        </div>
      </section>

      {/* App Version Footer */}
      <div className="pt-4 text-center text-xs text-slate-400">
        STL Manager Desktop — Sürüm {systemPaths?.appVersion || '1.0.0'} (Windows x64)
      </div>
    </div>
  );
};

