#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${HYPER_SDK:?Android SDK required}"
HYPER_JAVA="${HYPER_JAVA:-$(command -v java)}"
bt="$HYPER_SDK/build-tools/35.0.0"
platform="$HYPER_SDK/platforms/android-35/android.jar"
r8_jar="$bt/lib/d8.jar"
python3 security/verify-android-sdk.py "$HYPER_SDK"
if [ "${HYPER_HARDENED:-0}" = "1" ] && [ "${HYPER_REQUIRE_SIGNING_KEY:-0}" = "1" ] && { [ ! -s signing/hypercruise.p12 ] || [ ! -s signing/password.txt ]; }; then
  echo 'ERROR: persistent signing key missing; refusing beta build.' >&2
  exit 1
fi
if [ "${HYPER_HARDENED:-0}" = "1" ]; then
  bash security/check-build-env.sh
  bash security/beta-check.sh
  node security/obfuscate-assets.cjs
  node security/verify-staged-assets.cjs
  node security/test-transformed-core.cjs
  ASSET_DIR="$PWD/build/hardened-assets"
  trap 'rm -rf "$PWD/build/hardened-assets"' EXIT
else
  ASSET_DIR="$PWD/app/assets"
fi
mkdir -p build/classes build/dex signing output
"$bt/aapt2" compile --dir app/res -o build/resources.zip
"$bt/aapt2" link -o build/resources.apk -I "$platform" --manifest app/AndroidManifest.xml --auto-add-overlay -A "$ASSET_DIR" build/resources.zip
rm -rf build/classes build/dex
mkdir -p build/classes build/dex
python3 - <<'SRC'
from pathlib import Path
Path('build/sources.txt').write_text('\n'.join(str(p) for folder in ['app/src','app/engine-src'] for p in Path(folder).rglob('*.java'))+'\n')
SRC
"$HYPER_JAVA" --module jdk.compiler/com.sun.tools.javac.Main --release 11 -encoding UTF-8 -classpath "$platform" -d build/classes @build/sources.txt
python3 - <<'JAR'
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
with ZipFile('build/classes.jar','w',ZIP_DEFLATED) as z:
 for p in Path('build/classes').rglob('*.class'):z.write(p,str(p.relative_to('build/classes')))
JAR
if [ "${HYPER_HARDENED:-0}" = "1" ]; then
  # R8 performs shrinking/optimization/obfuscation, unlike the previous D8-only build.
  "$HYPER_JAVA" -cp "$r8_jar" com.android.tools.r8.R8 --release --min-api 28 --lib "$platform" --pg-conf security/r8-rules.pro --pg-map-output build/r8-mapping.txt --output build/dex build/classes.jar
else
  "$HYPER_JAVA" -cp "$bt/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 28 --lib "$platform" --output build/dex build/classes.jar
fi
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
with ZipFile('build/resources.apk') as src,ZipFile('build/unsigned.apk','w',ZIP_DEFLATED) as out:
 for item in src.infolist():out.writestr(item,src.read(item.filename))
 for dex in Path('build/dex').glob('*.dex'):out.write(dex,dex.name)
PY
"$bt/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
if [ "${HYPER_HARDENED:-0}" = "1" ] && [ "${HYPER_REQUIRE_SIGNING_KEY:-0}" = "1" ] && { [ ! -s signing/hypercruise.p12 ] || [ ! -s signing/password.txt ]; }; then
  echo 'ERROR: persistent signing key required for distributable beta. Supply signing/hypercruise.p12 and signing/password.txt securely.' >&2
  exit 1
fi
if [ ! -f signing/hypercruise.p12 ]; then
 umask 077
 python3 - <<'PY'
from pathlib import Path
import secrets
Path('signing/password.txt').write_text(secrets.token_urlsafe(32)+'\n')
PY
 "$HYPER_JAVA" --module java.base/sun.security.tools.keytool.Main -genkeypair -keystore signing/hypercruise.p12 -storetype PKCS12 -storepass:file signing/password.txt -keypass:file signing/password.txt -alias hypercruise -keyalg RSA -keysize 3072 -validity 10950 -dname 'CN=Hypercruise Personal App, C=FR'
fi
if [ -s signing/hypercruise.p12 ] && [ -s signing/password.txt ]; then
 "$HYPER_JAVA" --module java.base/sun.security.tools.keytool.Main -list -keystore signing/hypercruise.p12 -storetype PKCS12 -storepass:file signing/password.txt -alias hypercruise >/dev/null
fi
signed_tmp="$(mktemp "$PWD/output/.hyper-signed.XXXXXX.apk")"
"$HYPER_JAVA" -jar "$bt/lib/apksigner.jar" sign --ks signing/hypercruise.p12 --ks-key-alias hypercruise --ks-pass file:signing/password.txt --v4-signing-enabled false --out "$signed_tmp" build/aligned.apk
"$HYPER_JAVA" -jar "$bt/lib/apksigner.jar" verify --verbose "$signed_tmp"
"$bt/zipalign" -c 4 "$signed_tmp"
python3 - "$signed_tmp" <<'APK'
import os,sys
from pathlib import Path
from zipfile import ZipFile
p=Path(sys.argv[1])
with p.open('r+b') as f: os.fsync(f.fileno())
with ZipFile(p) as z: assert z.testzip() is None
os.replace(p,'output/Hypercruise-0.8.25.apk')
print('Final APK ZIP valid:',Path('output/Hypercruise-0.8.25.apk').stat().st_size,'bytes')
APK

if [ "${HYPER_HARDENED:-0}" = "1" ]; then
  python3 security/verify-apk-assets.py output/Hypercruise-0.8.25.apk "$ASSET_DIR"
  python3 security/release-gate.py output/Hypercruise-0.8.25.apk
fi
