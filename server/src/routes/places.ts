import { Router } from 'express';
import { z } from 'zod';
import { searchPlaces } from '../services/googlePlaces.js';

const router = Router();
const schema = z.object({ query: z.string().trim().min(2).max(100), location: z.string().trim().min(2).max(120), minRating: z.number().min(0).max(5).optional(), minReviews: z.number().int().min(0).optional() });

router.post('/search', async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const results = await searchPlaces(input.query, input.location, input.minRating, input.minReviews);
    res.json({ results });
  } catch (error) { next(error); }
});

export default router;
