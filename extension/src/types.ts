export type LeadStatus = 'Yeni' | 'Arandı' | 'WhatsApp Gönderildi' | 'Teklif Verildi' | 'Görüşülüyor' | 'Müşteri Oldu' | 'Olumsuz';

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

export interface SearchPayload {
  query?: string;
  location: string;
  minRating?: number;
  minReviews?: number;
}

export interface EnrichmentData {
  email?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  contactPage?: string;
  hasContactForm?: boolean;
  hasSsl?: boolean;
  technology?: string[];
}

export interface SavedLead extends LeadCandidate {
  id: string;
  status: LeadStatus;
  notes?: string;
  enrichment?: EnrichmentData;
}
