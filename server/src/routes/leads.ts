import { Router } from 'express';
import { z } from 'zod';
import { enrichLead } from '../services/enrichment.js';
import { buildLeadsWorkbook } from '../services/excelExport.js';
import {
  getLeadFromGoogleSheet,
  getLeadsFromGoogleSheet,
  replaceLeadInGoogleSheet,
  updateLeadInGoogleSheet,
  upsertLeadToGoogleSheet,
  type GoogleSheetLead,
  type LeadStatus
} from '../services/googleSheets.js';

const router = Router();
const statusSchema = z.enum(['Yeni','Arandı','WhatsApp Gönderildi','Teklif Verildi','Görüşülüyor','Müşteri Oldu','Olumsuz']);
const leadSchema = z.object({
  placeId:z.string().min(1), name:z.string().min(1), category:z.string().optional(),
  phone:z.string().optional(), phoneType:z.enum(['Cep','Sabit','Diğer']).optional(), mobilePhone:z.string().optional(), landlinePhone:z.string().optional(),
  website:z.string().optional(), address:z.string().optional(), mapsUrl:z.string().optional(), rating:z.number().optional(), reviewCount:z.number().int().optional(), latitude:z.number().optional(), longitude:z.number().optional(), openingHours:z.array(z.string()).optional(),
  email:z.string().optional(), whatsapp:z.string().optional(), instagram:z.string().optional(), instagramFollowers:z.number().int().nonnegative().optional(), facebook:z.string().optional(), facebookFollowers:z.number().int().nonnegative().optional(), linkedin:z.string().optional(), linkedinFollowers:z.number().int().nonnegative().optional(), tiktok:z.string().optional(), tiktokFollowers:z.number().int().nonnegative().optional(), contactPage:z.string().optional(), hasContactForm:z.boolean().optional(), ssl:z.boolean().optional(), mobileFriendly:z.boolean().optional(), technology:z.array(z.string()).optional(), enrichmentStatus:z.enum(['idle','done','failed']).optional(),
  leadScore:z.number().min(0).max(100), scoreReasons:z.array(z.string()), status:statusSchema.optional(), notes:z.string().optional(), tags:z.array(z.string()).optional(), lastContactedAt:z.string().nullable().optional()
});
const patchSchema = z.object({
  status:statusSchema.optional(), notes:z.string().max(5000).optional(), tags:z.array(z.string().trim().min(1).max(50)).max(30).optional(), lastContactedAt:z.string().datetime().nullable().optional()
});

router.get('/', async (_req,res,next)=>{ try { res.json({leads:await getLeadsFromGoogleSheet()}); } catch(e){next(e);} });

router.post('/', async (req,res,next)=>{ try {
  const input=leadSchema.parse(req.body);
  const result=await upsertLeadToGoogleSheet(input);
  res.status(result.duplicate ? 200 : 201).json(result);
} catch(e){next(e);} });

router.patch('/:id', async (req,res,next)=>{ try {
  const patch=patchSchema.parse(req.body);
  const lead=await updateLeadInGoogleSheet(req.params.id, patch as {status?:LeadStatus;notes?:string;tags?:string[];lastContactedAt?:string|null});
  res.json({lead});
} catch(e){next(e);} });

router.post('/:id/enrich', async (req,res,next)=>{ try {
  const current=await getLeadFromGoogleSheet(req.params.id);
  if(!current) throw new Error('Müşteri Google Sheets havuzunda bulunamadı.');
  const enriched=await enrichLead(current);
  const saved:GoogleSheetLead={...current,...enriched,id:current.id,status:current.status,tags:current.tags,notes:current.notes,lastContactedAt:current.lastContactedAt};
  await replaceLeadInGoogleSheet(saved);
  res.json({lead:saved});
} catch(e){next(e);} });

router.get('/export.csv', async (_req,res,next)=>{ try {
  const rows=await getLeadsFromGoogleSheet();
  const esc=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`;
  const headers=['Firma','Kategori','Telefon','Telefon Türü','Cep Telefonu','Sabit Hat','E-posta','WhatsApp','Website','Website Durumu','Instagram','Instagram Takipçi','Facebook','Facebook Takipçi','LinkedIn','LinkedIn Takipçi','TikTok','TikTok Takipçi','Google Maps','Adres','Puan','Yorum','Lead Score','Durum','Etiketler','Notlar','Son İletişim'];
  const csv=[headers.join(','),...rows.map(r=>[
    r.name,r.category,r.phone,r.phoneType,r.mobilePhone,r.landlinePhone,r.email,r.whatsapp,r.website,r.website?'Var':'Yok',
    r.instagram,r.instagramFollowers,r.facebook,r.facebookFollowers,r.linkedin,r.linkedinFollowers,r.tiktok,r.tiktokFollowers,
    r.mapsUrl,r.address,r.rating,r.reviewCount,r.leadScore,r.status,(r.tags??[]).join(' | '),r.notes,r.lastContactedAt
  ].map(esc).join(','))].join('\n');
  res.type('text/csv').setHeader('Content-Disposition','attachment; filename="musteriler.csv"').send('\uFEFF'+csv);
} catch(e){next(e);} });

router.get('/export.xlsx', async (_req,res,next)=>{ try {
  const rows=await getLeadsFromGoogleSheet();
  const buffer=await buildLeadsWorkbook(rows);
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename="contrast-musteri-havuzu.xlsx"');
  res.send(buffer);
} catch(e){next(e);} });

export default router;
