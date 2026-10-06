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

export async function searchPlaces(query: string, location: string, minRating?: number, minReviews?: number): Promise<LeadCandidate[]> {
  requireGooglePlacesKey();
  const textQuery = query.trim() ? `${query.trim()} ${location}` : `işletmeler ${location}`;

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.googlePlacesApiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount,places.location,places.regularOpeningHours'
    },
    body: JSON.stringify({ textQuery, languageCode: 'tr', maxResultCount: 20 })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Places isteği başarısız (${response.status}). ${detail.slice(0, 180)}`);
  }

  const data = await response.json() as { places?: GooglePlace[] };
  return (data.places ?? []).map((place) => {
    const base = {
      placeId: place.id ?? '', name: place.displayName?.text ?? 'İsimsiz işletme', category: place.primaryTypeDisplayName?.text,
      phone: place.nationalPhoneNumber, website: place.websiteUri, address: place.formattedAddress, mapsUrl: place.googleMapsUri,
      rating: place.rating, reviewCount: place.userRatingCount, latitude: place.location?.latitude, longitude: place.location?.longitude,
      openingHours: place.regularOpeningHours?.weekdayDescriptions
    };
    return { ...base, ...scoreLead(base) };
  }).filter(p => p.placeId && (minRating === undefined || (p.rating ?? 0) >= minRating) && (minReviews === undefined || (p.reviewCount ?? 0) >= minReviews));
}
