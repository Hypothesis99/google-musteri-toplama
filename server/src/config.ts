import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  allowedExtensionOrigin: process.env.ALLOWED_EXTENSION_ORIGIN ?? ''
};

export function requireGooglePlacesKey() {
  if (!config.googlePlacesApiKey) throw new Error('Google Places API anahtarı yapılandırılmamış. server/.env dosyasını kontrol et.');
}

export function requireSupabase() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) throw new Error('Supabase bağlantısı yapılandırılmamış. server/.env dosyasını kontrol et.');
}
