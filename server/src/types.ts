export interface LeadCandidate {
  placeId: string;
  name: string;
  category?: string;
  phone?: string;
  website?: string;
  address?: string;
  mapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  leadScore: number;
  scoreReasons: string[];
}
