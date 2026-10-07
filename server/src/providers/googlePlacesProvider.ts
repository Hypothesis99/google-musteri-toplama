import type { LeadSourceProvider } from './LeadSourceProvider.js';
import { searchPlaces } from '../services/googlePlaces.js';

export const googlePlacesProvider: LeadSourceProvider = {
  id: 'google-places',
  search: ({ query, location, minRating, minReviews, scanMode }) => searchPlaces(query, location, minRating, minReviews, scanMode)
};
