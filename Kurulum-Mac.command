#!/bin/zsh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
ENV_FILE="$SERVER_DIR/.env"
PLIST="$HOME/Library/LaunchAgents/com.contrast.google-musteri-toplama.plist"
LABEL="com.contrast.google-musteri-toplama"

pause_and_exit() {
  echo ""
  read -k 1 "?Kapatmak için bir tuşa basın..."
  exit "${1:-1}"
}

if [[ ! -d "$SERVER_DIR" ]]; then
  echo "server klasörü bulunamadı: $SERVER_DIR"
  pause_and_exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

OLD_WORKDIR=""
if [[ -f "$PLIST" ]]; then
  OLD_WORKDIR="$(plutil -extract WorkingDirectory raw "$PLIST" 2>/dev/null || true)"
fi

# Eski kurulumdaki gizli ayarları yeni sürüme otomatik taşı.
if [[ -n "$OLD_WORKDIR" && "$OLD_WORKDIR" != "$SERVER_DIR" ]]; then
  if [[ -f "$OLD_WORKDIR/.env" ]]; then cp "$OLD_WORKDIR/.env" "$ENV_FILE"; fi
  if [[ -f "$OLD_WORKDIR/google-service-account.json" ]]; then cp "$OLD_WORKDIR/google-service-account.json" "$SERVER_DIR/google-service-account.json"; fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$SERVER_DIR/.env.example" "$ENV_FILE"
fi

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

get_env_value() {
  local key="$1"
  grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -n 1 | cut -d= -f2-
}

# API key yalnızca bu Mac'te istenir; ekrana yazdırılmaz ve paketin içine gömülmez.
CURRENT_API_KEY="$(get_env_value GOOGLE_PLACES_API_KEY)"
if [[ -z "$CURRENT_API_KEY" ]]; then
  echo ""
  echo "Google Places API anahtarı bulunamadı."
  read -r -s "API_KEY?Google Places API anahtarını girin: "
  echo ""
  if [[ -z "$API_KEY" ]]; then
    echo "API anahtarı boş bırakılamaz."
    pause_and_exit 1
  fi
  set_env_value GOOGLE_PLACES_API_KEY "$API_KEY"
  unset API_KEY
  echo "✓ Google Places API anahtarı bu Mac'teki .env dosyasına kaydedildi."
else
  echo "✓ Mevcut Google Places API anahtarı korundu."
fi

# Sheet ID gizli değildir ama boşsa ilk kurulumda kullanıcıdan alınır.
CURRENT_SHEET_ID="$(get_env_value GOOGLE_SHEET_ID)"
if [[ -z "$CURRENT_SHEET_ID" ]]; then
  echo ""
  read -r "SHEET_ID?Google Sheet ID'sini girin (docs.google.com/spreadsheets/d/ ile /edit arasındaki bölüm): "
  if [[ -z "$SHEET_ID" ]]; then
    echo "Google Sheet ID boş bırakılamaz."
    pause_and_exit 1
  fi
  set_env_value GOOGLE_SHEET_ID "$SHEET_ID"
  echo "✓ Google Sheet ID kaydedildi."
else
  echo "✓ Mevcut Google Sheet ID korundu."
fi

set_env_value GOOGLE_SERVICE_ACCOUNT_FILE './google-service-account.json'

if [[ ! -f "$SERVER_DIR/google-service-account.json" ]]; then
  echo ""
  echo "UYARI: google-service-account.json bulunamadı."
  echo "Google Sheets/Havuz özellikleri için servis hesabı JSON dosyasını:"
  echo "$SERVER_DIR/google-service-account.json"
  echo "konumuna koyup Kurulum-Mac.command dosyasını tekrar çalıştırın."
  pause_and_exit 1
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
if [[ -z "$NODE_BIN" || -z "$NPM_BIN" ]]; then
  echo "Node.js/npm bulunamadı. Önce Node.js kurulu olmalı."
  pause_and_exit 1
fi

cd "$SERVER_DIR"
"$NPM_BIN" install --omit=dev

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$SERVER_DIR/dist/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$SERVER_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/google-musteri-toplama.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/google-musteri-toplama-error.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL"

sleep 2
HEALTH="$(curl -fsS "http://localhost:8787/health" 2>/dev/null || true)"
if [[ "$HEALTH" != *'"ok":true'* ]]; then
  echo "Backend başlatıldı ancak sağlık kontrolü başarısız oldu."
  echo "Hata günlüğü: $HOME/Library/Logs/google-musteri-toplama-error.log"
  pause_and_exit 1
fi

open "http://localhost:8787/health"

echo ""
echo "✓ Google Müşteri Toplama güncellendi ve arka planda çalışıyor."
echo "✓ API anahtarı ve Sheet ayarları bu Mac'te kalıcı olarak saklandı."
echo "✓ Mac açıldığında otomatik başlayacak."
echo ""
read -k 1 "?Kapatmak için bir tuşa basın..."
