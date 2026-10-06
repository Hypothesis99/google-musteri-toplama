import type { LeadCandidate } from '../types.js';

type ScoreInput = Omit<LeadCandidate, 'leadScore' | 'scoreReasons'>;

export function scoreLead(lead: ScoreInput): Pick<LeadCandidate, 'leadScore' | 'scoreReasons'> {
  let score = 35;
  const reasons: string[] = [];

  if (!lead.website) { score += 25; reasons.push('Web sitesi yok: dijital hizmet ihtiyacı yüksek olabilir.'); }
  else { score += 5; reasons.push('Web sitesi mevcut: iletişim ve analiz yapılabilir.'); }
  if (lead.phone) { score += 10; reasons.push('Telefon bilgisi bulundu.'); }
  if (lead.email) { score += 8; reasons.push('Kamuya açık e-posta adresi bulundu.'); }
  if (lead.whatsapp) { score += 6; reasons.push('WhatsApp iletişim kanalı bulundu.'); }
  if ((lead.rating ?? 0) >= 4.2) { score += 10; reasons.push('Google puanı yüksek.'); }
  if ((lead.reviewCount ?? 0) >= 50) { score += 10; reasons.push('Yorum sayısı güçlü; aktif bir işletme sinyali veriyor.'); }
  if ((lead.reviewCount ?? 0) >= 200) score += 5;
  if (lead.website && lead.mobileFriendly === false) { score += 8; reasons.push('Web sitesi mobil uyumluluk sinyali vermiyor.'); }
  if (lead.website && lead.hasContactForm === false) { score += 4; reasons.push('Web sitesinde iletişim formu bulunamadı.'); }
  if (lead.website && lead.enrichmentStatus === 'done' && !lead.instagram) { score += 4; reasons.push('Instagram bağlantısı bulunamadı.'); }

  return { leadScore: Math.max(0, Math.min(100, score)), scoreReasons: reasons };
}
