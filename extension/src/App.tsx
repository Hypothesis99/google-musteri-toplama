import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_URL, api } from './api';
import type { LeadCandidate, LeadStatus, SavedLead, SearchHistoryItem, SearchPayload } from './types';

type Tab = 'search' | 'pool' | 'history' | 'settings';
const STATUSES: LeadStatus[] = ['Yeni', 'Arandı', 'WhatsApp Gönderildi', 'Teklif Verildi', 'Görüşülüyor', 'Müşteri Oldu', 'Olumsuz'];
const HISTORY_KEY = 'google-musteri-toplama:search-history';

function loadHistory(): SearchHistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as SearchHistoryItem[]; }
  catch { return []; }
}

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 75 ? 'Sıcak' : score >= 50 ? 'Orta' : 'Düşük';
  return <div className={`score score-${label.toLowerCase()}`}><strong>{score}</strong><span>/100 · {label}</span></div>;
}

function ContactLink({ href, label }: { href?: string; label: string }) {
  return href
    ? <a className="contact-link" href={href} target="_blank" rel="noreferrer">{label}</a>
    : <span className="contact-missing">{label}: yok</span>;
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
    <label>Etiketler<input value={tagsText} onChange={event => setTagsText(event.target.value)} placeholder="sıcak, web sitesi yok, aranacak" /></label>
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

  return <article className={`lead-card ${selected ? 'selected' : ''}`}>
    <div className="lead-main">
      {onSelect && <input aria-label={`${lead.name} seç`} type="checkbox" checked={selected} onChange={onSelect} />}
      <div className="lead-copy">
        <div className="lead-title-row"><h3 title={lead.name}>{lead.name}</h3><ScoreBadge score={lead.leadScore} /></div>
        <p className="muted">{lead.category ?? 'Kategori yok'} · ⭐ {lead.rating ?? '—'} ({lead.reviewCount ?? 0})</p>
        <div className="signals">
          <span>{lead.phone ? '☎ Telefon' : 'Telefon yok'}</span>
          <span>{lead.website ? '🌐 Website' : 'Website yok'}</span>
          {lead.email && <span>✉ E-posta</span>}
          {lead.whatsapp && <span>WhatsApp</span>}
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
        {lead.phone && <p><strong>Telefon:</strong> {lead.phone}</p>}
        {lead.email && <p><strong>E-posta:</strong> {lead.email}</p>}
        <div className="contact-row">
          <ContactLink href={lead.whatsapp} label="WhatsApp" />
          <ContactLink href={lead.instagram} label="Instagram" />
          <ContactLink href={lead.facebook} label="Facebook" />
          <ContactLink href={lead.linkedin} label="LinkedIn" />
          <ContactLink href={lead.tiktok} label="TikTok" />
          <ContactLink href={lead.contactPage} label="İletişim" />
        </div>
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
  const [poolQuery, setPoolQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Tümü' | LeadStatus>('Tümü');
  const [results, setResults] = useState<LeadCandidate[]>([]);
  const [pool, setPool] = useState<SavedLead[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>(loadHistory);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enriching, setEnriching] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCount = selected.size;
  const sortedPool = useMemo(() => [...pool]
    .filter(lead => `${lead.name} ${lead.category ?? ''} ${lead.email ?? ''} ${(lead.tags ?? []).join(' ')}`.toLowerCase().includes(poolQuery.toLowerCase()))
    .filter(lead => statusFilter === 'Tümü' || lead.status === statusFilter)
    .sort((a, b) => b.leadScore - a.leadScore), [pool, poolQuery, statusFilter]);

  useEffect(() => { if (tab === 'pool') void refreshPool(); }, [tab]);

  function pushHistory(payload: SearchPayload, resultCount: number) {
    const item: SearchHistoryItem = { ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), resultCount };
    const next = [item, ...history.filter(h => !(h.query === item.query && h.location === item.location && h.minRating === item.minRating && h.minReviews === item.minReviews))].slice(0, 20);
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
    await performSearch({ query: query.trim() || undefined, location, minRating: minRating ? Number(minRating) : undefined, minReviews: minReviews ? Number(minReviews) : undefined });
  }

  async function repeatSearch(item: SearchHistoryItem) {
    setQuery(item.query ?? ''); setLocation(item.location); setMinRating(item.minRating?.toString() ?? ''); setMinReviews(item.minReviews?.toString() ?? '');
    await performSearch({ query: item.query, location: item.location, minRating: item.minRating, minReviews: item.minReviews });
  }

  function clearHistory() {
    setHistory([]); localStorage.removeItem(HISTORY_KEY); setNotice('Arama geçmişi temizlendi.');
  }

  async function addLead(lead: LeadCandidate) {
    setError('');
    try {
      const data = await api.addLead(lead);
      setNotice(data.duplicate ? `${lead.name} zaten müşteri havuzunda.` : `${lead.name} müşteri havuzuna eklendi.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lead eklenemedi.'); }
  }

  function markEnriching(key: string, active: boolean) {
    setEnriching(previous => { const next = new Set(previous); active ? next.add(key) : next.delete(key); return next; });
  }

  async function enrichCandidate(lead: LeadCandidate) {
    markEnriching(lead.placeId, true); setError('');
    try {
      const data = await api.enrich(lead);
      setResults(current => current.map(item => item.placeId === lead.placeId ? data.lead : item));
      setNotice(`${lead.name}: kamuya açık iletişim bilgileri tarandı.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Website taranamadı.'); }
    finally { markEnriching(lead.placeId, false); }
  }

  async function enrichSaved(lead: SavedLead) {
    markEnriching(lead.id, true); setError('');
    try {
      const data = await api.enrichSavedLead(lead.id);
      setPool(current => current.map(item => item.id === lead.id ? data.lead : item));
      setNotice(`${lead.name}: iletişim bilgileri güncellendi ve skor yeniden hesaplandı.`);
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
      setNotice(`${lead.name}: notlar kaydedildi.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Notlar kaydedilemedi.'); }
  }

  return <div className="app-shell">
    <header><div><span className="eyebrow">LEAD WORKSPACE</span><h1>Google Müşteri Toplama</h1></div><span className="live-dot">MVP</span></header>
    <nav>
      <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Müşteri Bul</button>
      <button className={tab === 'pool' ? 'active' : ''} onClick={() => setTab('pool')}>Havuz</button>
      <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Geçmiş</button>
      <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Ayarlar</button>
    </nav>

    {error && <div className="alert error">{error}</div>}
    {notice && <div className="alert success">{notice}</div>}

    {tab === 'search' && <main>
      <section className="hero"><h2>Yeni müşterileri birkaç saniyede bul.</h2><p>Konumu yazman yeterli. Sektör isteğe bağlıdır; doldurursan sonuçları o sektöre daraltırız.</p></section>
      <form className="search-form" onSubmit={search}>
        <label>Sektör / arama terimi <span className="optional">İsteğe bağlı</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Örn. diş kliniği — boş bırakabilirsin" /></label>
        <label>İl / ilçe / konum <span className="required">Zorunlu</span><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Örn. Bursa, Orhangazi" /></label>
        <details><summary>Gelişmiş filtreler</summary><div className="filter-grid"><label>Minimum puan<input value={minRating} onChange={event => setMinRating(event.target.value)} type="number" min="0" max="5" step="0.1" placeholder="4.0" /></label><label>Minimum yorum<input value={minReviews} onChange={event => setMinReviews(event.target.value)} type="number" min="0" placeholder="20" /></label></div></details>
        <button className="primary" disabled={loading}>{loading ? 'Müşteriler aranıyor…' : 'Müşteri Ara'}</button>
      </form>

      {loading && <div className="skeleton-list">{[1, 2, 3].map(i => <div className="skeleton" key={i} />)}</div>}
      {!loading && results.length === 0 && <div className="empty"><strong>Aramaya hazır.</strong><span>Örnek: yalnızca “Bursa, Orhangazi” veya “reklam ajansı” + “Bursa”</span></div>}
      {!loading && results.length > 0 && <section className="results">
        <div className="section-head"><div><h2>{results.length} aday bulundu</h2><p>En yüksek fırsat skorları üstte.</p></div><button className="text-button" onClick={() => setSelected(new Set(results.map(result => result.placeId)))}>Tümünü seç</button></div>
        {[...results].sort((a, b) => b.leadScore - a.leadScore).map(lead => <LeadCard key={lead.placeId} lead={lead} selected={selected.has(lead.placeId)} onSelect={() => setSelected(previous => { const next = new Set(previous); next.has(lead.placeId) ? next.delete(lead.placeId) : next.add(lead.placeId); return next; })} onAdd={() => addLead(lead)} onEnrich={lead.website ? () => enrichCandidate(lead) : undefined} enriching={enriching.has(lead.placeId)} />)}
      </section>}
      {selectedCount > 0 && <div className="bulk-bar"><strong>{selectedCount} müşteri seçildi</strong><button onClick={() => void Promise.all(results.filter(result => selected.has(result.placeId)).map(addLead))}>Havuza Ekle</button></div>}
    </main>}

    {tab === 'pool' && <main>
      <section className="section-head"><div><h2>Müşteri Havuzu</h2><p>En güçlü adaylar önce gösterilir.</p></div><div className="export-group"><a className="export-button" href={`${API_URL}/api/leads/export.csv`} target="_blank" rel="noreferrer">CSV</a><a className="export-button" href={`${API_URL}/api/leads/export.xlsx`} target="_blank" rel="noreferrer">Excel</a></div></section>
      <div className="pool-filters"><input className="pool-search" value={poolQuery} onChange={event => setPoolQuery(event.target.value)} placeholder="Firma, kategori, e-posta veya etiket ara…" /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'Tümü' | LeadStatus)}><option>Tümü</option>{STATUSES.map(status => <option key={status}>{status}</option>)}</select></div>
      {sortedPool.length ? sortedPool.map(lead => <LeadCard key={lead.id} lead={lead} saved={lead} onStatusChange={status => changeStatus(lead, status)} onEnrich={lead.website ? () => enrichSaved(lead) : undefined} enriching={enriching.has(lead.id)} onSaveMeta={(notes, tags) => saveMeta(lead, notes, tags)} />) : <div className="empty"><strong>{poolQuery || statusFilter !== 'Tümü' ? 'Filtreye uygun müşteri yok.' : 'Havuz henüz boş.'}</strong><span>{poolQuery || statusFilter !== 'Tümü' ? 'Filtreleri değiştirebilirsin.' : 'Müşteri Bul ekranından aday ekleyebilirsin.'}</span></div>}
    </main>}

    {tab === 'history' && <main>
      <section className="section-head"><div><h2>Arama Geçmişi</h2><p>Son 20 arama bu cihazda saklanır.</p></div>{history.length > 0 && <button className="text-button danger-text" onClick={clearHistory}>Temizle</button>}</section>
      {history.length ? <div className="history-list">{history.map(item => <article className="history-card" key={item.id}><div><strong>{item.query || 'Tüm işletmeler'}</strong><span>{item.location} · {item.resultCount} sonuç</span><small>{new Date(item.createdAt).toLocaleString('tr-TR')}{item.minRating !== undefined ? ` · min. ${item.minRating} puan` : ''}{item.minReviews !== undefined ? ` · min. ${item.minReviews} yorum` : ''}</small></div><button className="secondary" onClick={() => void repeatSearch(item)}>Tekrar ara</button></article>)}</div> : <div className="empty"><strong>Henüz arama geçmişi yok.</strong><span>Yaptığın aramalar burada görünecek.</span></div>}
    </main>}

    {tab === 'settings' && <main><div className="settings-card"><h2>Ayarlar</h2><p>Backend adresi: <code>{API_URL}</code></p><p className="muted">Google ve Supabase API anahtarları eklentide tutulmaz.</p><p className="muted">Website taraması yalnızca kamuya açık işletme sayfalarındaki iletişim sinyallerini işler.</p></div></main>}
  </div>;
}
