import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreLead } from './leadScore.js';

test('websitesiz aktif işletmeye yüksek ihtiyaç skoru verir', () => {
  const result = scoreLead({
    placeId: 'place-1',
    name: 'Örnek İşletme',
    phone: '5555555555',
    rating: 4.7,
    reviewCount: 250
  });

  assert.ok(result.leadScore >= 90);
  assert.ok(result.scoreReasons.some(reason => reason.includes('Web sitesi yok')));
});

test('enrichment iletişim kanallarını skora dahil eder', () => {
  const base = scoreLead({
    placeId: 'place-2',
    name: 'Dijital İşletme',
    website: 'https://example.com',
    rating: 3.8,
    reviewCount: 10
  });

  const enriched = scoreLead({
    placeId: 'place-2',
    name: 'Dijital İşletme',
    website: 'https://example.com',
    email: 'info@example.com',
    whatsapp: 'https://wa.me/905555555555',
    rating: 3.8,
    reviewCount: 10,
    enrichmentStatus: 'done',
    mobileFriendly: false,
    hasContactForm: false
  });

  assert.ok(enriched.leadScore > base.leadScore);
  assert.ok(enriched.scoreReasons.some(reason => reason.includes('e-posta')));
  assert.ok(enriched.scoreReasons.some(reason => reason.includes('WhatsApp')));
});

test('lead score 100 sınırını aşmaz', () => {
  const result = scoreLead({
    placeId: 'place-3',
    name: 'Yoğun Sinyalli İşletme',
    phone: '5555555555',
    email: 'info@example.com',
    whatsapp: 'https://wa.me/905555555555',
    rating: 5,
    reviewCount: 1000
  });

  assert.equal(result.leadScore, 100);
});
