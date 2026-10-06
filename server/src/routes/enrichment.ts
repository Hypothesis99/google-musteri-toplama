import { Router } from 'express';
import { z } from 'zod';
import { enrichLead } from '../services/enrichment.js';

const router = Router();
const leadSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  mapsUrl: z.string().url().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().int().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  openingHours: z.array(z.string()).optional(),
  leadScore: z.number().min(0).max(100),
  scoreReasons: z.array(z.string())
});

router.post('/', async (req, res, next) => {
  try {
    const input = leadSchema.parse(req.body);
    res.json({ lead: await enrichLead(input) });
  } catch (error) { next(error); }
});

export default router;
