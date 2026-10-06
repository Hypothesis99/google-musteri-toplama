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

## UI/UX — Birinci öncelik
Bu ürün yalnızca çalışan bir geliştirici aracı gibi görünmemeli. Kullanıcı ilk açtığında güven veren, hızlı öğrenilen, modern ve satış odaklı bir ürün hissi vermeli. UI/UX kabul kriterleri fonksiyonel kabul kriterleri kadar önemlidir.

### Genel tasarım prensipleri
- Temiz, modern, sade ve kurumsal görünüm.
- Gereksiz gradient, yoğun gölge, fazla renk ve görsel kalabalık kullanma.
- Güçlü tipografi hiyerarşisi kullan: başlık, açıklama, veri, yardımcı metin ve aksiyonlar net ayrışsın.
- 8px tabanlı spacing sistemi ve tutarlı radius/border yaklaşımı kullan.
- Tıklanabilir alanlar en az yaklaşık 40px yüksekliğinde olsun.
- Renkleri yalnızca anlam taşımak için kullan: başarı, uyarı, sıcak lead, hata, pasif durum.
- Kontrast ve klavye erişilebilirliğine dikkat et.
- Hover, focus, disabled, loading ve selected state'leri eksiksiz olsun.
- Kullanıcıyı teknik kavramlarla yorma; metinler sade Türkçe olsun.

### Extension yerleşimi
Popup'ı dar ve sıkışık bir kutuya dönüştürme. Mümkünse extension action ile açılan geniş bir side panel veya yeterli genişlikte uygulama görünümü tercih et. Popup kullanılacaksa minimum 420px genişlikte ve okunabilir yükseklikte tasarla.

Ana navigasyon ilk sürümde çok basit olsun:
1. `Müşteri Bul`
2. `Müşteri Havuzu`
3. `Arama Geçmişi`
4. `Ayarlar`

Kullanıcı hangi bölümde olduğunu her an anlayabilsin. Mobil uygulama benzeri alt navigasyon yerine masaüstü Chrome eklentisine uygun kompakt tab/side navigation tercih et.

### Müşteri Bul ekranı
Arama formunu tek bakışta anlaşılır yap.
- Ana alanlar: sektör/arama terimi, şehir, ilçe/bölge.
- Gelişmiş filtreleri ilk anda gösterme; `Filtreler` açılır alanında tut.
- Birincil CTA tek ve belirgin olsun: `Müşteri Ara`.
- Form hatalarını alanın yanında göster.
- Son kullanılan aramaları hızlı seçim olarak sunabilirsin.
- Arama sürerken skeleton veya anlamlı progress kullan; yalnızca spinner gösterip ekranı boş bırakma.

### Sonuç listesi
Lead kartı veya tablo görünümünde bilgi hiyerarşisi çok iyi olmalı.
İlk bakışta görülecekler:
- Firma adı
- Kategori
- Lead score
- Telefon / WhatsApp / e-posta bulunma durumu
- Puan + yorum sayısı
- Website durumu
- CRM durumu

İkincil bilgiler detay açılımında gösterilebilir:
- Tam adres
- Çalışma saatleri
- Sosyal ağlar
- Teknoloji sinyalleri
- Score reasons
- Place ID vb. teknik alanlar

Her satır/kartta her şeyi aynı anda gösterip bilgi kalabalığı oluşturma.

### Lead Score sunumu
Lead score ürünün en önemli farklılaştırıcılarından biridir.
- `87/100` gibi skor net görünmeli.
- Sıcak/orta/düşük gibi kısa etiket kullanılabilir.
- Yalnızca renk ile anlatma; metin/ikon da kullan.
- Skora tıklanınca veya detay açılınca `Bu müşteri neden öne çıkıyor?` altında `score_reasons` maddeleri göster.
- Örnek: `Web sitesi yok`, `Google puanı yüksek`, `WhatsApp bulundu`, `Instagram eksik`.

### Toplu seçim ve aksiyonlar
Çok sayıda lead ile çalışırken UX bozulmamalı.
- Select all / tekil seçim.
- Seçim yapıldığında sticky/belirgin toplu aksiyon barı göster.
- Aksiyonlar: `Havuza Ekle`, `Etiketle`, `Dışa Aktar`.
- Kullanıcı yanlışlıkla tekrar ekleme yaparsa sessiz hata yerine anlaşılır duplicate geri bildirimi ver.

### Müşteri Havuzu / CRM
CRM ekranı spreadsheet kadar yoğun, klasik CRM kadar ağır olmamalı.
- Arama alanı her zaman kolay erişilebilir olsun.
- Filtre chip'leri kullan: durum, lead score, website, e-posta, WhatsApp, etiket.
- Varsayılan sıralama `En yüksek lead score` olabilir.
- Lead detay paneli açıldığında kullanıcı liste bağlamını kaybetmesin; mümkünse drawer/side panel kullan.
- Durum değiştirme tek/iki tıklamayla yapılabilsin.
- Not ekleme sürtünmesiz olsun.
- `Son iletişim` tarihi görünür olsun.

### Empty / loading / error state'leri
Her ana ekranın kaliteli state'leri olmalı.
- İlk kullanım: kısa açıklama + örnek arama.
- Arama sonucu yok: filtreleri gevşetmeyi öner.
- Backend erişilemıyor: teknik hata kodu yerine anlaşılır açıklama ve `Tekrar Dene`.
- Enrichment bekliyor: firmanın ana datasını göstermeye devam et, zenginleştirme durumunu ayrı göster.
- Export başarı/başarısızlığı toast veya inline feedback ile bildir.

### Mikro etkileşimler
- Butona tıklayınca anında görsel geri bildirim.
- Optimistic update yalnızca güvenli işlemlerde kullan.
- Toast'ları kısa ve anlamlı tut.
- Uzun animasyon kullanma; UI hızlı hissettirmeli.
- Kopyalanabilir telefon/e-posta alanlarına tek tık kopyalama ekle.
- Website / Maps / sosyal medya bağlantılarını yeni sekmede aç.

### Performans UX'i
- Büyük listelerde virtualization veya pagination düşün.
- Arama inputlarında gereksiz her tuşta API çağrısı yapma.
- Enrichment'i gerekirse progressive/asenkron göster; kullanıcı tüm sonuçların bitmesini beklemek zorunda kalmasın.
- Skeleton ile layout shift azalt.

### Görsel kalite kontrolü
Codex işi tamamlamadan önce yalnızca build testine bakma. Şunları da kontrol et:
- Aynı component içinde tutarsız padding/radius var mı?
- Text overflow kırılıyor mu?
- Uzun firma adları arayüzü bozuyor mu?
- 0 sonuç / 1 sonuç / 100+ sonuç state'leri kullanılabilir mi?
- Telefon veya website olmayan lead kartı düzgün görünüyor mu?
- Loading state'te layout zıplıyor mu?
- 420px genişlikte okunabilir mi?
- En önemli CTA her ekranda açık mı?

UI için component'leri tekrar kullanılabilir kur: `SearchForm`, `FilterBar`, `LeadCard/LeadRow`, `LeadScoreBadge`, `StatusBadge`, `BulkActionBar`, `LeadDetailDrawer`, `EmptyState`, `Skeleton` gibi.

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
