import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { getSupabase } from '../services/supabase.js';
import { enrichLead } from '../services/enrichment.js';

const router = Router();
const leadSchema = z.object({
  placeId:z.string().min(1), name:z.string().min(1), category:z.string().optional(), phone:z.string().optional(), website:z.string().url().optional(), address:z.string().optional(), mapsUrl:z.string().url().optional(), rating:z.number().optional(), reviewCount:z.number().int().optional(), latitude:z.number().optional(), longitude:z.number().optional(), openingHours:z.array(z.string()).optional(),
  email:z.string().optional(), whatsapp:z.string().url().optional(), instagram:z.string().url().optional(), facebook:z.string().url().optional(), linkedin:z.string().url().optional(), tiktok:z.string().url().optional(), contactPage:z.string().url().optional(), hasContactForm:z.boolean().optional(), ssl:z.boolean().optional(), mobileFriendly:z.boolean().optional(), technology:z.array(z.string()).optional(), enrichmentStatus:z.enum(['idle','done','failed']).optional(),
  leadScore:z.number().min(0).max(100), scoreReasons:z.array(z.string())
});
const patchSchema = z.object({
  status:z.enum(['Yeni','Arandı','WhatsApp Gönderildi','Teklif Verildi','Görüşülüyor','Müşteri Oldu','Olumsuz']).optional(),
  notes:z.string().max(5000).optional(),
  tags:z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  lastContactedAt:z.string().datetime().nullable().optional()
});

router.get('/', async (_req,res,next)=>{ try { const {data,error}=await getSupabase().from('leads').select('*').order('lead_score',{ascending:false}); if(error) throw error; res.json({leads:(data??[]).map(dbToLead)}); } catch(e){next(e);} });

router.post('/', async (req,res,next)=>{ try { const input=leadSchema.parse(req.body); const row=leadToDb(input); const sb=getSupabase(); const existing=await sb.from('leads').select('*').eq('place_id',input.placeId).maybeSingle(); if(existing.error) throw existing.error; if(existing.data) return res.json({lead:dbToLead(existing.data),duplicate:true}); const {data,error}=await sb.from('leads').insert(row).select('*').single(); if(error) throw error; res.status(201).json({lead:dbToLead(data)}); } catch(e){next(e);} });

router.patch('/:id', async (req,res,next)=>{ try { const patch=patchSchema.parse(req.body); const now=new Date().toISOString(); const update:any={updated_at:now}; if(patch.status!==undefined) update.status=patch.status; if(patch.notes!==undefined) update.notes=patch.notes; if(patch.tags!==undefined) update.tags=patch.tags; if(patch.lastContactedAt!==undefined) update.last_contacted_at=patch.lastContactedAt; else if(patch.status && patch.status!=='Yeni' && patch.status!=='Olumsuz') update.last_contacted_at=now; const {data,error}=await getSupabase().from('leads').update(update).eq('id',req.params.id).select('*').single(); if(error) throw error; res.json({lead:dbToLead(data)}); } catch(e){next(e);} });

router.post('/:id/enrich', async (req,res,next)=>{ try { const sb=getSupabase(); const current=await sb.from('leads').select('*').eq('id',req.params.id).single(); if(current.error) throw current.error; const enriched=await enrichLead(dbToLead(current.data)); const update=leadToDb(enriched); const {data,error}=await sb.from('leads').update({...update,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single(); if(error) throw error; res.json({lead:dbToLead(data)}); } catch(e){next(e);} });

router.get('/export.csv', async (_req,res,next)=>{ try { const rows=await getRows(); const esc=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`; const csv=['Firma,Kategori,Telefon,E-posta,WhatsApp,Website,Instagram,Facebook,LinkedIn,Adres,Puan,Yorum,Lead Score,Durum,Etiketler,Son İletişim',...rows.map(r=>[r.name,r.category,r.phone,r.email,r.whatsapp,r.website,r.instagram,r.facebook,r.linkedin,r.address,r.rating,r.review_count,r.lead_score,r.status,(r.tags??[]).join(' | '),r.last_contacted_at].map(esc).join(','))].join('\n'); res.type('text/csv').setHeader('Content-Disposition','attachment; filename="musteriler.csv"').send('\uFEFF'+csv); } catch(e){next(e);} });

router.get('/export.xlsx', async (_req,res,next)=>{ try { const rows=await getRows(); const workbook=new ExcelJS.Workbook(); const sheet=workbook.addWorksheet('Müşteriler'); sheet.columns=[['Firma','name'],['Kategori','category'],['Telefon','phone'],['E-posta','email'],['WhatsApp','whatsapp'],['Website','website'],['Instagram','instagram'],['Facebook','facebook'],['LinkedIn','linkedin'],['Adres','address'],['Puan','rating'],['Yorum','review_count'],['Lead Score','lead_score'],['Durum','status'],['Etiketler','tags'],['Son İletişim','last_contacted_at']].map(([header,key])=>({header,key,width:20})); for(const row of rows) sheet.addRow({...row,tags:(row.tags??[]).join(', ')}); sheet.getRow(1).font={bold:true}; sheet.views=[{state:'frozen',ySplit:1}]; const buffer=await workbook.xlsx.writeBuffer(); res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition','attachment; filename="musteriler.xlsx"'); res.send(Buffer.from(buffer)); } catch(e){next(e);} });

async function getRows(){ const {data,error}=await getSupabase().from('leads').select('*').order('lead_score',{ascending:false}); if(error) throw error; return data??[]; }
function leadToDb(l:z.infer<typeof leadSchema> | any){return{place_id:l.placeId,name:l.name,category:l.category,phone:l.phone,website:l.website,address:l.address,maps_url:l.mapsUrl,rating:l.rating,review_count:l.reviewCount,latitude:l.latitude,longitude:l.longitude,opening_hours:l.openingHours,email:l.email,whatsapp:l.whatsapp,instagram:l.instagram,facebook:l.facebook,linkedin:l.linkedin,tiktok:l.tiktok,contact_page:l.contactPage,has_contact_form:l.hasContactForm,ssl:l.ssl,mobile_friendly:l.mobileFriendly,technology:l.technology??[],enrichment_status:l.enrichmentStatus??'idle',lead_score:l.leadScore,score_reasons:l.scoreReasons};}
function dbToLead(r:any){return{id:r.id,placeId:r.place_id,name:r.name,category:r.category,phone:r.phone,website:r.website,address:r.address,mapsUrl:r.maps_url,rating:r.rating,reviewCount:r.review_count,latitude:r.latitude,longitude:r.longitude,openingHours:r.opening_hours??[],email:r.email,whatsapp:r.whatsapp,instagram:r.instagram,facebook:r.facebook,linkedin:r.linkedin,tiktok:r.tiktok,contactPage:r.contact_page,hasContactForm:r.has_contact_form,ssl:r.ssl,mobileFriendly:r.mobile_friendly,technology:r.technology??[],enrichmentStatus:r.enrichment_status??'idle',leadScore:r.lead_score??0,scoreReasons:r.score_reasons??[],status:r.status,notes:r.notes,tags:r.tags??[],lastContactedAt:r.last_contacted_at};}

export default router;
