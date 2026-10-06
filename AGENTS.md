# Google Müşteri Toplama — Codex Talimatları

Bu repository bağımsız projedir. Başka repository'lerden dosya, config veya bağımlılık kopyalama.

## Hedef
Google Places API ile işletme keşfi yapan, seçilen işletmeleri CRM müşteri havuzuna ekleyen Chrome Manifest V3 eklentisi ve Node.js/TypeScript backend geliştir.

## Mimari
- `extension/`: React + Vite + TypeScript Chrome extension
- `server/`: Express + TypeScript API
- `supabase/`: PostgreSQL schema
- Google API ve Supabase service role anahtarları sadece backend env değişkenlerinde

## Kod standartları
- TypeScript strict kullan.
- Input validation yap.
- Secret commit etme.
- Google Maps DOM scraping yerine resmi Places API kullan.
- UI Türkçe olsun.
- Hata/loading/empty state'leri ekle.
- `place_id` duplicate kayıtlarını engelle.
- Build/lint/test çalıştırmadan işi tamamlanmış sayma.

## MVP
Detaylı ürün gereksinimleri GitHub issue #1 içindedir. Önce issue #1'i oku ve kabul kriterlerine göre uygula.
