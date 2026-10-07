export type PhoneType = 'Cep' | 'Sabit' | 'Diğer';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeTrPhone(raw?: string): string | undefined {
  if (!raw) return undefined;
  let digits = digitsOnly(raw);
  if (!digits) return undefined;
  if (digits.startsWith('0090')) digits = digits.slice(4);
  else if (digits.startsWith('90') && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1);
  if (digits.length !== 10) return raw.trim() || undefined;
  return `0${digits}`;
}

export function formatTrPhone(raw?: string): string | undefined {
  const normalized = normalizeTrPhone(raw);
  if (!normalized) return undefined;
  const digits = digitsOnly(normalized);
  if (digits.length !== 11 || !digits.startsWith('0')) return normalized;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
}

export function classifyTrPhone(raw?: string): { phone?: string; phoneType?: PhoneType; mobilePhone?: string; landlinePhone?: string } {
  const normalized = normalizeTrPhone(raw);
  if (!normalized) return {};
  const digits = digitsOnly(normalized).replace(/^0/, '');
  const phone = formatTrPhone(normalized) ?? normalized;

  if (/^5\d{9}$/.test(digits)) return { phone, phoneType: 'Cep', mobilePhone: phone };
  if (/^[234]\d{9}$/.test(digits) || /^850\d{7}$/.test(digits)) return { phone, phoneType: 'Sabit', landlinePhone: phone };
  return { phone, phoneType: 'Diğer' };
}

export function extractTrPhones(text: string): string[] {
  const matches = text.match(/(?:\+?90[\s().-]*)?(?:0[\s().-]*)?(?:5\d{2}|[234]\d{2}|850)[\s().-]*\d{3}[\s().-]*\d{2}[\s().-]*\d{2}/g) ?? [];
  const values = matches.map(value => formatTrPhone(value)).filter((value): value is string => Boolean(value));
  return [...new Set(values)];
}

export function splitPhones(values: Array<string | undefined>): { phone?: string; phoneType?: PhoneType; mobilePhone?: string; landlinePhone?: string } {
  const normalized = [...new Set(values.map(value => formatTrPhone(value)).filter((value): value is string => Boolean(value)))];
  const mobile = normalized.find(value => classifyTrPhone(value).phoneType === 'Cep');
  const landline = normalized.find(value => classifyTrPhone(value).phoneType === 'Sabit');
  const first = normalized[0];
  const primary = classifyTrPhone(first);
  return {
    phone: first,
    phoneType: primary.phoneType,
    mobilePhone: mobile,
    landlinePhone: landline
  };
}
