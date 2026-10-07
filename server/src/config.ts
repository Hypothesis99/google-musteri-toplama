import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  googleSheetId: process.env.GOOGLE_SHEET_ID ?? '',
  googleServiceAccountFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  allowedExtensionOrigin: process.env.ALLOWED_EXTENSION_ORIGIN ?? ''
};

export function requireGooglePlacesKey() {
  if (!config.googlePlacesApiKey) throw new Error('Google Places API anahtarı yapılandırılmamış. server/.env dosyasını kontrol et.');
}

export function requireGoogleSheets() {
  if (!config.googleSheetId || !config.googleServiceAccountFile) throw new Error('Google Sheets bağlantısı yapılandırılmamış. server/.env dosyasını kontrol et.');
}

export function requireSupabase() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new Error('Supabase bağlantısı yapılandırılmamış. server/.env dosyasını kontrol et.');
}
