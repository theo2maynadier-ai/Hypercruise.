#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo 'Checking first-party JavaScript syntax...'
for f in app/assets/*.js; do node --check "$f" >/dev/null; done
echo 'Checking accidental secret/private key inclusions...'
if find app/assets app/src app/engine-src -type f \( -iname '*.p12' -o -iname '*.jks' -o -iname '*.pem' -o -iname 'id_rsa' -o -iname '*.keystore' \) | grep .; then
  echo 'FAIL: suspected private keys embedded in app source/assets' >&2; exit 1
fi
if grep -q 'android:debuggable="true"' app/AndroidManifest.xml; then echo 'FAIL: debug manifest' >&2; exit 1; fi
if grep -q 'android:allowBackup="true"' app/AndroidManifest.xml; then echo 'FAIL: backup enabled' >&2; exit 1; fi
echo 'Static checks OK. This does not establish resistance to reverse engineering.'
