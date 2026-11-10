# STL Manager — Professional 3D Model Library

Windows işletim sisteminde tamamen yerel ve çevrimdışı (offline) çalışan, profesyonel arayüze sahip, 3D model kataloglama ve yönetim masaüstü uygulaması.

> **Referans Deneyim**: Steam Library + Windows Explorer + Modern 3D Asset Manager

---

## 🚀 Öne Çıkan Özellikler

1. **Otomatik ve Akıllı Klasör Tarama (Recursive Scanner)**
   - Kök dizin altındaki ana klasörleri **Proje** olarak otomatik gruplar (Örn: `Hamamcan`, `Schwab`, `Disli`).
   - İç içe tüm alt klasörleri (`V2`, `V3`, `Final`) hiyerarşiyi bozmadan proje klasör ağacında korur.
   - Sınırsız klasör derinliği desteği ve Windows junction / symlink sonsuz döngü koruması.
   - Büyük/küçük harf duyarsız uzantı tanıma (`.stl`, `.3mf`, `.gcode`, `.obj`, `.step`, `.stp`, `.ply`, `.amf`, `.f3d`).
   - **Asla yıkıcı işlem yapmaz**: Dosyaları taşımaz, kopyalamaz, yeniden adlandırmaz veya kaynak dosyalara yazmaz.

2. **Gerçek Zamanlı 3D Geometri Önizleme ve Thumbnail Sistemi**
   - Three.js WebGL altyapısı ile STL modellerinin gerçek geometrisini okur.
   - Bounding box ve otomatik kamera açıları ile stüdyo aydınlatmalı 384x384 PNG thumbnail üretir.
   - Dosya yolu, boyutu ve değiştirilme tarihi (mtime) tabanlı MD5 önbellekleme (cache). Dosya değişmediği sürece tekrar üretilmez.
   - Arka plan iş kuyruğu (queue) ile ana arayüz donmadan asenkron üretim.

3. **Etkileşimli 3-Panelli Model Detay Ekranı**
   - **Sol Panel**: Projenin gerçek klasör ağacı. Ağaçtan başka bir modele tıklandığında anında orta panel güncellenir.
   - **Orta Panel**: Three.js 3D Viewer (OrbitControls döndürme/kaydırma/yakınlaştırma, Ön/Üst/Sağ/Sol kamera açıları, tel kafes görünümü, arka plan rengi seçimi, mm cinsinden X/Y/Z ölçüleri, üçgen ve tepe noktası sayıları).
   - **Sağ Panel**: Detaylı metadata, doğrudan Creality Print ile açma, varsayılan programla açma, klasörde gösterme, dosya yolu kopyalama ve proje kapağı belirleme.

4. **3 Seviyeli Açıklama ve Not Sistemi (SQLite)**
   - **Proje Açıklaması**: Projeye genel amaç ve montaj notları.
   - **Klasör Açıklaması**: Alt revizyonlar (V2, V3) için özel notlar.
   - **Model Açıklaması**: Dilimleme parametreleri, filament türü veya baskı notları.
   - Etiketleme (Tags) ve favorilere ekleme. Veritabanında kalıcı saklanır.

5. **Otomatik Senkronizasyon (File Watcher)**
   - Chokidar ile kök klasörler arka planda izlenir.
   - Yeni klasör/dosya ekleme, silme veya değiştirme olayları debounce edilerek otomatik kütüphaneye yansıtılır.
   - Manuel "Yeniden Tara" butonu.

6. **3D Dilimleyici (Slicer) Entegrasyonu**
   - Ayarlar üzerinden Creality Print (`CrealityPrint.exe`) konumu tanımlanır.
   - Güvenli argüman aktarımı (`child_process.spawn`) ile shell injection açıkları engellenmiştir; boşluklu ve Türkçe karakterli yollar sorunsuz desteklenir.
   - OrcaSlicer, Bambu Studio ve PrusaSlicer altyapısına hazır mimari.

---

## 🛠️ Teknoloji Mimarisi

- **Masaüstü Altyapısı**: Electron 24 (Context Isolation açık, Node Integration kapalı)
- **Kullanıcı Arayüzü**: React 19 + TypeScript
- **Stil Altyapısı**: Tailwind CSS v4 + Lucide Icons
- **Build & Paketleme**: Vite + esbuild + electron-builder (NSIS)
- **3D Render**: Three.js + STLLoader + OrbitControls
- **Yerel Veritabanı**: SQLite (better-sqlite3) — WAL modunda, Foreign Key ve Index destekli
- **Dosya İzleme**: Chokidar (Debounced event stream)
- **Durum Yönetimi**: Zustand

---

## 📦 Kurulum ve Çalıştırma

### Hazır Kurulum Dosyası (Son Kullanıcı)
Windows için tek tıkla kurulabilir paket:
- **Konum**: `release/STLManager-Setup-1.0.0.exe`
- Kurulum sihirbazı Masaüstü ve Başlat Menüsü kısayollarını otomatik oluşturur.
- Harici Node.js, Python veya SQLite kurulumu gerektirmez.

### Geliştirici Ortamı (Development)

Gereksinimler:
- Node.js (v18+)
- npm (v9+)

1. **Bağımlılıkları Kurun**:
   ```bash
   npm install
   ```

2. **Geliştirme Sunucusunu Başlatın**:
   ```bash
   # Electron ve Vite geliştirme modunda çalıştırma
   npm run build
   npm start
   ```

3. **Otomatik Testleri Çalıştırın**:
   ```bash
   npm test
   ```

4. **Windows NSIS Kurulum Paketini Derleyin**:
   ```bash
   npm run dist
   ```
   Çıktı dosyası `release/STLManager-Setup-1.0.0.exe` olarak üretilecektir.

---

## 📂 Veri ve Önbellek Konumları

Kullanıcı verileri uygulamanın kurulum dizininde değil, Windows kullanıcı profili altında saklanır:
- **Veritabanı**: `%APPDATA%\stlmanager\stlmanager.db`
- **Thumbnail Önbelleği**: `%APPDATA%\stlmanager\thumbnails\`

Uygulama güncellendiğinde veya thumbnail önbelleği temizlendiğinde açıklamalar, favoriler ve etiketler korunur.

