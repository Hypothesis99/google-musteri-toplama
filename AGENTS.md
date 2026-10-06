# Google Müşteri Toplama — Codex Talimatları

Bu repository bağımsız projedir. Başka repository'lerden dosya, config veya bağımlılık kopyalama.

## Hedef
Google Places API ile işletme keşfi yapan, seçilen işletmeleri CRM müşteri havuzuna ekleyen, işletme web sitelerini zenginleştiren ve satış önceliği için lead score üreten Chrome Manifest V3 eklentisi ve Node.js/TypeScript backend geliştir.

## Mimari
- `extension/`: React + Vite + TypeScript Chrome extension
- `server/`: Express + TypeScript API
- `supabase/`: PostgreSQL schema
- Google API ve Supabase service role anahtarları sadece backend env değişkenlerinde
- Veri kaynağı katmanını provider tabanlı kur. İlk provider resmi Google Places API olsun. İleride farklı veri kaynakları eklenebilmesi için `LeadSourceProvider` benzeri bir abstraction kullan.
- Website enrichment, lead scoring, export ve CRM birbirinden ayrılmış servis katmanları olsun.

## Kod standartları
- TypeScript strict kullan.
- Input validation yap.
- Secret commit etme.
- Ana veri kaynağında Google Maps DOM scraping yerine resmi Places API kullan.
- UI Türkçe olsun.
- Hata/loading/empty state'leri ekle.
- `place_id` duplicate kayıtlarını engelle.
- Build/lint/test çalıştırmadan işi tamamlanmış sayma.

## Ürün yönü
Bu proje yalnızca CSV çıkaran bir scraper olmayacak; satış odaklı müşteri bulma ve önceliklendirme aracı olacak.

### Zorunlu çekirdek
- Sektör + şehir + ilçe/bölge ile işletme arama
- Minimum puan ve minimum yorum filtresi
- Firma adı, kategori, telefon, website, adres, Maps URL, puan, yorum sayısı, place_id, koordinat ve çalışma saatleri
- Lead havuzu / CRM
- Durumlar: Yeni, Arandı, WhatsApp Gönderildi, Teklif Verildi, Görüşülüyor, Müşteri Oldu, Olumsuz
- Not ve etiket sistemi
- Duplicate kontrolü
- Arama geçmişi
- CSV ve XLSX export

### Website enrichment
İşletmenin kendi web sitesindeki yalnızca kamuya açık iletişim bilgilerini işle:
- E-posta
- WhatsApp bağlantısı
- Instagram
- Facebook
- LinkedIn
- TikTok
- İletişim sayfası
- İletişim formu var/yok
- SSL var/yok
- Mobil uyumluluk için temel teknik sinyaller
- WordPress / Wix / Shopify gibi teknoloji sinyalleri mümkünse tespit et

Enrichment işlemini ayrı servis yap ve başarısız enrichment'in ana lead kaydını bozmasına izin verme.

### Lead score
Her lead için 0-100 arası `lead_score` üret. İlk sürümde deterministik kurallar kullan; AI provider olmadan da çalışsın.
Örnek sinyaller:
- Web sitesi yok / zayıf
- Sosyal medya eksik
- Yüksek Google puanı
- Yüksek yorum sayısı
- İletişim kanalı bulunması
- Website teknik eksikleri
- Kategori bazlı ağırlıklar

Skor yanında `score_reasons` alanı döndür ve UI'de kullanıcıya neden bu skorun verildiğini Türkçe göster.

### Gelişmiş filtreler
- Website var/yok
- E-posta var/yok
- WhatsApp var/yok
- Instagram var/yok
- Lead score aralığı
- CRM durumu
- Etiket
- Puan / yorum aralığı

### Export / entegrasyon
- CSV
- XLSX
- Google Sheets için adapter/service arayüzü hazırla; gerçek OAuth kurulumu gerekiyorsa README'de kullanıcı adımı olarak belirt.
- İstenilen kolonları seçerek export edebilmek için yapı hazır olsun.

### Gelecek faz
Mimaride yer aç ama MVP'yi bozma:
- AI ile kişiselleştirilmiş satış mesajı
- E-posta taslağı
- WhatsApp taslağı
- Periyodik tekrar tarama / yeni firma bulma
- Doğal dil komutları: ör. `Orhangazi'de web sitesi olmayan restoranları bul`
- MCP veya benzeri agent arayüzü

## Güvenlik / uyum
- Yalnızca kamuya açık işletme verilerini işle.
- Gereksiz kişisel veri toplama.
- Website crawling için timeout, boyut limiti, SSRF koruması ve private network/IP bloklaması ekle.
- Harici URL'lere erişirken `http/https` dışı protokolleri reddet.
- Kullanıcıya teknik stack trace döndürme.

## MVP
Detaylı ürün gereksinimleri GitHub issue #1 içindedir. Önce issue #1'i oku ve kabul kriterlerine göre uygula. Issue #1 altındaki son kapsam güncellemelerini de ana gereksinim kabul et.
