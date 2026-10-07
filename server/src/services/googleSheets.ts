import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { config, requireGoogleSheets } from '../config.js';
import type { LeadCandidate } from '../types.js';

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

const HEADERS = [
  'Place ID', 'Firma', 'Kategori', 'Telefon', 'E-posta', 'WhatsApp', 'Website',
  'Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Google Maps', 'Adres', 'Puan',
  'Yorum', 'Lead Score', 'Durum', 'Etiketler', 'Notlar', 'Son İletişim'
];

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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`
    })
  });
  const data = await response.json().catch(() => ({})) as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description ?? 'Google erişim anahtarı alınamadı.');
  return data.access_token;
}

async function googleRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.error?.message ?? 'Google Sheets işlemi başarısız oldu.';
    throw new Error(message);
  }
  return data as T;
}

async function getFirstSheetTitle(): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}?fields=sheets.properties.title`;
  const data = await googleRequest<{ sheets?: Array<{ properties?: { title?: string } }> }>(url);
  const title = data.sheets?.[0]?.properties?.title;
  if (!title) throw new Error('Google Sheet içinde çalışma sayfası bulunamadı.');
  return title;
}

function rowForLead(lead: ExportableLead): unknown[] {
  return [
    lead.placeId,
    lead.name,
    lead.category ?? '',
    lead.phone ?? '',
    lead.email ?? '',
    lead.whatsapp ?? '',
    lead.website ?? '',
    lead.instagram ?? '',
    lead.facebook ?? '',
    lead.linkedin ?? '',
    lead.tiktok ?? '',
    lead.mapsUrl ?? '',
    lead.address ?? '',
    lead.rating ?? '',
    lead.reviewCount ?? '',
    lead.leadScore ?? '',
    lead.status ?? 'Yeni',
    (lead.tags ?? []).join(', '),
    lead.notes ?? '',
    lead.lastContactedAt ?? ''
  ];
}

export async function upsertLeadsToGoogleSheet(leads: ExportableLead[]) {
  requireGoogleSheets();
  if (!leads.length) return { count: 0, sheetUrl: `https://docs.google.com/spreadsheets/d/${config.googleSheetId}/edit` };

  const title = await getFirstSheetTitle();
  const range = `'${title.replaceAll("'", "''")}'!A:T`;
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}/values/${encodeURIComponent(range)}`;
  const existing = await googleRequest<{ values?: unknown[][] }>(readUrl);
  const values = existing.values ?? [];
  const rows = values.length && String(values[0]?.[0] ?? '') === HEADERS[0] ? values.slice(1) : values;

  const byPlaceId = new Map<string, unknown[]>();
  for (const row of rows) {
    const placeId = String(row?.[0] ?? '').trim();
    if (placeId) byPlaceId.set(placeId, row);
  }
  for (const lead of leads) byPlaceId.set(lead.placeId, rowForLead(lead));

  const merged = [HEADERS, ...byPlaceId.values()];
  const writeRange = `'${title.replaceAll("'", "''")}'!A1:T${merged.length}`;
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.googleSheetId)}/values/${encodeURIComponent(writeRange)}?valueInputOption=RAW`;
  await googleRequest(writeUrl, { method: 'PUT', body: JSON.stringify({ values: merged }) });

  return {
    count: leads.length,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${config.googleSheetId}/edit`
  };
}
