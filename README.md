# Google Müşteri Toplama

Google Places API üzerinden potansiyel müşteri adayları bulmak, lead score ile önceliklendirmek ve CRM havuzunda yönetmek için geliştirilen Chrome eklentisi + backend projesi.

## MVP durumu
İlk çalışan geliştirme `codex/mvp-v1` branch'i ve PR #2 altında ilerliyor.

Şu anda:
- sektör + şehir/ilçe ile işletme arama
- minimum puan / minimum yorum filtresi
- firma adı, kategori, telefon, web sitesi, adres, Maps URL, puan ve yorum sayısı
- deterministik `0-100` lead score ve açıklama nedenleri
- seçilen firmaları müşteri havuzuna ekleme
- `place_id` ile duplicate engelleme
- Supabase CRM tablosu
- CSV export endpointi
- UI/UX odaklı Chrome MV3 popup
- GitHub Actions typecheck + build kontrolü

## Teknoloji
- Chrome Extension Manifest V3
- React + Vite + TypeScript
- Node.js + Express + TypeScript
- Supabase / PostgreSQL
- Google Places API (New)

## 1. Gereksinimler
- Node.js 22+
- npm
- Google Cloud hesabı
- Supabase projesi
- Google Chrome / Chromium

## 2. Kurulum
Repository kökünde:

```bash
npm install
```

## 3. Google Places API
Google Cloud Console'da bir proje oluştur ve **Places API (New)** servisini etkinleştir.

Bir API key oluştur ve bu key'i yalnızca backend ortam değişkeninde kullan. Extension içine koyma.

## 4. Supabase
Yeni bir Supabase projesi oluştur.

Supabase SQL Editor içinde:

```text
supabase/schema.sql
```

dosyasındaki şemayı çalıştır.

## 5. Backend env

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

## 6. Backend'i çalıştır

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
2. Developer mode aç
3. `Load unpacked`
4. `extension/dist` klasörünü seç

## 8. Test
Eklentiyi aç ve örnek olarak:

- Sektör: `diş kliniği`
- Konum: `Bursa`

ile arama yap.

## API

- `GET /health`
- `POST /api/places/search`
- `GET /api/leads`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `GET /api/leads/export.csv`

## Güvenlik
- Secret ve `.env` commit edilmez.
- Google API key yalnızca server tarafında tutulur.
- Input validation Zod ile yapılır.
- Rate limit ve Helmet aktiftir.
- Extension doğrudan Google API anahtarını görmez.

## Sonraki iterasyon
- website enrichment: e-posta / WhatsApp / sosyal medya
- CRM durum güncelleme UI
- arama geçmişi
- XLSX export
- Google Sheets adapter
- lead detay drawer
- etiket / not / son iletişim
- AI destekli satış mesajı

Geliştirme kararları için `AGENTS.md` ve GitHub issue #1 ana kaynaklardır.
