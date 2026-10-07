import { config, requireGooglePlacesKey } from '../config.js';
import { scoreLead } from './leadScore.js';
import { classifyTrPhone } from './phone.js';
import type { LeadCandidate } from '../types.js';

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  primaryTypeDisplayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
}

type PlacesResponse = { places?: GooglePlace[]; nextPageToken?: string };

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.primaryTypeDisplayName', 'places.formattedAddress',
  'places.nationalPhoneNumber', 'places.websiteUri', 'places.googleMapsUri', 'places.rating',
  'places.userRatingCount', 'places.location', 'places.regularOpeningHours', 'nextPageToken'
].join(',');

// Google Text Search tek bir sorguda en fazla 60 sonuç döndürür. Geniş taramada farklı
// sektör ailelerini ayrı ayrı arayıp Place ID ile birleştirerek ilçe kapsamını büyütüyoruz.
const BROAD_TERMS = [
  'restoran lokanta yemek', 'kafe kahve pastane fırın', 'market bakkal süpermarket',
  'mağaza giyim ayakkabı tekstil', 'eczane medikal sağlık', 'doktor klinik diş hekimi veteriner',
  'otomotiv oto galeri', 'oto servis lastik yedek parça', 'akaryakıt istasyonu oto yıkama',
  'inşaat müteahhit yapı malzemeleri', 'nalbur hırdavat elektrik tesisat', 'emlak gayrimenkul',
  'kuaför berber güzellik salonu', 'spor salonu pilates fitness', 'okul eğitim kurs dershane kreş',
  'fabrika sanayi imalat üretim', 'tarım zeytin zirai ürün kooperatif', 'otel pansiyon konaklama',
  'reklam matbaa tabela fotoğrafçı ajans', 'telefon bilgisayar elektronik beyaz eşya',
  'mobilya dekorasyon perde halı', 'lojistik nakliye kargo kurye', 'muhasebe mali müşavir avukat danışmanlık',
  'sigorta banka finans', 'düğün salonu organizasyon çiçekçi', 'temizlik güvenlik bakım hizmetleri',
  'kasap manav şarküteri', 'demir çelik metal makine', 'mermer cam alüminyum pvc',
  'turizm seyahat rent a car', 'petshop yem hayvancılık', 'kırtasiye kitap oyuncak hediyelik'
];

async function fetchTextSearch(textQuery: string, maxPages: number): Promise<GooglePlace[]> {
  const collected: GooglePlace[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const body: Record<string, unknown> = { textQuery, languageCode: 'tr', pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Google Places isteği başarısız (${response.status}). ${detail.slice(0, 180)}`);
    }

    const data = await response.json() as PlacesResponse;
    collected.push(...(data.places ?? []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return collected;
}

function toLead(place: GooglePlace): LeadCandidate {
  const phones = classifyTrPhone(place.nationalPhoneNumber);
  const base = {
    placeId: place.id ?? '',
    name: place.displayName?.text ?? 'İsimsiz işletme',
    category: place.primaryTypeDisplayName?.text,
    ...phones,
    website: place.websiteUri,
    address: place.formattedAddress,
    mapsUrl: place.googleMapsUri,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    latitude: place.location?.latitude,
    longitude: place.location?.longitude,
    openingHours: place.regularOpeningHours?.weekdayDescriptions
  };
  return { ...base, ...scoreLead(base) };
}

async function runSearches(searches: Array<{ text: string; pages: number }>): Promise<GooglePlace[]> {
  const all: GooglePlace[] = [];
  const concurrency = 4;
  for (let index = 0; index < searches.length; index += concurrency) {
    const batch = searches.slice(index, index + concurrency);
    const settled = await Promise.allSettled(batch.map(search => fetchTextSearch(search.text, search.pages)));
    for (const result of settled) if (result.status === 'fulfilled') all.push(...result.value);
  }
  return all;
}

export async function searchPlaces(
  query: string,
  location: string,
  minRating?: number,
  minReviews?: number,
  scanMode: 'normal' | 'broad' = 'normal'
): Promise<LeadCandidate[]> {
  requireGooglePlacesKey();

  const searches: Array<{ text: string; pages: number }> = [];
  if (query.trim()) {
    searches.push({ text: `${query.trim()} ${location}`, pages: 3 });
  } else if (scanMode === 'broad') {
    searches.push({ text: `işletmeler ${location}`, pages: 3 });
    for (const term of BROAD_TERMS) searches.push({ text: `${term} ${location}`, pages: 3 });
  } else {
    searches.push({ text: `işletmeler ${location}`, pages: 3 });
  }

  const places = await runSearches(searches);
  const byId = new Map<string, GooglePlace>();
  for (const place of places) if (place.id) byId.set(place.id, place);

  return [...byId.values()]
    .map(toLead)
    .filter(place => place.placeId)
    .filter(place => minRating === undefined || (place.rating ?? 0) >= minRating)
    .filter(place => minReviews === undefined || (place.reviewCount ?? 0) >= minReviews)
    .sort((a, b) => b.leadScore - a.leadScore);
}
