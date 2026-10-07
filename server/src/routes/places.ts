import { Router } from 'express';
import { z } from 'zod';
import { googlePlacesProvider } from '../providers/googlePlacesProvider.js';

const router = Router();
const schema = z.object({
  query: z.string().trim().max(100).optional().default(''),
  location: z.string().trim().min(2).max(120),
  minRating: z.number().min(0).max(5).optional(),
  minReviews: z.number().int().min(0).optional(),
  scanMode: z.enum(['normal', 'broad']).optional().default('normal')
});

router.post('/search', async (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const results = await googlePlacesProvider.search(input);
    res.json({ provider: googlePlacesProvider.id, results });
  } catch (error) { next(error); }
});

export default router;
