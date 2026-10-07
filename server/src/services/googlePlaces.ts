import { config, requireGooglePlacesKey } from '../config.js';
import { scoreLead } from './leadScore.js';
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

const BROAD_TERMS = [
  'restoran kafe lokanta',
  'market mağaza alışveriş',
  'eczane sağlık diş doktor klinik',
  'otomotiv oto servis lastik yedek parça',
  'inşaat yapı malzemeleri nalbur',
  'emlak gayrimenkul',
  'kuaför berber güzellik salonu',
  'eğitim okul kurs dershane',
  'sanayi fabrika imalat üretim',
  'tarım zeytin zirai ürün',
  'otel pansiyon konaklama',
  'reklam matbaa fotoğrafçı ajans',
  'telefon bilgisayar elektronik',
  'mobilya ev dekorasyon',
  'lojistik nakliye kargo',
  'muhasebe avukat danışmanlık sigorta'
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
  const base = {
    placeId: place.id ?? '',
    name: place.displayName?.text ?? 'İsimsiz işletme',
    category: place.primaryTypeDisplayName?.text,
    phone: place.nationalPhoneNumber,
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
    for (const term of BROAD_TERMS) searches.push({ text: `${term} ${location}`, pages: 1 });
  } else {
    searches.push({ text: `işletmeler ${location}`, pages: 3 });
  }

  const byId = new Map<string, GooglePlace>();
  for (const search of searches) {
    const places = await fetchTextSearch(search.text, search.pages);
    for (const place of places) if (place.id) byId.set(place.id, place);
  }

  return [...byId.values()]
    .map(toLead)
    .filter(place => place.placeId)
    .filter(place => minRating === undefined || (place.rating ?? 0) >= minRating)
    .filter(place => minReviews === undefined || (place.reviewCount ?? 0) >= minReviews)
    .sort((a, b) => b.leadScore - a.leadScore);
}
