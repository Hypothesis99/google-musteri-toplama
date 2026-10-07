# Google Müşteri Toplama

Contrast Creative Studio için geliştirilen Chrome eklentisi + Mac backend uygulaması. Google Places üzerinden işletme adaylarını bulur, kamuya açık web iletişim bilgileriyle zenginleştirir, fırsat skoruna göre sıralar ve Google Sheets üzerinde CRM havuzu olarak yönetir.

## Aktif geliştirme
- Branch: `codex/mvp-v1`
- PR: #2
- Yol haritası: GitHub issue #3 ve `PROJECT.md`

## Özellikler
- il / ilçe / konum bazlı işletme arama
- isteğe bağlı sektör araması
- **geniş ilçe taraması**: farklı sektör sorgularını ve mevcut Google Places sayfalarını birleştirir
- minimum puan / minimum yorum filtresi
- websitesiz / website var filtresi
- cep telefonu / sabit hat ayrımı
- firma, kategori, telefonlar, website, adres, Maps, puan, yorum, koordinat ve çalışma saatleri
- deterministik `0-100` Lead Score + Türkçe nedenler
- kamuya açık website enrichment:
  - e-posta ve WhatsApp
  - Instagram / Facebook / LinkedIn / TikTok
  - platform sayfasında açıkça bulunabiliyorsa takipçi sayıları
  - iletişim sayfası ve form sinyali
  - SSL / mobil uyumluluk sinyali
  - WordPress / Wix / Shopify sinyalleri
- Google Sheets tabanlı müşteri havuzu / CRM
- Place ID ile duplicate kontrolü
- CRM durumları, not, etiket, son iletişim
- CSV export
- modern XLSX export: özet sayfası, filtreler, sabit başlık, linkler, durum açılır listesi ve koşullu biçimlendirme
- arama geçmişi
- Contrast Creative Studio markalı arayüz

## Google Places kapsam notu
Google Places Text Search tek sorguda en fazla 60 sonuç döndürür. Geniş tarama modu farklı sektör ailelerini ayrı sorgular halinde tarayıp sonuçları `Place ID` ile birleştirir. Bu yöntem ilçe kapsamını ciddi biçimde büyütür; ancak Google Places API hiçbir yöntemle bir bölgedeki **her işletmenin eksiksiz listesini garanti etmez**.

## Gereksinimler
- Node.js 22+
- Google Cloud projesi
- Places API (New)
- Google Sheets API
- servis hesabı JSON anahtarı
- Google Chrome / Chromium

## Backend ortam değişkenleri

```env
PORT=8787
GOOGLE_PLACES_API_KEY=...
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_FILE=./google-service-account.json
ALLOWED_EXTENSION_ORIGIN=
```

Gerçek API anahtarlarını ve servis hesabı JSON dosyasını commit etme.

## Çalıştırma

```bash
npm install
npm run dev:server
```

Sağlık kontrolü:

```text
GET http://localhost:8787/health
```

Extension build:

```bash
npm --workspace extension run build
```

Chrome'da `chrome://extensions` → Developer mode → Load unpacked → `extension/dist`.

## API
- `GET /health`
- `POST /api/places/search`
- `POST /api/enrichment`
- `GET /api/leads`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `POST /api/leads/:id/enrich`
- `GET /api/leads/export.csv`
- `GET /api/leads/export.xlsx`
- `POST /api/sheets/export`

## Güvenlik
- Secret ve `.env` commit edilmez.
- Google API key ve servis hesabı yalnızca backend'de tutulur.
- Extension API anahtarlarını görmez.
- Input validation Zod ile yapılır.
- Rate limit ve Helmet aktiftir.
- Website enrichment SSRF korumalıdır; localhost/private IP erişimi engellenir.
