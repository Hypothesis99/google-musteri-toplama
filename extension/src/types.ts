export type LeadStatus = 'Yeni' | 'Arandı' | 'WhatsApp Gönderildi' | 'Teklif Verildi' | 'Görüşülüyor' | 'Müşteri Oldu' | 'Olumsuz';

export interface LeadCandidate {
  placeId: string;
  name: string;
  category?: string;
  phone?: string;
  phoneType?: 'Cep' | 'Sabit' | 'Diğer';
  mobilePhone?: string;
  landlinePhone?: string;
  website?: string;
  address?: string;
  mapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
  openingHours?: string[];
  email?: string;
  whatsapp?: string;
  instagram?: string;
  instagramFollowers?: number;
  facebook?: string;
  facebookFollowers?: number;
  linkedin?: string;
  linkedinFollowers?: number;
  tiktok?: string;
  tiktokFollowers?: number;
  contactPage?: string;
  hasContactForm?: boolean;
  ssl?: boolean;
  mobileFriendly?: boolean;
  technology?: string[];
  enrichmentStatus?: 'idle' | 'done' | 'failed';
  leadScore: number;
  scoreReasons: string[];
}

export interface SearchPayload {
  query?: string;
  location: string;
  minRating?: number;
  minReviews?: number;
  scanMode?: 'normal' | 'broad';
}

export interface SearchHistoryItem extends SearchPayload {
  id: string;
  createdAt: string;
  resultCount: number;
}

export interface SavedLead extends LeadCandidate {
  id: string;
  status: LeadStatus;
  notes?: string;
  tags?: string[];
  lastContactedAt?: string | null;
}
