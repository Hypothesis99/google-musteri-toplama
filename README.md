# Google Müşteri Toplama

Google Places API üzerinden potansiyel müşteri adayları bulmak, kamuya açık website iletişim bilgileriyle zenginleştirmek, lead score ile önceliklendirmek ve CRM havuzunda yönetmek için geliştirilen Chrome eklentisi + backend projesi.

## Aktif geliştirme
- Branch: `codex/mvp-v1`
- PR: #2
- Yol haritası: GitHub issue #3 ve `PROJECT.md`

## Şu anki MVP özellikleri
- yalnızca il / ilçe / konum ile genel işletme arama
- isteğe bağlı sektör ile aramayı daraltma
- minimum puan / minimum yorum filtresi
- firma adı, kategori, telefon, website, adres, Maps URL, puan, yorum sayısı, Place ID, koordinat ve çalışma saatleri
- deterministik `0-100` Lead Score + Türkçe skor nedenleri
- website enrichment:
  - kamuya açık e-posta
  - WhatsApp bağlantısı
  - Instagram / Facebook / LinkedIn / TikTok
  - iletişim sayfası ve form sinyali
  - SSL / mobil viewport sinyali
  - WordPress / Wix / Shopify sinyalleri
- müşteri havuzu / CRM
- Place ID ile duplicate engelleme
- CRM durumları
- not + etiket
- son iletişim tarihi
- arama geçmişi ve tekrar arama
- CSV ve XLSX export
- GitHub Actions typecheck + production build

## Teknoloji
- Chrome Extension Manifest V3
- React + Vite + TypeScript
- Node.js 22 + Express + TypeScript
- Supabase / PostgreSQL
- Google Places API (New)
- ExcelJS

## 1. Gereksinimler
- Node.js 22+
- npm
- Google Cloud hesabı
- Supabase projesi
- Google Chrome / Chromium

## 2. Bağımlılıkları kur
Repository kökünde:

```bash
npm install
```

## 3. Google Places API
Google Cloud Console'da bir proje oluştur ve **Places API (New)** servisini etkinleştir.

Bir API key oluştur. Bu key yalnızca backend ortam değişkeninde tutulur; extension içine yazılmaz.

## 4. Supabase
Supabase projesi oluştur ve SQL Editor içinde `supabase/schema.sql` dosyasını çalıştır.

Mevcut eski bir veritabanın varsa aynı dosyadaki `alter table ... add column if not exists` satırları enrichment alanlarını ekler.

## 5. Backend ortam değişkenleri

```bash
cp server/.env.example server/.env
```

`server/.env`:

```env
PORT=8787
GOOGLE_PLACES_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_EXTENSION_ORIGIN=
```

Gerçek anahtarları commit etme.

## 6. Backend'i başlat

```bash
npm run dev:server
```

Sağlık kontrolü:

```text
GET http://localhost:8787/health
```

## 7. Extension build

```bash
npm --workspace extension run build
```

Chrome'da:
1. `chrome://extensions`
2. **Developer mode** aç
3. **Load unpacked** seç
4. `extension/dist` klasörünü seç

## 8. İlk test

### Sektörlü arama
- Sektör: `diş kliniği`
- Konum: `Bursa, Nilüfer`

### Sektörsüz arama
- Sektör: boş
- Konum: `Bursa, Orhangazi`

> Not: Google Places Text Search'te yalnızca konum yazmak, o bölgedeki tüm işletmelerin eksiksiz dökümü anlamına gelmez. Google'ın genel işletme sonuçlarını döndürür. Daha geniş kapsama ihtiyaç olursa ayrı bir “geniş tarama provider'ı” eklenebilir.

## 9. Website enrichment
Arama sonucunda veya CRM havuzunda website'i olan işletmede **İletişimi Bul** aksiyonu kullanılabilir.

Backend:
- yalnızca `http/https` kabul eder
- localhost/private IP bloklar
- DNS çözümlemesini kontrol eder
- yönlendirme sayısını sınırlar
- timeout uygular
- HTML response boyutunu sınırlar

Enrichment başarısız olursa ana lead kaydı kaybolmaz.

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

## Güvenlik
- Secret ve `.env` commit edilmez.
- Google API key ve Supabase service role key yalnızca backend'de tutulur.
- Input validation Zod ile yapılır.
- Rate limit ve Helmet aktiftir.
- Extension Google API anahtarını görmez.
- Website enrichment SSRF korumalıdır.

## Proje takibi
- `PROJECT.md`: mimari + detaylı checklist
- Issue #3: görünür ilerleme yüzdesi ve yol haritası
- `AGENTS.md`: Codex geliştirme kuralları

MVP dışındaki Google Sheets, AI satış mesajı, periyodik tarama ve MCP/agent özellikleri sonraki fazdadır.
