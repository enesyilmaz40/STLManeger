# STL Manager — Mimari Dokümantasyon

Bu doküman, STL Manager uygulamasının teknik mimarisini, katmanlarını, veritabanı şemasını ve veri akışlarını açıklamaktadır.

---

## 1. Katmanlı Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                       REACT RENDERER                        │
│  (React 19, TypeScript, Tailwind CSS, Lucide, Zustand)     │
│  • Dashboard  • Projeler  • Tüm Modeller  • 3-Panel Detay   │
│  • Three.js Etkileşimli 3D Viewer                           │
└──────────────────────────────▲──────────────────────────────┘
                               │
            contextBridge (window.api) [GÜVENLİ IPC]
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    ELECTRON PRELOAD BRIDGE                  │
│       • contextIsolation: true  • nodeIntegration: false    │
└──────────────────────────────▲──────────────────────────────┘
                               │
                     ipcMain / ipcRenderer
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                   ELECTRON MAIN PROCESS                     │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   Scanner Service       │   │   Thumbnail Service     │  │
│  │   • Recursive Walker    │   │   • WebGL Offscreen     │  │
│  │   • Symlink Safe        │   │   • Three.js STLLoader  │  │
│  │   • Non-destructive     │   │   • MD5 Cache Engine    │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   Watcher Service       │   │   Launcher Service      │  │
│  │   • Chokidar FS Watch   │   │   • Creality Print      │  │
│  │   • Debounced Sync      │   │   • Shell / Native App  │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SQLite Database Service (WAL)            │  │
│  │    LibraryRoots, Projects, Folders, Files, Tags...    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Temel Modüller ve İşleyiş

### 2.1 Güvenli IPC ve Preload Mimarisi
- Güvenlik standardı gereği Renderer sürecinin doğrudan Node.js `fs`, `child_process` veya `better-sqlite3` erişimi kapatılmıştır.
- Tüm veri ve dosya istekleri `preload.ts` üzerinden `window.api` arayüzü ile asenkron yürütülür.
- Yerel thumbnail ve dosya erişimi için özel `app-asset://` şeması tanımlanmıştır.

### 2.2 Klasör Tarama (Scanner Service)
- **Kök Dizin ve Proje Tanıma**: Bir kök dizin eklendiğinde (örn. `D:\3D Modeller`), doğrudan altındaki her klasör bağımsız bir `Project` kabul edilir.
- **Alt Klasör Hiyerarşisi**: Projenin altındaki `V2`, `V3`, `Final` gibi klasörler `folders` tablosunda `relative_path` ile korunur.
- **Döngü Koruma**: `fs.realpathSync` takibi yapılarak Windows symlink / junction döngülerinin sonsuz döngü yaratması engellenir.
- **Kayıpsız Bütünlük**: Dosya sisteminden kaynak dosyalar asla silinmez veya adlandırılmaz; sadece diskte mevcut olmayan kayıtlar veritabanından temizlenir (`cleanOrphanedRecords`).

### 2.3 3D Thumbnail Üretim Servisi (Three.js WebGL Engine)
- Arka planda gizli (`show: false`) bir Electron penceresinde çalışan Three.js WebGL motoru kullanılır.
- **Kuyruk Mekanizması**: STL dosyaları sırayla işlenir, bellek sızıntısını önlemek için her render işleminden sonra Three.js geometrileri ve materyalleri serbest bırakılır (`dispose`).
- **Önbellekleme**: Dosya yolu + mtime + dosya boyutu kombinasyonundan MD5 hash üretilir (`userData/thumbnails/{hash}.png`). Dosya değişmediği sürece yeniden oluşturulmaz.

### 2.4 Veritabanı Şeması (SQLite)
- `library_roots`: Taranan ana klasörler
- `projects`: Kök klasörlerin altındaki ana model projeleri
- `folders`: Proje içerisindeki alt dizinler (`/`, `/V2`, `/V3` vb.)
- `files`: İndekslenen STL, 3MF, GCODE ve diğer dosyalar
- `tags` ve `file_tags`: Çoktan çoğa etiket ilişkisi
- `application_settings`: Uygulama tercihleri ve dilimleyici yolları
- `scan_history` ve `scan_errors`: Tarama hata logları ve istatistikleri

### 2.5 Dış Uygulama Başlatıcı (External Launcher)
- `child_process.spawn` kullanılarak Creality Print doğrudan çalıştırılır.
- Shell string birleştirme yapılmadığı için dosya yolunda boşluk veya Türkçe karakter bulunması problem oluşturmaz, komut enjeksiyonu engellenmiştir.

