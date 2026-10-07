import ExcelJS from 'exceljs';
import type { GoogleSheetLead } from './googleSheets.js';

const STATUS_LIST = 'Yeni,Arandı,WhatsApp Gönderildi,Teklif Verildi,Görüşülüyor,Müşteri Oldu,Olumsuz';

export async function buildLeadsWorkbook(leads: GoogleSheetLead[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Contrast Creative Studio';
  workbook.company = 'Contrast Creative Studio';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Özet', { views: [{ showGridLines: false }] });
  summary.mergeCells('A1:D1');
  const title = summary.getCell('A1');
  title.value = 'Google Müşteri Toplama — CRM Özeti';
  title.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF172033' } };
  title.alignment = { vertical: 'middle' };
  summary.getRow(1).height = 34;

  const metrics: Array<[string, number]> = [
    ['Toplam Müşteri', leads.length],
    ['Websitesiz Fırsat', leads.filter(lead => !lead.website).length],
    ['Cep Telefonu Olan', leads.filter(lead => lead.mobilePhone || lead.phoneType === 'Cep').length],
    ['Sabit Hat Olan', leads.filter(lead => lead.landlinePhone || lead.phoneType === 'Sabit').length],
    ['Müşteri Oldu', leads.filter(lead => lead.status === 'Müşteri Oldu').length],
    ['Ortalama Lead Score', leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.leadScore, 0) / leads.length) : 0]
  ];
  metrics.forEach(([label, metric], index) => {
    const rowIndex = index + 3;
    const labelCell = summary.getCell(`A${rowIndex}`);
    const valueCell = summary.getCell(`B${rowIndex}`);
    labelCell.value = label;
    valueCell.value = metric;
    labelCell.font = { bold: true, color: { argb: 'FF4E576A' } };
    valueCell.font = { bold: true, size: 14, color: { argb: 'FF172033' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F7F9' } };
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F7F9' } };
    labelCell.alignment = { vertical: 'middle' };
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summary.getRow(rowIndex).height = 26;
  });
  summary.getColumn('A').width = 25;
  summary.getColumn('B').width = 18;
  summary.getCell('A11').value = 'Not';
  summary.getCell('A11').font = { bold: true };
  summary.mergeCells('A12:D14');
  summary.getCell('A12').value = 'Websitesiz işletmeler, cep/sabit telefon ayrımı ve sosyal medya metrikleri ana Müşteriler sayfasında filtrelenebilir. Durum alanında açılır liste bulunur.';
  summary.getCell('A12').alignment = { wrapText: true, vertical: 'top' };

  const sheet = workbook.addWorksheet('Müşteriler', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Firma', key: 'name', width: 30 }, { header: 'Kategori', key: 'category', width: 22 },
    { header: 'Telefon', key: 'phone', width: 18 }, { header: 'Telefon Türü', key: 'phoneType', width: 14 },
    { header: 'Cep Telefonu', key: 'mobilePhone', width: 18 }, { header: 'Sabit Hat', key: 'landlinePhone', width: 18 },
    { header: 'E-posta', key: 'email', width: 28 }, { header: 'WhatsApp', key: 'whatsapp', width: 24 },
    { header: 'Website', key: 'website', width: 32 }, { header: 'Website Durumu', key: 'websiteStatus', width: 16 },
    { header: 'Instagram', key: 'instagram', width: 28 }, { header: 'IG Takipçi', key: 'instagramFollowers', width: 14 },
    { header: 'Facebook', key: 'facebook', width: 28 }, { header: 'FB Takipçi', key: 'facebookFollowers', width: 14 },
    { header: 'LinkedIn', key: 'linkedin', width: 28 }, { header: 'LI Takipçi', key: 'linkedinFollowers', width: 14 },
    { header: 'TikTok', key: 'tiktok', width: 28 }, { header: 'TikTok Takipçi', key: 'tiktokFollowers', width: 16 },
    { header: 'Google Maps', key: 'mapsUrl', width: 30 }, { header: 'Adres', key: 'address', width: 42 },
    { header: 'Puan', key: 'rating', width: 10 }, { header: 'Yorum', key: 'reviewCount', width: 12 },
    { header: 'Lead Score', key: 'leadScore', width: 13 }, { header: 'Durum', key: 'status', width: 22 },
    { header: 'Etiketler', key: 'tags', width: 24 }, { header: 'Notlar', key: 'notes', width: 36 },
    { header: 'Son İletişim', key: 'lastContactedAt', width: 22 }
  ];

  for (const lead of leads) {
    sheet.addRow({ ...lead, websiteStatus: lead.website ? 'Var' : 'Yok', tags: (lead.tags ?? []).join(', ') });
  }

  const header = sheet.getRow(1);
  header.height = 30;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF172033' } };
  header.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.autoFilter = { from: 'A1', to: 'AA1' };
  sheet.properties.defaultRowHeight = 20;

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowIndex % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FA' } };

    const lead = leads[rowIndex - 2];
    const links: Array<[string, string | undefined, boolean?]> = [
      ['G', lead?.email, true], ['H', lead?.whatsapp], ['I', lead?.website], ['K', lead?.instagram],
      ['M', lead?.facebook], ['O', lead?.linkedin], ['Q', lead?.tiktok], ['S', lead?.mapsUrl]
    ];
    for (const [column, url, isEmail] of links) {
      if (!url) continue;
      const cell = sheet.getCell(`${column}${rowIndex}`);
      cell.value = { text: url, hyperlink: isEmail ? `mailto:${url}` : url };
      cell.font = { color: { argb: 'FF2F5597' }, underline: true };
    }

    sheet.getCell(`U${rowIndex}`).numFmt = '0.0';
    sheet.getCell(`V${rowIndex}`).numFmt = '0';
    sheet.getCell(`W${rowIndex}`).numFmt = '0';
    sheet.getCell(`X${rowIndex}`).dataValidation = {
      type: 'list', allowBlank: false, formulae: [`"${STATUS_LIST}"`]
    };
  }

  if (sheet.rowCount >= 2) {
    sheet.addConditionalFormatting({
      ref: `J2:J${sheet.rowCount}`,
      rules: [{ type: 'expression', priority: 1, formulae: ['$J2="Yok"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE5E5' }, fgColor: { argb: 'FFFFE5E5' } }, font: { color: { argb: 'FF9C2F2F' }, bold: true } } }]
    });
    sheet.addConditionalFormatting({
      ref: `X2:X${sheet.rowCount}`,
      rules: [{ type: 'expression', priority: 2, formulae: ['$X2="Müşteri Oldu"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE1F2E5' }, fgColor: { argb: 'FFE1F2E5' } }, font: { color: { argb: 'FF24613A' }, bold: true } } }]
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
