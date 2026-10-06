import { Router } from 'express';
import { z } from 'zod';
import { getSupabase } from '../services/supabase.js';

const router = Router();
const leadSchema = z.object({ placeId:z.string().min(1), name:z.string().min(1), category:z.string().optional(), phone:z.string().optional(), website:z.string().url().optional(), address:z.string().optional(), mapsUrl:z.string().url().optional(), rating:z.number().optional(), reviewCount:z.number().int().optional(), latitude:z.number().optional(), longitude:z.number().optional(), openingHours:z.array(z.string()).optional(), leadScore:z.number().min(0).max(100), scoreReasons:z.array(z.string()) });

router.get('/', async (_req,res,next)=>{ try { const {data,error}=await getSupabase().from('leads').select('*').order('lead_score',{ascending:false}); if(error) throw error; res.json({leads:(data??[]).map(dbToLead)}); } catch(e){next(e);} });

router.post('/', async (req,res,next)=>{ try { const input=leadSchema.parse(req.body); const row=leadToDb(input); const sb=getSupabase(); const existing=await sb.from('leads').select('*').eq('place_id',input.placeId).maybeSingle(); if(existing.error) throw existing.error; if(existing.data) return res.json({lead:dbToLead(existing.data),duplicate:true}); const {data,error}=await sb.from('leads').insert(row).select('*').single(); if(error) throw error; res.status(201).json({lead:dbToLead(data)}); } catch(e){next(e);} });

router.patch('/:id', async (req,res,next)=>{ try { const patch=z.object({status:z.enum(['Yeni','Arandı','WhatsApp Gönderildi','Teklif Verildi','Görüşülüyor','Müşteri Oldu','Olumsuz']).optional(),notes:z.string().max(5000).optional()}).parse(req.body); const {data,error}=await getSupabase().from('leads').update({...patch,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single(); if(error) throw error; res.json({lead:dbToLead(data)}); } catch(e){next(e);} });

router.get('/export.csv', async (_req,res,next)=>{ try { const {data,error}=await getSupabase().from('leads').select('*').order('lead_score',{ascending:false}); if(error) throw error; const rows=data??[]; const esc=(v:unknown)=>`"${String(v??'').replaceAll('"','""')}"`; const csv=['Firma,Telefon,Website,Adres,Puan,Yorum,Lead Score,Durum',...rows.map(r=>[r.name,r.phone,r.website,r.address,r.rating,r.review_count,r.lead_score,r.status].map(esc).join(','))].join('\n'); res.type('text/csv').setHeader('Content-Disposition','attachment; filename="musteriler.csv"').send('\uFEFF'+csv); } catch(e){next(e);} });

function leadToDb(l:z.infer<typeof leadSchema>){return{place_id:l.placeId,name:l.name,category:l.category,phone:l.phone,website:l.website,address:l.address,maps_url:l.mapsUrl,rating:l.rating,review_count:l.reviewCount,latitude:l.latitude,longitude:l.longitude,opening_hours:l.openingHours,lead_score:l.leadScore,score_reasons:l.scoreReasons};}
function dbToLead(r:any){return{id:r.id,placeId:r.place_id,name:r.name,category:r.category,phone:r.phone,website:r.website,address:r.address,mapsUrl:r.maps_url,rating:r.rating,reviewCount:r.review_count,latitude:r.latitude,longitude:r.longitude,openingHours:r.opening_hours??[],leadScore:r.lead_score??0,scoreReasons:r.score_reasons??[],status:r.status,notes:r.notes};}

export default router;
