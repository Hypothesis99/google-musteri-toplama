# Google Müşteri Toplama

Google Places API üzerinden potansiyel işletme/müşteri adaylarını bulmak, seçmek ve CRM havuzunda yönetmek için geliştirilen Chrome eklentisi + backend projesi.

## Durum
İlk MVP geliştirmesi Codex görevi olarak GitHub issue #1 altında tanımlanmıştır.

## MVP
- Sektör + konum ile işletme arama
- Firma adı, kategori, telefon, web sitesi, adres, Google Maps URL, puan ve yorum sayısı
- Seçilen firmaları müşteri havuzuna ekleme
- `place_id` ile duplicate engelleme
- CRM durum yönetimi
- Notlar
- Filtreleme
- CSV export

## Teknoloji
- Chrome Extension Manifest V3
- React + Vite + TypeScript
- Node.js + Express + TypeScript
- Supabase / PostgreSQL
- Google Places API (New)

## Güvenlik
Gerçek API anahtarları repository içine yazılmamalıdır. Google Places API ve Supabase service role anahtarları yalnızca backend ortam değişkenlerinde tutulacaktır.

## Codex
Geliştirmeye başlamadan önce `AGENTS.md` ve GitHub issue #1 okunmalıdır.
