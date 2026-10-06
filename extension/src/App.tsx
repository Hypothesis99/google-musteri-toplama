import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API_URL, api } from './api';
import type { LeadCandidate, LeadStatus, SavedLead } from './types';

type Tab = 'search' | 'pool' | 'history' | 'settings';
const STATUSES: LeadStatus[] = ['Yeni','Arandı','WhatsApp Gönderildi','Teklif Verildi','Görüşülüyor','Müşteri Oldu','Olumsuz'];

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 75 ? 'Sıcak' : score >= 50 ? 'Orta' : 'Düşük';
  return <div className={`score score-${label.toLowerCase()}`}><strong>{score}</strong><span>/100 · {label}</span></div>;
}

function LeadCard({ lead, selected = false, onSelect, onAdd, saved, onStatusChange }: { lead: LeadCandidate; selected?: boolean; onSelect?: () => void; onAdd?: () => void; saved?: SavedLead; onStatusChange?: (status: LeadStatus) => void }) {
  return <article className={`lead-card ${selected ? 'selected' : ''}`}>
    <div className="lead-main">
      {onSelect && <input aria-label={`${lead.name} seç`} type="checkbox" checked={selected} onChange={onSelect} />}
      <div className="lead-copy">
        <div className="lead-title-row"><h3>{lead.name}</h3><ScoreBadge score={lead.leadScore} /></div>
        <p className="muted">{lead.category ?? 'Kategori yok'} · ⭐ {lead.rating ?? '—'} ({lead.reviewCount ?? 0})</p>
        <div className="signals"><span>{lead.phone ? '☎ Telefon' : 'Telefon yok'}</span><span>{lead.website ? '🌐 Website' : 'Website yok'}</span>{saved && <span className="status-chip">{saved.status}</span>}</div>
        <p className="reason">{lead.scoreReasons[0] ?? 'Lead skoru hesaplandı'}</p>
      </div>
    </div>
    <div className="card-actions">
      {lead.mapsUrl && <a href={lead.mapsUrl} target="_blank" rel="noreferrer">Maps</a>}
      {lead.website && <a href={lead.website} target="_blank" rel="noreferrer">Website</a>}
      {onAdd && <button className="secondary" onClick={onAdd}>Havuza ekle</button>}
      {saved && onStatusChange && <select className="status-select" aria-label={`${saved.name} durumu`} value={saved.status} onChange={e=>onStatusChange(e.target.value as LeadStatus)}>{STATUSES.map(status=><option key={status}>{status}</option>)}</select>}
    </div>
  </article>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minReviews, setMinReviews] = useState('');
  const [poolQuery, setPoolQuery] = useState('');
  const [results, setResults] = useState<LeadCandidate[]>([]);
  const [pool, setPool] = useState<SavedLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedCount = selected.size;
  const sortedPool = useMemo(() => [...pool].filter(l=>`${l.name} ${l.category ?? ''}`.toLowerCase().includes(poolQuery.toLowerCase())).sort((a,b) => b.leadScore - a.leadScore), [pool, poolQuery]);

  useEffect(() => { if (tab === 'pool') refreshPool(); }, [tab]);

  async function refreshPool() {
    setError('');
    try { const r = await api.leads(); setPool(r.leads); }
    catch (e) { setError(e instanceof Error ? e.message : 'Havuz yüklenemedi.'); }
  }

  async function search(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice('');
    if (!query.trim() || !location.trim()) { setError('Sektör ve konum alanlarını doldur.'); return; }
    setLoading(true);
    try {
      const data = await api.search({ query: query.trim(), location: location.trim(), minRating: minRating ? Number(minRating) : undefined, minReviews: minReviews ? Number(minReviews) : undefined });
      setResults(data.results); setSelected(new Set());
      if (!data.results.length) setNotice('Sonuç bulunamadı. Filtreleri gevşetmeyi veya bölgeyi genişletmeyi dene.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Arama başarısız.'); }
    finally { setLoading(false); }
  }

  async function addLead(lead: LeadCandidate) {
    setError('');
    try {
      const data = await api.addLead(lead);
      setNotice(data.duplicate ? `${lead.name} zaten müşteri havuzunda.` : `${lead.name} müşteri havuzuna eklendi.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Lead eklenemedi.'); }
  }

  async function changeStatus(lead: SavedLead, status: LeadStatus) {
    const previous = lead.status;
    setPool(current=>current.map(item=>item.id===lead.id?{...item,status}:item));
    try { await api.updateLead(lead.id,{status}); setNotice(`${lead.name}: durum “${status}” olarak güncellendi.`); }
    catch (e) { setPool(current=>current.map(item=>item.id===lead.id?{...item,status:previous}:item)); setError(e instanceof Error ? e.message : 'Durum güncellenemedi.'); }
  }

  return <div className="app-shell">
    <header><div><span className="eyebrow">LEAD WORKSPACE</span><h1>Google Müşteri Toplama</h1></div><span className="live-dot">MVP</span></header>
    <nav>
      <button className={tab==='search'?'active':''} onClick={()=>setTab('search')}>Müşteri Bul</button>
      <button className={tab==='pool'?'active':''} onClick={()=>setTab('pool')}>Havuz</button>
      <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}>Geçmiş</button>
      <button className={tab==='settings'?'active':''} onClick={()=>setTab('settings')}>Ayarlar</button>
    </nav>
    {error && <div className="alert error">{error}</div>}
    {notice && <div className="alert success">{notice}</div>}

    {tab === 'search' && <main>
      <section className="hero"><h2>Yeni müşterileri birkaç saniyede bul.</h2><p>Bir sektör ve bölge seç. En güçlü adayları lead skoruna göre öne çıkaralım.</p></section>
      <form className="search-form" onSubmit={search}>
        <label>Sektör / arama terimi<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Örn. diş kliniği" /></label>
        <label>Şehir / ilçe<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Örn. Bursa, Nilüfer" /></label>
        <details><summary>Gelişmiş filtreler</summary><div className="filter-grid"><label>Minimum puan<input value={minRating} onChange={e=>setMinRating(e.target.value)} type="number" min="0" max="5" step="0.1" placeholder="4.0" /></label><label>Minimum yorum<input value={minReviews} onChange={e=>setMinReviews(e.target.value)} type="number" min="0" placeholder="20" /></label></div></details>
        <button className="primary" disabled={loading}>{loading ? 'Müşteriler aranıyor…' : 'Müşteri Ara'}</button>
      </form>
      {loading && <div className="skeleton-list">{[1,2,3].map(i => <div className="skeleton" key={i} />)}</div>}
      {!loading && results.length === 0 && <div className="empty"><strong>Aramaya hazır.</strong><span>Örnek: “reklam ajansı” + “Bursa”</span></div>}
      {!loading && results.length > 0 && <section className="results"><div className="section-head"><div><h2>{results.length} aday bulundu</h2><p>En yüksek fırsat skorları üstte.</p></div><button className="text-button" onClick={()=>setSelected(new Set(results.map(r=>r.placeId)))}>Tümünü seç</button></div>{[...results].sort((a,b)=>b.leadScore-a.leadScore).map(lead=><LeadCard key={lead.placeId} lead={lead} selected={selected.has(lead.placeId)} onSelect={()=>setSelected(prev=>{const n=new Set(prev); n.has(lead.placeId)?n.delete(lead.placeId):n.add(lead.placeId); return n;})} onAdd={()=>addLead(lead)} />)}</section>}
      {selectedCount > 0 && <div className="bulk-bar"><strong>{selectedCount} müşteri seçildi</strong><button onClick={()=>Promise.all(results.filter(r=>selected.has(r.placeId)).map(addLead))}>Havuza Ekle</button></div>}
    </main>}

    {tab === 'pool' && <main>
      <section className="section-head"><div><h2>Müşteri Havuzu</h2><p>En güçlü adaylar önce gösterilir.</p></div><a className="export-button" href={`${API_URL}/api/leads/export.csv`} target="_blank" rel="noreferrer">CSV indir</a></section>
      <input className="pool-search" value={poolQuery} onChange={e=>setPoolQuery(e.target.value)} placeholder="Havuzda firma veya kategori ara…" />
      {sortedPool.length ? sortedPool.map(l=><LeadCard key={l.placeId} lead={l} saved={l} onStatusChange={status=>changeStatus(l,status)} />) : <div className="empty"><strong>{poolQuery ? 'Aramana uygun müşteri yok.' : 'Havuz henüz boş.'}</strong><span>{poolQuery ? 'Farklı bir arama deneyebilirsin.' : 'Müşteri Bul ekranından aday ekleyebilirsin.'}</span></div>}
    </main>}
    {tab === 'history' && <main><div className="empty"><strong>Arama geçmişi yakında burada.</strong><span>Bir sonraki iterasyonda kayıt ve tekrar çalıştırma ekleyeceğiz.</span></div></main>}
    {tab === 'settings' && <main><div className="settings-card"><h2>Ayarlar</h2><p>Backend adresi: <code>{API_URL}</code></p><p className="muted">API anahtarları eklentide tutulmaz.</p></div></main>}
  </div>;
}
