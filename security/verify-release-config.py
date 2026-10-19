#!/usr/bin/env python3
"""Check critical release configuration before cloud compilation."""
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parent.parent
build=(root/'build.sh').read_text()
workflow=(root/'.github/workflows/android-beta.yml').read_text()
manifest=(root/'app/AndroidManifest.xml').read_text()
errors=[]
checks={
 'release uses R8': 'com.android.tools.r8.R8 --release' in build,
 'release uses transformed assets': 'ASSET_DIR="$PWD/build/hardened-assets"' in build,
 'APK assets are verified': 'security/verify-apk-assets.py' in build,
 'APK release gate runs': 'security/release-gate.py' in build,
 'persistent signing enforced': 'HYPER_REQUIRE_SIGNING_KEY' in build and 'HYPER_KEYSTORE_B64' in workflow,
 'dependencies installed from lockfile': 'npm ci' in workflow and (root/'security/package-lock.json').is_file(),
 'actions pinned to commits': not re.search(r'uses:\s+[^\s]+@v\d+',workflow),
 'Android platform integrity checked': 'verify-android-sdk.py' in build and 'verify-android-sdk.py' in (root/'security/check-build-env.sh').read_text(),
 'cloud only publishes APK': 'path: output/Hypercruise-0.8.25.apk' in workflow,
 'no debug manifest': 'android:debuggable="true"' not in manifest,
 'no backup enabled': 'android:allowBackup="true"' not in manifest,
}
for label,passed in checks.items():
 print(('PASS' if passed else 'FAIL')+': '+label)
 if not passed:errors.append(label)
if errors:sys.exit(1)
