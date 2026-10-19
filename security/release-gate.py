#!/usr/bin/env python3
"""Fail-closed distribution gate. Inspects a built APK, not source claims."""
import sys, zipfile, re, hashlib
from pathlib import Path
if len(sys.argv) != 2:
    raise SystemExit('Usage: python3 security/release-gate.py path/to/release.apk')
p = Path(sys.argv[1]); errors=[]
if not p.is_file(): raise SystemExit('FAIL: APK absent')
with zipfile.ZipFile(p) as z:
    names=z.namelist()
    if z.testzip() is not None: errors.append('Corrupt APK archive')
    if not any(re.fullmatch(r'classes\d*\.dex',n) for n in names): errors.append('Missing DEX')
    for n in names:
        if n.startswith(('signing/','build/')) or n.endswith(('.p12','.jks','.keystore','.pem','.java','.kt','.map')):
            errors.append('Sensitive/development file packaged: '+n)
    proprietary=[n for n in names if n.startswith('assets/') and n.endswith('.js') and not n.startswith('assets/vendor/')]
    for n in proprietary:
        b=z.read(n)
        # Conservative heuristic, not a proof of obfuscation.
        if len(b.splitlines())>80:
            errors.append('Readable multi-line proprietary JS: '+n)
    print('SHA256:',hashlib.sha256(p.read_bytes()).hexdigest())
    print('First-party JS:',len(proprietary),'(obfuscation cannot be certified by this check)')
if errors:
    print('DISTRIBUTION BLOCKED:')
    for e in errors: print(' -',e)
    sys.exit(1)
print('Static archive checks passed; still requires signature, manifest and device tests.')
