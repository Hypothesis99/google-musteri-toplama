import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { config, requireGoogleSheets } from '../config.js';
import type { LeadCandidate } from '../types.js';

export type LeadStatus = 'Yeni' | 'Arandı' | 'WhatsApp Gönderildi' | 'Teklif Verildi' | 'Görüşülüyor' | 'Müşteri Oldu' | 'Olumsuz';

export type GoogleSheetLead = LeadCandidate & {
  id: string;
  status: LeadStatus;
  tags: string[];
  notes: string;
  lastContactedAt?: string | null;
};

type ExportableLead = LeadCandidate & {
  status?: string;
  tags?: string[];
  notes?: string;
  lastContactedAt?: string | null;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type SheetInfo = { title: string; sheetId: number };

export const SHEET_HEADERS = [
  'Place ID', 'Firma', 'Kategori', 'Telefon', 'Telefon Türü', 'Cep Telefonu', 'Sabit Hat',
  'E-posta', 'WhatsApp', 'Website', 'Website Durumu', 'Instagram', 'Instagram Takipçi',
  'Facebook', 'Facebook Takipçi', 'LinkedIn', 'LinkedIn Takipçi', 'TikTok', 'TikTok Takipçi',
  'Google Maps', 'Adres', 'Puan', 'Yorum', 'Lead Score', 'Durum', 'Etiketler', 'Notlar',
  'Son İletişim', 'SSL', 'Mobil Uyum', 'İletişim Formu', 'Teknoloji', 'Çalışma Saatleri'
];

const STATUSES: LeadStatus[] = ['Yeni', 'Arandı', 'WhatsApp Gönderildi', 'Teklif Verildi', 'Görüşülüyor', 'Müşteri Oldu', 'Olumsuz'];

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

async function loadServiceAccount(): Promise<ServiceAccount> {
  requireGoogleSheets();
  const file = config.googleServiceAccountFile;
  const path = isAbsolute(file) ? file : resolve(process.cwd(), file);
  const parsed = JSON.parse(await readFile(path, 'utf8')) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) throw new Error('Google servis hesabı JSON dosyası geçersiz.');
  return parsed as ServiceAccount;
}

async function getAccessToken(): Promise<string> {
  const account = await loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: account.token_uri ?? 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key).toString('base64url');

  const response = await fetch(account.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` })
  });
  const data = await response.json().catch(() => ({})) as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? 'Google erişim anahtarı alınamadı.');
  return data.access_token;
}

async function googleRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.error?.message ?? 'Google Sheets işlemi başarısız oldu.';
    throw new Error(message);
  }
  return data as T;
}

async function getFirstSheetInfo(): Promise<SheetInfo> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}?fields=sheets.properties(sheetId,title)`;
  const data = await googleRequest<{ sheets?: Array<{ properties?: { title?: string; sheetId?: number } }> }>(url);
  const properties = data.sheets?.[0]?.properties;
  if (!properties?.title || properties.sheetId === undefined) throw new Error('Google Sheet içinde çalışma sayfası bulunamadı.');
  return { title: properties.title, sheetId: properties.sheetId };
}

function escapedTitle(title: string): string {
  return `'${title.replaceAll("'", "''")}'`;
}

function value(row: unknown[], headerIndex: Map<string, number>, name: string): string {
  const index = headerIndex.get(name);
  return index === undefined ? '' : String(row[index] ?? '').trim();
}

function numberValue(row: unknown[], headerIndex: Map<string, number>, name: string): number | undefined {
  const raw = value(row, headerIndex, name);
  if (!raw) return undefined;
  const parsed = Number(raw.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function boolValue(row: unknown[], headerIndex: Map<string, number>, name: string): boolean | undefined {
  const raw = value(row, headerIndex, name).toLocaleLowerCase('tr-TR');
  if (!raw) return undefined;
  return ['evet', 'var', 'true', '1'].includes(raw);
}

function rowToLead(headers: string[], row: unknown[]): GoogleSheetLead | undefined {
  const headerIndex = new Map(headers.map((header, index) => [String(header).trim(), index]));
  const placeId = value(row, headerIndex, 'Place ID');
  const name = value(row, headerIndex, 'Firma');
  if (!placeId || !name) return undefined;
  const statusRaw = value(row, headerIndex, 'Durum') as LeadStatus;
  const status = STATUSES.includes(statusRaw) ? statusRaw : 'Yeni';

  return {
    id: placeId,
    placeId,
    name,
    category: value(row, headerIndex, 'Kategori') || undefined,
    phone: value(row, headerIndex, 'Telefon') || undefined,
    phoneType: (value(row, headerIndex, 'Telefon Türü') || undefined) as LeadCandidate['phoneType'],
    mobilePhone: value(row, headerIndex, 'Cep Telefonu') || undefined,
    landlinePhone: value(row, headerIndex, 'Sabit Hat') || undefined,
    email: value(row, headerIndex, 'E-posta') || undefined,
    whatsapp: value(row, headerIndex, 'WhatsApp') || undefined,
    website: value(row, headerIndex, 'Website') || undefined,
    instagram: value(row, headerIndex, 'Instagram') || undefined,
    instagramFollowers: numberValue(row, headerIndex, 'Instagram Takipçi'),
    facebook: value(row, headerIndex, 'Facebook') || undefined,
    facebookFollowers: numberValue(row, headerIndex, 'Facebook Takipçi'),
    linkedin: value(row, headerIndex, 'LinkedIn') || undefined,
    linkedinFollowers: numberValue(row, headerIndex, 'LinkedIn Takipçi'),
    tiktok: value(row, headerIndex, 'TikTok') || undefined,
    tiktokFollowers: numberValue(row, headerIndex, 'TikTok Takipçi'),
    mapsUrl: value(row, headerIndex, 'Google Maps') || undefined,
    address: value(row, headerIndex, 'Adres') || undefined,
    rating: numberValue(row, headerIndex, 'Puan'),
    reviewCount: numberValue(row, headerIndex, 'Yorum'),
    leadScore: numberValue(row, headerIndex, 'Lead Score') ?? 0,
    status,
    tags: value(row, headerIndex, 'Etiketler').split(',').map(item => item.trim()).filter(Boolean),
    notes: value(row, headerIndex, 'Notlar'),
    lastContactedAt: value(row, headerIndex, 'Son İletişim') || null,
    ssl: boolValue(row, headerIndex, 'SSL'),
    mobileFriendly: boolValue(row, headerIndex, 'Mobil Uyum'),
    hasContactForm: boolValue(row, headerIndex, 'İletişim Formu'),
    technology: value(row, headerIndex, 'Teknoloji').split(',').map(item => item.trim()).filter(Boolean),
    openingHours: value(row, headerIndex, 'Çalışma Saatleri').split(' | ').map(item => item.trim()).filter(Boolean),
    scoreReasons: []
  };
}

function rowForLead(lead: ExportableLead): unknown[] {
  return [
    lead.placeId, lead.name, lead.category ?? '', lead.phone ?? '', lead.phoneType ?? '',
    lead.mobilePhone ?? '', lead.landlinePhone ?? '', lead.email ?? '', lead.whatsapp ?? '',
    lead.website ?? '', lead.website ? 'Var' : 'Yok', lead.instagram ?? '', lead.instagramFollowers ?? '',
    lead.facebook ?? '', lead.facebookFollowers ?? '', lead.linkedin ?? '', lead.linkedinFollowers ?? '',
    lead.tiktok ?? '', lead.tiktokFollowers ?? '', lead.mapsUrl ?? '', lead.address ?? '', lead.rating ?? '',
    lead.reviewCount ?? '', lead.leadScore ?? '', lead.status ?? 'Yeni', (lead.tags ?? []).join(', '),
    lead.notes ?? '', lead.lastContactedAt ?? '', lead.ssl === undefined ? '' : lead.ssl ? 'Var' : 'Yok',
    lead.mobileFriendly === undefined ? '' : lead.mobileFriendly ? 'Var' : 'Yok',
    lead.hasContactForm === undefined ? '' : lead.hasContactForm ? 'Var' : 'Yok',
    (lead.technology ?? []).join(', '), (lead.openingHours ?? []).join(' | ')
  ];
}

function mergeDefined<T extends Record<string, any>>(base: T | undefined, incoming: T): T {
  if (!base) return incoming;
  const result: Record<string, any> = { ...base };
  for (const [key, val] of Object.entries(incoming)) {
    if (val !== undefined && val !== null && val !== '') result[key] = val;
  }
  return result as T;
}

async function readAll(): Promise<{ info: SheetInfo; leads: GoogleSheetLead[] }> {
  requireGoogleSheets();
  const info = await getFirstSheetInfo();
  const range = `${escapedTitle(info.title)}!A:AZ`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}/values/${encodeURIComponent(range)}`;
  const data = await googleRequest<{ values?: unknown[][] }>(url);
  const values = data.values ?? [];
  if (!values.length) return { info, leads: [] };
  const headers = (values[0] ?? []).map(item => String(item ?? '').trim());
  const leads = values.slice(1).map(row => rowToLead(headers, row)).filter((lead): lead is GoogleSheetLead => Boolean(lead));
  return { info, leads };
}

async function formatSheet(info: SheetInfo, rowCount: number) {
  const requests: any[] = [
    { updateSheetProperties: { properties: { sheetId: info.sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
    { repeatCell: { range: { sheetId: info.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: SHEET_HEADERS.length }, cell: { userEnteredFormat: { backgroundColor: { red: 0.09, green: 0.13, blue: 0.2 }, textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat' } },
    { repeatCell: { range: { sheetId: info.sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: 0, endColumnIndex: SHEET_HEADERS.length }, cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat.verticalAlignment,userEnteredFormat.wrapStrategy' } },
    { setBasicFilter: { filter: { range: { sheetId: info.sheetId, startRowIndex: 0, endRowIndex: Math.max(rowCount, 1), startColumnIndex: 0, endColumnIndex: SHEET_HEADERS.length } } } },
    { updateDimensionProperties: { range: { sheetId: info.sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: SHEET_HEADERS.length }, properties: { pixelSize: 135 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId: info.sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 230 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId: info.sheetId, dimension: 'COLUMNS', startIndex: 20, endIndex: 21 }, properties: { pixelSize: 300 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId: info.sheetId, dimension: 'COLUMNS', startIndex: 26, endIndex: 27 }, properties: { pixelSize: 260 }, fields: 'pixelSize' } },
    { addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId: info.sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: 10, endColumnIndex: 11 }], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Yok' }] }, format: { backgroundColor: { red: 1, green: 0.9, blue: 0.9 }, textFormat: { foregroundColor: { red: 0.55, green: 0.12, blue: 0.12 }, bold: true } } } } } },
    { addConditionalFormatRule: { index: 0, rule: { ranges: [{ sheetId: info.sheetId, startRowIndex: 1, endRowIndex: Math.max(rowCount, 2), startColumnIndex: 24, endColumnIndex: 25 }], booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Müşteri Oldu' }] }, format: { backgroundColor: { red: 0.86, green: 0.96, blue: 0.88 }, textFormat: { foregroundColor: { red: 0.12, green: 0.38, blue: 0.2 }, bold: true } } } } } }
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}:batchUpdate`;
  await googleRequest(url, { method: 'POST', body: JSON.stringify({ requests }) });
}

async function writeAll(info: SheetInfo, leads: ExportableLead[]) {
  const title = escapedTitle(info.title);
  const clearRange = `${title}!A:AZ`;
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}/values/${encodeURIComponent(clearRange)}:clear`;
  await googleRequest(clearUrl, { method: 'POST', body: '{}' });

  const values = [SHEET_HEADERS, ...leads.map(rowForLead)];
  const endRow = Math.max(values.length, 1);
  const writeRange = `${title}!A1:AG${endRow}`;
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}/values/${encodeURIComponent(writeRange)}?valueInputOption=RAW`;
  await googleRequest(writeUrl, { method: 'PUT', body: JSON.stringify({ values }) });
  await formatSheet(info, values.length);
}

export async function getLeadsFromGoogleSheet(): Promise<GoogleSheetLead[]> {
  const { leads } = await readAll();
  return leads.sort((a, b) => b.leadScore - a.leadScore);
}

export async function getLeadFromGoogleSheet(id: string): Promise<GoogleSheetLead | undefined> {
  const { leads } = await readAll();
  return leads.find(lead => lead.id === id || lead.placeId === id);
}

export async function upsertLeadToGoogleSheet(lead: ExportableLead): Promise<{ lead: GoogleSheetLead; duplicate: boolean }> {
  const { info, leads } = await readAll();
  const index = leads.findIndex(item => item.placeId === lead.placeId);
  const existing = index >= 0 ? leads[index] : undefined;
  const merged = mergeDefined(existing as any, {
    ...(lead as any),
    id: lead.placeId,
    status: (existing?.status ?? lead.status ?? 'Yeni') as LeadStatus,
    tags: existing?.tags ?? lead.tags ?? [],
    notes: existing?.notes ?? lead.notes ?? '',
    lastContactedAt: existing?.lastContactedAt ?? lead.lastContactedAt ?? null
  });
  if (index >= 0) leads[index] = merged;
  else leads.push(merged);
  await writeAll(info, leads);
  return { lead: merged, duplicate: Boolean(existing) };
}

export async function updateLeadInGoogleSheet(id: string, patch: { status?: LeadStatus; notes?: string; tags?: string[]; lastContactedAt?: string | null }): Promise<GoogleSheetLead> {
  const { info, leads } = await readAll();
  const index = leads.findIndex(item => item.id === id || item.placeId === id);
  if (index < 0) throw new Error('Müşteri Google Sheets havuzunda bulunamadı.');
  const current = leads[index];
  if (!current) throw new Error('Müşteri Google Sheets havuzunda bulunamadı.');
  const now = new Date().toISOString();
  const updated: GoogleSheetLead = {
    ...current,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    ...(patch.lastContactedAt !== undefined ? { lastContactedAt: patch.lastContactedAt } : {}),
    ...(patch.lastContactedAt === undefined && patch.status && patch.status !== 'Yeni' && patch.status !== 'Olumsuz' ? { lastContactedAt: now } : {})
  };
  leads[index] = updated;
  await writeAll(info, leads);
  return updated;
}

export async function replaceLeadInGoogleSheet(lead: GoogleSheetLead): Promise<GoogleSheetLead> {
  const { info, leads } = await readAll();
  const index = leads.findIndex(item => item.id === lead.id || item.placeId === lead.placeId);
  if (index < 0) throw new Error('Müşteri Google Sheets havuzunda bulunamadı.');
  leads[index] = lead;
  await writeAll(info, leads);
  return lead;
}

export async function upsertLeadsToGoogleSheet(leadsToSave: ExportableLead[]) {
  requireGoogleSheets();
  if (!leadsToSave.length) return { count: 0, sheetUrl: `https://docs.google.com/spreadsheets/d/${config.googleSheetId}/edit` };

  const { info, leads } = await readAll();
  const byPlaceId = new Map(leads.map(lead => [lead.placeId, lead]));
  for (const incoming of leadsToSave) {
    const existing = byPlaceId.get(incoming.placeId);
    const merged = mergeDefined(existing as any, {
      ...(incoming as any), id: incoming.placeId,
      status: (existing?.status ?? incoming.status ?? 'Yeni') as LeadStatus,
      tags: existing?.tags ?? incoming.tags ?? [], notes: existing?.notes ?? incoming.notes ?? '',
      lastContactedAt: existing?.lastContactedAt ?? incoming.lastContactedAt ?? null
    });
    byPlaceId.set(incoming.placeId, merged);
  }

  await writeAll(info, [...byPlaceId.values()]);
  return { count: leadsToSave.length, sheetUrl: `https://docs.google.com/spreadsheets/d/${config.googleSheetId}/edit` };
}
