import type { LeadCandidate, LeadStatus, SavedLead, SearchPayload } from './types';

export const API_URL = 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'İşlem tamamlanamadı.');
  return payload as T;
}

export const api = {
  search: (payload: SearchPayload) => request<{ results: LeadCandidate[] }>('/api/places/search', { method: 'POST', body: JSON.stringify(payload) }),
  enrich: (lead: LeadCandidate) => request<{ lead: LeadCandidate }>('/api/enrichment', { method: 'POST', body: JSON.stringify(lead) }),
  leads: () => request<{ leads: SavedLead[] }>('/api/leads'),
  addLead: (lead: LeadCandidate) => request<{ lead: SavedLead; duplicate?: boolean }>('/api/leads', { method: 'POST', body: JSON.stringify(lead) }),
  updateLead: (id: string, patch: { status?: LeadStatus; notes?: string; tags?: string[]; lastContactedAt?: string | null }) => request<{ lead: SavedLead }>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  enrichSavedLead: (id: string) => request<{ lead: SavedLead }>(`/api/leads/${id}/enrich`, { method: 'POST' }),
  exportToSheets: (leads: Array<LeadCandidate | SavedLead>) => request<{ ok: true; count: number; sheetUrl: string }>('/api/sheets/export', { method: 'POST', body: JSON.stringify({ leads }) })
};
