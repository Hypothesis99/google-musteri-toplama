#!/bin/zsh
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
PLIST="$HOME/Library/LaunchAgents/com.contrast.google-musteri-toplama.plist"
LABEL="com.contrast.google-musteri-toplama"

if [[ ! -d "$SERVER_DIR" ]]; then
  echo "server klasörü bulunamadı: $SERVER_DIR"
  read -k 1 "?Kapatmak için bir tuşa basın..."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

OLD_WORKDIR=""
if [[ -f "$PLIST" ]]; then
  OLD_WORKDIR="$(plutil -extract WorkingDirectory raw "$PLIST" 2>/dev/null || true)"
fi

# Eski kurulumdaki gizli ayarları yeni sürüme otomatik taşı.
if [[ -n "$OLD_WORKDIR" && "$OLD_WORKDIR" != "$SERVER_DIR" ]]; then
  if [[ -f "$OLD_WORKDIR/.env" ]]; then cp "$OLD_WORKDIR/.env" "$SERVER_DIR/.env"; fi
  if [[ -f "$OLD_WORKDIR/google-service-account.json" ]]; then cp "$OLD_WORKDIR/google-service-account.json" "$SERVER_DIR/google-service-account.json"; fi
fi

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
fi

# Google servis hesabı dosya yolunu standartlaştır.
if ! grep -q '^GOOGLE_SERVICE_ACCOUNT_FILE=' "$SERVER_DIR/.env"; then
  echo 'GOOGLE_SERVICE_ACCOUNT_FILE=./google-service-account.json' >> "$SERVER_DIR/.env"
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
if [[ -z "$NODE_BIN" || -z "$NPM_BIN" ]]; then
  echo "Node.js/npm bulunamadı. Önce Node.js kurulu olmalı."
  read -k 1 "?Kapatmak için bir tuşa basın..."
  exit 1
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
open "http://localhost:8787/health"

echo ""
echo "✓ Google Müşteri Toplama güncellendi ve arka planda çalışıyor."
echo "✓ Eski .env ve servis hesabı ayarları otomatik taşındı."
echo "✓ Mac açıldığında otomatik başlayacak."
echo ""
read -k 1 "?Kapatmak için bir tuşa basın..."
