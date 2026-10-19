#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v docker >/dev/null || { echo 'Docker is required'; exit 2; }
mkdir -p signing output
if [[ ! -s signing/hypercruise.p12 || ! -s signing/password.txt ]]; then
  echo 'Generating persistent signing key LOCALLY. Keep signing/ private and backed up.'
  command -v keytool >/dev/null || { echo 'Install JDK/keytool before first run'; exit 2; }
  umask 077
  python3 - <<'PY2'
from pathlib import Path
import secrets
Path('signing/password.txt').write_text(secrets.token_urlsafe(32)+'\n')
PY2
  keytool -genkeypair -keystore signing/hypercruise.p12 -storetype PKCS12 -storepass:file signing/password.txt -keypass:file signing/password.txt -alias hypercruise -keyalg RSA -keysize 3072 -validity 10950 -dname 'CN=Hypercruise Beta, C=FR'
fi
docker build -t hypercruise-beta-build .
docker run --rm -v "$PWD/signing:/work/signing" -v "$PWD/output:/work/output" hypercruise-beta-build
printf 'APK: %s\n' "$PWD/output/Hypercruise-0.8.25.apk"
