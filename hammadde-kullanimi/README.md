# Hammadde Kullanım Analizi

Bu web uygulaması, kahve ve çikolata mağazaları için merkezi tedarik (HAVI) verileri ile mağazalardaki satış (AktifPOS) verilerini karşılaştırmak için geliştirilmiştir.

## Özellikler

- CSV ve Excel dosyalarını sürükle-bırak ile kolayca yükleme
- HAVI ve AktifPOS verilerini otomatik olarak eşleştirme
- Ürün bazında miktar karşılaştırması
- Farklılıkları görsel grafiklerle gösterme
- En büyük uyuşmazlıkları listeleme
- GitHub Pages ile ücretsiz olarak host edilebilme

## Kullanım

1. HAVI verileri bölümüne merkezi tedarik verilerini içeren CSV veya Excel dosyasını yükleyin
2. AktifPOS verileri bölümüne mağaza satış verilerini içeren CSV veya Excel dosyasını yükleyin
3. Sistem otomatik olarak ürün kodlarını eşleştirip karşılaştırma yapacaktır
4. Sonuçları farklı sekmelerde görüntüleyebilirsiniz:
   - Genel Bakış: Verilerdeki ürün dağılımını gösterir
   - En Büyük Uyuşmazlıklar: Miktar farklılıklarını grafik olarak gösterir
   - Ürün Listesi: Tüm uyuşmazlıkları liste halinde gösterir

## Kurulum ve Geliştirme

Bu projeyi yerel ortamınızda çalıştırmak için:

```bash
# Repoyu klonla
git clone https://github.com/[username]/hammadde-kullanimi.git

# Proje klasörüne git
cd hammadde-kullanimi

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

## GitHub Pages'te Yayınlama

Projeyi GitHub Pages üzerinde yayınlamak için:

1. package.json dosyasındaki `homepage` alanını kendi GitHub kullanıcı adınızla güncelleyin:

   ```json
   "homepage": "https://[username].github.io/hammadde-kullanimi"
   ```

2. Aşağıdaki komutu kullanarak uygulamayı GitHub Pages'e deploy edin:
   ```bash
   npm run deploy
   ```

## Gereksinimler

- Node.js 14.0 veya üzeri

## Teknolojiler

- React + Vite
- TypeScript
- Chakra UI
- Chart.js
- PapaParser (CSV işleme)
- XLSX.js (Excel işleme)

## Dosya Formatları

Uygulama aşağıdaki dosya formatlarını destekler:

- CSV (.csv)
- Excel (.xlsx, .xls)

## Lisans

MIT
