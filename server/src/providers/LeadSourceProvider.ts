import type { LeadCandidate } from '../types.js';

export interface LeadSearchInput {
  query: string;
  location: string;
  minRating?: number;
  minReviews?: number;
}

export interface LeadSourceProvider {
  id: string;
  search(input: LeadSearchInput): Promise<LeadCandidate[]>;
}
