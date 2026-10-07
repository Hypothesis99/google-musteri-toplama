import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_URL, api } from './api';
import type { LeadCandidate, LeadStatus, SavedLead, SearchHistoryItem, SearchPayload } from './types';

type Tab = 'search' | 'pool' | 'history' | 'settings';
type ContactFilter = 'Tümü' | 'Website var' | 'Websitesiz' | 'E-posta' | 'WhatsApp' | 'Instagram' | 'Cep telefonu' | 'Sabit hat';
type WebsiteFilter = 'Tümü' | 'Websitesiz' | 'Website var';
type PhoneFilter = 'Tümü' | 'Cep' | 'Sabit';

const STATUSES: LeadStatus[] = ['Yeni', 'Arandı', 'WhatsApp Gönderildi', 'Teklif Verildi', 'Görüşülüyor', 'Müşteri Oldu', 'Olumsuz'];
const CONTACT_FILTERS: ContactFilter[] = ['Tümü', 'Website var', 'Websitesiz', 'E-posta', 'WhatsApp', 'Instagram', 'Cep telefonu', 'Sabit hat'];
const HISTORY_KEY = 'google-musteri-toplama:search-history';

function loadHistory(): SearchHistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as SearchHistoryItem[]; }
  catch { return []; }
}

function formatFollowers(value?: number): string | undefined {
  return value === undefined ? undefined : value.toLocaleString('tr-TR');
}

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 75 ? 'Sıcak' : score >= 50 ? 'Orta' : 'Düşük';
  return <div className={`score score-${label.toLowerCase()}`}><strong>{score}</strong><span>/100 · {label}</span></div>;
}

function ContactLink({ href, label, followers }: { href?: string; label: string; followers?: number }) {
  return href
    ? <a className="contact-link" href={href} target="_blank" rel="noreferrer">{label}{followers !== undefined ? ` · ${formatFollowers(followers)} takipçi` : ''}</a>
    : <span className="contact-missing">{label}: yok</span>;
}

function matchesContactFilter(lead: SavedLead, filter: ContactFilter): boolean {
  if (filter === 'Tümü') return true;
  if (filter === 'Website var') return Boolean(lead.website);
  if (filter === 'Websitesiz') return !lead.website;
  if (filter === 'E-posta') return Boolean(lead.email);
  if (filter === 'WhatsApp') return Boolean(lead.whatsapp);
  if (filter === 'Instagram') return Boolean(lead.instagram);
  if (filter === 'Cep telefonu') return Boolean(lead.mobilePhone) || lead.phoneType === 'Cep';
  if (filter === 'Sabit hat') return Boolean(lead.landlinePhone) || lead.phoneType === 'Sabit';
  return true;
}

function SavedMetaEditor({ lead, onSave }: { lead: SavedLead; onSave: (notes: string, tags: string[]) => Promise<void> }) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [tagsText, setTagsText] = useState((lead.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(lead.notes ?? '');
    setTagsText((lead.tags ?? []).join(', '));
  }, [lead.id, lead.notes, lead.tags]);

  async function save() {
    setSaving(true);
    try { await onSave(notes, tagsText.split(',').map(value => value.trim()).filter(Boolean)); }
    finally { setSaving(false); }
  }

  return <div className="meta-editor">
    <label>Not<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Görüşme, ihtiyaç veya takip notu…" /></label>
    <label>Etiketler<input value={tagsText} onChange={event => setTagsText(event.target.value)} placeholder="sıcak, websitesiz, aranacak" /></label>
    <button className="secondary" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Notları kaydet'}</button>
  </div>;
}

function LeadCard({ lead, selected = false, onSelect, onAdd, saved, onStatusChange, onEnrich, enriching = false, onSaveMeta }: {
  lead: LeadCandidate;
  selected?: boolean;
  onSelect?: () => void;
  onAdd?: () => void;
  saved?: SavedLead;
  onStatusChange?: (status: LeadStatus) => void;
  onEnrich?: () => void;
  enriching?: boolean;
  onSaveMeta?: (notes: string, tags: string[]) => Promise<void>;
}) {
  const enriched = lead.enrichmentStatus === 'done';
  const socialTotal = [lead.instagramFollowers, lead.facebookFollowers, lead.linkedinFollowers, lead.tiktokFollowers]
    .filter((value): value is number => value !== undefined)
    .reduce((sum, value) => sum + value, 0);

  return <article className={`lead-card ${selected ? 'selected' : ''} ${!lead.website ? 'website-missing' : ''}`}>
    <div className="lead-main">
      {onSelect && <input aria-label={`${lead.name} seç`} type="checkbox" checked={selected} onChange={onSelect} />}
      <div className="lead-copy">
        <div className="lead-title-row"><h3 title={lead.name}>{lead.name}</h3><ScoreBadge score={lead.leadScore} /></div>
        <p className="muted">{lead.category ?? 'Kategori yok'} · ⭐ {lead.rating ?? '—'} ({lead.reviewCount ?? 0})</p>
        <div className="signals">
          {lead.mobilePhone && <span>📱 Cep</span>}
          {lead.landlinePhone && <span>☎ Sabit</span>}
          {!lead.mobilePhone && !lead.landlinePhone && lead.phone && <span>☎ {lead.phoneType ?? 'Telefon'}</span>}
          {!lead.phone && <span>Telefon yok</span>}
          <span className={!lead.website ? 'opportunity-chip' : ''}>{lead.website ? '🌐 Website' : '⚡ Websitesiz'}</span>
          {lead.email && <span>✉ E-posta</span>}
          {lead.whatsapp && <span>WhatsApp</span>}
          {socialTotal > 0 && <span>👥 {formatFollowers(socialTotal)} sosyal takipçi</span>}
          {enriched && <span className="enriched-chip">✓ Zenginleştirildi</span>}
          {lead.enrichmentStatus === 'failed' && <span className="failed-chip">Tarama başarısız</span>}
          {saved && <span className="status-chip">{saved.status}</span>}
        </div>
        <p className="reason">{lead.scoreReasons[0] ?? 'Lead skoru hesaplandı'}</p>
      </div>
    </div>

    <div className="card-actions">
      {lead.mapsUrl && <a href={lead.mapsUrl} target="_blank" rel="noreferrer">Maps</a>}
      {lead.website && <a href={lead.website} target="_blank" rel="noreferrer">Website</a>}
      {lead.website && onEnrich && <button className="secondary" onClick={onEnrich} disabled={enriching}>{enriching ? 'Taranıyor…' : enriched ? 'Yeniden tara' : 'İletişimi Bul'}</button>}
      {onAdd && <button className="secondary" onClick={onAdd}>Havuza ekle</button>}
      {saved && onStatusChange && <select className="status-select" aria-label={`${saved.name} durumu`} value={saved.status} onChange={event => onStatusChange(event.target.value as LeadStatus)}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>}
    </div>

    <details className="lead-details">
      <summary>Detaylar ve skor nedenleri</summary>
      <div className="detail-body">
        {lead.address && <p><strong>Adres:</strong> {lead.address}</p>}
        {lead.phone && <p><strong>Ana telefon:</strong> {lead.phone} {lead.phoneType ? `(${lead.phoneType})` : ''}</p>}
        {lead.mobilePhone && <p><strong>Cep telefonu:</strong> {lead.mobilePhone}</p>}
        {lead.landlinePhone && <p><strong>Sabit hat:</strong> {lead.landlinePhone}</p>}
        {lead.email && <p><strong>E-posta:</strong> {lead.email}</p>}
        <div className="contact-row">
          <ContactLink href={lead.whatsapp} label="WhatsApp" />
          <ContactLink href={lead.instagram} label="Instagram" followers={lead.instagramFollowers} />
          <ContactLink href={lead.facebook} label="Facebook" followers={lead.facebookFollowers} />
          <ContactLink href={lead.linkedin} label="LinkedIn" followers={lead.linkedinFollowers} />
          <ContactLink href={lead.tiktok} label="TikTok" followers={lead.tiktokFollowers} />
          <ContactLink href={lead.contactPage} label="İletişim" />
        </div>
        {(lead.instagram || lead.facebook || lead.linkedin || lead.tiktok) && <p className="muted">Takipçi sayısı yalnızca platformun kamuya açık sayfasında okunabiliyorsa gösterilir.</p>}
        {enriched && <div className="tech-grid">
          <span>SSL: {lead.ssl ? 'Var' : 'Yok'}</span>
          <span>Mobil sinyal: {lead.mobileFriendly ? 'Var' : 'Yok'}</span>
          <span>İletişim formu: {lead.hasContactForm ? 'Var' : 'Yok'}</span>
          <span>Teknoloji: {lead.technology?.length ? lead.technology.join(', ') : 'Tespit edilmedi'}</span>
        </div>}
        <div className="score-reasons"><strong>Bu müşteri neden öne çıkıyor?</strong><ul>{lead.scoreReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>
        {saved?.lastContactedAt && <p className="muted">Son iletişim: {new Date(saved.lastContactedAt).toLocaleString('tr-TR')}</p>}
        {saved && onSaveMeta && <SavedMetaEditor lead={saved} onSave={onSaveMeta} />}
      </div>
    </details>
  </article>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minReviews, setMinReviews] = useState('');
  const [fullScan, setFullScan] = useState(true);
  const [searchWebsiteFilter, setSearchWebsiteFilter] = useState<WebsiteFilter>('Tümü');
  const [searchPhoneFilter, setSearchPhoneFilter] = useState<PhoneFilter>('Tümü');
  const [poolQuery, setPoolQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Tümü' | LeadStatus>('Tümü');
  const [poolMinScore, setPoolMinScore] = useState('');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('Tümü');
  const [results, setResults] = useState<LeadCandidate[]>([]);
  const [pool, setPool] = useState<SavedLead[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>(loadHistory);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sheetExporting, setSheetExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCount = selected.size;
  const visibleResults = useMemo(() => [...results]
    .filter(lead => searchWebsiteFilter === 'Tümü' || (searchWebsiteFilter === 'Websitesiz' ? !lead.website : Boolean(lead.website)))
    .filter(lead => searchPhoneFilter === 'Tümü' || (searchPhoneFilter === 'Cep' ? Boolean(lead.mobilePhone) || lead.phoneType === 'Cep' : Boolean(lead.landlinePhone) || lead.phoneType === 'Sabit'))
    .sort((a, b) => b.leadScore - a.leadScore), [results, searchWebsiteFilter, searchPhoneFilter]);

  const hasPoolFilters = Boolean(poolQuery || poolMinScore || statusFilter !== 'Tümü' || contactFilter !== 'Tümü');
  const sortedPool = useMemo(() => [...pool]
    .filter(lead => `${lead.name} ${lead.category ?? ''} ${lead.email ?? ''} ${(lead.tags ?? []).join(' ')}`.toLowerCase().includes(poolQuery.toLowerCase()))
    .filter(lead => statusFilter === 'Tümü' || lead.status === statusFilter)
    .filter(lead => !poolMinScore || lead.leadScore >= Number(poolMinScore))
    .filter(lead => matchesContactFilter(lead, contactFilter))
    .sort((a, b) => b.leadScore - a.leadScore), [pool, poolQuery, statusFilter, poolMinScore, contactFilter]);

  useEffect(() => { if (tab === 'pool') void refreshPool(); }, [tab]);

  function pushHistory(payload: SearchPayload, resultCount: number) {
    const item: SearchHistoryItem = { ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), resultCount };
    const next = [item, ...history.filter(h => !(h.query === item.query && h.location === item.location && h.scanMode === item.scanMode && h.minRating === item.minRating && h.minReviews === item.minReviews))].slice(0, 20);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  async function refreshPool() {
    setError('');
    try { const response = await api.leads(); setPool(response.leads); }
    catch (e) { setError(e instanceof Error ? e.message : 'Havuz yüklenemedi.'); }
  }

  async function performSearch(payload: SearchPayload, saveToHistory = true) {
    setError(''); setNotice('');
    if (!payload.location.trim()) { setError('İl / ilçe veya konum alanını doldur.'); return; }
    setLoading(true); setTab('search');
    try {
      const normalized: SearchPayload = { ...payload, query: payload.query?.trim() || undefined, location: payload.location.trim() };
      const data = await api.search(normalized);
      setResults(data.results); setSelected(new Set());
      if (saveToHistory) pushHistory(normalized, data.results.length);
      if (!data.results.length) setNotice('Sonuç bulunamadı. Filtreleri gevşetmeyi veya bölgeyi genişletmeyi dene.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Arama başarısız.'); }
    finally { setLoading(false); }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    const broad = !query.trim() && fullScan;
    await performSearch({ query: query.trim() || undefined, location, minRating: minRating ? Number(minRating) : undefined, minReviews: minReviews ? Number(minReviews) : undefined, scanMode: broad ? 'broad' : 'normal' });
  }

  async function repeatSearch(item: SearchHistoryItem) {
    setQuery(item.query ?? ''); setLocation(item.location); setMinRating(item.minRating?.toString() ?? ''); setMinReviews(item.minReviews?.toString() ?? ''); setFullScan(item.scanMode === 'broad');
    await performSearch({ query: item.query, location: item.location, minRating: item.minRating, minReviews: item.minReviews, scanMode: item.scanMode });
  }

  function clearHistory() {
    setHistory([]); localStorage.removeItem(HISTORY_KEY); setNotice('Arama geçmişi temizlendi.');
  }

  async function addLead(lead: LeadCandidate) {
    setError('');
    try {
      const data = await api.addLead(lead);
      setNotice(data.duplicate ? `${lead.name} Google Sheets havuzunda güncellendi.` : `${lead.name} Google Sheets havuzuna eklendi.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lead eklenemedi.'); }
  }

  async function exportToSheets(leads: Array<LeadCandidate | SavedLead>) {
    if (!leads.length) { setError('Google Sheets’e aktarılacak müşteri bulunamadı.'); return; }
    setSheetExporting(true); setError(''); setNotice('');
    try {
      const data = await api.exportToSheets(leads);
      setNotice(`${data.count} müşteri Google Sheets’e aktarıldı.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Google Sheets aktarımı başarısız.'); }
    finally { setSheetExporting(false); }
  }

  function markEnriching(key: string, active: boolean) {
    setEnriching(previous => { const next = new Set(previous); active ? next.add(key) : next.delete(key); return next; });
  }

  async function enrichCandidate(lead: LeadCandidate) {
    markEnriching(lead.placeId, true); setError('');
    try {
      const data = await api.enrich(lead);
      setResults(current => current.map(item => item.placeId === lead.placeId ? data.lead : item));
      setNotice(`${lead.name}: iletişim, telefon ve sosyal medya bilgileri tarandı.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Website taranamadı.'); }
    finally { markEnriching(lead.placeId, false); }
  }

  async function enrichSaved(lead: SavedLead) {
    markEnriching(lead.id, true); setError('');
    try {
      const data = await api.enrichSavedLead(lead.id);
      setPool(current => current.map(item => item.id === lead.id ? data.lead : item));
      setNotice(`${lead.name}: Google Sheets kaydı zenginleştirildi.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Website taranamadı.'); }
    finally { markEnriching(lead.id, false); }
  }

  async function changeStatus(lead: SavedLead, status: LeadStatus) {
    const previous = lead.status;
    setPool(current => current.map(item => item.id === lead.id ? { ...item, status } : item));
    try {
      const data = await api.updateLead(lead.id, { status });
      setPool(current => current.map(item => item.id === lead.id ? data.lead : item));
      setNotice(`${lead.name}: durum “${status}” olarak güncellendi.`);
    } catch (e) {
      setPool(current => current.map(item => item.id === lead.id ? { ...item, status: previous } : item));
      setError(e instanceof Error ? e.message : 'Durum güncellenemedi.');
    }
  }

  async function saveMeta(lead: SavedLead, notes: string, tags: string[]) {
    try {
      const data = await api.updateLead(lead.id, { notes, tags });
      setPool(current => current.map(item => item.id === lead.id ? data.lead : item));
      setNotice(`${lead.name}: notlar Google Sheets’e kaydedildi.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Notlar kaydedilemedi.'); }
  }

  const searchExport = selectedCount > 0 ? results.filter(result => selected.has(result.placeId)) : visibleResults;

  return <div className="app-shell">
    <header className="brand-header">
      <img className="brand-logo" src="/contrast-logo.svg" alt="Contrast Creative Studio" />
      <div className="product-title"><span className="eyebrow">LEAD WORKSPACE</span><h1>Google Müşteri Toplama</h1></div>
      <span className="live-dot">MVP</span>
    </header>
    <nav>
      <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Müşteri Bul</button>
      <button className={tab === 'pool' ? 'active' : ''} onClick={() => setTab('pool')}>Havuz</button>
      <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Geçmiş</button>
      <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Ayarlar</button>
    </nav>

    {error && <div className="alert error">{error}</div>}
    {notice && <div className="alert success">{notice}</div>}

    {tab === 'search' && <main>
      <section className="hero"><h2>Yeni müşterileri birkaç saniyede bul.</h2><p>Sektör boşken geniş tarama, ilçedeki farklı işletme kategorilerini birleştirerek tek sorgudaki 20–60 sonuç sınırını aşar.</p></section>
      <form className="search-form" onSubmit={search}>
        <label>Sektör / arama terimi <span className="optional">İsteğe bağlı</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Örn. diş kliniği — boş bırakırsan geniş tarama" /></label>
        <label>İl / ilçe / konum <span className="required">Zorunlu</span><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Örn. Bursa, Orhangazi" /></label>
        <label className={`scan-option ${query.trim() ? 'disabled' : ''}`}><input type="checkbox" checked={fullScan} disabled={Boolean(query.trim())} onChange={event => setFullScan(event.target.checked)} /><span><strong>Geniş ilçe taraması</strong><small>Farklı sektörleri ve mevcut sayfaları tarar; daha fazla API isteği kullanır.</small></span></label>
        <details><summary>Gelişmiş filtreler</summary><div className="filter-grid"><label>Minimum puan<input value={minRating} onChange={event => setMinRating(event.target.value)} type="number" min="0" max="5" step="0.1" placeholder="4.0" /></label><label>Minimum yorum<input value={minReviews} onChange={event => setMinReviews(event.target.value)} type="number" min="0" placeholder="20" /></label></div></details>
        <button className="primary" disabled={loading}>{loading ? 'İşletmeler taranıyor…' : !query.trim() && fullScan ? 'İlçedeki İşletmeleri Tara' : 'Müşteri Ara'}</button>
      </form>

      {loading && <div className="skeleton-list">{[1, 2, 3].map(i => <div className="skeleton" key={i} />)}</div>}
      {!loading && results.length === 0 && <div className="empty"><strong>Aramaya hazır.</strong><span>Örnek: sektör boş + “Bursa, Orhangazi” ile geniş tarama yapabilirsin.</span></div>}
      {!loading && results.length > 0 && <section className="results">
        <div className="section-head"><div><h2>{results.length} aday bulundu</h2><p>{visibleResults.length !== results.length ? `${visibleResults.length} tanesi aktif filtreye uyuyor.` : 'En yüksek fırsat skorları üstte.'}</p></div><div className="export-group"><button className="export-button" disabled={sheetExporting} onClick={() => void exportToSheets(searchExport)}>{sheetExporting ? 'Aktarılıyor…' : selectedCount ? `Sheets (${selectedCount})` : 'Sheets’e Aktar'}</button><button className="text-button" onClick={() => setSelected(new Set(visibleResults.map(result => result.placeId)))}>Görünenleri seç</button></div></div>
        <div className="result-filters">
          <label>Website<select value={searchWebsiteFilter} onChange={event => setSearchWebsiteFilter(event.target.value as WebsiteFilter)}><option>Tümü</option><option>Websitesiz</option><option>Website var</option></select></label>
          <label>Telefon<select value={searchPhoneFilter} onChange={event => setSearchPhoneFilter(event.target.value as PhoneFilter)}><option>Tümü</option><option>Cep</option><option>Sabit</option></select></label>
          <div className="filter-stat"><strong>{results.filter(r => !r.website).length}</strong><span>websitesiz fırsat</span></div>
        </div>
        {visibleResults.length ? visibleResults.map(lead => <LeadCard key={lead.placeId} lead={lead} selected={selected.has(lead.placeId)} onSelect={() => setSelected(previous => { const next = new Set(previous); next.has(lead.placeId) ? next.delete(lead.placeId) : next.add(lead.placeId); return next; })} onAdd={() => addLead(lead)} onEnrich={lead.website ? () => enrichCandidate(lead) : undefined} enriching={enriching.has(lead.placeId)} />) : <div className="empty compact-empty"><strong>Bu filtrede sonuç yok.</strong><span>Website veya telefon filtresini değiştirebilirsin.</span></div>}
      </section>}
      {selectedCount > 0 && <div className="bulk-bar"><strong>{selectedCount} müşteri seçildi</strong><div className="bulk-actions"><button disabled={sheetExporting} onClick={() => void exportToSheets(searchExport)}>Sheets</button><button onClick={() => void Promise.all(results.filter(result => selected.has(result.placeId)).map(addLead))}>Havuza Ekle</button></div></div>}
    </main>}

    {tab === 'pool' && <main>
      <section className="section-head"><div><h2>Google Sheets Müşteri Havuzu</h2><p>Durum, not ve etiketler doğrudan bağlı Sheet üzerinde saklanır.</p></div><div className="export-group"><button className="export-button" disabled={sheetExporting || !sortedPool.length} onClick={() => void exportToSheets(sortedPool)}>Sheets</button><a className="export-button" href={`${API_URL}/api/leads/export.csv`} target="_blank" rel="noreferrer">CSV</a><a className="export-button" href={`${API_URL}/api/leads/export.xlsx`} target="_blank" rel="noreferrer">Excel Pro</a></div></section>
      <div className="pool-filters">
        <input className="pool-search" value={poolQuery} onChange={event => setPoolQuery(event.target.value)} placeholder="Firma, kategori, e-posta veya etiket ara…" />
        <select aria-label="CRM durumu" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'Tümü' | LeadStatus)}><option>Tümü</option>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>
        <input aria-label="Minimum lead score" value={poolMinScore} onChange={event => setPoolMinScore(event.target.value)} type="number" min="0" max="100" placeholder="Min. Lead Score" />
        <select aria-label="İletişim filtresi" value={contactFilter} onChange={event => setContactFilter(event.target.value as ContactFilter)}>{CONTACT_FILTERS.map(filter => <option key={filter}>{filter}</option>)}</select>
      </div>
      {sortedPool.length ? sortedPool.map(lead => <LeadCard key={lead.id} lead={lead} saved={lead} onStatusChange={status => changeStatus(lead, status)} onEnrich={lead.website ? () => enrichSaved(lead) : undefined} enriching={enriching.has(lead.id)} onSaveMeta={(notes, tags) => saveMeta(lead, notes, tags)} />) : <div className="empty"><strong>{hasPoolFilters ? 'Filtreye uygun müşteri yok.' : 'Havuz henüz boş.'}</strong><span>{hasPoolFilters ? 'Filtreleri değiştirebilirsin.' : 'Müşteri Bul ekranından aday ekleyebilirsin.'}</span></div>}
    </main>}

    {tab === 'history' && <main>
      <section className="section-head"><div><h2>Arama Geçmişi</h2><p>Son 20 arama bu cihazda saklanır.</p></div>{history.length > 0 && <button className="text-button danger-text" onClick={clearHistory}>Temizle</button>}</section>
      {history.length ? <div className="history-list">{history.map(item => <article className="history-card" key={item.id}><div><strong>{item.query || (item.scanMode === 'broad' ? 'Geniş işletme taraması' : 'Tüm işletmeler')}</strong><span>{item.location} · {item.resultCount} sonuç</span><small>{new Date(item.createdAt).toLocaleString('tr-TR')}{item.minRating !== undefined ? ` · min. ${item.minRating} puan` : ''}{item.minReviews !== undefined ? ` · min. ${item.minReviews} yorum` : ''}</small></div><button className="secondary" onClick={() => void repeatSearch(item)}>Tekrar ara</button></article>)}</div> : <div className="empty"><strong>Henüz arama geçmişi yok.</strong><span>Yaptığın aramalar burada görünecek.</span></div>}
    </main>}

    {tab === 'settings' && <main><div className="settings-card"><h2>Ayarlar</h2><p>Backend adresi: <code>{API_URL}</code></p><p className="muted">CRM veritabanı: Google Sheets. Supabase kullanılmıyor.</p><p className="muted">Google ve servis hesabı anahtarları yalnızca Mac’teki backend’de tutulur.</p><p className="muted">Sosyal takipçi sayıları yalnızca kamuya açık profillerden okunabildiği zaman doldurulur.</p></div></main>}
  </div>;
}
