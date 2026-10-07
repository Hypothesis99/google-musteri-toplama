import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  googleSheetId: process.env.GOOGLE_SHEET_ID ?? '',
  googleServiceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE ?? '',
  allowedExtensionOrigin: process.env.ALLOWED_EXTENSION_ORIGIN ?? ''
};

export function requireGooglePlacesKey() {
  if (!config.googlePlacesApiKey) throw new Error('Google Places API anahtarı yapılandırılmamış. server/.env dosyasını kontrol et.');
}

export function requireGoogleSheets() {
  if (!config.googleSheetId || !config.googleServiceAccountFile) throw new Error('Google Sheets bağlantısı yapılandırılmamış. server/.env dosyasını kontrol et.');
}
