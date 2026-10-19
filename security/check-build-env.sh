#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
check(){ if "$@" >/dev/null 2>&1; then printf 'OK   %s\n' "$*"; else printf 'FAIL %s\n' "$*"; fail=1; fi; }
check command -v node
check command -v npm
check command -v python3
check command -v java
check command -v javac
if [ -z "${HYPER_SDK:-}" ]; then echo 'FAIL HYPER_SDK is unset'; fail=1
else
 for p in platforms/android-35/android.jar build-tools/35.0.0/aapt2 build-tools/35.0.0/zipalign build-tools/35.0.0/lib/d8.jar build-tools/35.0.0/lib/apksigner.jar; do
  if [ -f "$HYPER_SDK/$p" ]; then echo "OK   $p"; else echo "FAIL $p"; fail=1; fi
 done
 if ! python3 security/verify-android-sdk.py "$HYPER_SDK"; then fail=1; fi
fi
if node -e "require('./security/node_modules/terser')" >/dev/null 2>&1; then echo 'OK   pinned local Terser'; else echo 'FAIL local Terser (cd security && npm install --ignore-scripts)'; fail=1; fi
exit "$fail"
