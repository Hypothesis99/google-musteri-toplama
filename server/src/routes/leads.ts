import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { enrichLead } from '../services/enrichment.js';
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
  placeId:z.string().min(1), name:z.string().min(1), category:z.string().optional(), phone:z.string().optional(), phoneType:z.enum(['Cep','Sabit','Diğer']).optional(), mobilePhone:z.string().optional(), landlinePhone:z.string().optional(), website:z.string().optional(), address:z.string().optional(), mapsUrl:z.string().optional(), rating:z.number().optional(), reviewCount:z.number().int().optional(), latitude:z.number().optional(), longitude:z.number().optional(), openingHours:z.array(z.string()).optional(),
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
  const workbook=new ExcelJS.Workbook();
  workbook.creator='Contrast Creative Studio';
  workbook.created=new Date();

  const summary=workbook.addWorksheet('Özet',{views:[{showGridLines:false}]});
  summary.mergeCells('A1:D1');
  summary.getCell('A1').value='Google Müşteri Toplama — CRM Özeti';
  summary.getCell('A1').font={bold:true,size:18,color:{argb:'FFFFFFFF'}};
  summary.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF172033'}};
  summary.getCell('A1').alignment={vertical:'middle'};
  summary.getRow(1).height=32;
  const metrics=[
    ['Toplam Müşteri',rows.length],
    ['Websitesiz',rows.filter(r=>!r.website).length],
    ['Cep Telefonu Olan',rows.filter(r=>r.mobilePhone || r.phoneType==='Cep').length],
    ['Müşteri Oldu',rows.filter(r=>r.status==='Müşteri Oldu').length],
    ['Ortalama Lead Score',rows.length?Math.round(rows.reduce((sum,r)=>sum+r.leadScore,0)/rows.length):0]
  ];
  metrics.forEach(([label,val],index)=>{const row=index+3;summary.getCell(`A${row}`).value=label;summary.getCell(`B${row}`).value=val as number;summary.getCell(`A${row}`).font={bold:true};summary.getCell(`A${row}:B${row}` as any);});
  summary.getColumn('A').width=24; summary.getColumn('B').width=18;

  const sheet=workbook.addWorksheet('Müşteriler',{views:[{state:'frozen',ySplit:1}]});
  const columns:Array<{header:string;key:string;width:number}>=[
    {header:'Firma',key:'name',width:30},{header:'Kategori',key:'category',width:22},{header:'Telefon',key:'phone',width:18},{header:'Telefon Türü',key:'phoneType',width:14},{header:'Cep Telefonu',key:'mobilePhone',width:18},{header:'Sabit Hat',key:'landlinePhone',width:18},
    {header:'E-posta',key:'email',width:28},{header:'WhatsApp',key:'whatsapp',width:24},{header:'Website',key:'website',width:32},{header:'Website Durumu',key:'websiteStatus',width:16},
    {header:'Instagram',key:'instagram',width:28},{header:'IG Takipçi',key:'instagramFollowers',width:14},{header:'Facebook',key:'facebook',width:28},{header:'FB Takipçi',key:'facebookFollowers',width:14},
    {header:'LinkedIn',key:'linkedin',width:28},{header:'LI Takipçi',key:'linkedinFollowers',width:14},{header:'TikTok',key:'tiktok',width:28},{header:'TikTok Takipçi',key:'tiktokFollowers',width:16},
    {header:'Google Maps',key:'mapsUrl',width:30},{header:'Adres',key:'address',width:42},{header:'Puan',key:'rating',width:10},{header:'Yorum',key:'reviewCount',width:12},{header:'Lead Score',key:'leadScore',width:13},{header:'Durum',key:'status',width:22},{header:'Etiketler',key:'tags',width:24},{header:'Notlar',key:'notes',width:36},{header:'Son İletişim',key:'lastContactedAt',width:22}
  ];
  sheet.columns=columns;
  for(const lead of rows) sheet.addRow({
    ...lead,websiteStatus:lead.website?'Var':'Yok',tags:(lead.tags??[]).join(', ')
  });

  const header=sheet.getRow(1);
  header.height=28;
  header.font={bold:true,color:{argb:'FFFFFFFF'}};
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF172033'}};
  header.alignment={vertical:'middle',horizontal:'center',wrapText:true};
  sheet.autoFilter={from:'A1',to:'AA1'};
  sheet.properties.defaultRowHeight=20;

  for(let rowIndex=2;rowIndex<=sheet.rowCount;rowIndex++){
    const row=sheet.getRow(rowIndex);
    row.alignment={vertical:'top',wrapText:true};
    if(rowIndex%2===0) row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F8FA'}};
    const links=[['G','email'],['H','whatsapp'],['I','website'],['K','instagram'],['M','facebook'],['O','linkedin'],['Q','tiktok'],['S','mapsUrl']] as const;
    for(const [col,key] of links){const url=(rows[rowIndex-2] as any)?.[key];if(url){const hyperlink=key==='email'?`mailto:${url}`:String(url);sheet.getCell(`${col}${rowIndex}`).value={text:String(url),hyperlink};sheet.getCell(`${col}${rowIndex}`).font={color:{argb:'FF2F5597'},underline:true};}}
    sheet.getCell(`U${rowIndex}`).numFmt='0.0';
    sheet.getCell(`V${rowIndex}`).numFmt='0';
    sheet.getCell(`W${rowIndex}`).numFmt='0';
    sheet.getCell(`X${rowIndex}`).dataValidation={type:'list',allowBlank:false,formulae:['"Yeni,Arandı,WhatsApp Gönderildi,Teklif Verildi,Görüşülüyor,Müşteri Oldu,Olumsuz"']};
  }

  if(sheet.rowCount>=2){
    sheet.addConditionalFormatting({ref:`J2:J${sheet.rowCount}`,rules:[{type:'expression',formulae:['$J2="Yok"'],style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFFE5E5'},fgColor:{argb:'FFFFE5E5'}},font:{color:{argb:'FF9C2F2F'},bold:true}}}]});
    sheet.addConditionalFormatting({ref:`X2:X${sheet.rowCount}`,rules:[{type:'expression',formulae:['$X2="Müşteri Oldu"'],style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFE1F2E5'},fgColor:{argb:'FFE1F2E5'}},font:{color:{argb:'FF24613A'},bold:true}}}]});
  }

  const buffer=await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition','attachment; filename="contrast-musteri-havuzu.xlsx"');
  res.send(Buffer.from(buffer));
} catch(e){next(e);} });

export default router;
