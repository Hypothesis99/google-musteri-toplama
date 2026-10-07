import { Router } from 'express';
import { z } from 'zod';
import { upsertLeadsToGoogleSheet } from '../services/googleSheets.js';

const router = Router();

const leadSchema = z.object({
  placeId: z.string().min(1), name: z.string().min(1), category: z.string().optional(),
  phone: z.string().optional(), phoneType: z.enum(['Cep','Sabit','Diğer']).optional(), mobilePhone: z.string().optional(), landlinePhone: z.string().optional(),
  website: z.string().optional(), address: z.string().optional(), mapsUrl: z.string().optional(), rating: z.number().optional(), reviewCount: z.number().int().optional(), latitude: z.number().optional(), longitude: z.number().optional(), openingHours: z.array(z.string()).optional(),
  email: z.string().optional(), whatsapp: z.string().optional(), instagram: z.string().optional(), instagramFollowers: z.number().int().nonnegative().optional(),
  facebook: z.string().optional(), facebookFollowers: z.number().int().nonnegative().optional(), linkedin: z.string().optional(), linkedinFollowers: z.number().int().nonnegative().optional(),
  tiktok: z.string().optional(), tiktokFollowers: z.number().int().nonnegative().optional(), contactPage: z.string().optional(), hasContactForm: z.boolean().optional(), ssl: z.boolean().optional(), mobileFriendly: z.boolean().optional(), technology: z.array(z.string()).optional(), enrichmentStatus: z.enum(['idle', 'done', 'failed']).optional(),
  leadScore: z.number().min(0).max(100), scoreReasons: z.array(z.string()), status: z.string().optional(), tags: z.array(z.string()).optional(), notes: z.string().optional(), lastContactedAt: z.string().nullable().optional()
});

const exportSchema = z.object({ leads: z.array(leadSchema).min(1).max(2500) });

router.post('/export', async (req, res, next) => {
  try {
    const { leads } = exportSchema.parse(req.body);
    const result = await upsertLeadsToGoogleSheet(leads);
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

export default router;
