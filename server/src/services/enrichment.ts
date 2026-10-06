import { lookup } from 'node:dns/promises';
import net from 'node:net';
import type { LeadCandidate } from '../types.js';
import { scoreLead } from './leadScore.js';

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.');
    const a = Number(parts[0] ?? -1);
    const b = Number(parts[1] ?? -1);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIP(ip) === 6) {
    const value = ip.toLowerCase();
    return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:');
  }
  return true;
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Yalnızca http/https adresleri desteklenir.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('Yerel ağ adreslerine erişim engellendi.');
  const records = await lookup(host, { all: true });
  if (!records.length || records.some(record => isPrivateIp(record.address))) throw new Error('Private veya yerel ağ adreslerine erişim engellendi.');
  return url;
}

async function readHtml(response: Response): Promise<string> {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('text/html') && !type.includes('application/xhtml+xml')) throw new Error('Website HTML döndürmedi.');
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) throw new Error('Website yanıtı çok büyük.');
  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error('Website yanıtı boyut limitini aştı.');
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return html;
  } finally {
    reader.releaseLock();
  }
}

async function fetchWebsite(raw: string, redirects = 0): Promise<{ html: string; finalUrl: URL }> {
  if (redirects > MAX_REDIRECTS) throw new Error('Çok fazla yönlendirme.');
  const url = await assertPublicUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'GoogleMusteriToplama/1.0 (+public-business-contact-enrichment)', Accept: 'text/html,application/xhtml+xml' }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Geçersiz yönlendirme.');
      return fetchWebsite(new URL(location, url).toString(), redirects + 1);
    }
    if (!response.ok) throw new Error(`Website yanıt vermedi (${response.status}).`);
    return { html: await readHtml(response), finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function extractLinks(html: string, base: URL): string[] {
  const links: string[] = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(regex)) {
    const href = match[1];
    if (!href) continue;
    try {
      const url = new URL(href, base);
      if (['http:', 'https:'].includes(url.protocol)) links.push(url.toString());
    } catch { /* invalid href */ }
  }
  return unique(links);
}

function firstByHost(links: string[], hosts: string[]): string | undefined {
  return links.find(link => {
    try {
      const host = new URL(link).hostname.toLowerCase();
      return hosts.some(candidate => host === candidate || host.endsWith(`.${candidate}`));
    } catch { return false; }
  });
}

function cleanEmail(value: string): string {
  return (value.replace(/^mailto:/i, '').split('?')[0] ?? '').trim().toLowerCase();
}

export async function enrichLead(lead: LeadCandidate): Promise<LeadCandidate> {
  if (!lead.website) return { ...lead, enrichmentStatus: 'failed' };

  try {
    const { html, finalUrl } = await fetchWebsite(lead.website);
    const links = extractLinks(html, finalUrl);
    const mailto = [...html.matchAll(/mailto:([^"'\s<>?]+)/gi)].map(match => cleanEmail(match[1] ?? '')).filter(Boolean);
    const plain = [...html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(match => cleanEmail(match[0])).filter(Boolean);
    const emails = unique([...mailto, ...plain]).filter(email => !email.endsWith('.png') && !email.endsWith('.jpg'));

    const whatsapp = firstByHost(links, ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com']);
    const instagram = firstByHost(links, ['instagram.com']);
    const facebook = firstByHost(links, ['facebook.com', 'fb.com']);
    const linkedin = firstByHost(links, ['linkedin.com']);
    const tiktok = firstByHost(links, ['tiktok.com']);
    const contactPage = links.find(link => /\/(iletisim|iletişim|contact|contact-us|bize-ulasin|bize-ulaşın)(\/|$|\?|#)/i.test(link));
    const lower = html.toLowerCase();
    const technology = unique([
      lower.includes('wp-content') || lower.includes('wp-includes') ? 'WordPress' : undefined,
      lower.includes('wixstatic.com') || lower.includes('wix.com') ? 'Wix' : undefined,
      lower.includes('cdn.shopify.com') || lower.includes('shopify.theme') ? 'Shopify' : undefined
    ]);

    const enrichedBase: LeadCandidate = {
      ...lead,
      website: finalUrl.toString(),
      email: emails[0],
      whatsapp,
      instagram,
      facebook,
      linkedin,
      tiktok,
      contactPage,
      hasContactForm: /<form\b/i.test(html) && /(contact|iletisim|iletişim|message|mesaj|email|e-mail)/i.test(html),
      ssl: finalUrl.protocol === 'https:',
      mobileFriendly: /<meta[^>]+name=["']viewport["']/i.test(html),
      technology,
      enrichmentStatus: 'done'
    };
    return { ...enrichedBase, ...scoreLead(enrichedBase) };
  } catch {
    return { ...lead, enrichmentStatus: 'failed' };
  }
}
